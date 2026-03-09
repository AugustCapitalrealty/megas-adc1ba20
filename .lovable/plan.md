

## Melhorar modal "Registrar Envio ao Fornecedor"

Atualmente o modal é um simples `ConfirmModal` com título e descrição. A ideia é transformá-lo em um modal mais completo que coleta informações sobre o envio.

### Campos a adicionar

1. **Meio de envio** (select obrigatório): E-mail / WhatsApp / Correios / Entrega presencial / Outro
2. **Observação** (textarea opcional): campo livre para anotações
3. Exibir no modal os **dados de contato do fornecedor** (e-mail e telefone) que o solicitante informou, para referência rápida

### Persistência

- Salvar o meio de envio e observação no campo `motivo` do `historico_solicitacoes` (já existente), formatado como: `"OC enviada via E-mail. Obs: ..."` — sem necessidade de migration.

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `Backoffice.tsx` | `handleRegistrarEnvioFornecedor`: em vez de setar `confirmAction`, abre um novo estado dedicado (`envioFornecedorModal`). `handleRegistrarEnvioFornecedorConfirmed`: recebe `meioEnvio` e `observacao`, salva no `motivo` do histórico. |
| `BackofficeModals.tsx` | Substituir o uso do `ConfirmModal` genérico por um modal dedicado com select de meio de envio, exibição dos dados de contato do fornecedor, e textarea de observação. |

### UI do novo modal

```text
┌─────────────────────────────────────┐
│ ✅ Registrar Envio ao Fornecedor    │
│ Solicitação #2026000210             │
│                                     │
│ Contato do fornecedor:              │
│  📧 fornecedor@email.com            │
│  📱 (41) 99999-9999                 │
│                                     │
│ Por onde a OC foi enviada? *        │
│ [ E-mail               ▼ ]         │
│                                     │
│ Observação                          │
│ [                          ]        │
│                                     │
│        [Cancelar] [Confirmar]       │
└─────────────────────────────────────┘
```

