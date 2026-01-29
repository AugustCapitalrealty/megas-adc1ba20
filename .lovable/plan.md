

## Plano: Implementação do Fluxo Jurídico para Contratação (PRO_08.002)

Este plano implementa as regras do procedimento de formalização de requisições, incluindo classificação automática do instrumento jurídico, gatilhos de natureza do serviço, Due Diligence obrigatória e campos dinâmicos para escopo detalhado.

---

## Resumo Executivo

### O que muda para o Solicitante
1. Após informar valor >= R$ 10.000, aparecem checkboxes de natureza do serviço (obra civil, altura, fossa, preço variável)
2. Sistema classifica automaticamente se precisa de OC, Termo de Contratação, Contrato ou Empreitada
3. Quando classificado como Termo/Contrato, aparece campo obrigatório de "Escopo Detalhado para Minuta" (min. 100 caracteres)
4. Se valor >= R$ 50.000, aparece banner de Due Diligence com confirmação obrigatória
5. Avisos automáticos de retenção técnica quando aplicável

### O que muda para o Backoffice
1. Nova coluna "Instrumento Jurídico" na listagem (OC, Termo, Contrato, Empreitada)
2. Flag visual "Validar Due Diligence" para solicitações >= R$ 50k
3. Escopo detalhado visível para elaboração de minutas
4. Histórico registra classificação jurídica automática

---

## 1. Alterações no Banco de Dados

### 1.1 Novo Enum: instrumento_juridico
```text
CREATE TYPE public.instrumento_juridico AS ENUM (
  'oc',                    -- Ordem de Compra (dispensa contrato)
  'termo_contratacao',     -- Termo de Contratação (R$ 10k-69.9k ou riscos)
  'contrato_prestacao',    -- Contrato Prestação Serviços (>= R$ 70k)
  'contrato_fornecimento', -- Contrato Fornecimento (material com fabricação)
  'contrato_empreitada'    -- Contrato Empreitada (obra estrutural)
);
```

### 1.2 Novos Campos na Tabela solicitacoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| instrumento_juridico | instrumento_juridico | Classificação automática do tipo de contrato |
| natureza_servico_obra_civil | boolean | Gatilho: envolve obra civil/estrutural |
| natureza_servico_altura_risco | boolean | Gatilho: trabalho em altura ou risco de vida |
| natureza_servico_fossa_filtro | boolean | Gatilho: limpeza de fossa/filtro |
| natureza_servico_preco_variavel | boolean | Gatilho: preço pode variar (m², m³, hora) |
| escopo_detalhado_minuta | text | Escopo detalhado para elaboração da minuta |
| due_diligence_confirmada | boolean | Usuário confirmou ciência da Due Diligence |
| due_diligence_numero_projuris | text | Número do processo no Projuris (se existente) |
| requer_retencion_tecnica | boolean | Calculado automaticamente |
| prazo_liberacao_retencao_dias | integer | 45-180 dias conforme regra |

### 1.3 Função de Classificação Automática
```text
CREATE FUNCTION calcular_instrumento_juridico(
  p_valor NUMERIC,
  p_tipo_contratacao TEXT,
  p_obra_civil BOOLEAN,
  p_altura_risco BOOLEAN,
  p_fossa_filtro BOOLEAN,
  p_preco_variavel BOOLEAN,
  p_fornecimento_material BOOLEAN
) RETURNS instrumento_juridico
```

**Regras de classificação (em ordem de prioridade):**
1. Se `p_obra_civil = true` -> `contrato_empreitada`
2. Se `p_fornecimento_material = true AND p_valor >= 10000` -> `contrato_fornecimento`
3. Se `p_altura_risco = true OR p_fossa_filtro = true OR p_preco_variavel = true` -> `termo_contratacao`
4. Se `p_valor >= 70000` -> `contrato_prestacao`
5. Se `p_valor >= 10000` -> `termo_contratacao`
6. Senão -> `oc`

---

## 2. Alterações no Frontend - NovaSolicitacao.tsx

### 2.1 Novos Estados
```typescript
// Gatilhos de natureza do serviço
const [naturezaObraCivil, setNaturezaObraCivil] = useState(false);
const [naturezaAlturaRisco, setNaturezaAlturaRisco] = useState(false);
const [naturezaFossaFiltro, setNaturezaFossaFiltro] = useState(false);
const [naturezaPrecoVariavel, setNaturezaPrecoVariavel] = useState(false);

// Escopo e Due Diligence
const [escopoDetalhadoMinuta, setEscopoDetalhadoMinuta] = useState('');
const [dueDiligenceConfirmada, setDueDiligenceConfirmada] = useState(false);
const [dueDiligenceNumeroProjuris, setDueDiligenceNumeroProjuris] = useState('');
```

### 2.2 Classificação Automática (Client-side)
```typescript
const calcularInstrumentoJuridico = useMemo(() => {
  // Empreitada tem prioridade máxima
  if (naturezaObraCivil) return 'contrato_empreitada';
  
  // Gatilhos de risco sempre geram Termo
  if (naturezaAlturaRisco || naturezaFossaFiltro || naturezaPrecoVariavel) {
    return 'termo_contratacao';
  }
  
  // Faixas de valor
  if (valorNumerico >= 70000) return 'contrato_prestacao';
  if (valorNumerico >= 10000) return 'termo_contratacao';
  
  return 'oc';
}, [valorNumerico, naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel]);

const requerEscopoDetalhado = calcularInstrumentoJuridico !== 'oc';
const requerDueDiligence = valorNumerico >= 50000;
const requerRetencaoTecnica = (
  calcularInstrumentoJuridico === 'contrato_empreitada' ||
  (valorNumerico >= 150000 && /* duração > 30 dias */)
);
```

### 2.3 Novo Step: Gatilhos (após "tipo")
Após o step "tipo" e antes de "detalhes", aparece um novo step quando valor >= R$ 10.000:

```text
+------------------------------------------------------------------+
|  NATUREZA DO SERVIÇO                                              |
|                                                                   |
|  Marque as opções que se aplicam:                                 |
|                                                                   |
|  [ ] O serviço envolve obra civil ou alteração estrutural?        |
|      (Ex: reforma, construção, demolição)                         |
|                                                                   |
|  [ ] O serviço envolve trabalho em altura ou risco de vida?       |
|      (Ex: manutenção em telhado, limpeza de fachada)              |
|                                                                   |
|  [ ] É um serviço de limpeza de fossa ou filtro?                  |
|                                                                   |
|  [ ] O valor final pode variar?                                   |
|      (Ex: contratação por m², m³, hora técnica)                   |
|                                                                   |
+------------------------------------------------------------------+
|  CLASSIFICAÇÃO AUTOMÁTICA                                         |
|                                                                   |
|  [Badge: TERMO DE CONTRATAÇÃO]                                   |
|  Seu pedido requer formalização jurídica simplificada.            |
+------------------------------------------------------------------+
```

### 2.4 Campo Dinâmico: Escopo Detalhado
Quando `requerEscopoDetalhado = true`, aparece no step "detalhes":

```text
+------------------------------------------------------------------+
|  ESCOPO DETALHADO PARA MINUTA                                     |
|                                                                   |
|  ⚠️ Identificamos que sua solicitação requer formalização         |
|  jurídica. Por favor, detalhe o escopo para elaboração da minuta. |
|                                                                   |
|  [                                                               ]|
|  [   Descreva:                                                   ]|
|  [   - Etapas do serviço                                         ]|
|  [   - Prazos esperados                                          ]|
|  [   - Materiais envolvidos (se aplicável)                       ]|
|  [                                                               ]|
|                                                                   |
|  [82/100 caracteres] ⚠️ Mínimo de 100 caracteres                  |
+------------------------------------------------------------------+
```

### 2.5 Módulo Due Diligence
Quando `valorNumerico >= 50000`, aparece no step "detalhes":

```text
+------------------------------------------------------------------+
|  ⚠️ DUE DILIGENCE OBRIGATÓRIA                                     |
|  ---------------------------------------------------------------- |
|  Contratações acima de R$ 50.000 exigem pesquisa reputacional     |
|  do fornecedor antes da formalização.                             |
|                                                                   |
|  O que você deve fazer:                                           |
|  1. Após definição comercial, solicite Due Diligence no Projuris  |
|  2. Aguarde parecer do Jurídico (favorável/desfavorável)          |
|  3. Somente após parecer, comunique o vencedor da concorrência    |
|                                                                   |
|  [ ] Já possuo processo de Due Diligence no Projuris              |
|      Número do Processo: [________________]                        |
|                                                                   |
|  [✓] Declaro ciência da obrigatoriedade da Due Diligence *        |
+------------------------------------------------------------------+
```

### 2.6 Avisos de Retenção Técnica
Quando aplicável, aparece banner informativo:

```text
+------------------------------------------------------------------+
|  ℹ️ RETENÇÃO TÉCNICA APLICÁVEL                                    |
|  ---------------------------------------------------------------- |
|  Este contrato terá retenção de 6% sobre o valor total.           |
|  Prazo de liberação: 45-90 dias após termo de entrega.            |
|  (Para empreitadas: 90-180 dias)                                  |
+------------------------------------------------------------------+
```

### 2.7 Validação do Botão Enviar
O botão "Enviar" só é habilitado se:
- Para Termo/Contrato/Empreitada: `escopoDetalhadoMinuta.length >= 100`
- Para valor >= R$ 50k: `dueDiligenceConfirmada = true`

---

## 3. Alterações no Backoffice

### 3.1 Nova Coluna na Listagem
Badge visual para o instrumento jurídico:
- **OC** (cinza): Ordem de Compra
- **Termo** (azul): Termo de Contratação
- **Contrato** (laranja): Contrato Prestação/Fornecimento
- **Empreitada** (vermelho): Contrato de Empreitada

### 3.2 Flag de Due Diligence
Na listagem de solicitações >= R$ 50k:
- Ícone de escudo amarelo se `due_diligence_confirmada = true`
- Texto "Validar Due Diligence" no card expandido
- Campo visível com número Projuris (se preenchido)

### 3.3 Escopo Detalhado no Detalhamento
Nova seção no modal de detalhes:
```text
+------------------------------------------------------------------+
|  ESCOPO PARA MINUTA                                               |
|  ---------------------------------------------------------------- |
|  [Texto completo do escopo_detalhado_minuta]                      |
|                                                                   |
|  📋 Copiar para área de transferência                             |
+------------------------------------------------------------------+
```

### 3.4 Histórico
Novos eventos registrados:
- "Classificação jurídica: Termo de Contratação"
- "Due Diligence confirmada pelo solicitante"
- "Número Projuris informado: XXXXXX"

---

## 4. Tabela de Regras de Classificação

| Valor | Gatilho Obra Civil | Gatilho Risco | Resultado |
|-------|-------------------|---------------|-----------|
| < R$ 10k | - | - | OC |
| R$ 10k-69.9k | Não | Não | Termo de Contratação |
| R$ 10k-69.9k | Não | Sim | Termo de Contratação |
| >= R$ 70k | Não | Não | Contrato Prestação |
| Qualquer | Sim | - | Contrato Empreitada |

---

## 5. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Nova migration com enum e campos |
| `src/types/index.ts` | Novos tipos e labels |
| `src/pages/NovaSolicitacao.tsx` | Novo step, estados, validações |
| `src/pages/Backoffice.tsx` | Badge de instrumento, seção escopo |
| `src/hooks/useFormPersistence.ts` | Incluir novos campos no draft |
| `src/components/ui/SolicitacaoCard.tsx` | Badge de instrumento jurídico |

---

## 6. Impacto por Persona

### Para o Solicitante (Facilities)
- **Mais clareza**: Sistema induz o preenchimento correto
- **Menos retrabalho**: Classificação automática evita erros
- **Conhecimento do fluxo**: Avisos sobre Due Diligence e retenção
- **Documentação adequada**: Escopo detalhado já coletado na origem

### Para o Backoffice
- **Menos decisões manuais**: Instrumento jurídico já classificado
- **Validação facilitada**: Apenas conferir dados vs. Projuris
- **Escopo pronto**: Texto para minuta já disponível
- **Rastreabilidade**: Histórico completo das classificações

