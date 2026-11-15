// Tela inicial e escolha do papel (professor na TV ou aluno no Chromebook).
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ITEMS } from '../../shared/items.ts';
import Host from './Host.tsx';
import Player from './Player.tsx';
import { clearRoom, loadSession, saveSession, send, socket, useConnected, useKicked, useRoom, type Session } from './net.ts';
import { ItemImg, Logo } from './ui.tsx';

export default function App() {
  const room = useRoom();
  const kicked = useKicked();
  const connected = useConnected();
  const [session, setSession] = useState<Session | null>(loadSession);
  const [justJoined, setJustJoined] = useState(false);
  const [error, setError] = useState('');

  // Ao conectar (ou reconectar), volta para a sala salva.
  useEffect(() => {
    const resume = async () => {
      const s = loadSession();
      if (!s) return;
      const res = s.role === 'teacher'
        ? await send('teacher:resume', { code: s.code, token: s.token })
        : await send('player:resume', { code: s.code, token: s.token });
      if (!res.ok) {
        saveSession(null);
        setSession(null);
        clearRoom();
        setError(res.error);
      }
    };
    socket.on('connect', resume);
    if (socket.connected) resume();
    return () => void socket.off('connect', resume);
  }, []);

  useEffect(() => {
    if (kicked) setSession(null);
  }, [kicked]);

  const start = (s: Session) => {
    saveSession(s);
    setSession(s);
    setError('');
  };
  const exit = () => {
    saveSession(null);
    setSession(null);
    setJustJoined(false);
    clearRoom();
  };

  if (session && room?.code === session.code) {
    return session.role === 'teacher'
      ? <Host room={room} onExit={exit} />
      : <Player room={room} playerId={session.playerId} justJoined={justJoined} onExit={exit} />;
  }
  if (session) {
    return (
      <main className="center-screen">
        <div className="spinner" aria-hidden="true" />
        <p>{connected ? 'Entrando na sala…' : 'Acordando o servidor… (na primeira vez do dia pode levar até 1 minuto)'}</p>
        <button className="btn btn-ghost btn-sm" onClick={exit}>Cancelar</button>
      </main>
    );
  }
  return (
    <Home
      connected={connected}
      error={kicked ? 'O professor tirou você da sala.' : error}
      onTeacher={async () => {
        const res = await send('teacher:create', null);
        if (res.ok) start({ role: 'teacher', code: res.code, token: res.token });
        else setError(res.error);
      }}
      onJoin={async (code) => {
        const res = await send('player:join', { code });
        if (!res.ok) return setError(res.error);
        setJustJoined(true);
        start({ role: 'player', code: code.toUpperCase(), token: res.token, playerId: res.playerId });
      }}
    />
  );
}

function Home({ connected, error, onTeacher, onJoin }: {
  connected: boolean;
  error: string;
  onTeacher: () => void;
  onJoin: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('sala')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onJoin(code.trim());
    setBusy(false);
  };
  const strip = ITEMS.slice(0, 12);
  return (
    <main className="home">
      <div className="home-orbit" aria-hidden="true">
        {strip.map((i, k) => (
          <span key={i.id} style={{ '--k': k } as CSSProperties}><ItemImg id={i.id} thumb /></span>
        ))}
      </div>
      <section className="home-card">
        <Logo />
        <h1 className="home-title">Qual coluna está certa?</h1>
        <p className="muted">A peça aparece na TV. Corra para a coluna certa antes do tempo acabar. São 3 vidas.</p>
        <form onSubmit={submit} className="join-form">
          <label htmlFor="code">Código da sala</label>
          <input
            id="code" value={code} maxLength={4} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="ABCD" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            className="code-input"
          />
          <button className="btn btn-primary btn-xl" disabled={code.length !== 4 || busy || !connected}>
            {busy ? 'Entrando…' : 'Entrar e sortear meu nome'}
          </button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        <p className={`server ${connected ? 'ok' : ''}`}>
          {connected ? '● Servidor pronto' : '○ Acordando o servidor… (pode levar até 1 minuto)'}
        </p>
        <hr />
        <button className="btn btn-ghost" onClick={onTeacher} disabled={!connected}>
          Sou professor: abrir sala na TV →
        </button>
      </section>
    </main>
  );
}
