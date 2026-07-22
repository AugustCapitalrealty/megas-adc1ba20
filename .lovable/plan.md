Plano para corrigir a tela OC x NF zerada:

1. **Remover a dependência frágil do filtro local por empreendimento**
   - Hoje a tela busca os documentos de OC e depois filtra no front usando `userEmpreendimentos`/`hasAllAccess`.
   - Como o próprio backend já aplica as regras de acesso por usuário, vou deixar a lista respeitar o que o backend retornou, sem zerar no front por divergência de vínculo/local.

2. **Tornar a busca mais resiliente**
   - Se `documentos_emitidos` retornar OCs mas alguma consulta complementar falhar ou vier parcial, a tela não deve aparecer como “0 sol. · 0 OCs” sem explicar.
   - Vou tratar erros por etapa e exibir um aviso/estado de erro quando a leitura falhar, em vez de silenciosamente mostrar vazio.

3. **Ajustar contadores e filtros da tela**
   - Garantir que “Todas”, “Pendência de justificativa”, “Justificadas” e “0 sol. · 0 OCs” contem a mesma base de dados carregada.
   - Manter os filtros de busca, empreendimento e status funcionando, mas sem esconder tudo por erro de sincronização de permissões.

4. **Validar no navegador**
   - Testar `/monitoramento-oc` com sessão autenticada.
   - Confirmar que a tela volta a mostrar as OCs e que não há erro de rede/console relevante.

Detalhe técnico confirmado antes do plano:
- O backend tem dados: `documentos_emitidos` com 640 OCs.
- As permissões efetivas de leitura das tabelas usadas estão ativas para usuários autenticados.
- Na sessão de teste autenticada a tela carrega dados, mas o print do usuário mostra o estado zerado; por isso o ponto mais provável é o filtro/estado local eliminando resultados depois da leitura.