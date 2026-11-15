// Partida de ponta a ponta com prints de cada tela: TV (1366×768), dois alunos de verdade e alunos-robô.
// Uso local (servidor e Vite rodando): node scripts/e2e.ts
// Teste leve em produção: E2E_URL=https://fernandobalbino.github.io/pecacerta/ SERVER_URL=https://pecacerta.onrender.com ROBOS=2 node scripts/e2e.ts
import { chromium, type Page } from 'playwright';
import { io, type Socket } from 'socket.io-client';
import { mkdirSync } from 'node:fs';
import { IO_LABEL, IO_ORDER, ITEM_BY_ID } from '../shared/items.ts';
import type { ClientEvents, PublicRoom, ServerEvents } from '../shared/protocol.ts';

const URL = process.env.E2E_URL ?? 'http://localhost:5173/pecacerta/';
const SERVER = process.env.SERVER_URL ?? 'http://localhost:3000';
const BOTS = Number(process.env.ROBOS ?? 14);
const OUT = 'qa-evidence';
mkdirSync(OUT, { recursive: true });

const step = (msg: string) => console.log('•', msg);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rightCol = (r: PublicRoom) => (r.kind === 'funcao' ? r.cols.indexOf(0) : IO_ORDER.indexOf(ITEM_BY_ID[r.item!].io!));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' }); // CI: PW_CHANNEL=chromium
const errors: string[] = [];
const open = async (w: number, h: number) => {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  return page;
};
const shot = (p: Page, name: string) => p.screenshot({ path: `${OUT}/${name}.png` });

// Robôs: entram e, a cada rodada, passeiam entre colunas. Os 4 primeiros sempre terminam na certa.
const sockets: Socket<ServerEvents, ClientEvents>[] = [];
let last: PublicRoom | null = null;
const botJoin = async (code: string, smart: boolean) => {
  const s: Socket<ServerEvents, ClientEvents> = io(SERVER, { transports: ['websocket'] });
  let round = 0;
  s.on('state', (r) => {
    if (!sockets.length || s === sockets[0]) last = r;
    if (r.phase !== 'question' || r.round === round) return;
    round = r.round;
    const right = rightCol(r);
    const final = smart || Math.random() < 0.4 ? right : (right + 1 + Math.floor(Math.random() * 2)) % 3;
    setTimeout(() => s.emit('player:pick', { col: Math.floor(Math.random() * 3) }, () => {}), 300 + Math.random() * 1500);
    setTimeout(() => s.emit('player:pick', { col: final }, () => {}), 2200 + Math.random() * 1500);
  });
  await new Promise<void>((ok) => s.emit('player:join', { code }, () => ok()));
  sockets.push(s);
};
const joinKid = async (code: string) => {
  const kid = await open(412, 860);
  await kid.goto(`${URL}?sala=${code}`);
  await kid.getByRole('button', { name: /Entrar/ }).click();
  await kid.locator('.intro').waitFor();
  return kid;
};
const tvBtn = (tv: Page, name: RegExp) => tv.locator('.tv-bar').getByRole('button', { name }).click();
// Cada aluno vê as colunas em outra ordem: o clique é pelo texto da coluna da TV.
const titleOf = (r: PublicRoom, col: number) => (r.kind === 'tipo' ? IO_LABEL[IO_ORDER[col]].title : ITEM_BY_ID[r.item!].does[r.cols[col]]);
const pickOn = (kid: Page, col: number) => kid.locator('.p-opt', { hasText: titleOf(last!, col) }).click();

try {
  const tv = await open(1366, 768);
  await tv.goto(URL);
  await tv.getByText('Servidor pronto').waitFor({ timeout: 90_000 }); // o Render pode estar dormindo
  await shot(tv, '00-inicio');
  await tv.getByRole('button', { name: /Sou professor/ }).click();
  const code = (await tv.locator('.code-tiles').getAttribute('aria-label'))!.replace('Código da sala: ', '');
  step(`sala ${code}`);

  const kid = await joinKid(code);
  await wait(600);
  await shot(kid, '01-aluno-gerando-nome');
  await kid.locator('.intro.landed').waitFor();
  await wait(900);
  await shot(kid, '02-aluno-nome-sorteado');
  await kid.getByRole('button', { name: 'Bora jogar!' }).click();
  const loser = await joinKid(code); // este aluno erra sempre, para mostrar a tela de eliminado
  for (let k = 0; k < BOTS; k++) await botJoin(code, k < 4);
  await tv.getByText(`${BOTS + 2} alunos na sala`).waitFor();
  await wait(1600);
  await shot(tv, '03-tv-sala-de-espera');
  await shot(kid, '04-aluno-esperando');

  // Ordem: monitor (função), headset (tipo), processador (função), webcam (tipo).
  await tv.getByRole('button', { name: 'Escolher ordem das peças' }).last().click();
  for (const name of ['Monitor', 'Headset (fone com microfone)', 'Processador', 'Webcam']) await tv.getByRole('button', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`) }).click();
  await wait(500);
  await shot(tv, '05-tv-ordem-das-pecas');
  await tv.getByRole('button', { name: 'Pronto' }).click();
  await tv.locator('.seg').first().getByRole('button', { name: '10', exact: true }).click();
  await tv.getByRole('button', { name: '30 s', exact: true }).click();
  await shot(tv, '06-tv-configurada');
  await tv.getByRole('button', { name: /Começar partida/ }).click();

  let n = 7;
  const name = (s: string) => `${String(n++).padStart(2, '0')}-${s}`;
  for (let round = 1; ; round++) {
    await tv.getByText(`Rodada ${round} de 10`).waitFor();
    await wait(400);
    const r = last!;
    const right = rightCol(r);
    if (!(await loser.locator('.intro').count()) && (await loser.locator('.p-opt:not(:disabled)').count())) await pickOn(loser, (right + 1) % 3);
    else if (await loser.locator('.intro-go:not(:disabled)').count()) await loser.locator('.intro-go').click();
    // Aluno principal: muda de ideia uma vez; erra só na 2ª rodada.
    await pickOn(kid, (right + 2) % 3);
    await wait(1200);
    await pickOn(kid, round === 2 ? (right + 1) % 3 : right);
    await wait(2800);
    const label = r.kind === 'tipo' ? 'tipo-entrada-saida-hibrido' : 'funcao';
    if (round <= 2 || round === 4) {
      await shot(tv, name(`tv-rodada${round}-pergunta-${label}`));
      await shot(kid, name(`aluno-rodada${round}-pergunta-${label}`));
    }
    await tvBtn(tv, /Encerrar tempo/);
    if (round === 1) {
      await wait(450);
      await shot(tv, name('tv-rodada1-tempo-esgotado'));
      await shot(kid, name('aluno-rodada1-tempo-esgotado'));
      await wait(1450);
      await shot(tv, name('tv-rodada1-coracao-quebrando'));
      await wait(1500);
    } else await wait(3400);
    if (round <= 4) {
      await shot(tv, name(`tv-rodada${round}-resposta-${label}`));
      await shot(kid, name(`aluno-rodada${round}-resultado`));
    }
    if (round === 3) await shot(loser, name('aluno-eliminado'));
    if (round === 4) await shot(loser, name('aluno-assistindo'));
    await tvBtn(tv, /Próxima/);
    await wait(300);
    if (await tv.locator('.final').count()) break;
  }
  await tv.getByRole('heading', { name: 'Pódio' }).waitFor();
  await wait(3200);
  await shot(tv, name('tv-podio-e-classificacao'));
  await shot(kid, name('aluno-final'));
  step('partida completa');
} finally {
  for (const s of sockets) s.close();
  await browser.close();
  if (errors.length) console.log('Erros no navegador:\n' + errors.join('\n'));
}
