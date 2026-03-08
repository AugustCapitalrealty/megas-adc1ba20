

# Exibir validações IA persistidas nas telas de visualização

## Problema atual

Os resultados de IA (CNAE e descrição) são salvos no banco durante o submit, mas:
1. **MinhasSolicitacoes** — busca os campos `ia_*` mas nunca exibe nenhum badge
2. **Backoffice** — exibe CNAE do cache, mas não exibe o alerta de descrição vaga do cache
3. Os badges só aparecem "ao vivo" durante o preenchimento do formulário

## Solução

### 1. Criar componente `DescriptionQualityBadge` (novo)

Componente simples que recebe `isVague: boolean` e `suggestion: string` do cache e exibe o badge estático (sem chamar edge function). Similar ao `CNAECompatibilityBadge` com `cachedResult`.

- Se `isVague = true`: badge amber com ícone de alerta e sugestão
- Se `isVague = false`: badge verde "Descrição adequada"
- Se `null`: não renderiza nada

### 2. Backoffice — adicionar badge de descrição

No modal de detalhes (perto do CNAE badge existente), adicionar `DescriptionQualityBadge` usando `detalhes.solicitacao.ia_descricao_vaga` e `detalhes.solicitacao.ia_descricao_sugestao`.

### 3. MinhasSolicitacoes — adicionar ambos os badges

Na área expandida de cada solicitação, exibir:
- `CNAECompatibilityBadge` com `cachedResult` dos campos `ia_cnae_status` / `ia_cnae_justificativa`
- `DescriptionQualityBadge` com `ia_descricao_vaga` / `ia_descricao_sugestao`

### 4. `get_solicitacao_detalhes` RPC

Já retorna `s.*`, então os campos `ia_*` já estão disponíveis. Nenhuma mudança no banco necessária.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/DescriptionQualityBadge.tsx` | Criar |
| `src/pages/Backoffice.tsx` | Adicionar badge descrição no modal |
| `src/pages/MinhasSolicitacoes.tsx` | Adicionar ambos badges na view expandida |

Nenhuma migration SQL necessária. Nenhuma chamada extra a edge functions — tudo lido do banco.

