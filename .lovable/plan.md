## Problema

Na aba "Consumo por Cliente", quando não há módulos vagos ativos, o rótulo "Resto p/ Vagos: 4.942,47 / 3.460,74" ainda aparece, sugerindo que existe um resto sendo cobrado de algum vago — confuso, já que os módulos 24/25/26 foram desativados.

## Correção (escopo mínimo)

Em `src/components/admin/energia/MemoriaCalculoTab.tsx`, ajustar a função `validation` (linha ~1443) e o totalizador da linha "MÓDULOS VAGOS → Mega" para deixar claro o estado "sem vagos":

1. **Linha MÓDULOS VAGOS**: quando `vagos.length === 0`, exibir `0,00` nas colunas de demanda usada / consumo ponta / consumo fora (em vez de `restoD/CP/CF`), e o rótulo "—" para identificadores (já está assim).

2. **Validação por coluna** (`validation`): quando `vagos.length === 0` e há diferença positiva (entrada < Copel), mostrar `Faltam X (sem vagos)` em âmbar — para o usuário saber que falta consumo a alocar, mas sem prometer destino "para Vagos".

3. **Distribuição (`handleSave`)**: já está correto — quando `vagos.length === 0`, nenhum lançamento é criado para módulos vagos. Manter assim (o roadmap do usuário cuida disso depois).

Nenhuma mudança em schema, fetch ou em outros arquivos. Sem impacto no cálculo da memória, só nos rótulos da UI quando não há vagos.