

## Problema

Os inputs nativos `<input type="date">` não são intuitivos:
- Visual inconsistente entre navegadores
- Não mostra calendário visual ao clicar
- Difícil selecionar datas rapidamente
- Não segue o padrão visual do resto da aplicação

---

## Solução

Substituir por **DatePicker com Popover + Calendar** do Shadcn — padrão já utilizado na aplicação que oferece:
- Calendário visual com seleção por clique
- Visual consistente com o design system
- Exibe data formatada (dd/MM/yyyy) de forma legível

### Layout proposto

```
┌─────────────────────┐   ┌─────────────────────┐
│ 📅  01/01/2025   ▾  │   │ 📅  31/01/2025   ▾  │
└─────────────────────┘   └─────────────────────┘
      Data Início              Data Fim
```

Cada campo abre um popover com calendário ao clicar.

### Mudanças técnicas

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/DashboardEficiencia.tsx` | Adicionar imports de `Popover`, `PopoverTrigger`, `PopoverContent`, `Calendar`, `format` do date-fns |
| Linha 234-249 | Substituir bloco de inputs nativos por dois `<Popover>` com `<Calendar>` |
| State | Converter `dataInicio`/`dataFim` de string ISO para objetos `Date` (ou manter string e parsear) |

### Código exemplo

```tsx
<div className="flex items-center gap-2">
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="h-8 w-[130px] justify-start text-xs">
        <Calendar className="mr-1.5 h-3.5 w-3.5" />
        {filters.dataInicio ? format(parseISO(filters.dataInicio), 'dd/MM/yyyy') : 'Data início'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={filters.dataInicio ? parseISO(filters.dataInicio) : undefined}
        onSelect={(date) => handleFilterChange('dataInicio', date ? format(date, 'yyyy-MM-dd') : '')}
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>

  <span className="text-muted-foreground text-xs">—</span>

  <Popover>
    {/* Similar para dataFim */}
  </Popover>
</div>
```

---

## Resultado esperado

- Clique no botão → abre calendário visual
- Seleciona data com um clique
- Exibe data formatada "dd/MM/yyyy" no botão
- UX consistente com padrões modernos

