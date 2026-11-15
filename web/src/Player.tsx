// Tela do aluno (Chromebook ou celular): sorteio do nome, escolha da coluna e resultado.
import confetti from 'canvas-confetti';
import { useEffect, useState, type CSSProperties } from 'react';
import { ITEM_BY_ID, PODIUM, rankPlayers } from '../../shared/items.ts';
import type { PublicPlayer, PublicRoom } from '../../shared/protocol.ts';
import { send, setMyChoice, useRemaining } from './net.ts';
import { Avatar, Hearts, IoIcon, ItemImg, NameRoller, columns, questionText, reducedMotion, studentOrder, whyText } from './ui.tsx';

export default function Player({ room, playerId, justJoined, onExit }: {
  room: PublicRoom;
  playerId: string;
  justJoined: boolean;
  onExit: () => void;
}) {
  const me = room.players.find((p) => p.id === playerId);
  const [intro, setIntro] = useState(justJoined);
  if (!me) return <main className="center-screen"><div className="spinner" /></main>;
  if (intro) return <Intro me={me} onDone={() => setIntro(false)} />;

  const out = me.out !== null;
  return (
    <main className="player" style={{ '--c': me.color } as CSSProperties}>
      <header className="p-bar">
        <Avatar color={me.color} size={40} mood={out ? 'out' : 'happy'} />
        <div className="p-who">
          <strong>{me.name}</strong>
          <small>Sala {room.code}</small>
        </div>
        <Hearts lives={me.lives} lost={room.phase === 'reveal' && (me.last === 'wrong' || me.last === 'none')} className="p-hearts" />
      </header>
      {room.phase === 'lobby' && <Waiting me={me} onExit={onExit} />}
      {room.phase === 'question' && <Choose room={room} me={me} />}
      {room.phase === 'reveal' && <Result room={room} me={me} />}
      {room.phase === 'finished' && <PlayerFinal room={room} me={me} onExit={onExit} />}
    </main>
  );
}

// Animação de entrada: "Gerando nome aleatório…" até parar no nome sorteado.
function Intro({ me, onDone }: { me: PublicPlayer; onDone: () => void }) {
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!landed) return;
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.45 }, colors: [me.color, '#ffffff', '#22d3ee'], disableForReducedMotion: true });
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [landed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className={`intro ${landed ? 'landed' : ''}`} style={{ '--c': me.color } as CSSProperties}>
      <p className="intro-label">{landed ? 'Seu nome no jogo é' : 'Gerando nome aleatório'}<span className="dots" /></p>
      <div className="intro-avatar">
        {landed ? <Avatar color={me.color} size={140} /> : <span className="mystery">?</span>}
      </div>
      <div className="slot"><NameRoller name={me.name} onDone={() => setLanded(true)} /></div>
      <button className="btn btn-primary btn-xl intro-go" onClick={onDone} disabled={!landed}>Bora jogar!</button>
    </main>
  );
}

function Waiting({ me, onExit }: { me: PublicPlayer; onExit: () => void }) {
  return (
    <section className="p-center">
      <div className="float"><Avatar color={me.color} size={120} /></div>
      <h1>Você está na sala!</h1>
      <p className="muted">Olhe para a TV. Quando a rodada começar, toque na coluna que você acha certa. Dá para trocar até o tempo acabar.</p>
      <button className="btn btn-ghost btn-sm" onClick={onExit}>Sair da sala</button>
    </section>
  );
}

function Choose({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  const remaining = useRemaining(room, 200);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const item = ITEM_BY_ID[room.item ?? ''];
  const watching = me.out !== null;
  const pick = async (col: number) => {
    if (busy || watching || room.paused || col === me.choice) return;
    const prev = me.choice;
    setMyChoice(me.id, col);
    setBusy(true);
    const res = await send('player:pick', { col });
    setBusy(false);
    if (!res.ok) {
      setMyChoice(me.id, prev);
      setMsg(res.error);
    } else setMsg('');
  };
  return (
    <section className="p-question" key={room.round}>
      <div className="p-timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${remaining / (room.seconds * 1000)})` }} className={remaining < 5500 ? 'urgent' : ''} />
      </div>
      <div className="p-qhead">
        <ItemImg id={item.id} thumb />
        <div>
          <small className="muted">Rodada {room.round} de {room.rounds} · {Math.ceil(remaining / 1000)} s</small>
          <h2>{item.name}</h2>
          <p className="p-ask">{questionText(room)}</p>
        </div>
      </div>
      {watching && <p className="banner">👻 Você está assistindo. Tente acertar de cabeça!</p>}
      {room.paused && <p className="banner">⏸ O professor pausou</p>}
      <div className="p-options">
        {studentOrder(me.id, room.round).map((i) => [i, columns(room)[i]] as const).map(([i, c]) => (
          <button
            key={i}
            className={`p-opt ${me.choice === i ? 'chosen' : ''}`}
            onClick={() => pick(i)}
            disabled={watching}
            aria-pressed={me.choice === i}
          >
            <span className="opt-dot" aria-hidden="true" />
            <span className="opt-text">
              <strong>{c.io && <IoIcon io={c.io} />}{c.title}</strong>
              {c.hint && <small>{c.hint}</small>}
            </span>
            {me.choice === i && <span className="opt-here">✓ Você está aqui</span>}
          </button>
        ))}
      </div>
      {!watching && (
        <p className="p-hint muted">{me.choice < 0 ? 'Toque numa coluna. Sem escolha = perde vida!' : 'Pode trocar até o tempo acabar.'}</p>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </section>
  );
}

function Result({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  // Suspense igual ao da TV: primeiro "Tempo esgotado!", depois o resultado.
  const [show, setShow] = useState(reducedMotion);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const right = columns(room)[room.answer];
  const watching = me.out !== null && me.out < room.round;
  const status = watching ? 'watch' : me.last === 'ok' ? 'ok' : me.out === room.round ? 'dead' : 'bad';
  const title = {
    ok: 'Acertou! ✓',
    bad: me.last === 'none' ? 'Não escolheu a tempo! −1 ❤' : 'Errou! −1 ❤',
    dead: 'Suas vidas acabaram 👻',
    watch: 'Resposta da rodada',
  }[status];
  if (!show) return <section className="p-result"><h1 className="p-timeup">⏰ Tempo esgotado!</h1></section>;
  return (
    <section className={`p-result r-${status}`}>
      <div className="r-badge">
        <Avatar color={me.color} size={110} mood={status === 'ok' || status === 'watch' ? 'happy' : status === 'dead' ? 'out' : 'sad'} />
        {status === 'ok' && <span className="av-badge ok">✓</span>}
        {(status === 'bad' || status === 'dead') && <span className="av-badge bad">✕</span>}
      </div>
      <h1>{title}</h1>
      {status === 'dead' && <p>Continue assistindo na TV até o fim. Você acertou {me.correct}.</p>}
      <div className="r-answer">
        <small>Resposta certa</small>
        <strong>{right?.title}</strong>
        <p>💡 {whyText(room)}</p>
      </div>
      <p className="muted small">Acertos: {me.correct}</p>
    </section>
  );
}

function PlayerFinal({ room, me, onExit }: { room: PublicRoom; me: PublicPlayer; onExit: () => void }) {
  const ranked = rankPlayers(room.players);
  const mine = ranked.find((p) => p.id === me.id)!;
  return (
    <section className="p-center p-final">
      <p className="kicker">Fim de jogo!</p>
      <h1 className="big-place">{mine.place}º lugar</h1>
      <p>{mine.correct} acertos{mine.place <= PODIUM ? ' · você está no pódio! 🏆' : ''}</p>
      <ol className="mini-rank">
        {ranked.slice(0, PODIUM).map((p) => (
          <li key={p.id} className={p.id === me.id ? 'me' : ''}>
            <span>{p.place}º</span>
            <Avatar color={p.color} size={28} />
            <span className="r-name">{p.name}</span>
            <b>{p.correct}</b>
          </li>
        ))}
      </ol>
      <p className="muted small">Se o professor começar outra partida, você entra direto.</p>
      <button className="btn btn-ghost btn-sm" onClick={onExit}>Sair da sala</button>
    </section>
  );
}
