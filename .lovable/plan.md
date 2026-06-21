## Problema

No modal de Contrato, vincular módulos hoje exige adicionar 1 a 1 (um Select + duas datas por linha). Para clientes com 10+ módulos isso vira uma lista enorme e repetitiva — todas as vigências costumam ser iguais (as do contrato).

## Solução

Substituir a lista linha-a-linha por um seletor em massa com vigência padrão herdada do contrato, e edição de vigência por exceção.

### Novo layout

```text
Módulos vinculados                            [3 selecionados]
┌────────────────────────────────────────────────────────────┐
│ Vigência padrão: [20/06/2026] até [—]   [Aplicar a todos]  │
│ ──────────────────────────────────────────────────────────  │
│ 🔍 Buscar módulo...           [Selecionar todos] [Limpar]   │
│ ──────────────────────────────────────────────────────────  │
│ ☑ Módulo 46   início 20/06/2026  fim —     [editar datas]  │
│ ☑ Módulo 47   início 20/06/2026  fim —     [editar datas]  │
│ ☐ Módulo 48                                                 │
│ ☑ Módulo 49   início 01/07/2026  fim —     [editar datas]  │
│ ☐ Módulo 50                                                 │
│ ...                                                         │
└────────────────────────────────────────────────────────────┘
```

### Comportamento

- **Lista única** de todos os módulos disponíveis com checkbox. Cada linha mostra o identificador e, se marcado, as datas atuais inline.
- **Busca** por identificador no topo (filtra a lista).
- **Selecionar todos / Limpar** opera apenas sobre o filtro visível.
- **Vigência padrão**: dois date inputs herdando `vigencia_inicio`/`vigencia_fim` do contrato. Ao marcar um módulo, ele assume a vigência padrão.
- **Aplicar a todos**: sobrescreve a vigência de todos os módulos já selecionados.
- **Editar datas por linha** (popover): só aparece em módulos selecionados que precisam de vigência diferente. Mostra um badge "vigência custom" para sinalizar exceção.
- **Contador** no header ("3 selecionados") e ordenação: selecionados primeiro, depois alfabético/numérico.
- **Vínculos existentes** (com `id`) preservam seu `id` ao serem mantidos; desmarcar marca `_delete: true` (mesma lógica atual de sync).

### Detalhes técnicos

- Arquivo: `src/components/admin/energia/ContratosTab.tsx` — substituir somente o bloco "Módulos vinculados" dentro de `ContratoModal` (linhas ~426-469). Lógica de save (`handleSave`) e estrutura `vinculosDraft` ficam inalteradas — apenas a UI muda.
- Reusar `Checkbox`, `Popover`, `Input`, `Button` do design system.
- Sem alterações em schema, RLS ou em `handleSave`.

### Fora de escopo

- Não mexer em outras abas (FaturaCopel, Lançamentos, Faturas).
- Não alterar regras de negócio de vigência sobreposta (já tratadas no backend).
