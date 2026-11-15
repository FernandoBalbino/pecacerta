// Banco de peças, regras fixas e nomes engraçados. Fonte da verdade do servidor e da interface.
// shortcut: o gabarito vai junto no bundle do navegador (um aluno com DevTools poderia achar); mover `does[0]`/`io` para server/ se isso virar problema.

export type Io = 'entrada' | 'saida' | 'hibrido';
export type Kind = 'funcao' | 'tipo';

export interface Item {
  id: string; // nome do arquivo em web/public/items
  name: string;
  io: Io | null; // null = peça interna: só entra na pergunta de função
  does: [string, string, string]; // [certa, errada, errada]: curtas, parecidas e sem termo técnico
  why: string; // explicação curta mostrada na revelação
}

const it = (id: string, name: string, io: Io | null, does: Item['does'], why: string): Item => ({ id, name, io, does, why });

export const ITEMS: Item[] = [
  it('teclado', 'Teclado', 'entrada', ['Digitar letras e números', 'Mostrar letras e números', 'Guardar letras e números'], 'Você aperta as teclas e as letras entram no computador.'),
  it('mouse', 'Mouse', 'entrada', ['Mover a seta e clicar', 'Mostrar a seta na tela', 'Guardar os cliques feitos'], 'Você mexe a mão e a seta anda na tela.'),
  it('monitor', 'Monitor', 'saida', ['Mostrar a imagem do PC', 'Criar a imagem do PC', 'Guardar a imagem do PC'], 'Ele só exibe o que o computador manda.'),
  it('caixa-som', 'Caixa de som', 'saida', ['Tocar o som do PC', 'Gravar o som do PC', 'Guardar o som do PC'], 'O som sai do computador e chega aos seus ouvidos.'),
  it('microfone', 'Microfone', 'entrada', ['Captar a sua voz', 'Tocar a sua voz', 'Guardar a sua voz'], 'Ele leva a sua voz para dentro do computador.'),
  it('webcam', 'Webcam', 'entrada', ['Filmar quem está na frente', 'Mostrar quem está na frente', 'Iluminar quem está na frente'], 'Ela capta a sua imagem e manda para o computador.'),
  it('impressora', 'Impressora', 'saida', ['Passar o texto da tela para o papel', 'Passar o texto do papel para a tela', 'Apagar o texto escrito no papel'], 'Ela tira o que está no computador e coloca no papel.'),
  it('headset', 'Headset (fone com microfone)', 'hibrido', ['Ouvir e falar ao mesmo tempo', 'Só ouvir, sem poder falar', 'Só falar, sem poder ouvir'], 'O fone toca o som (saída) e o microfone capta a voz (entrada).'),
  it('controle', 'Controle de videogame', 'entrada', ['Mandar comandos para o jogo', 'Mostrar o jogo na tela', 'Salvar o progresso do jogo'], 'Os botões mandam as suas ordens para o jogo.'),
  it('pendrive', 'Pendrive', 'hibrido', ['Guardar e levar arquivos', 'Abrir e editar arquivos', 'Baixar arquivos da internet'], 'Ele grava e lê arquivos, e cabe no bolso.'),
  it('hd', 'HD', 'hibrido', ['Guardar arquivos mesmo desligado', 'Guardar arquivos só com o PC ligado', 'Apagar os arquivos ao desligar'], 'Seus arquivos continuam lá mesmo com o PC desligado.'),
  it('ssd', 'SSD', 'hibrido', ['Guardar arquivos com muita rapidez', 'Baixar arquivos com muita rapidez', 'Mostrar arquivos com muita rapidez'], 'Faz o mesmo que o HD, só que bem mais rápido.'),
  it('ssd-m2', 'SSD M.2', 'hibrido', ['Guardar o sistema e os arquivos', 'Fazer as contas do sistema', 'Esfriar o sistema e as peças'], 'É um SSD pequeno que encaixa direto na placa-mãe.'),
  it('memoria', 'Memória RAM', null, ['Guardar o que está aberto agora', 'Guardar tudo mesmo desligado', 'Fazer as contas do computador'], 'Ela segura os programas abertos e se apaga ao desligar.'),
  it('processador', 'Processador', null, ['Fazer as contas e dar as ordens', 'Guardar as contas e as ordens', 'Mostrar as contas e as ordens'], 'É o cérebro: faz os cálculos e comanda tudo.'),
  it('placa-mae', 'Placa-mãe', null, ['Ligar todas as peças entre si', 'Dar energia a todas as peças', 'Esfriar todas as peças'], 'Todas as peças se encaixam e conversam por ela.'),
  it('fonte', 'Fonte', null, ['Levar a energia da tomada às peças', 'Guardar energia se a luz cair', 'Ligar as peças entre si'], 'Ela pega a energia da tomada e distribui para as peças.'),
  it('cooler', 'Cooler', null, ['Esfriar o processador', 'Ligar o processador', 'Dar energia ao processador'], 'O ventilador tira o calor do processador.'),
  it('water-cooler', 'Water cooler', null, ['Esfriar usando líquido', 'Limpar usando líquido', 'Iluminar usando líquido'], 'Um líquido passa pelos canos e leva o calor embora.'),
  it('gabinete', 'Gabinete', null, ['Proteger e organizar as peças', 'Dar energia para as peças', 'Deixar as peças mais rápidas'], 'É a caixa que segura e protege as peças.'),
  it('placa-video', 'Placa de vídeo', null, ['Criar as imagens dos jogos', 'Mostrar as imagens dos jogos', 'Guardar as imagens dos jogos'], 'Ela desenha as imagens; o monitor só mostra.'),
  it('nobreak', 'Nobreak', null, ['Manter o PC ligado se a luz cair', 'Aumentar a energia da tomada', 'Dividir a tomada em várias'], 'Ele tem bateria e segura o PC ligado quando a energia cai.'),
  it('roteador', 'Roteador', 'hibrido', ['Espalhar a internet pela casa', 'Criar a internet da casa', 'Guardar a internet da casa'], 'Ele recebe e envia dados, por cabo e por Wi-Fi.'),
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Pergunta de tipo: colunas sempre na mesma ordem, para a turma decorar o lugar.
export const IO_ORDER: Io[] = ['entrada', 'saida', 'hibrido'];
export const IO_LABEL: Record<Io, { title: string; hint: string }> = {
  entrada: { title: 'Entrada', hint: 'manda informação para o PC' },
  saida: { title: 'Saída', hint: 'recebe informação do PC' },
  hibrido: { title: 'Híbrido', hint: 'manda e recebe' },
};
export const IO_WHY: Record<Io, string> = {
  entrada: 'Entrada: só manda informação para o computador.',
  saida: 'Saída: só recebe informação do computador.',
  hibrido: 'Híbrido: manda e recebe informação (é entrada e saída).',
};

export const LIVES = 3;
export const PODIUM = 5;
export const MAX_ROUNDS = 30;
export const MAX_PLAYERS = 40;
export const REVEAL_MS = 8000;
export const SECONDS_OPTIONS = [30, 45, 60, 90];
export const ROUND_OPTIONS = [10, 15, 20, 25, 30];

// Rodada ímpar pergunta a função; par pergunta o tipo (se a peça for de entrada/saída).
export const kindFor = (round: number, item: Item): Kind => (round % 2 === 0 && item.io ? 'tipo' : 'funcao');

// Ordem final: as escolhidas pelo professor primeiro, depois o resto sorteado, repetindo se faltar.
export function buildQueue(order: string[], rounds: number, rnd = Math.random): string[] {
  const chosen = [...new Set(order.filter((id) => ITEM_BY_ID[id]))];
  const queue = chosen.slice(0, rounds);
  let pool = shuffle(ITEMS.map((i) => i.id).filter((id) => !queue.includes(id)), rnd);
  while (queue.length < rounds) {
    if (!pool.length) pool = shuffle(ITEMS.map((i) => i.id), rnd);
    queue.push(pool.shift()!);
  }
  return queue;
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Nome = bicho + complemento. Os complementos não mudam com o gênero ("Capivara Turbo", "Pinguim Turbo").
export const ANIMALS = [
  'Capivara', 'Pinguim', 'Tatu', 'Jacaré', 'Coruja', 'Lhama', 'Panda', 'Polvo', 'Sapo', 'Tucano',
  'Preguiça', 'Ornitorrinco', 'Calango', 'Galinha', 'Pato', 'Hamster', 'Esquilo', 'Mico', 'Lagartixa', 'Cabra',
  'Ouriço', 'Tamanduá', 'Quati', 'Lontra', 'Suricato', 'Camelo', 'Canguru', 'Jabuti', 'Flamingo', 'Bode',
];
export const EXTRAS = [
  'de Pijama', 'Sem Wi-Fi', 'Turbo', 'de Óculos', 'Gamer', 'do Teclado', 'de Patinete', 'Sem Bateria',
  'do Pendrive', 'com Soluço', 'de Chinelo', 'do Pastel', 'Overclock', 'de Capacete', 'com Lag', 'do Bug',
  'Ninja', 'de Boné', 'do Café', 'Sem Mouse', 'Bluetooth', 'do Rolê', 'com Fome', 'do Futuro', 'de Gravata',
  'do Cabo USB', 'de Sunga', 'Hacker', 'do Wi-Fi', 'Sem Freio',
];
export const randomName = (rnd = Math.random) =>
  `${ANIMALS[Math.floor(rnd() * ANIMALS.length)]} ${EXTRAS[Math.floor(rnd() * EXTRAS.length)]}`;

// Cores bem separadas: ângulo de ouro no matiz e três níveis de claridade.
export const colorFor = (i: number) => `hsl(${Math.round((i * 137.508) % 360)} 78% ${[56, 44, 66][i % 3]}%)`;

export interface Rankable {
  name: string;
  correct: number;
  lives: number;
  out: number | null; // rodada em que perdeu a última vida
  time: number; // ms até a escolha final nas rodadas certas
}

// Classificação: mais acertos, depois mais vidas, quem durou mais e quem decidiu mais rápido. Empate total = mesma posição.
export function rankPlayers<T extends Rankable>(ps: T[]): (T & { place: number })[] {
  const cmp = (a: T, b: T) => b.correct - a.correct || b.lives - a.lives || (b.out ?? Infinity) - (a.out ?? Infinity) || a.time - b.time || 0;
  const sorted = [...ps].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name, 'pt-BR'));
  let place = 0;
  return sorted.map((p, i) => {
    if (i === 0 || cmp(sorted[i - 1], p) !== 0) place = i + 1;
    return { ...p, place };
  });
}
