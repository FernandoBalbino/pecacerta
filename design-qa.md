# Design QA — Peça Certa

Prints em `qa-evidence/`, gerados por `npm run e2e` (TV 1366×768, aluno 412×860, 16 alunos: 2 navegadores + 14 robôs).

| Tela | Verificado | Print |
|---|---|---|
| Início | Código com 4 letras, aviso de servidor acordando, botão do professor; peças flutuando em volta (some no celular) | `00-inicio.png` |
| Sorteio do nome (aluno) | "Gerando nome aleatório…", nomes passando e freando, "?" girando; ao parar, bichinho na cor do aluno + confete | `01-aluno-gerando-nome.png`, `02-aluno-nome-sorteado.png` |
| Sala de espera (TV) | Código gigante em blocos, endereço, alunos entrando com mini-sorteio do nome, botão de remover; painel de rodadas, tempo, ≈ minutos e ordem | `03-tv-sala-de-espera.png`, `06-tv-configurada.png` |
| Ordem das peças | Clique numera 1, 2, 3…; mostra se a rodada será "função" ou "tipo"; clique de novo tira e renumera; sortear/limpar | `05-tv-ordem-das-pecas.png` |
| Rodada de função (TV) | Peça grande, "Para que serve?", 3 colunas A/B/C com alternativas parecidas, bichinhos andando entre colunas, banco "ainda decidindo", anel do tempo | `07-tv-rodada1-pergunta-funcao.png` |
| Rodada de tipo (TV) | "É de entrada, saída ou híbrido?", colunas fixas Entrada/Saída/Híbrido com ícone de seta e dica | `14-tv-rodada2-pergunta-tipo-entrada-saida-hibrido.png`, `21-…` |
| Aluno escolhendo | Ordem própria do aluno (diferente da TV), sem letra nem cor de coluna; "✓ Você está aqui"; pode trocar | `08-aluno-rodada1-pergunta-funcao.png`, `15-…`, `22-…` |
| Fim do tempo | "⏰ Tempo esgotado!" na TV e no aluno antes de revelar | `09-tv-rodada1-tempo-esgotado.png`, `10-aluno-rodada1-tempo-esgotado.png` |
| Revelação (TV) | Coluna certa acende + carimbo CERTA; ✓ verde em quem acertou; ✕ vermelho, carinha triste e coração quebrando em quem errou/não escolheu; explicação 💡 | `11-tv-rodada1-coracao-quebrando.png`, `12-…`, `16-…`, `23-…` |
| Resultado (aluno) | Acertou ✓ / Errou −1 ❤ / Não escolheu; resposta certa e explicação; coração quebra no topo | `13-aluno-rodada1-resultado.png`, `17-aluno-rodada2-resultado.png` |
| Eliminado | "Suas vidas acabaram 👻"; depois vê a pergunta só para treinar; na TV vai para "Fora do jogo" | `20-aluno-eliminado.png`, `25-aluno-assistindo.png` |
| Pódio e classificação (TV) | 5 degraus (4º, 2º, 1º, 3º, 5º), coroa, confete; lista de todos por acertos com corações ou "saiu na Xª" | `26-tv-podio-e-classificacao.png` |
| Final (aluno) | Posição, acertos, top 5 com o aluno destacado | `27-aluno-final.png` |

## Critérios
- TV em 1366×768 (notebook espelhado) sem rolagem; fontes com `vw`/`vh`.
- Chromebook: avatares numa camada só, movidos por `transform`; `prefers-reduced-motion` desliga os movimentos.
- Som só na TV (botão 🔊/🔇). O aluno não tem som.
