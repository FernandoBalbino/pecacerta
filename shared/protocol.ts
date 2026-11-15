// Mensagens entre navegador e servidor. Pequenas de propósito: a banda do Render é limitada.
import type { Kind } from './items.ts';

export type Phase = 'lobby' | 'question' | 'reveal' | 'finished';
export type EndReason = 'rounds' | 'survivors' | 'teacher';

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  lives: number;
  correct: number;
  choice: number; // coluna 0..2; -1 = ainda decidindo
  online: boolean;
  out: number | null; // rodada em que perdeu a última vida
  last: 'ok' | 'wrong' | 'none' | null; // resultado da última rodada
  time: number; // ms somados até a escolha final nas rodadas certas (desempate)
}

export interface PublicRoom {
  code: string;
  phase: Phase;
  round: number;
  rounds: number;
  seconds: number;
  item: string | null;
  kind: Kind;
  cols: number[]; // função: índice de `does` em cada coluna; tipo: [0, 1, 2] = IO_ORDER
  answer: number; // coluna certa; -1 até a revelação
  endsAt: number; // fim da rodada ou da revelação, no relógio do servidor
  paused: boolean;
  left: number; // ms que faltavam quando pausou
  players: PublicPlayer[];
  endReason: EndReason | null;
  serverNow: number;
}

export interface StartOptions {
  rounds: number;
  seconds: number;
  order: string[];
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Cb<T = object> = (res: Ack<T>) => void;

export type TeacherAction = 'pause' | 'resume' | 'skip' | 'next' | 'end' | 'restart' | 'kick';

export interface ClientEvents {
  'teacher:create': (p: null, ack: Cb<{ code: string; token: string }>) => void;
  'teacher:resume': (p: { code: string; token: string }, ack: Cb) => void;
  'teacher:start': (p: StartOptions, ack: Cb) => void;
  'teacher:action': (p: { action: TeacherAction; playerId?: string }, ack: Cb) => void;
  'player:join': (p: { code: string }, ack: Cb<{ playerId: string; token: string }>) => void;
  'player:resume': (p: { code: string; token: string }, ack: Cb<{ playerId: string }>) => void;
  'player:pick': (p: { col: number }, ack: Cb) => void;
}

export interface ServerEvents {
  state: (room: PublicRoom) => void;
  pick: (p: { id: string; col: number }) => void; // só para a TV
  kicked: () => void;
}
