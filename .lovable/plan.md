

## Refatorar filtros de data do DashboardSLA

Substituir os `<Input type="date">` nativos por **Popover + Calendar** (mesmo padrão aplicado no DashboardEficiencia).

### Mudanças em `src/pages/DashboardSLA.tsx`

**Imports** — adicionar:
- `Popover, PopoverTrigger, PopoverContent` de `@/components/ui/popover`
- `Calendar as CalendarComponent` de `@/components/ui/calendar`
- `format, parseISO` de `date-fns`
- `ptBR` de `date-fns/locale/pt-BR`
- `cn` de `@/lib/utils`
- Renomear o ícone `Calendar` do lucide para `CalendarIcon` (evitar conflito com o componente Calendar)

**Bloco de filtros (linhas 253–275)** — substituir os dois `<Input type="date">` por:

```tsx
<div className="space-y-2">
  <Label className="flex items-center gap-1.5 text-xs">
    <CalendarIcon className="h-3.5 w-3.5" />
    Data Início
  </Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10",
        !filters.dataInicio && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {filters.dataInicio ? format(parseISO(filters.dataInicio), 'dd/MM/yyyy') : 'Selecionar'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <CalendarComponent
        mode="single"
        selected={filters.dataInicio ? parseISO(filters.dataInicio) : undefined}
        onSelect={(date) => handleFilterChange('dataInicio', date ? format(date, 'yyyy-MM-dd') : null)}
        locale={ptBR}
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
</div>
```

Mesmo padrão para Data Fim. Remover import de `Input` se não for mais usado.

