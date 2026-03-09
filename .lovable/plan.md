
## Correção — Barra de Filtros de Data

### Problema
Na barra de filtros, o ícone `<Calendar>` do lucide-react está posicionado dentro de um sub-`div` junto com apenas o primeiro input de data, mas visualmente fica desalinhado porque:
1. O `input[type="date"]` nativo já tem seu próprio ícone de calendário embutido no browser (visível na screenshot)
2. O ícone lucide fica "flutuando" à esquerda do primeiro campo mas fora do segundo
3. A proporção e espaçamento ficam irregulares

### Solução
Redesenhar o bloco de datas para parecer um **range picker unificado** — um único container com borda, o ícone do calendário à esquerda, os dois inputs separados por "—", sem bordas individuais nos inputs internos:

```tsx
<div className="flex items-center gap-1.5 border rounded-md px-2.5 h-8 bg-background">
  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  <input type="date" className="text-xs bg-transparent border-none outline-none w-[110px]" ... />
  <span className="text-muted-foreground text-xs">—</span>
  <input type="date" className="text-xs bg-transparent border-none outline-none w-[110px]" ... />
</div>
```

Usar `<input>` nativo (não o `<Input>` do shadcn) com estilos customizados para remover a borda individual e fundir os dois campos em um container visual único.

### Arquivo alterado
`src/pages/DashboardEficiencia.tsx` — apenas o bloco de linhas 234–251.
