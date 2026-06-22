## Objetivo

Adicionar uma nova seção na aba **Fatura Copel** (`FaturaCopelTab.tsx`) chamada **"Medidor (Energy)"**, logo abaixo da tabela de itens da Copel. Essa seção registra as perdas medidas no Energy e mostra automaticamente a diferença que sobrou entre o consumo dos clientes e o que a Copel cobrou.

## Como vai funcionar

A nova seção tem dois blocos:

### Bloco 1 — Diferença da Fatura Copel (somente leitura)

Calculada automaticamente:

```text
Soma consumo clientes Ponta   −   Consumo Ponta na fatura Copel   =   Diferença Ponta
Soma consumo clientes Fora    −   Consumo Fora na fatura Copel    =   Diferença Fora
```

- Soma do consumo dos clientes vem de `energia_competencia_lancamentos` (colunas `consumo_ponta_kwh` / `consumo_fora_kwh`) da competência atual.
- Consumo da Copel vem dos campos `copel_consumo_ponta_kwh` / `copel_consumo_fora_kwh` (já salvos pelos itens TE/USD Ponta/Fora desta mesma aba).
- Mostrar Ponta, Fora e Total, com badge informando se é positivo (sobra) ou negativo (faltou).

### Bloco 2 — Medidor (Energy)

Tabela com 3 linhas (Ponta, Fora da Ponta, Total), e duas colunas:

| Linha | Perdas identificadas no Energy (input) | Perdas Totais (calculado) |
|---|---|---|
| Ponta | usuário digita | `Energy Ponta + Diferença Copel Ponta` |
| Fora da Ponta | usuário digita | `Energy Fora + Diferença Copel Fora` |
| Total | soma | soma |

- Os valores digitados são salvos em `perdas_energy_ponta_kwh` e `perdas_energy_fora_kwh` (colunas já existentes em `energia_competencia_tarifas`).
- As "Perdas Totais" calculadas alimentam os campos `perdas_copel_ponta_kwh` / `perdas_copel_fora_kwh` no save (que o engine de rateio em `energia-rateio.ts` já soma com `perdas_energy_*` em `perdasPontaTotal/perdasForaTotal`). Assim a memória de cálculo passa a refletir as perdas reais sem dupla contagem — para evitar somar duas vezes, gravaremos `perdas_copel_*` recebendo apenas a **diferença** da fatura Copel (o componente do Energy continua no campo `perdas_energy_*`).

## Comportamento

- Bloqueado quando a competência está fechada (mesma regra dos outros campos).
- Reage em tempo real à edição dos itens Copel (a diferença recalcula sozinha).
- Persiste junto com o botão **"Salvar Fatura Copel"** já existente.
- Se não houver lançamentos de clientes ainda, mostra "—" na diferença e um hint para preencher na Memória de Cálculo.

## Detalhes técnicos

Arquivo único alterado: `src/components/admin/energia/FaturaCopelTab.tsx`

1. No `fetchComp`, carregar também `perdas_energy_ponta_kwh`, `perdas_energy_fora_kwh` da tarifa e a soma de `consumo_ponta_kwh / consumo_fora_kwh` de `energia_competencia_lancamentos` da competência (filtrado por `competencia_id`).
2. Novo estado: `energyPonta`, `energyFora` (strings BR), `clientesPonta`, `clientesFora` (números).
3. Memos para `difCopelPonta`, `difCopelFora`, `perdasTotaisPonta`, `perdasTotaisFora`.
4. Render: novo `Card` "Medidor (Energy) & Diferença Copel" abaixo do grid `Itens + Tributos`.
5. No `save()`, adicionar ao update:
   - `perdas_energy_ponta_kwh: parseBR(energyPonta)`
   - `perdas_energy_fora_kwh: parseBR(energyFora)`
   - `perdas_copel_ponta_kwh: max(0, difCopelPonta)`
   - `perdas_copel_fora_kwh: max(0, difCopelFora)`

Nenhuma migração necessária — todas as colunas já existem em `energia_competencia_tarifas`.