## Plano de Melhoria: Fluxo Jurídico & Operacional - Versão 2.0

**STATUS: EM IMPLEMENTAÇÃO**

---

## ✅ Itens Implementados

### 1. Correção: Regra AC vs OC para Anexos e Fluxo Jurídico
- [x] OC isento de fluxo jurídico
- [x] AC sempre exige anexos e ativa fluxo jurídico quando valor >= 10k ou gatilhos de risco
- [x] Lógica `showNaturezaServicoStep` corrigida

### 2. UI/UX: Gatilhos Dinâmicos e Opção "Nenhuma das Opções"
- [x] Step `natureza_servico` aparece para AC com valor >= 10k OU com gatilhos de risco
- [x] Opção "Nenhuma das opções acima" adicionada em `NaturezaServicoStep.tsx`
- [x] Lógica de exclusão mútua entre checkboxes
- [x] Estado `nenhumaOpcaoNatureza` persistido no draft

### 3. Gestão de Due Diligence (Centralização no Backoffice)
- [x] Card Due Diligence exibido no modal de detalhes do Backoffice para solicitações >= R$ 50k
- [x] Mostra status de confirmação e número Projuris (se informado)
- [x] Componente `DueDiligenceModule` refatorado com modo `readOnly`
- [ ] **Pendente**: Campos de status gerenciados pelo Backoffice (due_diligence_status, verificada_por, verificada_em)
- [ ] **Pendente**: Bloqueio de avanço sem validação DD

### 4. Visualização e Ciclo de Ajuste do Escopo Detalhado
- [x] Componente `EscopoMinutaCard.tsx` criado
- [x] Exibição do escopo no modal de detalhes do Backoffice
- [x] Botão "Copiar" funcional
- [x] Botão "Solicitar Ajuste" redireciona para ação existente
- [ ] **Pendente**: Reabertura do campo para edição quando `aguardando_informacoes`

### 5. Badge de Instrumento Jurídico no Backoffice
- [x] `InstrumentoJuridicoBadge` exibido no modal de detalhes

---

## 📋 Itens Pendentes (Média/Baixa Prioridade)

### 5. Otimização de IA (Cache de Resultados)
- [ ] Novos campos na tabela: `ia_cnae_status`, `ia_cnae_justificativa`, `ia_cnae_avaliado_em`, etc.
- [ ] Lógica de cache no submit e visualização
- [ ] Trigger para invalidar cache quando descrição/fornecedor mudam

### 6. Fluxo de Liberação da OC (Novo Modal)
- [ ] Renomear botão "Aceitar OC" → "Liberar para o Fornecedor"
- [ ] Novo modal de confirmação com detalhes da OC
- [ ] Campos opcionais de contato do fornecedor
- [ ] Manter opção de Revisão

---

## Arquivos Modificados

| Arquivo | Status |
|---------|--------|
| `src/pages/NovaSolicitacao.tsx` | ✅ Atualizado (lógica AC vs OC, gatilhos) |
| `src/components/NaturezaServicoStep.tsx` | ✅ Atualizado (opção "Nenhuma") |
| `src/components/DueDiligenceModule.tsx` | ✅ Refatorado (modo readOnly) |
| `src/components/EscopoMinutaCard.tsx` | ✅ Criado |
| `src/pages/Backoffice.tsx` | ✅ Atualizado (seção DD, Escopo, Badge) |
| `src/hooks/useFormPersistence.ts` | ✅ Atualizado (novo campo nenhumaOpcaoNatureza) |
| `src/pages/MinhasSolicitacoes.tsx` | ⏳ Pendente (modal liberação) |
| `src/hooks/useCNAEValidation.ts` | ⏳ Pendente (cache IA) |
| `src/hooks/useDescriptionValidation.ts` | ⏳ Pendente (cache IA) |
