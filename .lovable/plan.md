## O que ajustar em `MemoriaCalculoTab.tsx`

### 1. Inverter ordem das subtrações
As duas linhas de conferência hoje calculam ao contrário. Trocar para:

- **ENERGY Medidor − ENERGY Clientes**: `diffCell(emCP - sumCP, ...)` (Ponta) e `diffCell(emCF - sumCF, ...)` (Fora Ponta)  
  *(rótulo da linha também muda de "ENERGY Clientes − ENERGY Medidor" para "ENERGY Medidor − ENERGY Clientes")*
- **COPEL − ENERGY Medidor**: `diffCell(copelTotais.cp - emCP, ...)` (Ponta) e `diffCell(copelTotais.cf - emCF, ...)` (Fora Ponta)  
  *(rótulo muda de "ENERGY Medidor − Copel" para "COPEL − ENERGY MEDIDOR")*

### 2. Persistir ENTRADA MEDIDOR por competência
Hoje o `entradaMedidor` é apenas `useState` local no `ConsumoClienteCard` — perde ao trocar de competência ou recarregar.

Plano:

- Subir o estado `entradaMedidor` para o componente pai (`MemoriaCalculoTab`), do mesmo jeito que `consumoCli`.
- Reaproveitar o JSON existente `consumo_por_cliente` (em `energia_competencia_tarifas`) usando uma chave reservada `__ENTRADA_MEDIDOR__`:
  - Em `fetchCompData`: ao hidratar `ccMap`, extrair a entrada com essa chave para `setEntradaMedidor({ cp, cf })` e remover do mapa de clientes.
  - Em `saveConsumoCli`: anexar `{ cliente_key: '__ENTRADA_MEDIDOR__', consumo_ponta_kwh: entradaMedidor.cp, consumo_fora_kwh: entradaMedidor.cf, demanda_kw: '' }` ao array salvo, e ignorá-la na etapa de rateio para módulos.
- Passar `entradaMedidor` e `setEntradaMedidor` como props para `ConsumoClienteCard` (substituindo o `useState` interno).

Sem mudança de schema, sem efeito no rateio dos módulos — segue sendo só linha de conferência.

### Arquivo afetado
- `src/components/admin/energia/MemoriaCalculoTab.tsx`
