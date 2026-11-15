import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Clock } from '../server/game.ts';
import { ITEMS, ITEM_BY_ID, LIVES, REVEAL_MS, buildQueue, kindFor, rankPlayers } from '../shared/items.ts';

function fakeClock() {
  let now = 1_000_000;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let seq = 0;
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => (timers.push({ at: now + ms, fn, id: ++seq }), seq),
    clearTimeout: (id) => void (timers = timers.filter((t) => t.id !== id)),
  };
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      timers = timers.filter((t) => t !== next);
      now = next.at;
      next.fn();
    }
    now = end;
  };
  return { clock, tick };
}

function setup(n: number) {
  const { clock, tick } = fakeClock();
  const game = new Game({ clock });
  const room = game.createRoom();
  const players = Array.from({ length: n }, () => game.join(room.code).player);
  return { game, room, players, tick };
}

const right = (room: ReturnType<typeof setup>['room']) => {
  const item = ITEM_BY_ID[room.queue[room.round - 1]];
  return room.kind === 'funcao' ? room.cols.indexOf(0) : ['entrada', 'saida', 'hibrido'].indexOf(item.io!);
};

test('catálogo: 3 alternativas diferentes, sem repetir id', () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const i of ITEMS) assert.equal(new Set(i.does).size, 3, i.id);
});

test('nomes e cores não se repetem na sala', () => {
  const { players } = setup(40);
  assert.equal(new Set(players.map((p) => p.name)).size, 40);
  assert.equal(new Set(players.map((p) => p.colorIdx)).size, 40);
});

test('ordem do professor vem primeiro e as rodadas alternam função/tipo', () => {
  const q = buildQueue(['mouse', 'cooler', 'teclado'], 30);
  assert.deepEqual(q.slice(0, 3), ['mouse', 'cooler', 'teclado']);
  assert.equal(q.length, 30);
  assert.equal(kindFor(1, ITEM_BY_ID.mouse), 'funcao');
  assert.equal(kindFor(2, ITEM_BY_ID.mouse), 'tipo');
  assert.equal(kindFor(2, ITEM_BY_ID.cooler), 'funcao'); // peça interna não tem tipo
});

test('errou ou não escolheu: perde vida; 3 vidas perdidas = fora', () => {
  const { game, room, players, tick } = setup(2);
  game.start(room, { rounds: 10, seconds: 30, order: [] });
  const [a, b] = players;
  for (let r = 0; r < 3; r++) {
    game.pick(room, a.id, right(room));
    game.pick(room, b.id, (right(room) + 1) % 3);
    tick(30_000);
    assert.equal(room.phase, 'reveal');
    tick(REVEAL_MS);
  }
  assert.equal(a.correct, 3);
  assert.equal(a.lives, LIVES);
  assert.equal(b.lives, 0);
  assert.equal(b.out, 3);
  assert.throws(() => game.pick(room, b.id, 0), /3 vidas/);
});

test('pode trocar de coluna até o tempo acabar, vale a última', () => {
  const { game, room, players, tick } = setup(1);
  game.start(room, { rounds: 5, seconds: 30, order: [] });
  const p = players[0];
  game.pick(room, p.id, (right(room) + 1) % 3);
  tick(1000);
  game.pick(room, p.id, right(room));
  tick(29_000);
  assert.equal(p.last, 'ok');
  assert.equal(p.time, 1000); // desempate conta até a escolha final
});

test('acaba quando sobram 5 (se começou com mais de 5)', () => {
  const { game, room, players, tick } = setup(8);
  game.start(room, { rounds: 30, seconds: 30, order: [] });
  const losers = players.slice(0, 3);
  for (let r = 0; r < 3; r++) {
    for (const p of players.slice(3)) game.pick(room, p.id, right(room));
    for (const p of losers) game.pick(room, p.id, (right(room) + 1) % 3);
    tick(30_000 + REVEAL_MS);
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.endReason, 'survivors');
  const top = rankPlayers(players);
  assert.ok(top.slice(0, 5).every((p) => p.out === null));
});

test('acaba na última rodada', () => {
  const { game, room, players, tick } = setup(2);
  game.start(room, { rounds: 2, seconds: 30, order: [] });
  for (let r = 0; r < 2; r++) {
    for (const p of players) game.pick(room, p.id, right(room));
    tick(30_000 + REVEAL_MS);
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.endReason, 'rounds');
});

test('pausa congela o tempo', () => {
  const { game, room, tick } = setup(1);
  game.start(room, { rounds: 5, seconds: 30, order: [] });
  tick(10_000);
  game.setPaused(room, true);
  tick(60_000);
  assert.equal(room.phase, 'question');
  game.setPaused(room, false);
  tick(19_999);
  assert.equal(room.phase, 'question');
  tick(1);
  assert.equal(room.phase, 'reveal');
});

test('classificação: acertos, vidas, quem durou mais, quem decidiu mais rápido; empate divide lugar', () => {
  const r = rankPlayers([
    { name: 'A', correct: 5, lives: 1, out: null, time: 0 },
    { name: 'B', correct: 5, lives: 3, out: null, time: 9000 },
    { name: 'F', correct: 5, lives: 3, out: null, time: 4000 },
    { name: 'C', correct: 2, lives: 0, out: 6, time: 0 },
    { name: 'D', correct: 2, lives: 0, out: 4, time: 100 },
    { name: 'E', correct: 2, lives: 0, out: 4, time: 100 },
  ]);
  assert.deepEqual(r.map((p) => `${p.place}${p.name}`), ['1F', '2B', '3A', '4C', '5D', '5E']);
});
