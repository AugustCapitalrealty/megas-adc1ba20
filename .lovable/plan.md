

## Remover exigência de evidência quando data for futura

### Lógica
Quando a data de execução do serviço é **futura**, o serviço ainda não foi executado, logo não faz sentido exigir evidência. A evidência só é necessária quando a data é passada ou hoje.

### Mudanças em `SolicitanteModals.tsx`

1. **Campo de evidência** (linhas 662-686): Condicionar exibição — só mostrar quando `dataExecucaoServico` está preenchida **e** não é futura.

2. **Validação do botão "Continuar"** (linha 780): Ajustar para só exigir `evidenciaFile` quando a data **não** for futura.

3. **Texto de confirmação** (linha 700-702): Ajustar mensagem para data futura — algo como "Ao confirmar, o Backoffice enviará a OC ao fornecedor antes da execução do serviço."

