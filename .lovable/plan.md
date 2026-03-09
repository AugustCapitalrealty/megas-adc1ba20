

## Refatoração — Simplificar Filtros de Período

### Mudanças

1. **Remover botões 7d, 30d, 90d** — manter apenas "Este mês" e "Este ano"
2. **Reorganizar layout** — botões de atalho + inputs de data + select de empreendimento inline

### Implementação

**Arquivo:** `src/pages/DashboardEficiencia.tsx`

- Linha 92-98: Simplificar `QUICK_RANGES` para apenas 2 opções:
  ```ts
  const QUICK_RANGES = [
    { label: 'Este mês', fn: () => ({ dataInicio: formatBR(startOfMonth(new Date()), 'yyyy-MM-dd'), dataFim: formatBR(new Date(), 'yyyy-MM-dd') }) },
    { label: 'Este ano', fn: () => ({ dataInicio: formatBR(startOfYear(new Date()), 'yyyy-MM-dd'), dataFim: formatBR(new Date(), 'yyyy-MM-dd') }) },
  ] as const;
  ```

- Linha 140-150: Simplificar `applyQuickRange` já que todos têm `fn`:
  ```ts
  const applyQuickRange = (range: typeof QUICK_RANGES[number]) => {
    const dates = range.fn();
    setFilters(prev => ({ ...prev, ...dates }));
  };
  ```

- Remover import `subDays` (linha 2) se não for mais usado em outro lugar — verificar uso em `getDefaultDates()`. Manter pois é usado lá.

