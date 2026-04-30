Vou corrigir a edição/remoção do número Projuris de ponta a ponta.

Problema identificado:
- A solicitação de exemplo ficou com `numero_projuris = "0"` depois da remoção.
- Por isso o histórico mostra corretamente “4009 removido”, mas logo depois registra “0 adicionado”, e a tela continua mostrando “Requisição Projuris #0 não encontrada”.
- Também existe pelo menos um fluxo fora do modal principal, no painel de compliance Projuris, que atualiza `numero_projuris` diretamente em vez de usar a função com validação/histórico centralizado.

Plano de correção:
1. Ajustar a função segura `update_numero_projuris`
   - Normalizar o valor recebido antes de salvar.
   - Tratar campo vazio, espaços, `null`, `undefined` textual e `0` como remoção do Projuris, salvando `NULL`.
   - Manter histórico correto: adicionado, removido ou alterado.

2. Corrigir a solicitação afetada agora
   - Criar uma migração para transformar `numero_projuris = '0'` em `NULL` nas solicitações existentes.
   - Isso remove o falso “#0” da tela.
   - O histórico antigo permanece preservado, mas o estado atual fica correto.

3. Ajustar o modal do Backoffice
   - Enviar `editProjurisValue.trim() || null`, igual ao fluxo do solicitante.
   - Adicionar botão explícito “Remover número” quando já existir número Projuris, para não depender de apagar o campo e salvar.
   - Atualizar também o objeto selecionado/detalhes após salvar para a tela parar de exibir o valor antigo dentro do modal de detalhes.

4. Ajustar o modal do Solicitante
   - Manter o salvamento por RPC, mas também adicionar a ação explícita “Remover número” quando aplicável.
   - Evitar qualquer reexibição de valor antigo após salvar.

5. Centralizar o painel de Compliance Projuris
   - Trocar o update direto em `solicitacoes.numero_projuris` pela mesma função `update_numero_projuris`.
   - Assim todas as inclusões/remoções passam pela mesma regra e pelo mesmo histórico.

6. Melhorar a validação visual
   - No campo Projuris, deixar claro que para remover pode usar o botão “Remover número”.
   - Impedir que “0” seja salvo como número válido de Projuris, tratando como remoção.

Arquivos esperados:
- Nova migração SQL para corrigir a função e limpar registros `0`.
- `src/pages/Backoffice.tsx`
- `src/components/backoffice/BackofficeModals.tsx`
- `src/pages/MinhasSolicitacoes.tsx`
- `src/components/monitoramento/projuris/ProjurisCompliance.tsx`