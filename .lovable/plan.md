## Objetivo

Logo abaixo do bloco de totais atual (TOTAL Preenchido / TOTAL Fatura Copel / Diferença Copel−Preenchido) na aba **Memória de Cálculo → Consumo por Cliente**, acrescentar:

1. **Linha editável "ENTRADA MEDIDOR"** — dois inputs (Consumo Ponta kWh e Consumo Fora Ponta kWh). Coluna de Demanda fica em branco (não se aplica).
2. **Linha "ENERGY Clientes − ENERGY Medidor"** — diferença automática (TOTAL Preenchido dos clientes menos ENTRADA MEDIDOR), apenas em Consumo Ponta e Fora Ponta.
3. **Linha "ENERGY Medidor − Copel"** — diferença automática (ENTRADA MEDIDOR menos TOTAL Fatura Copel), apenas em Consumo Ponta e Fora Ponta.

As duas linhas de diferença usam o mesmo formatador `diffCell` (com sinal e cor) já em uso.

## Onde

Arquivo: `src/components/admin/energia/MemoriaCalculoTab.tsx`, dentro de `ConsumoClienteCard` (linhas ~1352–1528), logo após a linha "Diferença (Copel − Preenchido)" (linhas 1508–1513).

## Persistência

O valor de ENTRADA MEDIDOR é salvo por competência junto com o restante do consumo do cliente (mesmo mecanismo `consumoCli`/`updateConsumoCli` ou estado paralelo `entradaMedidor` propagado via props para o componente pai). Não altera o cálculo de rateio para módulos — é apenas conferência. Não há mudança de schema obrigatória; em primeira versão fica em estado local da competência atual (mesma estratégia atual dos campos Copel quando aplicável).

## Não muda

- Lógica de rateio para módulos.
- Estrutura de banco de dados.
- Outras abas (Faturas, Contratos, Copel, etc.).
- Botão "Salvar e Ratear para Módulos".
