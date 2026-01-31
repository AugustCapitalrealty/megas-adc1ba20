
## Plano: Implementação dos Itens Pendentes - Fluxo Jurídico v2.0

Este plano implementa os itens restantes do plano aprovado anteriormente.

---

## Itens a Implementar

### 1. Modal "Liberar para o Fornecedor" (Alta Prioridade)
Refatorar o modal de aceite de OC em `MinhasSolicitacoes.tsx`:

**Alterações:**
- Renomear textos de "Aceitar OC" para "Liberar para o Fornecedor"
- Adicionar campos opcionais de contato do fornecedor (email/telefone)
- Exibir detalhes da OC no modal de confirmação
- Atualizar banco de dados com novos campos

**Novos campos no banco:**
```sql
ALTER TABLE public.solicitacoes 
  ADD COLUMN IF NOT EXISTS fornecedor_email_contato TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_telefone_contato TEXT;
```

**Fluxo de 3 etapas atualizado:**
1. **Revisar**: Visualizar/baixar OC (mantém como está)
2. **Decidir**: Opções "Liberar para Fornecedor" ou "Solicitar Revisão"
3. **Confirmar**: Modal com dados de contato opcional do fornecedor + confirmação final

---

### 2. Campos de Due Diligence Gerenciados pelo Backoffice (Alta Prioridade)
Adicionar campos para controle do Backoffice:

**Novos campos no banco:**
```sql
ALTER TABLE public.solicitacoes 
  ADD COLUMN IF NOT EXISTS due_diligence_status TEXT 
    CHECK (due_diligence_status IN ('pendente', 'solicitada', 'verificada', 'aprovada', 'reprovada')),
  ADD COLUMN IF NOT EXISTS due_diligence_verificada_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS due_diligence_verificada_em TIMESTAMPTZ;
```

**Atualizações em `Backoffice.tsx`:**
- Seção para gerenciar status de Due Diligence
- Botões para marcar como "Verificada" ou "Solicitada ao Jurídico"
- Exibição do número Projuris informado pelo solicitante

---

### 3. Reabertura do Campo Escopo quando `aguardando_informacoes` (Média Prioridade)
Permitir edição do escopo detalhado em `MinhasSolicitacoes.tsx`:

**Lógica:**
- Quando status = `aguardando_informacoes` E última ação foi `ajuste_minuta_solicitado`
- Exibir campo de edição do `escopo_detalhado_minuta`
- Botão para reenviar resposta

---

### 4. Cache de IA no Banco de Dados (Baixa Prioridade - Otimização)
Implementar cache persistente para resultados de validação IA:

**Novos campos no banco:**
```sql
ALTER TABLE public.solicitacoes 
  -- Cache CNAE
  ADD COLUMN IF NOT EXISTS ia_cnae_status TEXT CHECK (ia_cnae_status IN ('compativel', 'incompativel', 'insuficiente')),
  ADD COLUMN IF NOT EXISTS ia_cnae_justificativa TEXT,
  ADD COLUMN IF NOT EXISTS ia_cnae_avaliado_em TIMESTAMPTZ,
  -- Cache Descrição
  ADD COLUMN IF NOT EXISTS ia_descricao_vaga BOOLEAN,
  ADD COLUMN IF NOT EXISTS ia_descricao_sugestao TEXT,
  ADD COLUMN IF NOT EXISTS ia_descricao_avaliado_em TIMESTAMPTZ;
```

**Trigger para invalidar cache:**
```sql
CREATE OR REPLACE FUNCTION reset_ia_cache_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ia_cnae_status := NULL;
  NEW.ia_cnae_justificativa := NULL;
  NEW.ia_cnae_avaliado_em := NULL;
  NEW.ia_descricao_vaga := NULL;
  NEW.ia_descricao_sugestao := NULL;
  NEW.ia_descricao_avaliado_em := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invalidate_ia_cache
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  WHEN (OLD.descricao IS DISTINCT FROM NEW.descricao 
        OR OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id)
  EXECUTE FUNCTION reset_ia_cache_fields();
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Nova migration com todos os campos novos |
| `src/types/index.ts` | Atualizar interface Solicitacao |
| `src/pages/MinhasSolicitacoes.tsx` | Modal "Liberar", edição de escopo |
| `src/pages/Backoffice.tsx` | Seção gerenciamento DD |
| `src/pages/NovaSolicitacao.tsx` | Salvar cache IA no submit |
| `src/hooks/useCNAEValidation.ts` | Lógica de leitura/escrita do cache |
| `src/hooks/useDescriptionValidation.ts` | Lógica de leitura/escrita do cache |

---

## Detalhes Técnicos

### Modal de Liberação (MinhasSolicitacoes.tsx)

**Step 2 - Decidir (textos atualizados):**
```text
┌─────────────────────────────────────────────────────────────┐
│  [●] Liberar para o Fornecedor                              │
│      Autorizo o envio formal desta OC ao fornecedor         │
│                                                             │
│  [ ] Solicitar Revisão                                      │
│      A OC precisa de correções antes do envio               │
└─────────────────────────────────────────────────────────────┘
```

**Step 3 - Confirmar (com campos de contato):**
```text
┌─────────────────────────────────────────────────────────────┐
│  🚀 LIBERAR PARA O FORNECEDOR                               │
│                                                             │
│  Você está autorizando o Backoffice a enviar                │
│  formalmente esta OC para o fornecedor.                     │
│                                                             │
│  Fornecedor: ABC Ltda                                       │
│  Valor: R$ 15.000,00                                        │
│  OC Nº: 2024-0001                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Dados de Contato (opcional)                          │    │
│  │                                                     │    │
│  │ E-mail:   [________________________]                │    │
│  │ Telefone: [________________________]                │    │
│  │                                                     │    │
│  │ ⚠️ Confira se os dados estão corretos               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ⚠️ Esta ação não pode ser desfeita                         │
│                                                             │
│  [Voltar]                        [Confirmar Liberação ✓]    │
└─────────────────────────────────────────────────────────────┘
```

### Seção Due Diligence (Backoffice.tsx)

Para solicitações >= R$ 50k, exibir card de gestão:
```text
┌─────────────────────────────────────────────────────────────┐
│  🛡️ DUE DILIGENCE (OBRIGATÓRIA - R$ 50k+)                   │
│                                                             │
│  Status atual: [Pendente]                                   │
│  Nº Projuris (informado): PROJ-2024-0001                    │
│                                                             │
│  [Marcar como Verificada]  [Solicitar ao Jurídico]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação

1. **Migration SQL** - Adicionar todos os campos novos
2. **MinhasSolicitacoes.tsx** - Modal "Liberar para Fornecedor" + edição escopo
3. **Backoffice.tsx** - Seção de gestão Due Diligence
4. **Hooks de validação IA** - Cache persistente (pode ser feito por último)

