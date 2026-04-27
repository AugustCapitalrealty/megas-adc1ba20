# Auditoria PO/PM — Caminho para Excelência

Sistema MEGAS está maduro: wizard de Nova Solicitação, Backoffice, Dashboards (Geral/SLA/Eficiência), Monitoramento OC, Projuris, Garantias, GChat/WhatsApp, Fluig, IA de validação. Abaixo, o que falta para entrar no nível "produto de classe alta".

---

## 1. Diagnóstico — pontos fortes

- Cobertura funcional ampla (8 personas/fluxos cobertos)
- Integrações vivas (Fluig, Projuris, GChat, WhatsApp, IA)
- Regras de negócio sofisticadas (SLA, AC/OC, instrumentos jurídicos, rateio, garantia)
- Memória de produto bem documentada (mem://)
- Design system Mega aplicado de forma consistente

## 2. Gaps críticos (bloqueiam excelência)

### 2.1 Qualidade & Confiabilidade
- **Testes quase inexistentes**: apenas 2 arquivos (`useAuth.test.ts`, `App.guards.test.tsx`). Nenhum teste de regras de negócio (AC/OC, SLA, rateio, instrumento jurídico).
- **Sem testes E2E** apesar de Playwright instalado. Fluxos críticos (criar solicitação → aprovar → OC → NF) não são validados automaticamente.
- **Sem error tracking** (Sentry/PostHog). Erros em produção são invisíveis.
- **Edge functions sem testes** — risco alto em cron jobs (SLA alerts, service-execution).

### 2.2 Observabilidade & Métricas de Produto
- Não há **analytics de uso real** (quais features são usadas, abandono no wizard, tempo por etapa).
- Não há **métricas de adoção por persona** (quantos solicitantes ativos/semana, % de auto-serviço).
- Falta painel de **saúde do sistema** (latência IA, falhas Fluig, retries GChat).

### 2.3 Onboarding & Experiência
- `WelcomeTour` existe mas não há **onboarding por persona** (Solicitante vs Backoffice vs Admin).
- Sem **central de ajuda contextual** (tooltips de regras AC/OC, glossário de instrumentos).
- Sem **changelog visível** ao usuário ("novidades da semana").
- Sem **modo demo / sandbox** para treinar novos usuários.

### 2.4 Acessibilidade & Inclusão
- Falta auditoria WCAG AA (contraste em badges, foco visível, ARIA labels em modais).
- Sem suporte explícito a teclado em tabelas grandes (Backoffice, MonitoramentoOC).
- Sem teste com leitores de tela.

### 2.5 Performance
- Tabelas grandes (Backoffice, Monitoramento) usam virtualização parcial — ainda há renders pesados.
- Sem **code splitting por rota** auditado (bundle pode estar grande).
- Sem métricas Core Web Vitals coletadas.
- Imagens/anexos sem compressão automática no upload.

### 2.6 Governança de Dados & Segurança
- Não há rotina visível de **revisão de RLS** documentada por release.
- Sem **trilha de auditoria consultável pela UI** (quem alterou status, valor, fornecedor).
- Sem **export LGPD** (dados pessoais por usuário) e **direito ao esquecimento**.
- Backups e plano de recuperação não documentados ao usuário final.

### 2.7 Mobile & Offline
- Layout responsivo existe, mas wizard ainda é pesado em telas pequenas.
- Sem PWA (instalar no celular, push, offline mínimo).
- Solicitante em campo não consegue tirar foto e anexar com fluxo otimizado.

### 2.8 Workflow & Automação
- **SLA alerts** só em 80% — falta escalonamento (gestor) e SLA por etapa.
- Sem **regras configuráveis pelo Admin** (hoje thresholds estão hardcoded: 1000, 3 dias, 6%).
- Sem **templates de solicitação** (recorrências comuns viram 1-clique).
- Sem **aprovação em lote** para Backoffice de baixo risco.

### 2.9 IA & Inteligência
- Validação de descrição via IA existe — falta **sugestão de fornecedor** baseada em histórico.
- Sem **detecção de duplicatas** (mesma solicitação criada 2x).
- Sem **previsão de SLA** (esta solicitação tende a estourar?).
- Sem **resumo executivo automático** para gestores.

### 2.10 Integrações
- Fluig/Projuris dependem de import manual/CSV em vários pontos — falta sincronização programada robusta com retry/backoff visível.
- Sem webhook de saída (clientes/parceiros consumirem eventos).
- Sem export agendado (relatório semanal por e-mail para diretoria).

---

## 3. Roadmap proposto (3 ondas)

### Onda 1 — Fundação de qualidade (2–3 sprints)
1. **Bateria de testes de negócio**: SLA, AC/OC, rateio, instrumento jurídico, retenção 6%.
2. **E2E Playwright**: 5 jornadas críticas (criar OC, criar AC, aprovação backoffice, NF chegada, garantia expirando).
3. **Sentry + analytics de produto** (eventos via `useTrackEvent` já existente, dashboard interno).
4. **Painel de saúde do sistema** (admin-only): cron jobs, edge function error rate, fila de retries.
5. **Auditoria de RLS** documentada + checklist de release.

> Status Onda 1:
> - [x] Item 1 — `src/lib/solicitacao-rules.test.ts` (27 testes)
> - [x] Item 2 — `tests/e2e/*.spec.ts` (Playwright, 6 specs cobrindo login, wizard, backoffice, OC, garantias + contrato de regras)
> - [x] Item 3 — Sentry-like (`error_logs` + `error-tracker.ts`) + analytics em `/admin/excelencia`
> - [x] Item 4 — `HealthPanel` em `/admin/excelencia` (cron jobs + RPC `get_system_health_*`, erros por origem, pendências paradas, ações não lidas, refresh 60s)
> - [ ] Item 5 — Checklist de RLS por release

### Onda 2 — Excelência de UX e operação (3–4 sprints)
6. **Onboarding por persona** + central de ajuda contextual + changelog in-app.
7. **Auditoria WCAG AA** com correções (foco, contraste, ARIA).
8. **PWA + fluxo mobile do solicitante** (foto, anexo rápido, push).
9. **Trilha de auditoria visível** (timeline expandida) e export LGPD por usuário.
10. **Regras configuráveis** (Admin define thresholds AC/OC, SLA, retenção).
11. **Aprovação em lote** e **templates de solicitação recorrente**.

### Onda 3 — Inteligência e escala (4+ sprints)
12. **IA preditiva**: sugestão de fornecedor, detecção de duplicatas, previsão de estouro de SLA.
13. **Resumo executivo automático** para diretoria (semanal por e-mail/GChat).
14. **Webhooks de saída + API pública** para integrações externas.
15. **Sincronização Fluig/Projuris** com retry/backoff e dashboard de fila.
16. **Gamificação leve** para solicitantes (qualidade da descrição, % auto-serviço).

---

## 4. KPIs para acompanhar excelência

- **Adoção**: usuários ativos/semana por persona, % solicitações criadas sem retrabalho.
- **Eficiência**: tempo médio do wizard, % SLA cumprido, lead time médio.
- **Qualidade**: taxa de erro JS (Sentry), uptime edge functions, % testes passando.
- **Satisfação**: NPS in-app, tickets de suporte/semana, tempo até primeira solicitação.
- **Negócio**: % AC com 3 CNPJs, valor médio por instrumento, garantias expirando atendidas.

---

## 5. Entregável imediato (se aprovado)

Crio um **dashboard `/admin/excelencia`** (admin-only) com:
- Status de cada item do roadmap (a fazer / em andamento / pronto)
- KPIs acima em tempo real (com base no que já existe no banco)
- Backlog priorizado editável
- Export PDF para apresentar à diretoria

Posso também começar pela Onda 1 item 1 (testes de negócio) se preferir entregar valor técnico antes do painel.

---

## Fora do escopo deste plano

- Refatoração de código existente que já funciona
- Mudanças no schema do banco (apenas adições controladas se necessário)
- Substituir integrações atuais (Fluig, Projuris, GChat continuam)
