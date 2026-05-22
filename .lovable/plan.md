Reverter a mudança em `isFluigFechado` / `getDataConclusaoFluig` que estava reclassificando como abertos vários registros que já estavam corretamente fechados pelas aprovações.

Investigação:
- Verifiquei o registro 155232 na planilha e no banco. Ele está como `Em Aberto`, `Localização = Aprovação Financeiro`, valor R$ 7.703,70, sem `gerencia_financeiro_conclusao` nem `diretoria_conclusao`.
- Pela regra original (valor > 2500 exige aprovação da Diretoria; sem ela = aberto), 155232 já aparece corretamente na aba Abertos > Curitiba. Não havia falha nesse caso — a regra antiga já o classifica como aberto.
- A regra que mudei começou a usar `situacao` como fonte primária, o que reabriu erradamente registros `Em Aberto` mas que já tinham todas as aprovações concluídas (situação que ocorre quando o Fluig ainda não atualizou o campo Situação, mas o fluxo aprovou tudo).

Plano:
1. Restaurar a lógica original em `src/lib/fluig-utils.ts`
   - `isFluigFechado`: voltar a basear apenas em valor + aprovações (≤2500 → financeiro; >2500 → diretoria).
   - `getDataConclusaoFluig`: voltar a usar `gerencia_financeiro_conclusao` (≤2500) ou `diretoria_conclusao` (>2500).
2. Manter o campo opcional `data_fim` na interface (não atrapalha, é só tipagem).
3. Não alterar parser, hook, schema ou UI.

Após reverter, o registro 155232 deve voltar a aparecer na aba Curitiba > Abertos automaticamente (sem reimportação), e os registros que já estavam fechados continuarão fechados.