

## Validação de data de execução do serviço

### Regra
- Data no passado ou hoje: fluxo normal (serviço já executado)
- Data no futuro: exibir campo obrigatório "Motivo do fornecedor receber a OC antes da execução"

### Mudanças em `SolicitanteModals.tsx`

**Props**: adicionar `motivoOCAntes: string` e `setMotivoOCAntes` (estado gerenciado em `MinhasSolicitacoes.tsx`).

**Step `tipo_entrega`** (linhas ~617-658): Após o campo de data, verificar se a data é futura. Se sim, exibir:
- Alerta amarelo: "A data informada é futura — o fornecedor receberá a OC antes da execução do serviço"
- Textarea obrigatório: "Motivo *"

**Botão "Continuar"** (linha 746): adicionar validação — se data futura, `motivoOCAntes` obrigatório.

**Step `confirmar`** (linha ~684): exibir o motivo no resumo quando presente.

**`MinhasSolicitacoes.tsx`**: adicionar estado `motivoOCAntes`, passar para modal, salvar no histórico da solicitação junto com a transição de status.

**DB**: O motivo será salvo como observação no `historico_solicitacoes` (campo `observacao` existente), sem necessidade de migration.

