

# Plano: Ajustar fuso horário para Brasília (America/Sao_Paulo)

## Problema

O app usa `new Date()` e `format()` do date-fns sem especificar timezone. Em servidores/navegadores fora do Brasil, as datas/horas podem aparecer erradas. Apenas 1 lugar no código usa `timeZone: 'America/Sao_Paulo'` explicitamente.

## Abordagem

Criar um utilitário centralizado de formatação de datas com timezone de Brasília e substituir os usos espalhados pelo código.

### 1. `src/lib/date-utils.ts` — Novo arquivo

Criar funções utilitárias que forçam o timezone de Brasília:

```typescript
const TZ = 'America/Sao_Paulo';

// Formata data com timezone de Brasília usando Intl.DateTimeFormat
export function formatDateBR(date: Date | string, options?: { showTime?: boolean }): string;

// Retorna "agora" no fuso de Brasília (para comparações)
export function nowBrasilia(): Date;
```

### 2. Substituir `toLocaleDateString` sem timezone

Arquivos afetados:
- `src/components/FornecedorCard.tsx` — adicionar `{ timeZone: TZ }`
- `src/components/RateioCard.tsx` — adicionar `{ timeZone: TZ }`
- `src/pages/NovaSolicitacao.tsx` — adicionar `{ timeZone: TZ }`

### 3. Substituir `format(new Date(...))` do date-fns

O `date-fns` `format` não suporta timezone nativamente. Para exibição de datas com hora (ex: `"dd/MM/yyyy 'às' HH:mm"`), usar `date-fns-tz` ou `Intl.DateTimeFormat` com timezone.

Instalar `date-fns-tz` e usar `formatInTimeZone`:

```typescript
import { formatInTimeZone } from 'date-fns-tz';
const TZ = 'America/Sao_Paulo';

// Em vez de: format(new Date(created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
// Usar: formatInTimeZone(created_at, TZ, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
```

Arquivos com `format()` que exibem hora (prioritários):
- `src/pages/Backoffice.tsx` — created_at, updated_at com HH:mm
- `src/components/JuridicoTracker.tsx` — created_at com HH:mm
- `src/components/SolicitacaoMessages.tsx` — created_at com HH:mm
- `src/components/SolicitacaoTimeline.tsx` — timestamps com hora
- `src/components/NotificationBell.tsx` — timestamps

Arquivos com `format()` que exibem só data (menos críticos, mas devem ser consistentes):
- `src/pages/PainelFluig.tsx`
- `src/pages/DashboardSLA.tsx`
- `src/components/FluigDashboard.tsx`
- `src/components/admin/SolicitacoesManagement.tsx`
- `src/components/monitoramento/TabProjuris.tsx`
- `src/pages/GarantiasVigentes.tsx`

### 4. `new Date().toISOString()` para gravar no banco

Estes estão corretos — `.toISOString()` sempre gera UTC, e o Supabase armazena em UTC. Não precisa mudar.

## Resultado

Todas as datas e horários exibidos no app estarão no fuso de Brasília (UTC-3), independente de onde o navegador do usuário estiver.

