
## Estado atual
Confirmado que **nenhum dos arquivos novos foi criado ainda** — `src/components/garantias/` está vazio e o hook/página ainda estão na versão original. Posso implementar tudo do zero com clareza total.

## O que será implementado

### 1. `src/hooks/useGarantiasVigentes.ts` — reescrever completamente
- Tipo `GarantiaStatus = 'vigente' | 'expirando_breve' | 'expirando' | 'expirada'`
- `calcularGarantiaDetalhe`: thresholds em 30 e 60 dias
- `processarGarantias`: `statusGeral` segue pior status das garantias individuais
- `StatusFiltro` inclui `'expirando_breve'`
- `OrdemFiltro = 'expiracao_asc' | 'expiracao_desc' | 'valor_desc' | 'recente'`
- KPIs: adicionar `expirando_breve`, `valorTotal`, `valorExpirando`, `proximaExpiracao` (min diasRestantes entre expirando)
- Filtro aplica `filtroStatus === 'expirando'` também captura `expirando_breve` (ou filtra exato, segundo select)
- Ordenação aplicada sobre `garantiasFiltradas`
- Retorna `ordem` + `setOrdem`

### 2. `src/components/garantias/GarantiaKPIs.tsx` — criar
4 cards em grid `sm:grid-cols-4`:
- Vigentes: count + valor total vigente
- Expirando (<30d): count + "próxima: Xd"  
- Expirando breve (30–60d): count + valor
- Expiradas: count + valor
- Ring highlight `ring-2 ring-primary` quando `filtroStatus === variant`
- Clique no card define `setFiltroStatus` correspondente; segundo clique em ativo → `'todos'`
- `React.memo`

### 3. `src/components/garantias/GarantiaCard.tsx` — criar
- `React.memo`
- Layout corrigido: todo conteúdo dentro do mesmo `flex flex-col gap-3`, o footer `border-t` dentro do mesmo `CardContent`
- `GarantiaBadge` memoizado inline: trata `expirando_breve` com badge âmbar mais claro (`bg-amber-100 text-amber-600`)
- `GarantiaProgressBar` memoizado: barra âmbar para 30–60d, laranja para <30d, vermelho para expirada
- Props: `garantia`, `infraspeakLoading`, `onToggleInfraspeak`, `onVerOriginal`

### 4. `src/components/garantias/GarantiaFiltros.tsx` — criar
- `React.memo`
- Grid compacto com busca, select empreendimento, select tipo, select status (inclui "Expirando < 30d" e "Expirando 30–60d"), select ordenação, botão Exportar XLSX
- Exportação: função local que recebe `garantias` e gera XLSX usando padrão de `export-utils.ts` — colunas: Protocolo, Empreendimento, Fornecedor, CNPJ, Tipo Garantia, Dias (Serviço / Produto), Data Conclusão, Expira em (data), Dias Restantes, Valor, Infraspeak

### 5. `src/pages/GarantiasVigentes.tsx` — reescrever
- Importa os 3 novos componentes
- Hook expõe `ordem/setOrdem` adicionais
- Componente principal: cabeçalho + `<GarantiaKPIs>` + `<GarantiaFiltros>` + lista de `<GarantiaCard>` + empty/loading/error states
- Remove todos os componentes inline (KpiCard, GarantiaBadge, GarantiaProgressBar)
- `handleToggleInfraspeak` permanece na página (mantém toast)

### Arquivos
| Arquivo | Ação |
|---|---|
| `src/hooks/useGarantiasVigentes.ts` | Reescrever |
| `src/components/garantias/GarantiaKPIs.tsx` | Criar |
| `src/components/garantias/GarantiaCard.tsx` | Criar |
| `src/components/garantias/GarantiaFiltros.tsx` | Criar |
| `src/pages/GarantiasVigentes.tsx` | Reescrever |
