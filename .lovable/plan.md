

## Adicionar "Outros Anexos" ilimitados no modal de correção

Atualmente o modal de correção (`EditModal`) só permite subir anexos nos slots tipados (proposta, chamado, etc.) via `MultiFileUpload`. Falta a opção de "Outros Anexos" que já existe no formulário de nova solicitação.

### Mudanças

**1. `src/pages/MinhasSolicitacoes.tsx`**
- Adicionar estado `editOutrosAnexos` (`UploadedFile[]`) ao lado de `editAnexos`
- Resetar no `openEditModal` (linha ~406)
- Incluir upload dos "outros anexos" em `uploadNewAnexos` — iterar sobre `editOutrosAnexos` e fazer upload com tipo `outros_*`
- Passar `editOutrosAnexos` e `setEditOutrosAnexos` nas props do `EditModal`

**2. `src/components/solicitante/SolicitanteModals.tsx`**
- Adicionar `editOutrosAnexos` e `setEditOutrosAnexos` nas props de `EditModalProps`
- Abaixo do `MultiFileUpload` (linha ~343), adicionar o componente `OtherFilesUpload` com `maxFiles={99}` (ilimitado na prática)
- Importar `OtherFilesUpload` do `@/components/FileUpload`

Resultado: o solicitante poderá subir quantos anexos extras quiser na correção, além dos slots obrigatórios.

