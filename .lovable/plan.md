## Nova aba "📄 Fatura Copel"

Criar uma aba dedicada para entrada da fatura Copel mensal, separada da "Memória de Cálculo", com visual mais limpo e indicativo.

### Estrutura

Nova aba no `RateioEnergiaTab`, posicionada entre "Memória de Cálculo" e "Contratos":

```
Memória de Cálculo | 📄 Fatura Copel | Contratos | Grandezas | Cadastros
```

Novo arquivo: `src/components/admin/energia/FaturaCopelTab.tsx`

### Layout da aba

**1. Header com seletor de competência** (mesmo padrão da Memória):
- Dropdown de competência (AAAA-MM) + badge de status (rascunho/fechada).
- Botão "Nova competência" se quiser criar do zero.

**2. Cabeçalho-resumo (KPI cards)** — 4 cards visuais no topo:
- **Total da Fatura (R$)** — soma calculada dos itens.
- **Total a Pagar** — valor que a pessoa digita do cabeçalho da fatura (referência da Copel).
- **Diferença** — pintada verde quando bate (±0,01), âmbar quando há divergência, com badge "OK" / "Revisar".
- **Alíquotas em uso** — mostra PIS / COFINS / ICMS do cadastro (link "Editar no Cadastro").

**3. Card principal: tabela "Itens de fatura"** — mesma estrutura já existente, mas com:
- Colunas Quant. e Preço unit (R$) destacadas em amarelo (campos de entrada).
- Colunas Valor / PIS-COFINS / ICMS / Tarifa unit. com fundo cinza claro indicando "calculado automaticamente" e ícone 🔒 que vira ✏️ se o usuário sobrescreveu manualmente.
- Linha CONT ILUMIN PÚBLICA MUNICÍPIO com placeholder visual diferenciado (só Valor).
- Linha TOTAL no rodapé com badge ao lado mostrando se bate com "Total a Pagar".

**4. Card lateral: Tributos calculados** — tabela compacta (ICMS / COFINS / PIS) preenchida automaticamente; mostra base, alíquota (lida do cadastro, read-only) e valor.

**5. Card auxiliar: "Como funciona"** — bloco curto com 3 passos visuais:
1. Digite Quant. e Preço unit. de cada linha
2. O sistema calcula Valor, tributos e tarifa "limpa"
3. Compare o Total com "Total a Pagar" da fatura e salve

**6. Barra inferior fixa** com Total calculado, status (OK/divergência) e botão **Salvar Fatura Copel**.

### Comportamento

- Carrega/salva os mesmos campos JSONB (`fatura_copel_itens`) e colunas espelho (`copel_*`) já existentes — sem migration.
- Alíquotas vêm de `energia_parametros` (igual à Memória de Cálculo).
- Auto-cálculo idêntico ao já implementado (Valor = Quant × Preço; PIS/COFINS, ICMS, Tarifa unit. derivados das alíquotas; parser pt-BR).
- Override manual continua possível em qualquer campo derivado.
- Quando salvar, atualiza também `copel_demanda_kw`, `copel_consumo_ponta_kwh`, `copel_consumo_fora_kwh` para a aba "Consumo por Cliente" da Memória ler os totais corretos (lógica de espelho já existe em `saveFaturaItens`).

### Limpeza na "Memória de Cálculo"

- Remover o card "📄 Itens da Fatura Copel" de dentro do `MemoriaCalculoTab` (passa a viver só na nova aba) — assim some a duplicação e a Memória fica focada em Fotovoltaico + Consumo por Cliente + Matriz/resultados.
- Manter no topo da Memória um indicador read-only mostrando se a Fatura Copel do mês já foi preenchida (com link "Abrir aba Fatura Copel").

### Detalhes técnicos

- Extrair lógica de fatura (state `faturaItens`, `aliquotas`, `updateFaturaItem`, useEffect de tributos, `saveFaturaItens`) para o novo componente. A Memória passa a só **ler** as colunas espelho `copel_*` para o card Consumo por Cliente.
- Reaproveitar `FaturaCopelCard` (já existe em `MemoriaCalculoTab.tsx`) — mover para `src/components/admin/energia/FaturaCopelCard.tsx` para ser usado pela nova aba (e, se quisermos, remover do arquivo antigo).
- Sem mudanças de schema, sem novas tabelas.

### Aceite

- Existe uma aba dedicada "📄 Fatura Copel" no `/admin/rateio-energia`.
- Ela mostra KPI cards no topo (Total calculado, Total a Pagar, Diferença, Alíquotas), tabela visual com colunas de entrada destacadas, tributos auto-preenchidos, status verde/âmbar quando bate/diverge, e botão Salvar.
- A Memória de Cálculo não mostra mais o mesmo card duplicado.
- Os dados salvos continuam alimentando a Memória/Consumo por Cliente como hoje.
