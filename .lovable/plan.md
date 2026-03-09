

## Refatorar DatePickers restantes para Popover + Calendar

### Arquivos a refatorar

| Arquivo | Campos | Status atual |
|---------|--------|--------------|
| `src/pages/NovaSolicitacao.tsx` | Data Início, Data Fim | `<Input type="date">` |
| `src/components/solicitante/SolicitanteModals.tsx` | Data emissão NF, Data vencimento boleto | `<Input type="date">` |
| `src/components/FluigDashboard.tsx` | Data Início, Data Fim | Já usa Popover+Calendar (ajuste menor) |

### Mudanças

**1. NovaSolicitacao.tsx**
- Adicionar imports: `Popover`, `PopoverTrigger`, `PopoverContent`, `Calendar`, `format`, `parseISO`, `ptBR`
- Substituir os dois `<Input type="date">` por Popover + Calendar
- Manter estado como string `yyyy-MM-dd`, exibir como `dd/MM/yyyy`

**2. SolicitanteModals.tsx**
- Mesma abordagem para Data emissão NF e Data vencimento boleto
- Adicionar imports necessários
- Converter para Popover + Calendar

**3. FluigDashboard.tsx** (ajuste menor)
- Adicionar `className="pointer-events-auto"` ao Calendar (boas práticas)
- Usar formato `dd/MM/yyyy` completo em vez de `dd/MM` para consistência

### Layout esperado

```
┌─────────────────────────┐
│ 📅  01/01/2025       ▾ │
└─────────────────────────┘
```

Ao clicar, abre calendário visual com locale pt-BR.

