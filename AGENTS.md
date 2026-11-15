# AGENTS.md — Peça Certa

Quiz em tempo real para turmas do técnico em Manutenção e Suporte de Informática. Professor na TV (notebook espelhado, 1366×768), alunos em Chromebook/celular. Textos em português com acentos.

## Arquitetura
- `shared/items.ts` é a fonte da verdade: peças, alternativas, regras fixas (vidas, pódio, tempos), nomes engraçados, cores e `rankPlayers`. Importado pelo servidor e pela web.
- `server/game.ts` tem só regras, com relógio injetável (`Clock`). Teste toda regra nova em `tests/game.test.ts` com o `fakeClock`.
- `server/index.ts` é o Socket.IO. O servidor é autoritativo: valida fase, vida, coluna e limita a um toque a cada 120 ms.
- **Banda do Render:** o estado completo (`state`) só sai em mudança de fase/entrada; a troca de coluna vai como `pick` pequeno e **só para a TV** (sala `CODE:tv`). O cronômetro é calculado no navegador (`endsAt` + relógio do servidor), sem ticks.
- **Ordem por aluno:** a TV mostra as colunas na ordem do servidor (`cols`); o aluno vê outra ordem (`studentOrder(playerId, round)` em `web/src/ui.tsx`), sem letra nem cor de coluna. O clique manda sempre o índice da coluna da TV.
- **Gabarito:** a resposta só aparece no estado depois do tempo (`answer = -1` antes). Atalho conhecido: o catálogo vai no bundle (ver comentário `shortcut` em `shared/items.ts`).
- **Rodadas:** ímpar = função; par = tipo (entrada/saída/híbrido) se a peça tiver `io`, senão função (`kindFor`). Ordem do professor primeiro, resto sorteado (`buildQueue`).
- **Fim:** última rodada, ou sobram ≤ 5 vivos (se começou com mais de 5), ou ninguém vivo.

## Telas
- `Host.tsx`: sala de espera + configuração + escolha da ordem (overlay), rodada (TV) e pódio.
- `Stage.tsx`: colunas e uma única camada de avatares movidos por `transform` (posições calculadas por área com `ResizeObserver`).
- `Player.tsx`: sorteio do nome (`NameRoller`), escolha, resultado com suspense de 1,2 s e final.
- Revelação (TV): "Tempo esgotado!" (0–1,2 s) → coluna certa acende (0,9 s) → ✓/✕ e carinhas (1,3 s) → coração quebrando (1,5 s).

## Regras de produto
- Alternativas curtas, parecidas entre si e **sem termo técnico**. As erradas costumam ser a função de outra peça (ex.: monitor "mostra", placa de vídeo "cria").
- Nunca use o nome da peça dentro da alternativa certa.
- Imagens: as do LeilãoTEC (mesmo estilo 3D, sem fundo, 512 px + miniatura 160 px em WebP). Peça nova = imagem nas duas pastas + entrada em `ITEMS`.

## Desempenho (Chromebook)
- Anime só `transform`/`opacity` (exceção pequena: o anel do cronômetro na TV). Respeite `prefers-reduced-motion`.

## Verificação
`npm run check && npm test && npm run build`, depois `npm run e2e` com servidor e Vite locais (gera os prints de `qa-evidence/`). Em produção, só teste leve (`ROBOS=2`).
