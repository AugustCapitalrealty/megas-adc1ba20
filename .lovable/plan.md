# Corrigir falhas ao enviar Nova Solicitação

## Problema observado

Alguns usuários relatam:
1. **Não conseguem finalizar** uma nova solicitação — clicam em "Enviar Solicitação" e nada acontece (ou aparece erro).
2. **Ao clicar repetidamente**, o sistema parece "abrir várias" (múltiplos toasts/erros, sensação de que está duplicando).
3. Sem feedback claro do que está faltando.

## Causa raiz identificada

No arquivo `src/pages/NovaSolicitacao.tsx`, a função `handleSubmit`:

```ts
if (isSubmittingRef.current || submitting) return;
if (!user || !formState.empreendimento || !formState.naturezaOrcamentaria || !formState.fornecedor) return;
```

- O segundo `return` é **silencioso** — sem `toast`, sem `setSubmitting(true)`. O botão fica habilitado e o usuário pode clicar várias vezes sem entender por quê.
- `FormNavigation` recebe `canProceed={true}` hardcoded e o botão Enviar só desabilita por `submitting`. Se faltar dado obrigatório, o botão fica clicável mas a submissão não acontece.
- Um usuário pode chegar à etapa de Revisão, clicar repetidamente e cada clique gera ruído (logs, mas sem ação útil).
- Em alguns casos a sessão Supabase já expirou (toast aparece mas usuário não relê) e o clique seguinte tenta de novo.

Não foram encontradas duplicatas reais no banco, então o problema é de UX/feedback — o usuário **percebe** múltiplos cliques porque o botão parece "engolir" sem reagir.

## Solução

### 1. `src/pages/NovaSolicitacao.tsx` — `handleSubmit`
- Substituir o `return` silencioso por um **toast destrutivo** explicando o que falta (Empreendimento, Natureza, Fornecedor) e voltar para a etapa correspondente automaticamente (`setCurrentStep('empreendimento' | 'detalhes' | 'fornecedor')`).
- Garantir que **toda saída antecipada** dispare toast claro com `description` descrevendo o motivo.
- Antes da submissão, revalidar `canProceed()` de **todas as etapas visíveis** — se alguma falhar, pular para essa etapa, ativar `showErrors=true` e mostrar toast.

### 2. `src/components/nova-solicitacao/FormNavigation.tsx`
- O botão "Enviar Solicitação" deve aceitar `canSubmit: boolean` (vindo do pai) e ficar **`disabled={submitting || !canSubmit}`**.
- Adicionar `aria-disabled` e tooltip leve ("Complete todas as etapas obrigatórias") quando bloqueado.
- Texto do botão muda para "Enviando…" quando `submitting`.

### 3. `src/pages/NovaSolicitacao.tsx` — passar `canSubmit`
- Calcular `const canSubmit = visibleSteps.every(s => stepIsValid(s.id))` usando a lógica já existente em `canProceed`/`useStepErrors`.
- Passar para `FormNavigation`.

### 4. Proteção extra contra cliques múltiplos
- Adicionar **debounce visual** de 1s no botão Enviar mesmo após erro: após `catch`, manter `submitting=true` por 800ms antes de liberar (evita spam de cliques quando rede lenta retorna erro).
- Mensagem do toast de erro fica visível por 8s (já é o padrão).

### 5. Verificação de sessão antes da submissão
- Manter o `supabase.auth.getSession()` que já existe, mas se sessão expirou, **redirecionar para `/login`** após o toast, não apenas voltar para a tela.

### 6. Teste manual sugerido após deploy
- Logar com usuário sem empreendimento atrelado → tentar criar solicitação → deve mostrar mensagem clara.
- Logar normalmente → preencher tudo → clicar várias vezes em Enviar → deve criar 1 só.
- Forçar erro de rede (DevTools offline) → clicar Enviar → toast claro e botão volta a habilitar após 800ms.

## Detalhes técnicos

- Mantém o duplo guard `isSubmittingRef` + `setSubmitting` (já existe).
- Não altera schema de banco.
- Não mexe em RLS.
- Sem migrações.

## Arquivos modificados

- `src/pages/NovaSolicitacao.tsx` — handleSubmit com toasts em vez de returns silenciosos, cálculo de `canSubmit`, debounce pós-erro.
- `src/components/nova-solicitacao/FormNavigation.tsx` — aceitar `canSubmit`, desabilitar Enviar quando inválido, texto "Enviando…".

Sem novos arquivos.
