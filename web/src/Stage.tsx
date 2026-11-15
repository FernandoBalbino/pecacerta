// Palco da TV: três colunas, banco de quem ainda decide e área de eliminados.
// Todos os avatares vivem numa única camada por cima e andam com `transform` (leve no Chromebook).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { PublicPlayer, PublicRoom } from '../../shared/protocol.ts';
import { Avatar, Hearts, IoIcon, LETTERS, columns, reducedMotion, type Mood } from './ui.tsx';

type Zone = 'c0' | 'c1' | 'c2' | 'bench' | 'ghost';
type Rect = { x: number; y: number; w: number; h: number };
const ZONES: Zone[] = ['c0', 'c1', 'c2', 'bench', 'ghost'];
const AV_W = 100; // largura do avatar sem escala (px)
const MAX_CELL: Record<Zone, number> = { c0: 104, c1: 104, c2: 104, bench: 88, ghost: 44 };

// Maior célula em que todos cabem na área.
function grid(r: Rect, n: number, max: number, ratio: number) {
  let s = max;
  while (s > 34 && Math.ceil(n / Math.max(1, Math.floor(r.w / s))) * s * ratio > r.h) s -= 2;
  const cols = Math.max(1, Math.floor(r.w / s));
  const left = r.x + (r.w - Math.min(n, cols) * s) / 2;
  return (i: number) => ({ x: left + (i % cols) * s, y: r.y + Math.floor(i / cols) * s * ratio, scale: s / AV_W });
}

export default function Stage({ room }: { room: PublicRoom }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const zoneEls = useRef<Partial<Record<Zone, HTMLDivElement | null>>>({});
  const [rects, setRects] = useState<Partial<Record<Zone, Rect>>>({});
  const arrival = useRef(new Map<string, { zone: Zone; n: number }>());
  const counter = useRef(0);

  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const next: Partial<Record<Zone, Rect>> = {};
      for (const z of ZONES) {
        const b = zoneEls.current[z]?.getBoundingClientRect();
        if (b) next[z] = { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height };
      }
      setRects(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    for (const z of ZONES) if (zoneEls.current[z]) ro.observe(zoneEls.current[z]!); // cabeçalho que quebra linha encolhe a área
    return () => ro.disconnect();
  }, []);

  const reveal = room.phase === 'reveal';
  // As carinhas só mudam depois do "Tempo esgotado!", junto com o ✓/✕.
  const [late, setLate] = useState(false);
  useEffect(() => {
    setLate(false);
    if (!reveal) return;
    const t = setTimeout(() => setLate(true), reducedMotion() ? 0 : 1300);
    return () => clearTimeout(t);
  }, [reveal, room.round]);
  // Quem perdeu a última vida nesta rodada ainda aparece na coluna para ver o 💔.
  const zoneOf = (p: PublicPlayer): Zone =>
    p.out !== null && !(reveal && p.out === room.round) ? 'ghost' : p.choice >= 0 ? (`c${p.choice}` as Zone) : 'bench';

  // Quem chega numa área entra no fim da fila dela; os outros não trocam de lugar.
  const groups: Record<Zone, PublicPlayer[]> = { c0: [], c1: [], c2: [], bench: [], ghost: [] };
  for (const p of room.players) {
    const z = zoneOf(p);
    if (arrival.current.get(p.id)?.zone !== z) arrival.current.set(p.id, { zone: z, n: ++counter.current });
    groups[z].push(p);
  }
  const place = new Map<string, { x: number; y: number; scale: number }>();
  for (const z of ZONES) {
    const r = rects[z];
    if (!r) continue;
    const list = groups[z].sort((a, b) => arrival.current.get(a.id)!.n - arrival.current.get(b.id)!.n);
    const at = grid(r, list.length, MAX_CELL[z], z === 'ghost' ? 1 : 1.3);
    list.forEach((p, i) => place.set(p.id, at(i)));
  }

  const cols = columns(room);
  return (
    <div className="stage" ref={stageRef}>
      <div className="stage-cols">
        {cols.map((c, i) => (
          <div
            key={i}
            className={`col col-${i} ${reveal ? (i === room.answer ? 'col-right' : 'col-wrong') : ''}`}
            style={{ '--d': `${i * 0.08}s` } as CSSProperties}
          >
            <header className="col-head" key={room.round}>
              <span className="col-letter">{LETTERS[i]}</span>
              <div className="col-text">
                <strong>{c.io && <IoIcon io={c.io} />}{c.title}</strong>
                {c.hint && <small>{c.hint}</small>}
              </div>
              <span className="col-count">{groups[`c${i}` as Zone].length}</span>
            </header>
            <div className="zone" ref={(el) => void (zoneEls.current[`c${i}` as Zone] = el)} />
            {reveal && i === room.answer && <span className="col-stamp">✓ CERTA</span>}
          </div>
        ))}
      </div>
      <div className="stage-bottom">
        <div className="bench">
          <span className="zone-label">{reveal ? '⌛ Não escolheram' : '⏳ Ainda decidindo'} · {groups.bench.length}</span>
          <div className="zone" ref={(el) => void (zoneEls.current.bench = el)} />
        </div>
        <div className="ghosts">
          <span className="zone-label">👻 Fora do jogo · {groups.ghost.length}</span>
          <div className="zone" ref={(el) => void (zoneEls.current.ghost = el)} />
        </div>
      </div>
      {reveal && <div className="time-up" key={room.round} aria-hidden="true">⏰ Tempo esgotado!</div>}
      <div className="av-layer" aria-hidden="true">
        {room.players.map((p) => {
          const pos = place.get(p.id);
          if (!pos) return null;
          const zone = zoneOf(p);
          const fx = !reveal || zone === 'ghost' ? '' : p.last === 'ok' ? 'fx-ok' : p.out === room.round ? 'fx-out' : 'fx-bad';
          const bad = fx === 'fx-bad' || fx === 'fx-out';
          const mood: Mood = zone === 'ghost' ? 'out' : !late ? 'happy' : fx === 'fx-out' ? 'out' : bad ? 'sad' : 'happy';
          return (
            <div
              key={p.id}
              className={`av ${zone === 'ghost' ? 'av-ghost' : ''} ${p.online ? '' : 'av-off'}`}
              style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.scale})` }}
            >
              <div className={`av-in ${fx}`}>
                <div className="av-body">
                  <Avatar color={p.color} size={64} mood={mood} />
                  {fx === 'fx-ok' && <span className="av-badge ok">✓</span>}
                  {bad && <span className="av-badge bad">✕</span>}
                </div>
                <span className="av-name">{p.name}</span>
                <Hearts lives={p.lives} lost={bad} className="av-hearts" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
