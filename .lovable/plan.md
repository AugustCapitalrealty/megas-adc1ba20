
## Implementação confirmada — pronto para execução

Todos os arquivos originais foram relidos e confirmados. O refactor está totalmente planejado. Abaixo estão os 5 arquivos completos a serem criados/reescritos.

---

### Arquivo 1 — `src/hooks/useGarantiasVigentes.ts` (reescrever)

**Mudanças-chave:**
- `GarantiaStatus` = `'vigente' | 'expirando_breve' | 'expirando' | 'expirada'`
- `calcularGarantiaDetalhe`: threshold em 60d (`expirando_breve`) e 30d (`expirando`)
- `STATUS_PRIORITY` map para comparação de "pior status"
- Campo `proximaExpiracaoDias` em cada `GarantiaItem` (usado na ordenação)
- `StatusFiltro` inclui `'expirando_breve'`
- `OrdemFiltro = 'expiracao_asc' | 'expiracao_desc' | 'valor_desc' | 'recente'`
- `garantiasFiltradas` via `useMemo` com sort integrado
- KPIs: `expirando_breve`, `valorTotal`, `valorVigentes`, `valorExpirando`, `proximaExpiracao`
- Retorna `ordem, setOrdem`

### Arquivo 2 — `src/components/garantias/GarantiaKPIs.tsx` (criar)

4 cards em `sm:grid-cols-4`:
- Vigentes (verde): count + valor vigente formatado
- Expirando <30d (laranja): count + "próxima em Xd" ou "—"
- Expirando 30–60d (âmbar): count + valor expirando
- Expiradas (vermelho): count + total expiradas

Ring highlight `ring-2 ring-offset-1 ring-primary` quando `filtroStatus === status do card`. Clique no card ativo reseta para `'todos'`. `React.memo`.

### Arquivo 3 — `src/components/garantias/GarantiaCard.tsx` (criar)

`React.memo`. Layout corrigido: tudo dentro de `<CardContent>`, incluindo o footer com border-t. Badges com 4 estados: `expirada` (vermelho), `expirando` (laranja), `expirando_breve` (âmbar claro), `vigente` (verde). Barras de progresso com cor correspondente ao status. Props: `garantia`, `infraspeakLoading`, `onToggleInfraspeak`, `onVerOriginal`.

### Arquivo 4 — `src/components/garantias/GarantiaFiltros.tsx` (criar)

`React.memo`. Grid 2 linhas: (1) busca + 4 selects + botão export; (2) select de ordenação integrado. Select de status inclui "Expirando <30d" e "Expirando 30–60d". Exportação XLSX: `Protocolo, Empreendimento, Fornecedor, CNPJ, Tipo, Dias Serviço, Dias Produto, Conclusão, Expira em (data), Dias Restantes, Valor, Infraspeak` — usando padrão da lib `xlsx` + `file-saver`.

### Arquivo 5 — `src/pages/GarantiasVigentes.tsx` (reescrever)

Slim orchestrator ~80 linhas: header fixo + `<GarantiaKPIs>` + `<GarantiaFiltros>` + estados (loading/error/empty) + lista de `<GarantiaCard>`. `handleToggleInfraspeak` permanece na página (mantém toast). Zero componentes inline.

---

### Estrutura de arquivos

```text
src/
├── hooks/
│   └── useGarantiasVigentes.ts     [REESCREVER]
├── components/garantias/           [CRIAR PASTA]
│   ├── GarantiaKPIs.tsx
│   ├── GarantiaCard.tsx
│   └── GarantiaFiltros.tsx
└── pages/
    └── GarantiasVigentes.tsx       [REESCREVER]
```
