## Quem está "certo"? Depende do objetivo

Os dois métodos calculam a bandeira tarifária, mas respondem a perguntas diferentes.

### Jeito da PLANILHA — "Tarifa oficial"
```text
Bandeira do cliente = ((consumo + perdas rateadas) / 100) × tarifa oficial ANEEL
tarifa oficial = valor tabelado da bandeira vigente (ex.: amarela = 2,5464 R$/100 kWh)
```
- A tarifa é **fixa**, digitada/consultada em tabela (na planilha: `PARÂMETROS COPEL!E24` via VLOOKUP).
- **Vantagem**: o cliente paga exatamente o preço público da bandeira — auditável contra a ANEEL.
- **Desvantagem**: como se cobra bandeira também sobre as **perdas técnicas**, a soma cobrada dos clientes fica **maior** que o valor de bandeira que a Copel cobrou do condomínio. Essa sobra fica com o condomínio (ou some no arredondamento).

### Jeito do APP hoje — "Rateio fechado"
```text
tarifa = (R$ total de bandeira da fatura Copel × 100) / (kWh Copel + perdas Energy)
Bandeira do cliente = ((consumo + perdas rateadas) / 100) × tarifa
```
- A tarifa é **derivada**: o total em R$ de bandeira lançado na Fatura Copel é redistribuído entre todos.
- **Vantagem**: a soma cobrada dos clientes **fecha exatamente** com o que a Copel cobrou — zero sobra e zero furo.
- **Desvantagem**: o R$/100 kWh que aparece na fatura do cliente não é o número oficial da ANEEL (fica um pouco menor, porque o denominador inclui as perdas). Isso gera questionamento de cliente que confere com a tabela pública.

### Qual é mais justo
- **Mais justo para o cliente / mais transparente**: tarifa oficial (planilha) — ele paga o preço publicado.
- **Mais justo para o rateio como um todo / sem sobra**: rateio fechado (app atual) — ninguém paga a mais nem a menos que o total real da Copel.
- **Recomendação**: usar o modo **Tarifa oficial** como padrão (é o que a planilha faz e o que o cliente consegue conferir), com o modo **Rateio fechado** disponível para quando a prioridade for fechar exatamente com a fatura da Copel.

## O que será implementado

**1. Botão de modo da bandeira (2 opções) na aba Fatura Copel**
- Toggle "Modo da bandeira": `Tarifa oficial (planilha)` | `Rateio fechado (fatura Copel)`.
- Padrão: **Tarifa oficial**.

**2. Modo Tarifa oficial**
- Seletor da bandeira vigente: Verde / Amarela / Vermelha P1 / Vermelha P2 (equivalente ao `D24` da planilha).
- Campo editável **Tarifa (R$/100 kWh)**, pré-preenchido pela tabela de referência (Verde 0,0000 · Amarela 2,5464 · Vermelha P1 4,4630 · Vermelha P2 7,8770) — equivalente ao VLOOKUP.
- Esse valor é o que vai para `bandeira_valor`.

**3. Modo Rateio fechado**
- Mantém o cálculo atual (`FaturaCopelTab.tsx:474-489`): soma dos itens de bandeira × 100 ÷ (kWh Copel + perdas Energy).

**4. Painel comparativo (sempre visível)**
Um bloco pequeno mostrando lado a lado, para o mês selecionado:
- tarifa oficial vs. tarifa derivada (R$/100 kWh);
- total de bandeira que será cobrado dos clientes em cada modo;
- total de bandeira lançado na Fatura Copel;
- a **sobra/falta** resultante do modo escolhido, com a explicação curta dos dois métodos (o texto acima, resumido, em um popover "Como é calculado").

**5. Sem mudança no motor de cálculo**
- `src/lib/energia-rateio.ts` fica inalterado — as fórmulas BM/BN/BO já replicam a planilha; só muda a origem de `bandeira_valor`.

## Detalhes técnicos
- Reaproveita a coluna existente `energia_competencia_tarifas.bandeira_valor`; o modo escolhido e a bandeira vigente ficam no JSONB `fatura_copel_itens` (chaves `bandeira_modo`, `bandeira_vigente`) — sem migração de schema.
- Competências já fechadas mantêm o valor salvo; a mudança vale para o que for recalculado daqui em diante.
- Rótulo em `MemoriaCalculoTab.tsx:157` passa a refletir o modo ativo.

## Validação
No modo Tarifa oficial com 2,5464 em 202606, a linha "Bandeira Tarifária" do Restaurante Industrial (SODEXO) deve fechar em **R$ 1.103,75**, igual à planilha.
