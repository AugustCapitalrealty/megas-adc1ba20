

# Melhorar PDF do Rateio — Logo apertada

## Problema
A faixa laranja do header tem apenas 40mm de altura e a logo é 28x28mm, ficando espremida. O texto do título fica colado na logo.

## Alterações em `src/components/RateioCard.tsx`

Ampliar o header e dar mais respiro à logo:

| Elemento | Atual | Novo |
|----------|-------|------|
| Faixa laranja | `height: 40` | `height: 54` |
| Logo | `(14, 6, 28, 28)` | `(14, 7, 40, 40)` |
| Título "Demonstrativo de Rateio" | `x:50, y:20, size:18` | `x:62, y:22, size:20` |
| Subtítulo "entre Condomínios" | `x:50, y:28, size:11` | `x:62, y:32, size:12` |
| Info section start `yPos` | `52` | `68` |

Resultado: logo maior com padding proporcional, texto reposicionado para não sobrepor, e espaço confortável antes da seção de informações.

**1 arquivo, ~8 linhas alteradas.**

