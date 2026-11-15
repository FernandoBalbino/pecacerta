// Tela do professor, feita para a TV: sala de espera, rodadas e pódio.
import confetti from 'canvas-confetti';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  IO_LABEL, ITEMS, ITEM_BY_ID, PODIUM, REVEAL_MS, ROUND_OPTIONS, SECONDS_OPTIONS,
  kindFor, rankPlayers, shuffle,
} from '../../shared/items.ts';
import type { PublicPlayer, PublicRoom, TeacherAction } from '../../shared/protocol.ts';
import { send, useRemaining } from './net.ts';
import { play, toggleMuted, useMuted } from './sound.ts';
import Stage from './Stage.tsx';
import { Avatar, BASE, Hearts, ItemImg, Logo, NameRoller, questionText, reducedMotion, whyText } from './ui.tsx';

const act = (action: TeacherAction, playerId?: string) => send('teacher:action', { action, playerId });

export default function Host({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  if (room.phase === 'lobby') return <Lobby room={room} onExit={onExit} />;
  if (room.phase === 'finished') return <Final room={room} onExit={onExit} />;
  return <Game room={room} />;
}

function MuteBtn() {
  const muted = useMuted();
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggleMuted} aria-label={muted ? 'Ligar som' : 'Desligar som'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

// ---------- configuração (fica salva no navegador do professor) ----------
interface Config { rounds: number; seconds: number; order: string[] }
const CFG_KEY = 'pecacerta:config';
function loadConfig(): Config {
  const def: Config = { rounds: 30, seconds: 60, order: [] };
  try {
    const c = { ...def, ...JSON.parse(localStorage.getItem(CFG_KEY) ?? '{}') };
    return { ...c, order: c.order.filter((id: string) => ITEM_BY_ID[id]) };
  } catch {
    return def;
  }
}
function useConfig() {
  const [cfg, setCfg] = useState(loadConfig);
  useEffect(() => {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    } catch { /* sem storage */ }
  }, [cfg]);
  return [cfg, setCfg] as const;
}

const joinUrl = () => `${location.host}${BASE}`.replace(/\/$/, '');

function Lobby({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  const [cfg, setCfg] = useConfig();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const n = room.players.length;
  const minutes = Math.round((cfg.rounds * (cfg.seconds + REVEAL_MS / 1000)) / 60);
  const chosen = Math.min(cfg.order.length, cfg.rounds);
  const start = async () => {
    setBusy(true);
    const res = await send('teacher:start', cfg);
    setBusy(false);
    setError(res.ok ? '' : res.error);
  };
  return (
    <main className="lobby">
      <header className="tv-bar">
        <Logo small />
        <span className="spacer" />
        <MuteBtn />
        <button className="btn btn-sm btn-ghost" onClick={onExit}>Sair</button>
      </header>
      <section className="lobby-main">
        <p className="join-hint">Entre em <b>{joinUrl()}</b> e digite o código:</p>
        <div className="code-tiles" aria-label={`Código da sala: ${room.code}`}>
          {room.code.split('').map((c, i) => <span key={i} style={{ '--i': i } as CSSProperties}>{c}</span>)}
        </div>
        <h2 className="lobby-count">{n ? `${n} ${n === 1 ? 'aluno' : 'alunos'} na sala` : 'Esperando os alunos…'}</h2>
        <div className="lobby-players">
          {room.players.map((p) => <LobbyPlayer key={p.id} p={p} />)}
        </div>
      </section>
      <aside className="panel lobby-panel">
        <h2>Partida</h2>
        <div className="field">
          <span>Duração (rodadas)</span>
          <div className="seg">
            {ROUND_OPTIONS.map((r) => (
              <button key={r} className={cfg.rounds === r ? 'on' : ''} onClick={() => setCfg({ ...cfg, rounds: r })}>{r}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Tempo por rodada</span>
          <div className="seg">
            {SECONDS_OPTIONS.map((s) => (
              <button key={s} className={cfg.seconds === s ? 'on' : ''} onClick={() => setCfg({ ...cfg, seconds: s })}>{s} s</button>
            ))}
          </div>
        </div>
        <p className="muted small">
          ≈ {minutes} min no máximo. Acaba antes se sobrarem só {PODIUM} jogadores (o pódio é de {PODIUM}).
        </p>
        <div className="field">
          <span>Ordem das peças</span>
          <button className="order-strip" onClick={() => setPicking(true)} aria-label="Escolher a ordem das peças">
            {cfg.order.slice(0, cfg.rounds).map((id, i) => (
              <span key={id} className="order-mini"><b>{i + 1}</b><ItemImg id={id} thumb /></span>
            ))}
            {!chosen && <span className="muted">Nenhuma escolhida: tudo sorteado</span>}
          </button>
          <p className="muted small">
            {chosen ? `${chosen} na ordem escolhida` : ''}
            {cfg.rounds > chosen ? `${chosen ? ' · ' : ''}${cfg.rounds - chosen} sorteadas depois` : ''}
          </p>
          <button className="btn btn-sm" onClick={() => setPicking(true)}>Escolher ordem das peças</button>
        </div>
        <button className="btn btn-primary btn-xl" disabled={!n || busy} onClick={start}>Começar partida ▶</button>
        {error && <p className="error" role="alert">{error}</p>}
      </aside>
      {picking && <OrderPicker cfg={cfg} setOrder={(order) => setCfg({ ...cfg, order })} onClose={() => setPicking(false)} />}
    </main>
  );
}

function LobbyPlayer({ p }: { p: PublicPlayer }) {
  return (
    <div className={`lobby-player ${p.online ? '' : 'off'}`} style={{ '--c': p.color } as CSSProperties}>
      <Avatar color={p.color} size={46} />
      <NameRoller name={p.name} steps={10} />
      <button className="kick" onClick={() => act('kick', p.id)} aria-label={`Remover ${p.name}`} title="Remover">✕</button>
    </div>
  );
}

// Clique na imagem: ganha o próximo número. Clique de novo: sai da fila e as outras se reorganizam.
function OrderPicker({ cfg, setOrder, onClose }: { cfg: Config; setOrder: (o: string[]) => void; onClose: () => void }) {
  const toggle = (id: string) =>
    setOrder(cfg.order.includes(id) ? cfg.order.filter((x) => x !== id) : [...cfg.order, id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Ordem das peças">
      <div className="picker">
        <header className="picker-head">
          <div>
            <h2>Ordem das peças</h2>
            <p className="muted">
              Clique na peça da 1ª rodada, depois na da 2ª, e assim por diante. Rodada ímpar pergunta a <b>função</b>;
              rodada par pergunta se é de <b>entrada, saída ou híbrido</b> (peça interna sempre cai em função).
            </p>
          </div>
          <div className="picker-actions">
            <button className="btn btn-sm" onClick={() => setOrder(shuffle(ITEMS.map((i) => i.id)))}>🎲 Sortear tudo</button>
            <button className="btn btn-sm" onClick={() => setOrder([])}>Limpar</button>
            <button className="btn btn-sm btn-primary" onClick={onClose}>Pronto</button>
          </div>
        </header>
        <div className="picker-grid">
          {ITEMS.map((item) => {
            const pos = cfg.order.indexOf(item.id) + 1;
            const late = pos > cfg.rounds;
            return (
              <button
                key={item.id} className={`pick-card ${pos ? 'chosen' : ''} ${late ? 'late' : ''}`}
                onClick={() => toggle(item.id)} aria-pressed={pos > 0}
                aria-label={`${item.name}${pos ? `, rodada ${pos}` : ''}`}
              >
                {pos > 0 && (
                  <span className="pick-num" key={pos}>
                    {pos}
                    <small>{late ? 'não entra' : kindFor(pos, item) === 'tipo' ? 'tipo' : 'função'}</small>
                  </span>
                )}
                <ItemImg id={item.id} thumb />
                <strong>{item.name}</strong>
                <span className={`io-tag io-${item.io ?? 'interna'}`}>{item.io ? IO_LABEL[item.io].title : 'Peça interna'}</span>
              </button>
            );
          })}
        </div>
        <p className="muted small">
          {cfg.order.length} de {ITEMS.length} escolhidas. As que ficarem sem número entram depois, sorteadas.
          {cfg.order.length > cfg.rounds && ` Só as ${cfg.rounds} primeiras cabem nas ${cfg.rounds} rodadas.`}
        </p>
      </div>
    </div>
  );
}

// ---------- rodada ----------
function Game({ room }: { room: PublicRoom }) {
  const remaining = useRemaining(room, 200);
  const item = ITEM_BY_ID[room.item ?? ''];
  const secs = Math.ceil(remaining / 1000);
  const question = room.phase === 'question';
  const alive = room.players.filter((p) => p.out === null).length;

  useEffect(() => {
    if (question) play('item', 0.6);
  }, [room.round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (question && !room.paused && secs > 0 && secs <= 5) play('contagem', 0.7);
  }, [secs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Espaço pausa; seta para a direita pula o tempo ou vai para a próxima.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') (e.preventDefault(), act(room.paused ? 'resume' : 'pause'));
      if (e.key === 'ArrowRight') act('skip');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [room.paused]);

  if (!item) return null;
  const total = question ? room.seconds * 1000 : REVEAL_MS;
  return (
    <main className={`tv phase-${room.phase} ${room.paused ? 'paused' : ''}`}>
      <header className="tv-bar">
        <Logo small />
        <span className="pill">Sala <b>{room.code}</b></span>
        <span className="pill">🎮 {alive} no jogo</span>
        {room.players.length > alive && <span className="pill">👻 {room.players.length - alive} fora</span>}
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => act(room.paused ? 'resume' : 'pause')}>
          {room.paused ? '▶ Continuar' : '⏸ Pausar'}
        </button>
        <button className="btn btn-sm" onClick={() => act('skip')}>{question ? '⏭ Encerrar tempo' : '⏭ Próxima'}</button>
        <button className="btn btn-sm btn-danger" onClick={() => confirm('Encerrar a partida agora e ir para o pódio?') && act('end')}>
          Encerrar
        </button>
        <MuteBtn />
      </header>
      <section className="hero" key={room.round}>
        <div className="hero-img"><ItemImg id={item.id} /></div>
        <div className="hero-text">
          <p className="kicker">
            Rodada {room.round} de {room.rounds} · <span className={`kind kind-${room.kind}`}>{room.kind === 'tipo' ? 'Tipo da peça' : 'Função da peça'}</span>
          </p>
          <h1>{item.name}</h1>
          <p className="question">{questionText(room)}</p>
          {room.phase === 'reveal' && <p className="why">💡 {whyText(room)}</p>}
        </div>
        <TimerRing remaining={remaining} total={total} label={question ? 'segundos' : 'próxima'} urgent={question && secs <= 5} />
      </section>
      <Stage room={room} />
      {room.paused && <div className="paused-badge">⏸ Pausado</div>}
    </main>
  );
}

function TimerRing({ remaining, total, label, urgent }: { remaining: number; total: number; label: string; urgent: boolean }) {
  const C = 2 * Math.PI * 44;
  return (
    <div className={`ring ${urgent ? 'urgent' : ''}`} role="timer" aria-label={`${Math.ceil(remaining / 1000)} ${label}`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" className="ring-bg" />
        <circle cx="50" cy="50" r="44" className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - remaining / total)} />
      </svg>
      <span className="ring-num" key={urgent ? Math.ceil(remaining / 1000) : 0}>{Math.ceil(remaining / 1000)}</span>
      <small>{label}</small>
    </div>
  );
}

// ---------- pódio ----------
const PODIUM_ORDER = [3, 1, 0, 2, 4]; // 4º, 2º, 1º, 3º, 5º da esquerda para a direita

function Final({ room, onExit }: { room: PublicRoom; onExit: () => void }) {
  const ranked = rankPlayers(room.players);
  const top = ranked.slice(0, PODIUM);
  const alive = room.players.filter((p) => p.out === null).length;
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || reducedMotion()) return;
    fired.current = true;
    const end = Date.now() + 2500;
    const burst = () => {
      confetti({ particleCount: 40, spread: 70, origin: { x: Math.random(), y: 0.2 }, disableForReducedMotion: true });
      if (Date.now() < end) setTimeout(burst, 300);
    };
    burst();
  }, []);
  const reason =
    room.endReason === 'rounds' ? `Fim das ${room.rounds} rodadas!`
      : room.endReason === 'teacher' ? 'Partida encerrada pelo professor.'
        : alive ? `Sobraram os ${alive} últimos!` : 'Todo mundo perdeu as 3 vidas!';
  return (
    <main className="final">
      <header className="tv-bar">
        <Logo small />
        <span className="pill">Sala <b>{room.code}</b></span>
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => act('restart')}>↻ Jogar de novo com a mesma turma</button>
        <button className="btn btn-sm btn-ghost" onClick={onExit}>Sair</button>
      </header>
      <section className="podium-wrap">
        <p className="kicker">{reason}</p>
        <h1>Pódio</h1>
        <div className="podium">
          {PODIUM_ORDER.map((i) => top[i] && (
            <div key={top[i].id} className={`step step-${i + 1}`} style={{ '--c': top[i].color, '--d': `${(4 - i) * 0.25}s` } as CSSProperties}>
              {i === 0 && <span className="crown" aria-hidden="true">👑</span>}
              <Avatar color={top[i].color} size={i === 0 ? 110 : 84} mood={top[i].out === null ? 'happy' : 'sad'} />
              <strong className="step-name">{top[i].name}</strong>
              <span className="step-score">{top[i].correct} acertos</span>
              <div className="step-block"><span>{top[i].place}º</span></div>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel ranking">
        <h2>Classificação</h2>
        <p className="muted small">Mais acertos na frente. Empate: quem decidiu mais rápido nas que acertou.</p>
        <ol>
          {ranked.map((p) => (
            <li key={p.id} style={{ '--c': p.color } as CSSProperties}>
              <span className="r-place">{p.place}º</span>
              <Avatar color={p.color} size={30} mood={p.out === null ? 'happy' : 'out'} />
              <span className="r-name">{p.name}</span>
              <span className="r-score"><b>{p.correct}</b> acertos</span>
              {p.out === null ? <Hearts lives={p.lives} /> : <span className="r-out">saiu na {p.out}ª</span>}
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
