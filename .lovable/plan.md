

## Refatorar NovaSolicitacao.tsx em sub-componentes por step

O arquivo atual tem 2104 linhas com toda a lógica de formulário, estado, validação e renderização misturadas. A refatoração vai separar em componentes por step + hooks especializados.

---

### Arquitetura Proposta

```text
src/
├── pages/
│   └── NovaSolicitacao.tsx (~400 linhas - orquestração)
├── components/
│   └── nova-solicitacao/
│       ├── steps/
│       │   ├── EmpreendimentoStep.tsx
│       │   ├── DescricaoStep.tsx
│       │   ├── TipoStep.tsx
│       │   ├── DetalhesStep.tsx
│       │   ├── FornecedorStep.tsx
│       │   ├── AnexosStep.tsx
│       │   └── RevisaoStep.tsx
│       ├── FormNavigation.tsx (botões voltar/próximo/enviar)
│       └── types.ts (interfaces compartilhadas)
├── hooks/
│   └── useNovaSolicitacaoForm.ts (todo o estado do formulário)
```

---

### Mudanças por arquivo

**1. `src/hooks/useNovaSolicitacaoForm.ts` (novo)**
- Extrair os ~50 estados (`useState`) do componente atual
- Extrair lógica de draft (load/save)
- Extrair valores derivados (`valorNumerico`, `isOC`, `isAC`, `instrumentoJuridico`, etc.)
- Extrair `getRequiredAttachments()`
- Retornar objeto tipado com todos os valores e setters

**2. `src/components/nova-solicitacao/types.ts` (novo)**
- Interface `NovaSolicitacaoFormState` com todos os campos
- Interface `StepProps` base para todos os steps
- Type `Step` (reutilizar do StepIndicator)

**3. Steps individuais (7 arquivos novos)**
- Cada step recebe `formState` e callbacks via props
- Renderiza apenas o conteúdo específico do step
- ~100-250 linhas cada

**4. `src/components/nova-solicitacao/FormNavigation.tsx` (novo)**
- Botões Voltar/Próximo/Enviar
- Lógica `canProceed()` extraída do componente principal

**5. `src/pages/NovaSolicitacao.tsx` (refatorado)**
- Importa `useNovaSolicitacaoForm` hook
- Renderiza `StepIndicator` + step atual + `FormNavigation`
- Mantém `handleSubmit()` (lógica de envio)
- ~400 linhas

---

### Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Linhas no arquivo principal | 2104 | ~400 |
| Testabilidade | Baixa (tudo acoplado) | Alta (steps isolados) |
| Code splitting | Não | Sim (lazy load por step) |
| Reuso | Nenhum | Steps podem ser reusados |
| Manutenção | Difícil encontrar código | Estrutura previsível |

