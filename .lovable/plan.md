
## Contexto

A tela `/nova-solicitacao` já tem uma base sólida: wizard de 8 etapas (`Local → Descrição → Tipo → Natureza → Detalhes → Fornecedor → Anexos → Enviar`), classificação automática AC/OC pelo valor, validação de descrição via IA, validação CNAE, persistência de rascunho, navegação por teclado e `FormSummarySidebar`.

O objetivo aqui **não é refazer**, e sim alinhar a UI ao novo padrão visual do Dashboard (hero compacto, segmented controls, action tiles, tokens consistentes) e tornar o feedback de validação em tempo real mais visível e útil.

## O que vai mudar

### 1. Hero / cabeçalho da página (`NovaSolicitacao.tsx`)
- Substituir cabeçalho atual por um header compacto com:
  - Título + subtítulo curto
  - Badge de persona (Solicitante/Backoffice/Admin) — mesmo padrão do Dashboard
  - Chip de "rascunho salvo há Xs" + botão "Descartar rascunho"
  - Atalho `Ctrl+K` / `←` `→` exposto discretamente
- Remover Card aninhado de fora; usar superfície limpa `rounded-xl` + `ring`.

### 2. Banner dinâmico AC/OC (novo componente)
Criar `src/components/nova-solicitacao/FluxoBadge.tsx` que mostra em tempo real, conforme o usuário digita o valor:

```text
┌──────────────────────────────────────────────┐
│ 📦 OC · Ordem de Compra                      │
│ Valor ≤ R$ 1.000 — fluxo simplificado        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📋 AC · Autorização de Compra                │
│ Serviço acima de R$ 1.000                    │
│ • Requer 3 CNPJs · • Instrumento: Termo      │
└──────────────────────────────────────────────┘
```

- Cores semânticas: OC = azul/info, AC = âmbar/warning, AC + emergencial = vermelho/destructive
- Aparece já na etapa de Descrição (assim que valor > 0) e persiste como sticky chip nas etapas seguintes
- Mostra microbadges secundárias: "Emergencial", "Requer Due Diligence", "Retenção 6%", "Instrumento: Contrato Empreitada/Termo/OC", calculadas pelo `derived` que já existe

### 3. StepIndicator modernizado (`StepIndicator.tsx`)
- Tornar steps **clicáveis para qualquer etapa já visitada** (manter a regra atual de não pular para frente sem validar)
- Adicionar mini-ícone por etapa (Building2, FileText, Tag, Sparkles, Settings, Truck, Paperclip, Send) em vez de só números
- Conector animado com gradient sutil quando concluído
- Versão mobile: trocar barra plana por **stepper horizontal scrollable** com snap

### 4. Validação em tempo real reforçada
Mudanças no `useNovaSolicitacaoErrors.ts` + componentes de step:
- **Mostrar erros inline imediatamente** após o campo perder o foco (touch-based), não apenas após tentar avançar. Adicionar estado `touchedFields` no hook.
- Indicador visual por campo: borda verde (válido), âmbar (warning IA) ou vermelha (erro), com ícone à direita do label
- Adicionar **medidor de qualidade da descrição** (Fraca / Boa / Ótima) baseado em comprimento + resultado IA, com barra de progresso slim
- No campo Valor, mostrar abaixo o tier do fluxo em tempo real (≤1000 OC | >1000 AC/OC) com chip colorido

### 5. FormSummarySidebar atualizado
- Adicionar mini-progresso (`x/8 etapas`) no topo
- Cada item clicável navega para a etapa correspondente
- Adicionar bloco "Fluxo detectado" abaixo, refletindo AC/OC + instrumento jurídico
- Usar `text-3xl tabular-nums` para o valor total formatado
- Sticky com sombra mais sutil (consistente com Dashboard)

### 6. FormNavigation aprimorada
- Botão "Próximo" mostra preview da próxima etapa (ícone + label)
- Quando há erros, botão fica desabilitado **e** mostra tooltip com a primeira mensagem de erro (não mais um genérico "complete a etapa")
- Submit final ganha estado "pré-validação OK" (verde) quando tudo estiver válido

### 7. Tokens e estilo
- Padronizar `rounded-xl`, `ring-1 ring-border/40`, `bg-card/60 backdrop-blur` nas cards das etapas
- Tipografia: títulos de step `text-xl font-semibold`, label de campo `text-sm font-medium`, hint `text-xs text-muted-foreground`
- Spacing: `space-y-6` consistente entre blocos
- Sem mudanças em cores globais — reuso dos tokens semânticos já existentes

## Arquivos afetados

- `src/pages/NovaSolicitacao.tsx` — novo hero, integração do FluxoBadge sticky
- `src/components/nova-solicitacao/FluxoBadge.tsx` — **novo**, banner dinâmico AC/OC
- `src/components/StepIndicator.tsx` — ícones por step, conectores animados, mobile stepper
- `src/components/nova-solicitacao/FormSummarySidebar.tsx` — itens clicáveis, bloco fluxo, progresso
- `src/components/nova-solicitacao/FormNavigation.tsx` — preview próxima etapa, tooltip de erro real
- `src/components/nova-solicitacao/steps/DescricaoStep.tsx` — medidor de qualidade, chip de fluxo no valor
- `src/components/nova-solicitacao/steps/EmpreendimentoStep.tsx` — visual modernizado
- `src/components/nova-solicitacao/steps/DetalhesStep.tsx` — bordas semânticas por validação
- `src/components/nova-solicitacao/steps/FornecedorStep.tsx` — bordas semânticas
- `src/hooks/useNovaSolicitacaoErrors.ts` — adicionar suporte a campos "tocados"
- `src/hooks/useNovaSolicitacaoForm.ts` — expor `touchedFields` + setter

## Fora do escopo

- Mudanças na lógica de submissão/persistência
- Mudanças no schema do banco ou edge functions
- Refatoração do fluxo de upload de anexos
- Alteração das regras de instrumento jurídico/SLA/IA (são de negócio, já corretas)
