

# Redesign do PDF de Rateio

## Problemas visíveis no PDF atual
- A logo está cortada no topo e na esquerda — o "M" mal aparece e o texto "CENTRO LOGISTICO" fica espremido na faixa laranja
- O título e subtítulo ficam desalinhados verticalmente em relação à logo
- A seção de informações (protocolo, tipo, valor, data) está muito colada no header
- Muito espaço vazio entre a tabela e o rodapé

## Alterações em `src/components/RateioCard.tsx`

### Header redesenhado
| Elemento | Atual | Novo |
|----------|-------|------|
| Faixa laranja | `height: 54` | `height: 70` |
| Logo | `(14, 7, 40, 40)` | `(14, 8, 50, 50)` — maior e com mais respiro |
| Título | `(62, 22)` size 20 | `(72, 28)` size 22 |
| Subtítulo | `(62, 32)` size 12 | `(72, 40)` size 13 |

### Seção de informações
- Adicionar uma linha cinza fina separadora abaixo do header (`y: 76`)
- `yPos` inicial de 68 → **84** para dar espaço
- Aumentar espaçamento entre linhas de 6 → **8**
- Usar labels em **bold** e valores em normal para melhor hierarquia visual

### Tabela
- Adicionar `margin: { left: 14, right: 14 }` para alinhar com o texto
- Aumentar `cellPadding` para mais respiro interno
- Coluna "Condomínio" mais larga

### Rodapé
- Adicionar texto centralizado "Documento confidencial" acima da linha

**1 arquivo editado, ~30 linhas alteradas.**

