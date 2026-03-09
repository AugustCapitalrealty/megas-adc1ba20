

## Refatorar botão "Visualizar OC" para indicar ação de liberação

### Problema
O botão "Visualizar OC" no banner verde não transmite a intenção real: o solicitante precisa **liberar** a OC para o fornecedor, não apenas visualizar.

### Mudanças

**`src/components/solicitante/SolicitanteSolicitacaoCard.tsx`** (banner verde):
- Texto do botão: "Visualizar OC" → **"Liberar OC"**
- Ícone: `FileText` → `Send` (reforça a ideia de envio/liberação)
- Subtexto do banner: "Visualize e libere para o fornecedor" → **"Revise e libere a OC para o fornecedor"**
- Estilo do botão: manter branco mas com cor mais chamativa (borda + texto mais forte)

**`src/components/solicitante/SolicitanteModals.tsx`** (título do modal):
- Step `'revisar'`: "Visualizar OC" → **"Revisar OC"** (dentro do modal faz sentido "revisar" antes de liberar)
- Botão interno de visualização do PDF mantém "Visualizar OC" pois ali é literalmente abrir o documento

