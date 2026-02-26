

# Deep Links Bidirecionais: Painel Fluig ↔ Solicitações

## Alterações

### 1. `src/pages/PainelFluig.tsx`

**Imports:** Adicionar `useNavigate` de `react-router-dom`.

**Estado e fetch:** Após linha 134, adicionar:
- `const navigate = useNavigate()`
- Estado `linkedProtocolos: Record<string, string>` (mapa fluig_number → protocolo)
- `useEffect` que busca protocolos vinculados em 2 passos:
  1. Via `solicitacao_interna_id` direto (query em `solicitacoes` por IDs)
  2. Fallback via `numero_chamado_fluig` para snapshots sem vínculo direto

**Tabela — coluna Nº (linhas 704-713):** Abaixo do link externo do Fluig, adicionar botão condicional:
```text
{linkedProtocolos[snapshot.solicitacao_fluig] && (
  <button
    onClick={() => navigate(
      isBackofficeOrAdmin
        ? `/backoffice?search=${linkedProtocolos[snapshot.solicitacao_fluig]}`
        : `/minhas-solicitacoes?search=${linkedProtocolos[snapshot.solicitacao_fluig]}`
    )}
    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mx-auto"
  >
    <FileText className="h-3 w-3" />
    #{linkedProtocolos[snapshot.solicitacao_fluig]}
  </button>
)}
```

Também extrair `isBackofficeOrAdmin` do `useAuth()` (linha 132).

---

### 2. `src/components/FluigStatusCard.tsx`

**Imports:** Adicionar `Link` de `react-router-dom` e `ExternalLink` de `lucide-react`.

**Header (linhas 308-319):** Após o badge de situação, adicionar link:
```text
<Link
  to="/painel-fluig"
  className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto"
>
  Ver no Painel
  <ExternalLink className="h-3 w-3" />
</Link>
```

---

### Resumo de arquivos

| Arquivo | Alteração |
|---|---|
| `src/pages/PainelFluig.tsx` | Import `useNavigate`, estado `linkedProtocolos`, fetch de protocolos, botão deep link na coluna Nº, extrair `isBackofficeOrAdmin` |
| `src/components/FluigStatusCard.tsx` | Import `Link` + `ExternalLink`, link "Ver no Painel" no header do card |

