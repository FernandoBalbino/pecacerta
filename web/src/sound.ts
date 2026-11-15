// Efeitos só na TV (os mesmos do LeilãoTEC). O aluno fica sem som para a sala não virar barulho.
import { useSyncExternalStore } from 'react';

type SoundName = 'item' | 'contagem';
const cache = new Map<SoundName, HTMLAudioElement>();
const listeners = new Set<() => void>();
let muted = (() => {
  try {
    return localStorage.getItem('pecacerta:mudo') === '1';
  } catch {
    return false;
  }
})();

export function play(name: SoundName, volume = 0.8) {
  if (muted) return;
  let a = cache.get(name);
  if (!a) cache.set(name, (a = new Audio(`${import.meta.env.BASE_URL}sounds/${name}.mp3`)));
  const node = a.cloneNode() as HTMLAudioElement;
  node.volume = volume;
  node.play().catch(() => {});
}

export function toggleMuted() {
  muted = !muted;
  listeners.forEach((f) => f());
  try {
    localStorage.setItem('pecacerta:mudo', muted ? '1' : '0');
  } catch { /* sem storage */ }
}

export const useMuted = () => useSyncExternalStore((f) => (listeners.add(f), () => void listeners.delete(f)), () => muted);
