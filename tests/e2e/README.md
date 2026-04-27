# MEGAS — Testes E2E (Playwright)

Cobertura das 5 jornadas críticas definidas no roadmap de excelência (Onda 1, item 2):

| Spec                          | Jornada                                              |
|-------------------------------|------------------------------------------------------|
| `01-login.spec.ts`            | Tela pública de login renderiza e protege rotas      |
| `02-nova-solicitacao.spec.ts` | Wizard de Nova Solicitação avança e classifica AC/OC |
| `03-backoffice.spec.ts`       | Lista do backoffice carrega e responde a filtros     |
| `04-monitoramento-oc.spec.ts` | Painel Monitoramento OC responde a interação         |
| `05-garantias.spec.ts`        | Painel de garantias vigentes renderiza KPIs          |

Além disso, `00-rules.spec.ts` valida ponta-a-ponta que as regras puras de
`src/lib/solicitacao-rules.ts` permanecem corretas no bundle do Vite.

## Como rodar

```bash
npx playwright install --with-deps   # 1ª vez
npm run e2e                          # headless
npm run e2e:ui                       # interativo
npm run e2e:report                   # abrir último relatório HTML
```

## Autenticação

Os testes injetam uma sessão Supabase mockada em `localStorage` antes de
navegar (ver `fixtures/auth.ts`). Isto evita depender de Google OAuth real.
Para rodar contra um ambiente já autenticado, basta exportar
`E2E_BASE_URL=https://seu-preview` antes de `npm run e2e`.