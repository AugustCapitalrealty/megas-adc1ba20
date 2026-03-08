

# Análise de PO: Melhorias Identificadas no App Mega AC/OC

Após análise detalhada do código, arquitetura, fluxos e componentes, segue a lista de melhorias organizadas por impacto e esforço.

---

## 1. Arquivos monolíticos (Debt Tecnico Critico)

**Problema**: `Backoffice.tsx` tem **2846 linhas** e `MinhasSolicitacoes.tsx` tem **2278 linhas**. Isso gera lentidão no desenvolvimento, bugs difíceis de rastrear e re-renders desnecessários.

**Melhoria**: Extrair em sub-componentes e custom hooks:
- Cada modal (Edit, Cancel, OC, NF/Boleto, Fluig, Projuris) vira componente próprio
- Lógica de actions (handleRegistrarOC, handleDarBaixa, etc.) vai para hooks dedicados
- Card de solicitação com render props/children para variações Backoffice vs Solicitante

---

## 2. Paginacao / Virtualização de listas

**Problema**: Todas as solicitações são carregadas de uma vez. Com crescimento do uso, a performance vai degradar (limite Supabase de 1000 rows, DOM pesado).

**Melhoria**: Implementar paginação server-side ou scroll infinito com `useInfiniteQuery` do React Query. Isso melhora tempo de carregamento e reduz uso de memória.

---

## 3. Feedback visual de SLA para o solicitante

**Problema**: O solicitante na tela "Minhas Solicitacoes" não tem visibilidade de quanto tempo sua solicitação está parada ou se o SLA está sendo cumprido.

**Melhoria**: Adicionar um indicador de tempo (badge) em cada card mostrando "há X dias neste status" com cores (verde < 3 dias, amarelo 3-5, vermelho > 5). Já existe lógica de SLA no Backoffice que pode ser reutilizada.

---

## 4. Confirmação de ações destrutivas inconsistente

**Problema**: Algumas ações criticas (rejeitar, cancelar) usam modais de confirmação, mas outras (dar baixa, registrar envio ao fornecedor) executam direto sem confirmação.

**Melhoria**: Padronizar: toda ação que muda status deve ter confirmação com resumo do que será feito.

---

## 5. Dashboard — KPIs clicáveis sem feedback de destino

**Problema**: Os KPIs do Dashboard navegam para `/minhas-solicitacoes?filter=X`, mas o filtro "com_backoffice" no modo "geral" (backoffice) leva para a tela do solicitante, não do backoffice.

**Melhoria**: No modo "geral" (backoffice), KPIs deveriam navegar para `/backoffice?tab=X` em vez de `/minhas-solicitacoes`.

---

## 6. Ausência de exportação de dados

**Problema**: Não existe funcionalidade de exportar solicitações para Excel/CSV, nem no Backoffice nem nas Minhas Solicitações. Gestores precisam de relatórios.

**Melhoria**: Adicionar botão "Exportar" no Backoffice e nos Dashboards (SLA, Eficiência) que gera planilha com os dados filtrados. A lib `xlsx` já está instalada.

---

## 7. Notificações sem "marcar todas como lidas"

**Problema**: O `NotificationBell` permite marcar uma notificação por vez como lida. Com volume alto, é improdutivo.

**Melhoria**: Adicionar botão "Marcar todas como lidas" no dropdown de notificações.

---

## 8. Busca global ausente

**Problema**: Cada página tem sua própria busca isolada. Não há busca global por protocolo/fornecedor/descrição que funcione cross-módulo.

**Melhoria**: Adicionar Command Palette (Cmd+K) usando o componente `cmdk` já instalado, permitindo busca rápida por protocolo e navegação direta.

---

## 9. Dark mode incompleto

**Problema**: Algumas cores são hardcoded (ex: `bg-green-50`, `text-amber-700` em GarantiasVigentes) sem variantes dark. O app tem `next-themes` instalado mas o suporte é parcial.

**Melhoria**: Auditar e converter cores hardcoded para usar CSS variables do design system (já definidas no Tailwind config).

---

## 10. Formulário "Nova Solicitação" sem salvamento de rascunho no banco

**Problema**: O `useFormPersistence` usa `localStorage`, que se perde ao trocar de dispositivo ou limpar cache. Um formulário com 8 steps e uploads pode ser perdido.

**Melhoria**: Salvar rascunhos no banco com status `rascunho`, permitindo retomada de qualquer dispositivo.

---

## Priorização sugerida (impacto x esforço)

| # | Melhoria | Impacto | Esforço |
|---|----------|---------|---------|
| 5 | KPIs do Dashboard navegando para rota correta | Alto | Baixo |
| 7 | Marcar todas notificações como lidas | Medio | Baixo |
| 3 | Badge de tempo no status (SLA visível) | Alto | Medio |
| 6 | Exportação Excel no Backoffice | Alto | Medio |
| 8 | Command Palette (Cmd+K) | Alto | Medio |
| 2 | Paginação server-side | Alto | Medio |
| 4 | Confirmação padronizada de ações | Medio | Baixo |
| 9 | Dark mode completo | Baixo | Medio |
| 1 | Refatorar arquivos monolíticos | Alto | Alto |
| 10 | Rascunhos no banco | Medio | Alto |

---

Qual(is) melhoria(s) gostaria de implementar primeiro?

