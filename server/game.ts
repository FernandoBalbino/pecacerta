// Regras do jogo, sem rede. O relógio é injetável para os testes.
import { randomBytes } from 'node:crypto';
import {
  IO_ORDER, ITEM_BY_ID, LIVES, MAX_PLAYERS, MAX_ROUNDS, PODIUM, REVEAL_MS,
  buildQueue, colorFor, kindFor, randomName, shuffle, type Kind,
} from '../shared/items.ts';
import type { EndReason, Phase, PublicRoom, StartOptions } from '../shared/protocol.ts';

export class GameError extends Error {}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface Player {
  id: string;
  token: string;
  name: string;
  colorIdx: number;
  lives: number;
  correct: number;
  choice: number;
  online: boolean;
  out: number | null;
  last: 'ok' | 'wrong' | 'none' | null;
  lastPick: number;
  time: number; // soma do tempo até a escolha final nas rodadas que acertou (desempate)
}

export interface Room {
  code: string;
  teacherToken: string;
  phase: Phase;
  round: number;
  rounds: number;
  seconds: number;
  queue: string[];
  kind: Kind;
  cols: number[];
  answer: number;
  roundStart: number;
  endsAt: number;
  paused: boolean;
  left: number;
  players: Map<string, Player>;
  endReason: EndReason | null;
  startedWith: number;
  timer: unknown;
  touched: number;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PICK_GAP_MS = 120; // ignora cliques em rajada
const ROOM_TTL_MS = 4 * 3600_000;

export class Game {
  rooms = new Map<string, Room>();
  private clock: Clock;
  private rnd: () => number;
  private onChange: (room: Room) => void;

  constructor(opts: { clock?: Clock; rnd?: () => number; onChange?: (room: Room) => void } = {}) {
    this.clock = opts.clock ?? realClock;
    this.rnd = opts.rnd ?? Math.random;
    this.onChange = opts.onChange ?? (() => {});
  }

  private changed(room: Room) {
    room.touched = this.clock.now();
    this.onChange(room);
  }

  createRoom(): Room {
    let code = '';
    do code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(this.rnd() * CODE_CHARS.length)]).join('');
    while (this.rooms.has(code));
    const room: Room = {
      code, teacherToken: randomBytes(16).toString('hex'), phase: 'lobby', round: 0, rounds: MAX_ROUNDS, seconds: 60,
      queue: [], kind: 'funcao', cols: [0, 1, 2], answer: -1, roundStart: 0, endsAt: 0, paused: false, left: 0,
      players: new Map(), endReason: null, startedWith: 0, timer: null, touched: this.clock.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  room(code: unknown): Room {
    const room = typeof code === 'string' ? this.rooms.get(code.trim().toUpperCase()) : undefined;
    if (!room) throw new GameError('Sala não encontrada. Confira o código na TV.');
    return room;
  }

  teacher(code: unknown, token: unknown): Room {
    const room = this.room(code);
    if (room.teacherToken !== token) throw new GameError('Sessão do professor inválida.');
    return room;
  }

  join(code: unknown) {
    const room = this.room(code);
    if (room.players.size >= MAX_PLAYERS) throw new GameError(`A sala está cheia (${MAX_PLAYERS} alunos).`);
    const taken = new Set([...room.players.values()].map((p) => p.name));
    let name = randomName(this.rnd);
    for (let i = 0; taken.has(name) && i < 200; i++) name = randomName(this.rnd);
    if (taken.has(name)) name = `${name} ${room.players.size + 1}`;
    const colors = new Set([...room.players.values()].map((p) => p.colorIdx));
    let colorIdx = 0;
    while (colors.has(colorIdx)) colorIdx++;
    const player: Player = {
      id: randomBytes(5).toString('hex'), token: randomBytes(16).toString('hex'), name, colorIdx,
      lives: LIVES, correct: 0, choice: -1, online: true, out: null, last: null, lastPick: 0, time: 0,
    };
    room.players.set(player.id, player);
    this.changed(room);
    return { room, player };
  }

  resume(code: unknown, token: unknown) {
    const room = this.room(code);
    const player = [...room.players.values()].find((p) => p.token === token);
    if (!player) throw new GameError('Você saiu desta sala. Entre de novo com o código.');
    return { room, player };
  }

  setOnline(room: Room, playerId: string, online: boolean) {
    const p = room.players.get(playerId);
    if (p && p.online !== online) {
      p.online = online;
      this.changed(room);
    }
  }

  start(room: Room, opts: StartOptions) {
    if (room.phase !== 'lobby') throw new GameError('A partida já começou.');
    if (!room.players.size) throw new GameError('Espere pelo menos um aluno entrar.');
    const rounds = Number(opts?.rounds);
    const seconds = Number(opts?.seconds);
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) throw new GameError(`Escolha de 1 a ${MAX_ROUNDS} rodadas.`);
    if (!Number.isInteger(seconds) || seconds < 10 || seconds > 180) throw new GameError('Tempo por rodada inválido.');
    const order = Array.isArray(opts.order) ? opts.order.filter((id): id is string => typeof id === 'string').slice(0, 100) : [];
    Object.assign(room, { rounds, seconds, queue: buildQueue(order, rounds, this.rnd), round: 0, endReason: null, paused: false });
    for (const p of room.players.values()) Object.assign(p, { lives: LIVES, correct: 0, choice: -1, out: null, last: null, time: 0 });
    room.startedWith = room.players.size;
    this.nextRound(room);
  }

  private schedule(room: Room, ms: number, fn: () => void) {
    this.clock.clearTimeout(room.timer);
    room.timer = this.clock.setTimeout(fn, Math.max(0, ms));
  }

  private nextRound(room: Room) {
    room.round++;
    const item = ITEM_BY_ID[room.queue[room.round - 1]];
    room.kind = kindFor(room.round, item);
    room.cols = room.kind === 'funcao' ? shuffle([0, 1, 2], this.rnd) : [0, 1, 2];
    room.answer = -1;
    room.phase = 'question';
    room.roundStart = this.clock.now();
    room.endsAt = room.roundStart + room.seconds * 1000;
    for (const p of room.players.values()) Object.assign(p, { choice: -1, last: null });
    this.schedule(room, room.seconds * 1000, () => this.closeRound(room));
    this.changed(room);
  }

  // Fim do tempo: quem está na coluna errada (ou em nenhuma) perde uma vida.
  closeRound(room: Room) {
    if (room.phase !== 'question') return;
    const item = ITEM_BY_ID[room.queue[room.round - 1]];
    room.answer = room.kind === 'funcao' ? room.cols.indexOf(0) : IO_ORDER.indexOf(item.io!);
    for (const p of room.players.values()) {
      if (p.out !== null) continue;
      if (p.choice === room.answer) {
        p.correct++;
        p.time += p.lastPick - room.roundStart;
        p.last = 'ok';
      } else {
        p.lives--;
        p.last = p.choice === -1 ? 'none' : 'wrong';
        if (p.lives <= 0) p.out = room.round;
      }
    }
    room.phase = 'reveal';
    room.paused = false;
    room.endsAt = this.clock.now() + REVEAL_MS;
    this.schedule(room, REVEAL_MS, () => this.advance(room));
    this.changed(room);
  }

  advance(room: Room) {
    if (room.phase !== 'reveal') return;
    const alive = [...room.players.values()].filter((p) => p.out === null).length;
    if (alive === 0 || (room.startedWith > PODIUM && alive <= PODIUM)) this.finish(room, 'survivors');
    else if (room.round >= room.rounds) this.finish(room, 'rounds');
    else this.nextRound(room);
  }

  finish(room: Room, reason: EndReason) {
    if (room.phase === 'lobby' || room.phase === 'finished') throw new GameError('Não há partida em andamento.');
    this.clock.clearTimeout(room.timer);
    room.phase = 'finished';
    room.endReason = reason;
    room.paused = false;
    this.changed(room);
  }

  pick(room: Room, playerId: string, col: unknown) {
    const p = room.players.get(playerId);
    if (!p) throw new GameError('Você não está nesta sala.');
    if (room.phase !== 'question' || room.paused) throw new GameError('Agora não dá para trocar de coluna.');
    if (p.out !== null) throw new GameError('Você já perdeu as 3 vidas. Assista na TV!');
    if (col !== 0 && col !== 1 && col !== 2) throw new GameError('Coluna inválida.');
    const now = this.clock.now();
    if (p.choice === col) return false;
    if (now - p.lastPick < PICK_GAP_MS) throw new GameError('Calma! Um toque de cada vez.');
    p.choice = col;
    p.lastPick = now;
    room.touched = now; // sem onChange: a TV recebe só o evento `pick`
    return true;
  }

  setPaused(room: Room, paused: boolean) {
    if (room.phase !== 'question' && room.phase !== 'reveal') throw new GameError('Não há rodada para pausar.');
    if (room.paused === paused) return;
    const now = this.clock.now();
    if (paused) {
      room.left = Math.max(0, room.endsAt - now);
      this.clock.clearTimeout(room.timer);
    } else {
      room.endsAt = now + room.left;
      this.schedule(room, room.left, () => (room.phase === 'question' ? this.closeRound(room) : this.advance(room)));
    }
    room.paused = paused;
    this.changed(room);
  }

  skip(room: Room) {
    if (room.phase === 'question') this.closeRound(room);
    else if (room.phase === 'reveal') this.advance(room);
    else throw new GameError('Não há rodada para pular.');
  }

  restart(room: Room) {
    this.clock.clearTimeout(room.timer);
    Object.assign(room, { phase: 'lobby', round: 0, answer: -1, paused: false, endReason: null, queue: [] });
    for (const p of room.players.values()) Object.assign(p, { lives: LIVES, correct: 0, choice: -1, out: null, last: null, time: 0 });
    this.changed(room);
  }

  kick(room: Room, playerId: unknown) {
    const p = typeof playerId === 'string' ? room.players.get(playerId) : undefined;
    if (!p) throw new GameError('Aluno não encontrado.');
    room.players.delete(p.id);
    this.changed(room);
    return p;
  }

  cleanup() {
    const now = this.clock.now();
    for (const [code, room] of this.rooms)
      if (now - room.touched > ROOM_TTL_MS) {
        this.clock.clearTimeout(room.timer);
        this.rooms.delete(code);
      }
  }

  view(room: Room): PublicRoom {
    return {
      code: room.code, phase: room.phase, round: room.round, rounds: room.rounds, seconds: room.seconds,
      item: room.round ? room.queue[room.round - 1] : null, kind: room.kind, cols: room.cols, answer: room.answer,
      endsAt: room.endsAt, paused: room.paused, left: room.left, endReason: room.endReason, serverNow: this.clock.now(),
      players: [...room.players.values()].map((p) => ({
        id: p.id, name: p.name, color: colorFor(p.colorIdx), lives: p.lives, correct: p.correct,
        choice: p.choice, online: p.online, out: p.out, last: p.last, time: p.time,
      })),
    };
  }
}
