Vou corrigir a edição do número Projuris para aparecer claramente também na aba **OC Emitida** e nos casos em que o número está errado/não encontrado.

Plano de ajuste:

1. **Backoffice: botão fixo de Projuris no cartão**
   - Hoje o Projuris só aparece no backoffice dentro dos chips quando a solicitação está em `aprovado` ou `em_processamento` e já tem Fluig.
   - Vou adicionar uma ação sempre visível no cartão, ao lado de **Ver Detalhes / Histórico**, para solicitações com instrumento jurídico:
     - Se já tiver número: **Editar Projuris #4009**
     - Se não tiver número: **Adicionar Projuris**
   - Isso vai funcionar também na aba **OC Emitida** (`oc_ac_emitida` / `aguardando_aceite`) e nas demais etapas posteriores.

2. **Backoffice: detalhes da solicitação também editável**
   - No modal **Ver Detalhes**, onde hoje aparece apenas “Requisição Projuris #4009 não encontrada no painel”, vou passar a ação de edição para o cartão do Projuris.
   - Assim, quando o número estiver errado e não encontrado, aparecerá o botão **Corrigir nº** dentro do próprio alerta.
   - Se o Projuris for encontrado, também aparecerá o ícone de lápis para editar.

3. **Solicitante: deixar a edição visível mesmo quando o card não está expandido**
   - O botão atual ficou escondido dentro do conteúdo expandido do card, por isso é fácil não encontrar.
   - Vou adicionar uma ação no cabeçalho do card para o dono da solicitação:
     - **Editar Projuris #4009** quando já existir número.
     - **Adicionar Projuris** quando for instrumento jurídico e ainda não existir número.
   - Vai continuar mantendo histórico pela função já criada.

4. **Ajuste técnico para permitir o modal nos detalhes**
   - Vou expor `openEditProjuris` para o componente de modais do backoffice, mantendo o mesmo fluxo atual de salvar via `update_numero_projuris`.
   - Não preciso alterar banco de dados: a função de atualização e histórico já existe.

Resultado esperado:
- Na aba **OC Emitida**, o backoffice conseguirá editar/remover o Projuris diretamente no card.
- Ao ver uma mensagem como “Projuris #4009 não encontrada no painel”, haverá botão **Corrigir nº** no local.
- O solicitante também verá a edição de Projuris sem precisar procurar dentro do card expandido.