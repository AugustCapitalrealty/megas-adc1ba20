
**Exploration & Diagnostics**
Analisei os arquivos atuais do painel de garantias (`GarantiasVigentes.tsx` e `useGarantiasVigentes.ts`) e observei pontos de atenção e oportunidades de melhoria semelhantes aos que resolvemos no backoffice e na visão de solicitantes. Identifiquei os seguintes problemas:

1. **Bug de layout**: O fechamento `</div>` do grid das barras de progresso está fora do lugar, fazendo com que o rodapé (com os botões Infraspeak e Ver OC) fique fora do `CardContent`.
2. **KPIs Incompletos e Estáticos**: Falta o somatório do valor em garantia e falta um indicador visual (anel de destaque) que mostre qual KPI está filtrando a tela no momento.
3. **Falta de Ordenação**: Os usuários podem filtrar, mas não conseguem ordenar as garantias por proximidade de expiração ou pelo maior valor envolvido.
4. **Sem Exportação para Excel**: Em listas importantes como a de garantias, a exportação (XLSX) é essencial para auditoria e acompanhamento, e atualmente não está disponível.
5. **Componentes Inline Causando Re-renders**: Elementos como `KpiCard`, `GarantiaBadge` e `GarantiaProgressBar` não são componentes desacoplados com `React.memo`, sendo recriados desnecessariamente.
6. **Alertas de Expiração Fixos**: O sistema só alerta se a garantia vencer em < 30 dias. Um nível extra (como 60 dias) daria maior margem de ação.

**Proposed Implementation Plan**

Para resolver esses pontos de forma definitiva e performática, vou dividir a lógica monolítica em componentes dedicados e melhorar o gerenciamento de estado.

**1. Extração de Componentes (`src/components/garantias/`)**:
- `GarantiaKPIs.tsx`: Exibirá os cards resumidos no topo (Vigentes, Expirando, Expiradas, Valor Total), incluindo o valor monetário formatado e o indicador ativo clicável.
- `GarantiaCard.tsx`: Extração da renderização do card individual da garantia com `React.memo`. Incluirá a correção estrutural do DOM e as badges.
- `GarantiaFiltros.tsx`: Uma barra compacta contendo busca, filtros de empreendimento/tipo/status, novo Select de ordenação, e botão de exportação.

**2. Refatoração do Hook (`useGarantiasVigentes.ts`)**:
- **Novo Status**: Adicionar o status `expirando_breve` (30–60 dias), exibindo uma cor de alerta mais branda (âmbar), reservando a cor mais intensa para < 30 dias.
- **Ordenação (`OrdemFiltro`)**: Implementar a lógica para ordenar por `expiracao_asc`, `expiracao_desc`, `valor_desc` ou `recente`.
- **Valores Totais**: Adicionar no objeto de KPIs os cálculos de `valorTotal` e `valorExpirando` somando os valores em BRL.

**3. Atualização da Página Principal (`src/pages/GarantiasVigentes.tsx`)**:
- Simplificar drasticamente o arquivo (reduzindo centenas de linhas), delegando as responsabilidades para os três novos componentes criados.
- Implementar a função de exportação combinando a biblioteca `xlsx` com a listagem de garantias já filtradas.
