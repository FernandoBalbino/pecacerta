// Peças visuais reaproveitadas pelas telas da TV e do aluno.
import { useEffect, useState, type CSSProperties } from 'react';
import { ITEM_BY_ID, IO_LABEL, IO_ORDER, IO_WHY, LIVES, colorFor, randomName, shuffle, type Io } from '../../shared/items.ts';
import type { PublicRoom } from '../../shared/protocol.ts';

export const BASE = import.meta.env.BASE_URL;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const LETTERS = ['A', 'B', 'C'];

export type Mood = 'happy' | 'sad' | 'out';

// Bichinho redondo: a cor diferencia cada aluno.
export function Avatar({ color, size = 64, mood = 'happy' }: { color: string; size?: number; mood?: Mood }) {
  const ink = '#1a1530';
  return (
    <svg className={`avatar mood-${mood}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="60" rx="17" ry="3" fill="#000" opacity=".25" />
      <path d="M32 5c15.5 0 26 11 26 27 0 16-11 27-26 27S6 48 6 32C6 16 16.5 5 32 5z" fill={mood === 'out' ? '#5b5f78' : color} />
      <path d="M32 5c15.5 0 26 11 26 27 0 16-11 27-26 27S6 48 6 32C6 16 16.5 5 32 5z" fill="url(#av-shade)" />
      <ellipse cx="22" cy="15" rx="7" ry="4" fill="#fff" opacity=".35" transform="rotate(-25 22 15)" />
      {mood === 'out' ? (
        <g stroke={ink} strokeWidth="3" strokeLinecap="round">
          <path d="M19 24l8 8M27 24l-8 8M37 24l8 8M45 24l-8 8" />
        </g>
      ) : (
        <g>
          <circle cx="23" cy="28" r="7" fill="#fff" />
          <circle cx="41" cy="28" r="7" fill="#fff" />
          <circle cx="24.5" cy="29.5" r="3.4" fill={ink} />
          <circle cx="42.5" cy="29.5" r="3.4" fill={ink} />
        </g>
      )}
      <path
        d={mood === 'happy' ? 'M24 41q8 7 16 0' : 'M25 45q7-6 14 0'}
        stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id="av-shade" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".25" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function ItemImg({ id, thumb, className = '' }: { id: string; thumb?: boolean; className?: string }) {
  return (
    <img
      className={`item-img ${className}`}
      src={`${BASE}items/${thumb ? 'thumb/' : ''}${id}.webp`}
      alt={ITEM_BY_ID[id]?.name ?? ''}
      draggable={false}
      decoding="async"
    />
  );
}

// `lost`: o coração que acabou de ser perdido aparece cheio e quebra na animação.
export function Hearts({ lives, lost, className = '' }: { lives: number; lost?: boolean; className?: string }) {
  return (
    <span className={`hearts ${className}`} aria-label={`${lives} de ${LIVES} vidas`}>
      {Array.from({ length: LIVES }, (_, i) =>
        i === lives && lost
          ? <span key={i} className="h-lost">❤</span>
          : <span key={i} className={i < lives ? 'h-on' : 'h-off'}>{i < lives ? '❤' : '♡'}</span>)}
    </span>
  );
}

// Ordem própria de cada aluno (fixa na rodada): quem olha a tela do vizinho não descobre a coluna.
export function studentOrder(playerId: string, round: number) {
  let h = 2166136261;
  for (const ch of `${playerId}:${round}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  return shuffle([0, 1, 2], rnd);
}

// Setas: entrada aponta para o PC, saída sai dele, híbrido vai e volta.
export function IoIcon({ io }: { io: Io }) {
  const box = <rect x="13" y="5" width="14" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />;
  return (
    <svg className="io-icon" viewBox="0 0 32 22" aria-hidden="true">
      {box}
      <path d="M17 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {io !== 'saida' && <path d="M1 8h9m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />}
      {io !== 'entrada' && <path d="M10 14H1m3-3-3 3 3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

// Texto de cada coluna na rodada atual.
export function columns(room: PublicRoom) {
  const item = ITEM_BY_ID[room.item ?? ''];
  if (!item) return [];
  return room.kind === 'tipo'
    ? IO_ORDER.map((io) => ({ title: IO_LABEL[io].title, hint: IO_LABEL[io].hint, io }))
    : room.cols.map((k) => ({ title: item.does[k], hint: '', io: null as Io | null }));
}

// Explicação mostrada depois do tempo (TV e aluno).
export const whyText = (room: PublicRoom) => {
  const item = ITEM_BY_ID[room.item ?? ''];
  return room.kind === 'tipo' ? IO_WHY[item.io!] : item.why;
};

export const questionText = (room: PublicRoom) =>
  room.kind === 'tipo' ? 'É de entrada, saída ou híbrido?' : 'Para que serve?';

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? 'logo-sm' : ''}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="32" height="32" rx="9" fill="url(#lg)" />
        <rect x="12" y="12" width="16" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2.6" />
        <path d="M16 4v6M24 4v6M16 30v6M24 30v6M4 16h6M4 24h6M30 16h6M30 24h6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M16.5 20.5l2.5 2.5 5-6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Peça <b>Certa</b>
    </span>
  );
}

// "Gerando nome aleatório…": nomes passam rápido e vão freando até parar no nome sorteado pelo servidor.
export function NameRoller({ name, steps = 22, onDone }: { name: string; steps?: number; onDone?: () => void }) {
  const [shown, setShown] = useState(() => randomName());
  const [k, setK] = useState(0);
  const done = shown === name && k >= steps;
  useEffect(() => {
    if (reducedMotion()) {
      setShown(name);
      setK(steps);
      return;
    }
    let step = 0;
    let t: ReturnType<typeof setTimeout>;
    const run = () => {
      step++;
      setK(step);
      if (step >= steps) return setShown(name);
      setShown(randomName());
      t = setTimeout(run, 45 + (step / steps) ** 3 * 380);
    };
    t = setTimeout(run, 60);
    return () => clearTimeout(t);
  }, [name, steps]);
  useEffect(() => {
    if (done) onDone?.();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className={`roller ${done ? 'roller-done' : ''}`} style={{ '--rc': colorFor(k) } as CSSProperties}>
      <span key={shown + k} className="roll-word">{shown}</span>
    </span>
  );
}
