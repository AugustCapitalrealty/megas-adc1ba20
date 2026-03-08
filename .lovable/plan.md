
# Melhorias do Painel de Garantias

## Diagnóstico

Analisando `GarantiasVigentes.tsx` (334 linhas) e `useGarantiasVigentes.ts`, identifiquei:

1. **Bug de layout** — o `</div>` do grid fecha antes do footer do card, quebrando a estrutura visual
2. **KPIs incompletos** — sem valor total em garantia, sem indicador ativo ao clicar
3. **Sem ordenação** — só filtra, mas não ordena (urgente primeiro, maior valor, etc.)
4. **Sem exportação** — não há como exportar a lista para Excel
5. **Componentes inline** — KpiCard, GarantiaBadge, GarantiaProgressBar não têm `React.memo`, recriados a cada render
6. **Threshold de expiração fixo** — apenas 30 dias, falta nível de alerta "60 dias"

---

## O que será feito

### 1. Extrair componentes → `src/components/garantias/`

```text
src/components/garantias/
├── GarantiaKPIs.tsx       ← KPIs ricos com valor total + indicador ativo
├── GarantiaCard.tsx       ← Card memoizado com layout corrigido
└── GarantiaFiltros.tsx    ← Filtros + ordenação numa barra compacta
```

### 2. KPIs enriquecidos (`GarantiaKPIs.tsx`)

Adicionar 4º card + subtextos com valor:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Vigentes:12 │ │ Expirando: 3 │ │ Expiradas: 5 │ │ Valor Total  │
│  R$ 2,4M     │ │ próx: 8 dias │ │ R$ 890K      │ │ R$ 3,3M      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- Ring highlight no KPI ativo (igual ao `BackofficeKPIs`)
- Subtexto com "próxima expiração em X dias" no card de Expirando

### 3. Ordenação + Exportação

Adicionar ao hook:
```typescript
export type OrdemFiltro = 'expiracao_asc' | 'expiracao_desc' | 'valor_desc' | 'recente';
```

Na barra de filtros: Select de ordenação + botão **Exportar XLSX**

Exportação com colunas: Protocolo, Empreendimento, Fornecedor, Tipo, Dias Contratados, Data Conclusão, Expira em, Dias Restantes, Valor, Infraspeak

### 4. Correção do bug de layout

O `</div>` de fechamento do grid de barras de progresso está fora do lugar, deixando o footer fora do `CardContent`. Será corrigido no `GarantiaCard.tsx`.

### 5. Nível de alerta 60 dias

No hook e nos badges: `status = 'expirando_breve'` (30–60 dias) com cor âmbar mais clara, além de `'expirando'` (< 30 dias) em âmbar escuro.

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/garantias/GarantiaKPIs.tsx` | Criar |
| `src/components/garantias/GarantiaCard.tsx` | Criar |
| `src/components/garantias/GarantiaFiltros.tsx` | Criar |
| `src/hooks/useGarantiasVigentes.ts` | Editar — ordenação, valor total, 2 níveis de alerta |
| `src/pages/GarantiasVigentes.tsx` | Refatorar — usar novos componentes, botão export |
