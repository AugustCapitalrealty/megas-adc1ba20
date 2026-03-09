

## Tornar telefone e e-mail do fornecedor obrigatórios na liberação da OC

### Mudanças em `SolicitanteModals.tsx`

1. **Label** (linha 730): Trocar "(opcional)" por "*(obrigatório)*"

2. **Campos** (linhas 732-741): Adicionar `required` nos inputs de e-mail e telefone

3. **Botão "Confirmar Liberação"** (linha 794): Adicionar validação — desabilitar se `fornecedorEmailContato` ou `fornecedorTelefoneContato` estiverem vazios

4. **Texto de ajuda** (linhas 743-746): Atualizar para indicar obrigatoriedade

