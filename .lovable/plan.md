## Mudança

No modal de contrato (`ContratoModal` em `src/components/admin/energia/ContratosTab.tsx`), ocultar da lista "Módulos vinculados" qualquer módulo já usado em outro contrato.

## Como

1. Em `ContratosTab`, passar todos os vínculos para o modal via nova prop `allVinculos={vinculos}` (além de `existingVinculos`, que continua sendo só do contrato editado).
2. Em `ContratoModal`, calcular o set de `modulo_id`s usados por outros contratos:
   ```
   usedByOthers = new Set(allVinculos
     .filter(v => v.contrato_id !== contrato?.id)
     .map(v => v.modulo_id))
   ```
3. Filtrar `modulos` antes do `useMemo` de `filteredModulos`:
   ```
   modulos.filter(m => !usedByOthers.has(m.id))
   ```
   Assim eles somem da busca, do "Selecionar todos" e do contador "X selecionados".

## Comportamento

- Criar contrato novo: só aparecem módulos sem vínculo.
- Editar contrato existente: aparecem os módulos livres + os já vinculados a esse mesmo contrato (não some o que você já tinha).
- Se um módulo for desvinculado e salvo, fica disponível para outros contratos no próximo abrir.

## Validação

Abrir um novo contrato — módulos 12–17, 27–30, etc., que já estão nos contratos placeholder, não devem aparecer mais.
