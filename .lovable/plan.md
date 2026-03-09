

## Melhorar modal "Concluir Solicitação"

Substituir o `ConfirmModal` genérico por um modal dedicado com checklist de confirmação obrigatória.

### Nova UI do modal

```text
┌─────────────────────────────────────────┐
│ ✅ Concluir Solicitação                 │
│ Solicitação #2026000210                 │
│                                         │
│ Confirme antes de concluir:             │
│                                         │
│ ☐ NF recebida e conferida              │
│ ☐ Pagamento lançado no Fluig           │
│                                         │
│          [Cancelar] [Confirmar]         │
│          (desabilitado sem os 2 checks) │
└─────────────────────────────────────────┘
```

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `BackofficeModals.tsx` | Criar componente `ConcluirSolicitacaoModal` com dois checkboxes obrigatórios. Botão "Confirmar" só habilita quando ambos marcados. Substituir o uso do `ConfirmModal` para `concluir_liberada`. |
| `Backoffice.tsx` | Trocar `setConfirmAction` por um novo estado `concluirModal` (tipo `SolicitacaoBackoffice | null`). Atualizar `handleConcluirLiberada` para setar esse estado. Ajustar `handleConcluirLiberadaConfirmed` para salvar no motivo: `"NF recebida e pagamento lançado no Fluig"`. |

### Persistência

Salvar confirmação no campo `motivo` do `historico_solicitacoes`: `"NF recebida e pagamento lançado no Fluig"` — sem migration.

