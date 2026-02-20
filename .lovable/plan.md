
# Refatoracao: Visualizacao de Solicitacoes, Links Diretos e Retrabalho

## Problema 1: Taxa de Retrabalho mostrando 0%

### Diagnostico
A funcao `get_retrabalho_eficiencia` procura por `status_novo = 'pendente_correcao'` no historico, mas esse status **nunca aparece** na tabela. O fluxo real de correcao usa:
- `status_novo = 'aguardando_informacoes'` (acao "Solicitacao de informacoes") — 61 ocorrencias

### Correcao
Alterar a RPC para buscar `status_novo = 'aguardando_informacoes'` ao inves de `'pendente_correcao'`.

```text
-- Trecho corrigido na CTE com_retrabalho:
WHERE h.status_novo = 'aguardando_informacoes'  -- era 'pendente_correcao'
```

Isso fara o calculo refletir a realidade: das 99 solicitacoes com OC emitida, quantas passaram por devolucao de informacoes.

---

## Problema 2: Links nao funcionam para solicitacoes

### Diagnostico
Os dashboards navegam para `/minhas-solicitacoes?search=PROTOCOLO`, mas o componente `MinhasSolicitacoes` nao le parametros da URL (`useSearchParams` nao existe no codigo). O parametro e ignorado.

Alem disso, para admin/backoffice que tem acesso total, a pagina "Minhas Solicitacoes" mostra apenas as solicitacoes proprias por padrao, entao mesmo com busca o protocolo pode nao aparecer.

### Correcao
1. **Ler parametros da URL**: Adicionar `useSearchParams` ao `MinhasSolicitacoes` para inicializar `searchTerm` e `activeTab` a partir dos query params `search` e `filter`
2. **Auto-switch para visao Empreendimento**: Quando usuario admin/backoffice chega via link com `?search=`, automaticamente mudar para `viewMode = 'empreendimento'` para garantir que a solicitacao apareca
3. **Auto-expandir resultado unico**: Se a busca resultar em exatamente 1 solicitacao, expandir automaticamente o card dela

---

## Problema 3: Telas comprimidas

### Correcao
- Aumentar `max-w` do container principal do `AppLayout` (se houver restricao)
- Aumentar altura minima dos graficos no `DashboardEficiencia` (de 180px/220px para 240px/280px)
- Dar mais espaco entre secoes
- Tabela de drill-down: permitir scroll horizontal em telas menores

---

## Secao Tecnica

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| Migration SQL | Atualizar RPC `get_retrabalho_eficiencia`: trocar `pendente_correcao` por `aguardando_informacoes` |
| `src/pages/MinhasSolicitacoes.tsx` | Ler `search` e `filter` da URL; auto-switch viewMode para admin; auto-expand resultado unico |
| `src/pages/DashboardEficiencia.tsx` | Aumentar alturas dos graficos; melhorar espacamento; ajustar tabela de drill-down |
| `src/components/layout/AppLayout.tsx` | Verificar e ajustar max-width do container principal |

### Detalhes da implementacao

**MinhasSolicitacoes.tsx — leitura de URL params:**
```text
// Adicionar ao inicio do componente:
const [searchParams] = useSearchParams();

// Inicializar estados a partir da URL:
const urlSearch = searchParams.get('search') || '';
const urlFilter = searchParams.get('filter') || '';

// useEffect para aplicar params da URL:
useEffect(() => {
  if (urlSearch) {
    setSearchTerm(urlSearch);
    // Admin/backoffice com empreendimentos: auto-switch para ver tudo
    if (userEmpreendimentos.length > 0 || hasAllAccess) {
      setViewMode('empreendimento');
    }
  }
  if (urlFilter) setActiveTab(urlFilter as FilterTab);
}, [urlSearch, urlFilter]);
```

**Migration SQL — correcao da RPC:**
```text
-- Na CTE com_retrabalho, trocar:
WHERE h.status_novo = 'pendente_correcao'
-- Por:
WHERE h.status_novo = 'aguardando_informacoes'
```

**DashboardEficiencia.tsx — melhorias visuais:**
- Graficos de barras: altura 180px passa para 240px
- Tempo por Etapa: altura 220px passa para 280px
- Histograma e Evolucao Semanal: 250px passa para 280px
- Rankings: truncar nomes com max-w maior (250px ao inves de 200px)
