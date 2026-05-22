Identifiquei o problema na planilha enviada: ela tem 36 linhas com `Situação = Em Aberto`, mas 19 delas estão sendo classificadas como fechadas porque a regra atual considera apenas as datas de aprovação Financeiro/Diretoria. Exemplo: solicitações em `Execução Serviço Contratado` continuam `Em Aberto`, mas têm aprovações preenchidas, então somem da aba Abertos.

Plano de correção:

1. Ajustar a regra central `isFluigFechado`
   - Priorizar a coluna `situacao` da planilha como fonte principal.
   - `Finalizada`/`Finalizado` = fechado.
   - `Cancelada`/`Cancelado` continua cancelado.
   - `Em Aberto` nunca deve ser tratado como fechado, mesmo com aprovações preenchidas.
   - Manter fallback por aprovações apenas quando a situação vier vazia ou indefinida.

2. Ajustar `getDataConclusaoFluig`
   - Usar `data_fim` quando a solicitação estiver realmente finalizada.
   - Evitar mostrar data de conclusão em registros `Em Aberto` só porque uma aprovação intermediária foi concluída.

3. Atualizar o tipo compartilhado do snapshot
   - Incluir `data_fim` na interface usada pelos utilitários, sem alterar schema do banco.

4. Validar com a planilha enviada
   - Confirmar que os 36 registros `Em Aberto` passam a aparecer na aba Abertos.
   - Confirmar que cancelados continuam na aba Cancelados e finalizados continuam na aba Fechados.

Arquivos previstos:
- `src/lib/fluig-utils.ts`

Sem mudança de banco de dados.