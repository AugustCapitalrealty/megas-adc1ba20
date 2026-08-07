# Correções da plataforma + campos Webdox — estado e o que falta

Não, o plano ainda **não** foi concluído. Só a parte inicial do item 5 (formulário) foi escrita, e ela ainda está incompleta porque a migração de banco não chegou a rodar (o banco estava fora no momento).

## Já feito

- `src/lib/signatarios.ts` (máscaras e validação de CPF, e-mail, telefone).
- `src/components/nova-solicitacao/SignatariosBlock.tsx` (bloco Representante legal + Testemunha).
- Campos e setters no estado do formulário (`types.ts`, `useNovaSolicitacaoForm.ts`), validação de erros e exibição no passo Detalhes.
- Validação de dias de garantia obrigatória no wizard (item 3, parte do envio).
- `src/lib/modulo-vago.ts` criado (ainda depende da coluna nova no banco).

## Falta fazer

### Banco
- Colunas em `solicitacoes`: `representante_legal_nome/cpf/email/telefone` e `testemunha_nome/cpf/email/telefone`.
- Coluna `modulo_vago` em `clientes` + marcar o "Módulo Vago" atual.
- Cadastrar "Módulos Vagos A" e "Módulos Vagos B" e vincular ao Mega Esteio.

### Item 5 — Webdox (concluir)
- Gravar os campos no envio da solicitação e no rascunho.
- Mostrar o bloco na revisão do wizard, no detalhe do Backoffice e na exportação.
- Trocar rótulos "Projuris" por "Webdox" nas telas do chamado (campos de número permanecem).

### Item 1 — parcelas e fornecedores após abertura
- No modal de correção do solicitante: campo de parcelas (com valor por parcela) e troca de fornecedor principal e concorrentes 1 e 2.
- Registrar cada alteração no histórico (valor anterior → novo).

### Item 2 — anexos marcados para exclusão
- Em `handleResubmit`: checar erro do delete (registro e arquivo) e abortar com mensagem clara.
- Reconferir na base que os anexos sumiram antes de mudar o status.
- Excluir antes de subir os novos arquivos do mesmo tipo.
- Registrar no histórico os anexos removidos.

### Item 3 — garantia incompleta (restante)
- Mesma obrigatoriedade no modal de correção.
- Aviso no Backoffice quando houver tipo de garantia sem prazo, com opção de completar.
- Sinalização na tela de Garantias.

### Item 4 — módulo vago (restante)
- Substituir o ID fixo em `solicitacao-rules.ts` pela regra baseada na marcação/nome, dispensando o comunicado ao cliente para todos.

## Detalhes técnicos
Arquivos: `src/pages/NovaSolicitacao.tsx`, `steps/RevisaoStep.tsx`, `src/pages/MinhasSolicitacoes.tsx`, `src/components/solicitante/SolicitanteModals.tsx`, `src/components/backoffice/BackofficeModals.tsx`, `src/pages/GarantiasVigentes.tsx`, `src/lib/solicitacao-rules.ts`, `src/lib/modulo-vago.ts`, `src/lib/export-utils.ts`.
