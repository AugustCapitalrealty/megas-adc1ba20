# Reorganização da Navegação Principal

Vamos reorganizar o menu superior para refletir o uso real da plataforma:

1. **Garantias** sai da navegação principal e passa a viver dentro do menu **Admin** (acesso restrito a backoffice/admin como hoje).
2. Surge uma nova aba pública **Calendário** no lugar de Garantias, visível para todos os perfis (cada usuário vê apenas seus empreendimentos — a regra já existe no hook `useCalendarioServicos`).
3. **Painel Fluig** vira simplesmente **Painel**, agrupando duas sub-abas internas:
   - **Fluig** (conteúdo atual da página)
   - **Projuris** (mesmo conteúdo já existente em Monitoramento → Projuris)

## Mudanças por arquivo

### `src/components/layout/AppLayout.tsx`
- `mainNavItems`: 
  - Trocar `'/garantias' / Garantias / Shield`  →  `'/calendario' / Calendário / CalendarDays` com `show: true` (todos os perfis).
  - Renomear o label `'Painel Fluig'`  →  `'Painel'` (rota `/painel-fluig` mantida para não quebrar links).
- `adminItems`: adicionar `{ href: '/garantias', label: 'Garantias', icon: Shield }` no topo da lista.
- `prefetchRoute`: adicionar `'/calendario': () => import('@/pages/Calendario')`.

### `src/App.tsx`
- Adicionar lazy import `const Calendario = lazy(() => import("./pages/Calendario"));`
- Nova rota dentro do `ProtectedShell`: `<Route path="calendario" element={<Calendario />} />`
- Manter `garantias` como está (a proteção de visualização já é por dados; o item só desaparece da nav principal e aparece sob Admin).

### `src/pages/Calendario.tsx` (novo)
Página fina que reaproveita o componente já existente:
```tsx
import { CalendarDays } from 'lucide-react';
import { CalendarioServicos } from '@/components/monitoramento/calendario/CalendarioServicos';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';

export default function Calendario() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos, hasAllAccess, loading } = useUserEmpreendimentos(effectiveUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário de Serviços</h1>
          <p className="text-muted-foreground text-sm">
            Veja os serviços agendados e executados nos seus empreendimentos
          </p>
        </div>
      </div>
      <CalendarioServicos
        userEmpreendimentos={empreendimentos}
        hasAllAccess={hasAllAccess}
        enabled={!loading}
      />
    </div>
  );
}
```
Nota: confirmar a assinatura exata de `<CalendarioServicos />` durante a implementação e ajustar props se necessário.

### `src/pages/PainelFluig.tsx`
Refatorar a página para envolver o conteúdo atual em um `<Tabs>` com duas sub-abas:
- **Fluig** → mantém todo o JSX atual da página (KPIs, tabela, modais, etc.) movido para dentro de `<TabsContent value="fluig">`.
- **Projuris** → renderiza `<TabProjuris />` (`@/components/monitoramento/TabProjuris`), reaproveitando o componente já usado em `MonitoramentoOC`.
- Atualizar o título da página para "Painel" (mantém ícone `BarChart3`).

### `src/pages/MonitoramentoOC.tsx`
Remover a aba **Projuris** da `TabsList` para evitar duplicidade (Projuris passa a viver no Painel). O hook/import e `TabsContent value="projuris"` também são removidos. Permanecem **OC x NF** e **Calendário de Serviços** (este último continua útil ali como visão de OCs/serviços agendados; se preferir remover por ser redundante com a nova aba global, posso retirar — me diga).

### `src/components/layout/AppBreadcrumbs.tsx`
- Adicionar `'/calendario': 'Calendário'` no `ROUTE_LABELS`.
- Atualizar `'/painel-fluig': 'Painel'`.

### `src/components/CommandPalette.tsx`
- Atualizar a entrada de "Painel Fluig" → "Painel".
- Adicionar atalho de navegação para `/calendario`.

## Pontos a confirmar
- **Aba Calendário em Monitoramento**: mantenho ou removo, já que existirá uma aba global? (default proposto: manter para não perder o contexto operacional dentro de Monitoramento).
- **Acesso a Garantias**: hoje o item aparece para `!isSolicitante` (backoffice/admin). Ao mover para o submenu Admin, o item ficará visível apenas no dropdown Admin (que só aparece para `isAdmin`). Se backoffice (não-admin) também precisar acessar Garantias, manteremos o item adicional no nav principal só para `isBackofficeOrAdmin && !isAdmin`. Confirme qual comportamento prefere.
