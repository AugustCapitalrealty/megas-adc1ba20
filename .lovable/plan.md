

# Redesign Completo do PDF de Rateio

## Visão geral
Reescrever a lógica de geração do PDF em ambos os arquivos (`RateioCard.tsx` e `RateioConfigTab.tsx`) para criar um relatório executivo com layout profissional em 7 seções.

## Estrutura do novo PDF

```text
┌─────────────────────────────────────┐
│  HEADER (faixa laranja + logo)      │
│  Demonstrativo de Rateio            │
├─────────────────────────────────────┤
│  RESUMO (4 cards em grid 2x2)      │
│  ┌──────────┐  ┌──────────────┐    │
│  │VALOR TOTAL│  │TIPO DE RATEIO│    │
│  │R$69.580   │  │Por Área      │    │
│  └──────────┘  └──────────────┘    │
│  ┌──────────┐  ┌──────────────┐    │
│  │DATA      │  │PROTOCOLO     │    │
│  │08/03/2026│  │TESTE-0000    │    │
│  └──────────┘  └──────────────┘    │
├─────────────────────────────────────┤
│  TABELA DE RATEIO                   │
│  (sem linha Total — separada)       │
├─────────────────────────────────────┤
│  TOTAL RATEADO (destaque isolado)   │
│  R$ 69.580,00                       │
├─────────────────────────────────────┤
│  GRÁFICO (barras horizontais)       │
│  Mega Curitiba  ████████ 47,65%     │
│  Mega Itajaí    ███████  42,75%     │
│  Mega Esteio    ██       9,60%      │
├─────────────────────────────────────┤
│  METODOLOGIA DO CÁLCULO             │
│  Texto explicativo + área total     │
├─────────────────────────────────────┤
│  RODAPÉ institucional               │
│  Capital Realty — Protocolo — Data  │
└─────────────────────────────────────┘
```

## Alterações técnicas

### 1. Extrair função compartilhada `generateRateioPDF`
Criar `src/lib/rateio-pdf.ts` com toda a lógica de geração, eliminando duplicação entre `RateioCard` e `RateioConfigTab`.

### 2. Seções do PDF (dentro de `rateio-pdf.ts`)

- **Header**: mantém faixa laranja 70mm + logo 50x50 + título
- **Cards de resumo**: 4 retângulos com borda cinza, label em cinza 8pt e valor em bold 14pt. Grid 2x2 com espaçamento
- **Tabela**: `autoTable` com colunas alinhadas à direita (área, %, valor), coluna % com fundo laranja claro, sem linha de total na tabela
- **Total destacado**: Faixa cinza escura com texto branco "TOTAL RATEADO — R$ XX.XXX,XX" centralizado
- **Gráfico de barras**: Retângulos desenhados com `doc.rect()` proporcionais ao %, cor laranja, com label e % ao lado
- **Metodologia**: Texto em itálico explicando o cálculo + área total considerada
- **Rodapé**: "Capital Realty — Demonstrativo de Rateio | Protocolo XXXX | Gerado em DD/MM/AAAA" + "Documento confidencial"

### 3. Atualizar importações
- `RateioCard.tsx`: importar e chamar `generateRateioPDF()`
- `RateioConfigTab.tsx`: importar e chamar `generateRateioPDF()` com dados de teste

**3 arquivos**: 1 novo (`src/lib/rateio-pdf.ts`), 2 editados.

