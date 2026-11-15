# Peça Certa

Quiz em tempo real para revisar **para que serve cada peça do computador** e se ela é de **entrada, saída ou híbrida**. O professor projeta a tela na TV; os alunos jogam pelo Chromebook ou celular.

- **Jogar:** https://fernandobalbino.github.io/pecacerta/
- **Servidor (Render):** https://pecacerta-wnx7.onrender.com/health

## Como funciona
1. O professor clica em **Sou professor** e a sala abre com um código de 4 letras.
2. Os alunos entram com o código. O nome é sorteado (ex.: "Capivara Sem Wi-Fi") com animação, e cada um ganha um bichinho de cor diferente.
3. O professor escolhe a duração (10 a 30 rodadas), o tempo por rodada (30 a 90 s) e, se quiser, a **ordem das peças**: clica nas imagens e cada uma ganha o número da rodada (1, 2, 3…). As que ficarem sem número entram depois, sorteadas.
4. Em cada rodada a TV mostra a peça e **3 colunas**. Rodada ímpar: **para que serve?** Rodada par: **entrada, saída ou híbrido?** (peça interna, como o processador, sempre cai em "para que serve").
5. O aluno toca na coluna e pode trocar até o tempo acabar. A TV mostra os bichinhos andando entre as colunas ao vivo. No aparelho de cada aluno as alternativas aparecem **em outra ordem**, sem letra nem cor da TV, para ninguém copiar a posição do vizinho.
6. Fim do tempo: "Tempo esgotado!", a coluna certa acende, quem acertou ganha um ✓ verde e quem errou (ou não escolheu) ganha um ✕ e **perde um coração**. Todos veem os corações de todos na TV.
7. Com 3 vidas perdidas, o aluno vira espectador 👻. O jogo acaba na última rodada ou quando sobram só **5** (o pódio é de 5). A classificação geral ordena por acertos (empate: mais vidas, quem durou mais, quem decidiu mais rápido).

Atalhos na TV: **espaço** pausa/continua, **→** encerra o tempo ou vai para a próxima rodada.

## Rodar localmente
```bash
npm install
npm run dev:server   # servidor em http://localhost:3000
npm run dev:web      # telas em http://localhost:5173/pecacerta/
```

## Verificação
```bash
npm run check && npm test && npm run build
npm run e2e          # partida completa com prints em qa-evidence/ (precisa do servidor e do Vite rodando)
```

## Publicação
- **Telas:** GitHub Pages, pelo workflow `.github/workflows/pages.yml` a cada push na `main`. O endereço do servidor vem da variável `VITE_SERVER_URL` do repositório (padrão: `https://pecacerta-wnx7.onrender.com`).
- **Servidor:** Render (plano free) pelo `render.yaml`. Só troca mensagens pequenas; imagens e sons saem do GitHub Pages. No plano free ele dorme depois de 15 min sem uso: abra o site uns minutos antes da aula para acordar.

Créditos das imagens e bibliotecas: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
