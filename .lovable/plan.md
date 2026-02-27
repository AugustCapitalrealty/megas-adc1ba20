

# Plano: PDF de Rateio com identidade visual Mega

## Objetivo
Redesenhar o PDF gerado pelo `RateioCard` para refletir a identidade visual do sistema: logo Mega, cores da marca (laranja `#E87722`, cinza `#64666A`, preto), e layout profissional.

## Alterações

### Arquivo: `src/components/RateioCard.tsx` — função `handleDownloadPDF`

1. **Logo no cabeçalho**: Carregar `logo-mega.png` como base64 (via canvas ou import estático) e inserir no topo do PDF com `doc.addImage()`
2. **Faixa laranja decorativa**: Desenhar um retângulo laranja (`#E87722`) no topo da página como header visual
3. **Título estilizado**: Texto branco sobre a faixa laranja, fonte maior e bold
4. **Informações do protocolo**: Abaixo do header, com fonte cinza `#64666A`
5. **Tabela com cores da marca**:
   - Header da tabela com fundo laranja `#E87722` (substituir o azul `[41, 128, 185]` atual)
   - Linhas alternadas com cinza claro
   - Linha de total com fundo cinza escuro `#64666A` e texto branco
6. **Rodapé**: Linha cinza com texto "Mega Centro Logístico — Documento gerado em DD/MM/AAAA"

### Técnica para o logo
- Converter `logo-mega.png` para base64 em runtime usando `Image` + `canvas.toDataURL()`
- Alternativa mais robusta: embutir o base64 como constante (evita CORS e async)

### Cores aplicadas
- Header/faixa: `[232, 119, 34]` (laranja Mega)
- Texto secundário: `[100, 102, 106]` (cinza Mega)
- Fundo alternado: `[248, 248, 248]`
- Total row: `[100, 102, 106]` com texto branco

Nenhuma alteração visual no componente web — apenas no PDF gerado.

