

# Plano: Persistir resultados de IA no banco e evitar chamadas repetidas

## Problema

Os campos `ia_cnae_status`, `ia_cnae_justificativa`, `ia_descricao_vaga`, `ia_descricao_sugestao` já existem na tabela `solicitacoes`, mas nunca são gravados. Toda vez que alguém abre os detalhes de uma solicitação (no Backoffice ou em NovaSolicitacao ao duplicar), a IA é chamada novamente via edge function. Isso gera custo desnecessário e lentidão.

## Estratégia

1. **Gravar os resultados na submissão** — No `NovaSolicitacao.tsx`, ao submeter (`handleSubmit`), salvar os resultados de IA que já estão em memória nos campos da solicitação.

2. **No Backoffice, usar dados do banco** — O `CNAECompatibilityBadge` no Backoffice recebe `descricao` e `fornecedor` e dispara a IA. Alterá-lo para aceitar um prop `cachedResult` opcional. Quando existir, exibe direto sem chamar a edge function.

3. **No NovaSolicitacao, manter IA ao vivo** — Durante a criação/edição, a IA continua rodando normalmente (o usuário está digitando, os dados mudam). Mas os resultados finais são persistidos na submissão.

## Alterações

### 1. `src/pages/NovaSolicitacao.tsx`

No `handleSubmit`, incluir os campos de cache na inserção do Supabase:
```typescript
ia_cnae_status: validationResult?.status || null,
ia_cnae_justificativa: validationResult?.justificativa_curta || null,
ia_descricao_vaga: descriptionValidation?.isVague || null,
ia_descricao_sugestao: descriptionValidation?.suggestion || null,
ia_cnae_avaliado_em: validationResult ? new Date().toISOString() : null,
ia_descricao_avaliado_em: descriptionValidation ? new Date().toISOString() : null,
```

### 2. `src/components/CNAECompatibilityBadge.tsx`

Adicionar prop `cachedResult?: { status: string; justificativa: string } | null`. Quando fornecido, renderizar diretamente sem chamar `useCNAEValidation`.

### 3. `src/pages/Backoffice.tsx`

Ao renderizar `CNAECompatibilityBadge`, passar os dados cacheados do `detalhes.solicitacao`:
```typescript
<CNAECompatibilityBadge
  descricao={detalhes.solicitacao.descricao}
  fornecedor={buildFornecedorFromDetalhes(detalhes.solicitacao)}
  cachedResult={detalhes.solicitacao.ia_cnae_status ? {
    status: detalhes.solicitacao.ia_cnae_status,
    justificativa: detalhes.solicitacao.ia_cnae_justificativa
  } : null}
/>
```

### 4. `src/hooks/useDescriptionValidation.ts`

Sem mudanças — usado apenas na criação.

## Resultado

- IA roda **uma vez** durante a criação da solicitação
- Resultados são gravados no banco na submissão
- Visualizações subsequentes (Backoffice, detalhes) usam dados do banco
- O trigger `reset_ia_cache_fields` já existe para limpar os campos se a descrição mudar (em caso de resubmissão)

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/NovaSolicitacao.tsx` | Persistir campos `ia_*` no insert |
| `src/components/CNAECompatibilityBadge.tsx` | Aceitar `cachedResult` prop |
| `src/pages/Backoffice.tsx` | Passar `cachedResult` ao badge |

