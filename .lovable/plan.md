
## Parte 1 — Bandeira Amarela (e Vermelha) por Posto

A fatura Copel emite a bandeira **duas vezes**: uma sobre o consumo Ponta e outra sobre Fora Ponta (visível na imagem: `ADICIONAL BAND. AMARELA` com 38.370 kWh e 390.603 kWh, cada um com PIS/COFINS e ICMS próprios). Hoje o catálogo em `FaturaCopelTab.tsx` tem uma única linha `bandeira_amarela` (idem `bandeira_vermelha_1/2`).

### Mudança no catálogo de itens (`FaturaCopelTab.tsx`)

Substituir as chaves atuais por pares Ponta/Fora Ponta:

```text
bandeira_amarela_ponta         ADICIONAL BAND. AMARELA — PONTA         kWh
bandeira_amarela_fora          ADICIONAL BAND. AMARELA — FORA PONTA    kWh
bandeira_vermelha_1_ponta      ADICIONAL BAND. VERMELHA P1 — PONTA     kWh
bandeira_vermelha_1_fora       ADICIONAL BAND. VERMELHA P1 — FORA      kWh
bandeira_vermelha_2_ponta      ADICIONAL BAND. VERMELHA P2 — PONTA     kWh
bandeira_vermelha_2_fora       ADICIONAL BAND. VERMELHA P2 — FORA      kWh
```

Ambos permanecem opcionais (aparecem via "+ Adicionar item"), `tributacao: 'full'`, `sinal: 1`, `hasUnitario: true`, `hasTarifa: true`.

### Compatibilidade com dados antigos

- Ao carregar `fatura_copel_itens`, se existir chave legada `bandeira_amarela`/`bandeira_vermelha_1`/`bandeira_vermelha_2`, mapear automaticamente para o sufixo `_fora` (assume-se que histórico foi lançado agregado; o usuário pode desdobrar em Ponta manualmente se quiser). Migração de banco: **nenhuma** — o JSONB é livre.
- Rótulos legados também aparecem no dropdown "+ Adicionar item" só se ainda estiverem populados na fatura carregada, para permitir edição sem perder dado.

### Impacto downstream

Em `src/lib/energia-rateio.ts` a bandeira é consumida como `bandeira_valor` (R$/100kWh) global vinda de `tarifas`, não item-a-item — então o **rateio não muda**. A fatura oficial exibida em `FaturasTab.tsx` mostra `bandeira_total` agregado (soma de todos os módulos) — segue igual, só que agora a **entrada** aceita as duas linhas separadas fielmente à fatura Copel.

## Parte 2 — Reorganização UX das abas do Rateio de Energia

Hoje: 6 abas planas (`Fatura Copel`, `Lançamentos`, `Faturas por Cliente`, `Contratos`, `Grandezas`, `Cadastros`) sem hierarquia entre "o que faço no mês" e "o que cadastro uma vez".

### Nova estrutura (2 camadas)

```text
Rateio de Energia
├─ Painel (novo — landing)
├─ Operação Mensal
│   ├─ 1. Fatura Copel
│   ├─ 2. Lançamentos
│   └─ 3. Faturas por Cliente
└─ Cadastros Base
    ├─ Contratos
    ├─ Grandezas Contratadas
    └─ Clientes / Módulos / Tarifas   (o atual EnergiaCadastrosTab)
```

Implementação: `Tabs` de nível 1 com 3 valores (`painel`, `operacao`, `cadastros`). Cada aba renderiza um sub-`Tabs` interno com seus filhos. Numeração `1./2./3.` na Operação Mensal deixa o fluxo explícito. `CompetenciaProvider` continua envolvendo tudo.

### Painel (novo componente `EnergiaPainelTab.tsx`)

Landing da tela — responde "o que preciso fazer neste mês?". Cards:

- **Compet. selecionada** com seletor grande + status: `Fatura Copel: ✓ lançada / ✗ pendente`, `Lançamentos: N/M módulos`, `Faturas por Cliente: gerado / pendente`
- **KPIs da competência** — Total Copel, Total Faturado (modo escolhido), Diferença, Ultrapassagem (multa)
- **Pendências** — lista curta de itens que travam o fechamento: "Contrato X vencido", "Módulo Y sem lançamento", "PIS/COFINS não bate"
- **Atalhos** — botões que navegam para as sub-abas certas (`Ir para Fatura Copel`, `Ir para Lançamentos`, `Gerar Faturas`)

Sem novas queries pesadas — reaproveita hooks já existentes (`useMemo` já usados nas abas atuais). Se algum dado exige nova query, fica como TODO com placeholder discreto e não bloqueia o merge.

### Reordenação e rótulos

- "Fatura Copel" ganha subtítulo "Entrada de dados da concessionária"
- "Lançamentos" vira "Lançamentos por Módulo" no rótulo interno
- "Faturas por Cliente" mantém, ganha o toggle Exato/Planilha já existente no header
- Ícones ficam consistentes: `LayoutDashboard` (Painel), `Workflow` (Operação Mensal), `Database` (Cadastros Base)

### Roteamento

Rota continua `/admin/rateio-energia`. Estado da sub-aba fica em `useState` local (não em query string) — mesmo padrão de hoje. Se o usuário clicar num atalho do Painel, `setTab('operacao')` + estado interno da sub-aba muda pra alvo desejado.

## Arquivos afetados

- `src/components/admin/energia/FaturaCopelTab.tsx` — desdobra bandeira em Ponta/Fora + compat legado
- `src/components/admin/energia/RateioEnergiaTab.tsx` (arquivo `src/components/admin/RateioEnergiaTab.tsx`) — nova estrutura 2-camadas
- `src/components/admin/energia/EnergiaPainelTab.tsx` — **novo**, landing/painel

## Fora de escopo

- Migração de banco (JSONB `fatura_copel_itens` acomoda novas chaves sem DDL)
- Motor `calcularMemoria` (não muda)
- Faturas por Cliente / detalhamento de tributos (já entregue nas rodadas anteriores)
- PDF/print

## Validação esperada

- Em Fatura Copel, "+ Adicionar item" lista Bandeira Amarela **Ponta** e **Fora Ponta** separadas; ambas podem coexistir e cada uma calcula PIS/COFINS e ICMS próprios
- Fatura antiga com `bandeira_amarela` continua abrindo sem perder valor (aparece como `_fora`)
- Tela do Rateio abre em "Painel" com status da competência atual, com atalhos que levam pra sub-aba correta
- Cadastros (Contratos, Grandezas, Clientes/Módulos/Tarifas) ficam agrupados em "Cadastros Base", separados do fluxo mensal
