

# Plano de Melhorias da Plataforma - 8 Itens

---

## 1. Bug Critico: Fornecedor Exclusivo Nao Permite Avancar

**Problema confirmado:** Quando o usuario marca "Fornecimento Exclusivo", a interface esconde corretamente a secao de 3 fornecedores (linha 1613: `requires3CNPJs && !fornecimentoExclusivo`), mas a **validacao do step** (linha 933) NAO considera `fornecimentoExclusivo`. Ela so verifica `excecaoFornecedores`, entao o formulario bloqueia o avanco exigindo 2 concorrentes que o usuario nem ve.

**Correcao:**
- Arquivo: `src/pages/NovaSolicitacao.tsx`
- Linhas 928-934 (validacao do step `fornecedor`): adicionar `!fornecimentoExclusivo` na condicao
- Linhas 682-700 (validacao do submit): idem
- Logica correta: `if (requires3CNPJs && !fornecimentoExclusivo && !excecaoFornecedores && (!concorrente1 || !concorrente2)) return false`
- Tambem validar que `fornecimentoExclusivo` exige `justificativaExclusividade` preenchida

---

## 2. Trigger instrumento_juridico: OC Recebendo Termo/Contrato

**Problema confirmado no banco:** 3 solicitacoes OC (combustivel/agua/energia) com valores acima de R$10.000 receberam `termo_contratacao` em vez de `oc`:
- #2026000106 (Energia, R$10.574) - ERRADO: `termo_contratacao`
- #2026000091 (Energia, R$18.590) - ERRADO: `termo_contratacao`
- #2026000076 (Agua, R$15.091) - ERRADO: `termo_contratacao`

**Correcao:** Migracao SQL para:
1. Alterar a funcao `set_instrumento_juridico` adicionando verificacao `IF NEW.tipo = 'OC' THEN` no inicio, forcar `instrumento_juridico = 'oc'` e pular toda a logica de calculo
2. UPDATE para corrigir os 3 registros existentes

---

## 3. Data dos Servicos +1 Dia (Fuso Horario)

**Problema:** Datas `data_inicio` e `data_fim` sao salvas como string (ex: "2026-02-11") mas ao exibir com `new Date("2026-02-11")`, o JavaScript interpreta como UTC meia-noite, que no fuso de Brasilia (UTC-3) vira o dia anterior ou seguinte dependendo do contexto.

**Correcao:**
- Arquivo: `src/lib/utils.ts` - a funcao `parseDateString` ja existe e resolve (adiciona `T12:00:00`)
- Verificar e corrigir TODAS as exibicoes de `data_inicio` e `data_fim` em:
  - `src/pages/MinhasSolicitacoes.tsx`
  - `src/pages/Backoffice.tsx`
  - `src/components/ui/SolicitacaoCard.tsx`
- Qualquer `new Date(sol.data_inicio)` deve ser substituido por `parseDateString(sol.data_inicio)`
- Qualquer `format(new Date(sol.created_at))` de campos DATE (nao TIMESTAMP) precisa do mesmo tratamento

---

## 4. Ver Anexos sem Precisar Corrigir

**Situacao atual:** Anexos so aparecem quando o usuario expande o card (expandedContent, linhas 1184-1197). Muitos usuarios nao percebem que podem expandir.

**Solucao:**
- Arquivo: `src/pages/MinhasSolicitacoes.tsx`
- Adicionar botao "Ver Anexos" (icone `Paperclip`) nos `headerActions` de cada SolicitacaoCard
- Ao clicar, abre um Dialog simples (somente-leitura) que lista todos os anexos com opcao de download usando o componente `AnexoCard` existente
- Nao requer acesso ao modal de correcao

---

## 5. Excluir Arquivos na Correcao (Melhorar Visibilidade)

**Situacao atual:** A funcionalidade JA existe (botoes "Excluir" e "Restaurar" no modal de correcao). O problema e visibilidade.

**Correcao:**
- Arquivo: `src/pages/MinhasSolicitacoes.tsx`
- Adicionar texto explicativo no topo da secao de anexos existentes: "Clique em Excluir para remover arquivos incorretos"
- Destacar visualmente o botao "Excluir" (usar `variant="destructive"` em vez de `outline`)

---

## 6. Botao "Informar Lancamento" no Canto Superior Direito (Backoffice)

**Situacao atual:** O botao fica junto com todos os outros no `flex-wrap` do rodape do card (linha 1238).

**Correcao:**
- Arquivo: `src/pages/Backoffice.tsx`
- Mover o botao de acao primaria de cada status para o `CardHeader` (ao lado do protocolo, no `justify-between`)
- Para `aprovado`: "Informar Lancamento" no header
- Para `aprovado/em_processamento`: "Registrar OC" no header
- Para `oc_ac_emitida`: "Concluir" no header
- Manter acoes secundarias (Ver Detalhes, Solicitar Ajuste, Rejeitar) na area inferior

---

## 7. Flag Infraspeak na Tela de Garantias

**Solucao:**
- Migracao SQL: adicionar coluna `infraspeak_registrada boolean DEFAULT false` na tabela `solicitacoes`
- Arquivo: `src/hooks/useGarantiasVigentes.ts` - incluir campo na query e funcao de toggle
- Arquivo: `src/pages/GarantiasVigentes.tsx` - botao toggle com icone em cada card de garantia, com badge visual "Infraspeak" quando ativo

---

## 8. Melhorias Visuais do Backoffice (Hierarquia de Botoes)

Aproveitando a mudanca do item 6, reorganizar TODOS os botoes do Backoffice:

- **Acao primaria** (botao cheio/filled): Assumir, Informar Lancamento, Registrar OC, Concluir - posicionado no header do card
- **Acoes secundarias** (outline): Ver Detalhes, Solicitar Ajuste - mantidos na area inferior
- **Destrutiva** (ghost vermelho, sem preenchimento): Rejeitar/Reprovar - mantido na area inferior, menos destaque
- **Utilitarios** (badges clicaveis): Fluig, Projuris, Cadastro - ja estao como badges, manter

---

## Resumo dos Arquivos

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/NovaSolicitacao.tsx` | Fix validacao fornecedor exclusivo |
| `src/pages/Backoffice.tsx` | Botao primario no header + hierarquia de botoes |
| `src/pages/MinhasSolicitacoes.tsx` | Dialog de anexos somente-leitura + visibilidade exclusao |
| `src/pages/GarantiasVigentes.tsx` | Botao flag Infraspeak |
| `src/hooks/useGarantiasVigentes.ts` | Campo infraspeak na query + toggle |
| `src/lib/utils.ts` | Verificar/padronizar funcoes de data |
| **Migracao SQL** | Fix trigger OC + campo infraspeak_registrada |

## Ordem de Execucao

1. Fix fornecedor exclusivo (bug bloqueante para usuarios)
2. Fix trigger OC para combustivel/agua/energia (dados incorretos)
3. Fix datas +1 dia (timezone)
4. Dialog de anexos somente-leitura
5. Botao primario no header do Backoffice + hierarquia
6. Flag Infraspeak nas garantias
7. Visibilidade da exclusao de anexos

