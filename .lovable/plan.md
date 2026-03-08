

# Análise de PM: Melhorias Estratégicas para o App Mega AC/OC

Olhando o app sob a ótica de Product Manager — focando em adoção, retenção, experiência do usuário e valor de negócio.

---

## 1. Onboarding inexistente para novos usuários

**Problema**: Após aprovação, o usuário cai direto no Dashboard sem nenhum guia. O formulário "Nova Solicitação" tem 8 steps complexos. A taxa de abandono provavelmente é alta para novos usuários.

**Melhoria**: Implementar um fluxo de welcome/onboarding com:
- Tela de boas-vindas pós-aprovação com 3-4 dicas rápidas (tooltip tour)
- Empty state no Dashboard com CTA claro "Crie sua primeira solicitação"
- Checklist de primeiros passos (configurar perfil, criar primeira solicitação)

**Impacto**: Reduz time-to-value para novos usuários. **Esforço**: Médio

---

## 2. Ausência de Error Boundary global

**Problema**: Não existe nenhum ErrorBoundary no app. Um erro JS em qualquer componente causa tela branca sem feedback. O usuário perde contexto e não sabe o que aconteceu.

**Melhoria**: Adicionar ErrorBoundary global no App.tsx + ErrorBoundaries por rota, com tela amigável "Algo deu errado" + botão de retry + opção de reportar.

**Impacto**: Reduz tickets de suporte, melhora confiança. **Esforço**: Baixo

---

## 3. Feedback de progresso no formulário multi-step

**Problema**: O `NovaSolicitacao` tem 2047 linhas e 8 steps. Não há indicação clara de "quanto falta" ou estimativa de tempo. Usuário não sabe se está no começo ou no fim.

**Melhoria**: 
- Adicionar barra de progresso percentual (não só steps)
- Mostrar "Passo 3 de 8 — Aprox. 5 min restantes"
- Salvar progresso automaticamente com indicador visual "Rascunho salvo"

**Impacto**: Reduz abandono de formulário. **Esforço**: Baixo

---

## 4. Notificações apenas in-app, sem resumo por email

**Problema**: As notificações existem mas são apenas in-app (NotificationBell com realtime). Se o usuário não está logado, perde ações urgentes como prazo de correção expirando.

**Melhoria**: Adicionar digest de notificações por email (diário ou semanal configurável pelo admin). Já existe infra de email (`send-notification-email`), basta criar uma edge function de digest.

**Impacto**: Reduz tempo de resposta em ações pendentes. **Esforço**: Médio

---

## 5. Sem métricas de uso/adoção

**Problema**: Não há tracking de eventos. O PM não sabe: quantos formulários são abandonados? Qual step tem mais desistência? Qual feature é mais usada? Quanto tempo leva para completar o formulário?

**Melhoria**: Adicionar tracking leve de eventos-chave:
- Formulário: step_viewed, step_completed, form_abandoned, form_submitted
- Backoffice: action_taken (type, status_change)
- Dashboard: kpi_clicked, view_mode_changed
- Usar tabela no banco (sem dependência externa) ou integrar com analytics

**Impacto**: Fundamental para decisões de produto baseadas em dados. **Esforço**: Médio

---

## 6. Falta de feedback de "sucesso" nas ações do Backoffice

**Problema**: Ao aprovar, rejeitar ou processar uma solicitação, o toast de sucesso é genérico e desaparece rápido. O analista não tem certeza visual de que a ação foi processada — especialmente em listas longas onde o card some do filtro atual.

**Melhoria**: 
- Toast persistente com link para a solicitação processada
- Animação de saída suave do card (fade-out) ao mudar de status
- Counter de "X processadas hoje" no header do Backoffice

**Impacto**: Melhora confiança e produtividade do analista. **Esforço**: Baixo

---

## 7. Página de "Aguardando Aprovação" é um dead-end

**Problema**: Após cadastro, o usuário vê "Aguardando Aprovação" mas não tem nenhuma indicação de quanto tempo levará, quem aprovar, ou o que fazer. Sem refresh automático — tem que fazer logout/login para verificar.

**Melhoria**: 
- Adicionar polling/realtime para detectar aprovação automaticamente
- Mostrar "Você é o Xº na fila" ou "Pedido enviado há X horas"
- Link de contato do admin ou email de suporte

**Impacto**: Reduz frustração de novos usuários. **Esforço**: Baixo

---

## 8. Duplicação de solicitação sem pré-validação

**Problema**: A feature de "Duplicar" copia dados para um novo formulário, mas não verifica se já existe uma solicitação similar aberta (mesmo fornecedor + empreendimento). Pode gerar duplicatas acidentais.

**Melhoria**: Ao duplicar ou ao submeter, mostrar warning "Você já tem uma solicitação aberta para este fornecedor neste empreendimento (Protocolo #XXX). Deseja continuar?"

**Impacto**: Reduz retrabalho do backoffice. **Esforço**: Baixo

---

## 9. Dashboard sem visão temporal / tendência

**Problema**: O Dashboard mostra apenas contadores instantâneos. O gestor não vê tendências: "estamos recebendo mais ou menos solicitações que mês passado?" "O tempo de resposta está melhorando?"

**Melhoria**: Adicionar mini-charts (sparklines) nos KPI cards mostrando tendência dos últimos 30 dias. Usar recharts (já instalado).

**Impacto**: Dá visibilidade de tendência sem navegar para dashboards separados. **Esforço**: Médio

---

## 10. Sem funcionalidade offline / resilience

**Problema**: Em caso de perda de conexão durante preenchimento do formulário de 8 steps, o trabalho é perdido se o localStorage expirar. Não há detecção de offline.

**Melhoria**: 
- Detectar estado offline e mostrar banner "Sem conexão"
- Queuing de ações para reenvio quando online
- Indicador visual de status de conexão no header

**Impacto**: Crítico para usuários em campo/galpão com conectividade instável. **Esforço**: Médio

---

## Priorização PM (valor de negócio x esforço)

| # | Melhoria | Valor | Esforço |
|---|----------|-------|---------|
| 2 | Error Boundary global | Alto | Baixo |
| 7 | Aguardando Aprovação com auto-refresh | Alto | Baixo |
| 6 | Feedback de sucesso no Backoffice | Medio | Baixo |
| 8 | Alerta de duplicata | Medio | Baixo |
| 3 | Progresso no formulário multi-step | Alto | Baixo |
| 1 | Onboarding de novos usuários | Alto | Medio |
| 9 | Sparklines de tendência no Dashboard | Medio | Medio |
| 5 | Tracking de eventos de uso | Alto | Medio |
| 4 | Digest de notificações por email | Medio | Medio |
| 10 | Detecção offline + resilience | Alto | Medio |

---

Qual(is) melhoria(s) gostaria de implementar?

