

## Plano de Melhoria: Fluxo Jurídico & Operacional - Versão 2.0

Este plano detalha as alterações necessárias para ajustar o sistema conforme os novos requisitos identificados, separando claramente as regras para AC vs OC, otimizando IA e melhorando o fluxo de Due Diligence e liberação de OC.

---

## Resumo Executivo das Alterações

### Para o Solicitante
1. **Regra OC vs AC corrigida**: OC fica isento de fluxo jurídico e anexos obrigatórios; AC sempre exige anexos
2. **Gatilhos de risco para valores < R$10k**: Checkboxes de risco (altura, fossa) ativam fluxo jurídico mesmo para valores baixos
3. **Opção "Nenhuma das opções acima"**: Evita travamentos no fluxo
4. **Due Diligence centralizada no Backoffice**: Solicitante recebe status informativo
5. **Botão "Liberar para o Fornecedor"**: Substitui "Aceitar/Revisar" com modal de confirmação

### Para o Backoffice
1. **Gestão centralizada de Due Diligence**: Campos para marcar verificação/solicitação
2. **Visualização do Escopo Detalhado**: Visível em todas as etapas de revisão
3. **Ciclo de ajuste de minuta**: Reabertura do campo para o Solicitante com notificação específica
4. **Cache de resultados de IA**: Evita chamadas repetidas para CNAE e descrição

---

## 1. Correção: Regra AC vs OC para Anexos e Fluxo Jurídico

### Problema Atual
Atualmente, a lógica de isenção de anexos considera apenas `naturezaOrcamentaria`. Falta considerar que:
- **OC (Ordem de Compra)**: Isento de fluxo jurídico e anexos obrigatórios
- **AC (Serviços/Produto)**: Nunca isento, sempre exige anexos

### Solução
Alterar a função `getRequiredAttachments()` e a lógica do step `natureza_servico`:

```typescript
// src/pages/NovaSolicitacao.tsx

// Fluxo jurídico apenas para AC (tipo_contratacao === 'servicos')
const requerFluxoJuridico = isAC && (
  valorNumerico >= 10000 || 
  naturezaObraCivil || 
  naturezaAlturaRisco || 
  naturezaFossaFiltro || 
  naturezaPrecoVariavel
);

// Step natureza_servico: exibir para AC com valor >= 10k OU com gatilhos de risco
const showNaturezaServicoStep = isAC && (valorNumerico >= 10000 || 
  naturezaObraCivil || naturezaAlturaRisco || naturezaFossaFiltro || naturezaPrecoVariavel);
```

### Arquivo Afetado
- `src/pages/NovaSolicitacao.tsx`

---

## 2. UI/UX: Gatilhos Dinâmicos e Opção "Nenhuma das Opções"

### Problema Atual
- O step `natureza_servico` só aparece para valores >= R$ 10k
- Não existe opção para seguir o fluxo simplificado quando nenhum gatilho se aplica

### Solução

#### 2.1 Exibição condicional do step
O step deve aparecer se:
- Valor >= R$ 10.000 **OU**
- Usuário marcou qualquer categoria de risco (mesmo com valor < R$ 10k)

#### 2.2 Nova opção "Nenhuma das opções acima"
Adicionar checkbox final que, quando marcado, desmarca os demais e permite fluxo simplificado.

### Alterações no Componente

```typescript
// src/components/NaturezaServicoStep.tsx

interface NaturezaServicoStepProps {
  // ... props existentes
  nenhumaOpcao: boolean;
  onNenhumaOpcaoChange: (checked: boolean) => void;
}

// Novo checkbox no final da lista:
<div className="flex items-start space-x-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 hover:bg-green-100 transition-colors">
  <Checkbox
    id="nenhuma_opcao"
    checked={nenhumaOpcao}
    onCheckedChange={(checked) => onNenhumaOpcaoChange(checked === true)}
  />
  <div className="flex-1">
    <Label htmlFor="nenhuma_opcao" className="flex items-center gap-2 cursor-pointer font-medium">
      <CheckCircle className="h-4 w-4 text-green-500" />
      Nenhuma das opções acima se aplica
    </Label>
    <p className="text-xs text-muted-foreground mt-1">
      Serviço comum, sem riscos especiais ou obra civil
    </p>
  </div>
</div>
```

### Lógica de exclusão mútua

```typescript
// NovaSolicitacao.tsx
const [nenhumaOpcaoNatureza, setNenhumaOpcaoNatureza] = useState(false);

const handleNenhumaOpcaoChange = (checked: boolean) => {
  setNenhumaOpcaoNatureza(checked);
  if (checked) {
    setNaturezaObraCivil(false);
    setNaturezaAlturaRisco(false);
    setNaturezaFossaFiltro(false);
    setNaturezaPrecoVariavel(false);
  }
};

const handleAnyRiskChange = (setter: (v: boolean) => void) => (checked: boolean) => {
  setter(checked);
  if (checked) {
    setNenhumaOpcaoNatureza(false);
  }
};
```

### Arquivos Afetados
- `src/components/NaturezaServicoStep.tsx`
- `src/pages/NovaSolicitacao.tsx`

---

## 3. Gestão de Due Diligence (Centralização no Backoffice)

### Problema Atual
O campo de Due Diligence está apenas no formulário do Solicitante, sem visibilidade/ação para o Backoffice.

### Solução

#### 3.1 Novos campos na tabela `solicitacoes`

```sql
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  due_diligence_status TEXT DEFAULT NULL 
  CHECK (due_diligence_status IN ('pendente', 'solicitada', 'verificada', 'aprovada', 'reprovada'));

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  due_diligence_verificada_por UUID REFERENCES auth.users(id);

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  due_diligence_verificada_em TIMESTAMPTZ;
```

#### 3.2 Interface do Solicitante (informativo)
Quando valor >= R$ 50k, exibir card informativo:

```text
+------------------------------------------------------------------+
|  ℹ️ DUE DILIGENCE                                                 |
|  ---------------------------------------------------------------- |
|  O Backoffice verificará se a empresa possui Due Diligence        |
|  válida com o Jurídico da Capital Realty.                         |
|                                                                   |
|  Caso não possua, será solicitada ao Jurídico e você será         |
|  notificado sobre o andamento.                                    |
|                                                                   |
|  [Informar Número Projuris] [Consultar Status]                    |
+------------------------------------------------------------------+
```

#### 3.3 Interface do Backoffice
No modal de detalhes, adicionar seção de Due Diligence:

```text
+------------------------------------------------------------------+
|  🛡️ DUE DILIGENCE (OBRIGATÓRIA - R$ 50k+)                         |
|  ---------------------------------------------------------------- |
|  Status: [Pendente / Solicitada / Verificada]                     |
|                                                                   |
|  [ ] Due Diligence verificada e válida                            |
|  [ ] Due Diligence solicitada ao Jurídico                         |
|                                                                   |
|  Número Projuris (se informado): PROJ-2024-0001                   |
|                                                                   |
|  [Salvar Status DD]                                               |
+------------------------------------------------------------------+
```

#### 3.4 Bloqueio de avanço
O processo só avança para `em_processamento` ou `aprovado` após o Backoffice validar o checkpoint de Due Diligence.

### Arquivos Afetados
- Nova migration SQL
- `src/components/DueDiligenceModule.tsx` (refatorar)
- `src/pages/Backoffice.tsx` (adicionar seção DD)
- `src/pages/NovaSolicitacao.tsx` (ajustar UI)

---

## 4. Visualização e Ciclo de Ajuste do Escopo Detalhado

### Problema Atual
O Backoffice não consegue visualizar o escopo detalhado facilmente, e não há ciclo de ajuste para a minuta.

### Solução

#### 4.1 Exibição no Backoffice
Adicionar seção destacada no modal de detalhes:

```text
+------------------------------------------------------------------+
|  📝 ESCOPO PARA MINUTA                                            |
|  ---------------------------------------------------------------- |
|  [Texto completo do escopo_detalhado_minuta preenchido pelo       |
|   solicitante, exibido em área scrollável]                        |
|                                                                   |
|  📋 Copiar   |   ✏️ Solicitar Ajuste                              |
+------------------------------------------------------------------+
```

#### 4.2 Ação "Solicitar Ajuste de Minuta"
Novo tipo de ação que:
1. Muda status para `aguardando_informacoes`
2. Registra no histórico com ação `ajuste_minuta_solicitado`
3. Envia notificação ao Solicitante com o motivo específico

#### 4.3 Reabertura do campo para o Solicitante
Quando a solicitação está em `aguardando_informacoes` e a última ação é `ajuste_minuta_solicitado`, o campo de escopo detalhado reabre para edição.

### Arquivos Afetados
- `src/pages/Backoffice.tsx`
- `src/pages/MinhasSolicitacoes.tsx`
- Novo componente: `src/components/EscopoMinutaCard.tsx`

---

## 5. Otimização de IA (Cache de Resultados)

### Problema Atual
A cada abertura de tela, o sistema pode chamar a IA para validar CNAE e descrição novamente, gerando custos desnecessários.

### Solução

#### 5.1 Novos campos na tabela `solicitacoes`

```sql
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_cnae_status TEXT DEFAULT NULL 
  CHECK (ia_cnae_status IN ('compativel', 'incompativel', 'insuficiente'));

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_cnae_justificativa TEXT;

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_cnae_avaliado_em TIMESTAMPTZ;

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_descricao_vaga BOOLEAN;

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_descricao_sugestao TEXT;

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  ia_descricao_avaliado_em TIMESTAMPTZ;
```

#### 5.2 Lógica de cache

```typescript
// Na criação da solicitação (handleSubmit)
// 1. Se já temos validationResult de CNAE, salvar no insert
// 2. Se já temos descriptionValidation, salvar no insert

// Na visualização (Backoffice/MinhasSolicitacoes)
// 1. Verificar se ia_cnae_avaliado_em existe
// 2. Se sim, usar dados do banco (não chamar IA)
// 3. Se não, chamar IA e salvar resultado
```

#### 5.3 Trigger para invalidar cache
Quando `descricao` ou `fornecedor_id` mudam, limpar os campos de cache:

```sql
CREATE TRIGGER invalidate_ia_cache
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  WHEN (NEW.descricao <> OLD.descricao OR NEW.fornecedor_id <> OLD.fornecedor_id)
  EXECUTE FUNCTION reset_ia_cache_fields();
```

### Arquivos Afetados
- Nova migration SQL
- `src/hooks/useCNAEValidation.ts` (adicionar lógica de cache)
- `src/hooks/useDescriptionValidation.ts` (adicionar lógica de cache)
- `src/pages/NovaSolicitacao.tsx` (salvar resultados)

---

## 6. Fluxo de Liberação da OC (Novo Modal)

### Problema Atual
O botão atual é "Aceitar/Revisar", que não deixa claro que está autorizando o envio formal ao fornecedor.

### Solução

#### 6.1 Renomear botão
De: "Aceitar OC" → Para: "Liberar para o Fornecedor"

#### 6.2 Novo modal de confirmação

```text
+------------------------------------------------------------------+
|  🚀 LIBERAR PARA O FORNECEDOR                                     |
|  ---------------------------------------------------------------- |
|                                                                   |
|  Você está autorizando o Backoffice a enviar formalmente esta     |
|  Ordem de Compra para o fornecedor.                               |
|                                                                   |
|  Fornecedor: ABC Ltda                                             |
|  Valor: R$ 15.000,00                                              |
|  OC Nº: 2024-0001                                                 |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Dados de Contato do Fornecedor (opcional)                   │  |
|  │                                                             │  |
|  │ E-mail: [fornecedor@email.com          ]                    │  |
|  │ Telefone: [(41) 99999-9999             ]                    │  |
|  │                                                             │  |
|  │ ⚠️ Confira se os dados estão corretos para envio           │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [Cancelar]                           [Confirmar Liberação ✓]     |
+------------------------------------------------------------------+
```

#### 6.3 Campos opcionais de contato

```sql
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  fornecedor_email_contato TEXT;

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS 
  fornecedor_telefone_contato TEXT;
```

#### 6.4 Manter opção de Revisão
O Solicitante mantém o poder de clicar em "Solicitar Revisão" a qualquer momento antes de liberar.

### Arquivos Afetados
- Nova migration SQL
- `src/pages/MinhasSolicitacoes.tsx` (refatorar modal de aceite)

---

## 7. Tabela Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Nova migration com campos de DD, cache IA, contato fornecedor |
| `src/pages/NovaSolicitacao.tsx` | Lógica AC vs OC, gatilhos dinâmicos, cache IA |
| `src/components/NaturezaServicoStep.tsx` | Opção "Nenhuma das opções acima" |
| `src/components/DueDiligenceModule.tsx` | Versões Solicitante (info) e Backoffice (ação) |
| `src/pages/Backoffice.tsx` | Seção DD, Escopo para minuta, ação de ajuste |
| `src/pages/MinhasSolicitacoes.tsx` | Modal "Liberar para Fornecedor", edição de minuta |
| `src/hooks/useCNAEValidation.ts` | Lógica de cache com banco de dados |
| `src/hooks/useDescriptionValidation.ts` | Lógica de cache com banco de dados |
| `src/components/EscopoMinutaCard.tsx` | Novo componente para exibição do escopo |

---

## 8. Priorização Sugerida

1. **Alta Prioridade** (Impacto operacional)
   - Correção da regra AC vs OC para anexos
   - Gestão de Due Diligence no Backoffice
   - Visualização do Escopo Detalhado

2. **Média Prioridade** (UX/Eficiência)
   - Gatilhos dinâmicos e "Nenhuma das opções"
   - Modal "Liberar para Fornecedor"
   - Ciclo de ajuste de minuta

3. **Baixa Prioridade** (Otimização)
   - Cache de IA para CNAE e descrição

