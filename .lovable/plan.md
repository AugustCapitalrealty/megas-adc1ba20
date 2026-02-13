
# Plano: Dashboard com Dados Reais para Todos os Usuarios

## Problema Identificado

O Dashboard atual busca solicitacoes apenas com `user_id = usuario_logado`. Usuarios como administradores ou backoffice que nao criam solicitacoes diretamente veem tudo zerado. O sistema ja tem a logica de acesso por empreendimento implementada na pagina "Minhas Solicitacoes", mas o Dashboard nao utiliza essa mesma logica.

## Solucao

Atualizar o hook `useDashboardMetrics` para considerar o papel do usuario:

1. **Admin/Backoffice**: Mostrar metricas de TODAS as solicitacoes do sistema
2. **Usuarios com acesso a empreendimentos**: Mostrar metricas das solicitacoes dos seus empreendimentos (comportamento similar ao modo "Empreendimento" da pagina Minhas Solicitacoes)
3. **Usuarios comuns**: Manter o comportamento atual (apenas suas proprias solicitacoes)

## Alteracoes

### 1. Atualizar `src/hooks/useDashboardMetrics.ts`

- Importar `useUserEmpreendimentos` para obter os empreendimentos do usuario
- Importar as flags `isBackofficeOrAdmin` e `isImpersonating` do `useAuth`
- Ajustar a query do Supabase:
  - Se admin/backoffice: buscar todas as solicitacoes (sem filtro de `user_id`)
  - Se usuario tem empreendimentos vinculados: buscar por `.in('empreendimento', userEmpreendimentos)` alem das proprias
  - Caso contrario: manter filtro `user_id` atual
- Garantir que a query nao ultrapasse o limite de 1000 linhas do Supabase (paginar ou usar count via RPC se necessario)

### 2. Atualizar `src/pages/Dashboard.tsx`

- Adicionar um toggle visual "Minhas | Geral" para admin/backoffice, similar ao toggle existente em MinhasSolicitacoes
- Ajustar o subtitulo para indicar o escopo dos dados exibidos (ex: "Visao geral de todas as solicitacoes" vs "Suas solicitacoes")
- Para backoffice/admin no modo "Geral", mostrar KPIs adicionais relevantes como volume total e distribuicao por empreendimento

### 3. Performance

- Usar `useQuery` com `staleTime` adequado para evitar re-fetches desnecessarios
- Para admin/backoffice com muitas solicitacoes, usar uma query otimizada com `COUNT` por status via RPC ao inves de trazer todos os registros para contar no frontend

## Secao Tecnica

```text
Fluxo de decisao da query:

Usuario logado
    |
    +-- E admin/backoffice?
    |       SIM --> Buscar TODAS solicitacoes (sem filtro user_id)
    |       NAO --> Tem empreendimentos vinculados?
    |                   SIM --> Buscar por user_id OU empreendimento IN (lista)
    |                   NAO --> Buscar apenas por user_id (atual)
```

**Arquivos modificados:**
- `src/hooks/useDashboardMetrics.ts` - Logica de busca contextualizada por role
- `src/pages/Dashboard.tsx` - Toggle de visualizacao e indicacao de escopo

**Nenhuma alteracao de banco de dados necessaria** - a RLS ja permite o acesso correto via `user_can_access_solicitacao`.
