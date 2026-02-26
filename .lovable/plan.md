

# Conectar Painel Fluig ↔ Solicitações com Deep Links

## Situação Atual

- `fluig_painel_snapshot` tem campo `solicitacao_interna_id` (50 de 428 registros vinculados)
- `solicitacoes` tem campo `numero_chamado_fluig` (preenchido pelo backoffice)
- **Nenhum dos dois** exibe links de navegação cruzada na UI

## Alterações

### 1. PainelFluig — Botão "Ver Solicitação" na tabela

Na coluna "Nº" da tabela, quando o snapshot tem `solicitacao_interna_id`, adicionar um ícone-link abaixo do número Fluig que navega para `/minhas-solicitacoes?search=PROTOCOLO` (ou `/backoffice?search=PROTOCOLO` para backoffice/admin).

Para isso, preciso buscar os protocolos das solicitações vinculadas. Farei um batch query após carregar os snapshots.

| Arquivo | Alteração |
|---|---|
| `src/pages/PainelFluig.tsx` | Adicionar estado `linkedProtocolos` (mapa id→protocolo), buscar protocolos das solicitações vinculadas, renderizar link na coluna Nº |

### 2. FluigStatusCard — Botão "Ver no Painel Fluig"

Adicionar um botão/link no card que navega para `/painel-fluig` (a página já existe como rota).

| Arquivo | Alteração |
|---|---|
| `src/components/FluigStatusCard.tsx` | Adicionar link "Ver no Painel" que navega para `/painel-fluig` (não filtra, mas o usuário já sabe o número) |

### 3. Vincular automaticamente snapshots sem `solicitacao_interna_id`

Muitos snapshots não têm `solicitacao_interna_id` mas a solicitação tem `numero_chamado_fluig` preenchido. Adicionar ao PainelFluig um match por `numero_chamado_fluig` como fallback.

| Arquivo | Alteração |
|---|---|
| `src/pages/PainelFluig.tsx` | No batch query, também buscar solicitações por `numero_chamado_fluig` para snapshots sem `solicitacao_interna_id` |

## Detalhes Técnicos

**PainelFluig.tsx — Buscar protocolos vinculados:**
```text
// Após carregar snapshots, buscar protocolos:
// 1. IDs diretos via solicitacao_interna_id
// 2. Fallback via numero_chamado_fluig matching solicitacao_fluig

const linkedIds = snapshots.filter(s => s.solicitacao_interna_id).map(s => s.solicitacao_interna_id);
const unlinkedFluigNums = snapshots.filter(s => !s.solicitacao_interna_id).map(s => s.solicitacao_fluig);

// Batch queries para ambos
// Resultado: Map<fluig_number, protocolo>
```

**PainelFluig.tsx — Renderizar link na coluna Nº:**
```text
// Abaixo do número Fluig, se tem protocolo vinculado:
<button onClick={() => navigate(targetPath)} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
  <FileText className="h-3 w-3" />
  #{protocolo}
</button>
```

**FluigStatusCard.tsx — Link para o Painel:**
```text
// No header do card, ao lado do título "Status Fluig #149899":
<Link to="/painel-fluig" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
  Ver no Painel <ExternalLink className="h-3 w-3" />
</Link>
```

