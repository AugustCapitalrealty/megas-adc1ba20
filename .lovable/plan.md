# Correções da plataforma + campos Webdox

## 1. Alterar parcelas e fornecedores depois do chamado aberto

Hoje o modal de detalhes do Backoffice só exibe parcelas e fornecedores (leitura); a troca de fornecedor só existe no modal de correção do solicitante.

- Liberar, no fluxo de devolução para ajuste, a edição de **parcelas** e **fornecedores** pelo solicitante.
- No modal de correção (Minhas Solicitações), incluir o campo de número de parcelas (com valor por parcela calculado) junto dos campos já editáveis, e manter/ampliar a troca de fornecedor (principal e concorrentes 1 e 2).
- Toda alteração grava linha no histórico (valor anterior → novo) para auditoria.

## 2. Anexos marcados para exclusão que voltam a aparecer

O reenvio marca os anexos e chama a exclusão, mas o resultado da exclusão não é verificado: se o banco recusar ou falhar, o processo segue e a solicitação volta com o anexo antigo.

- Verificar o retorno da exclusão (registro e arquivo) e abortar o reenvio com mensagem clara em caso de falha.
- Depois de excluir, reconferir na base que os anexos marcados sumiram antes de mudar o status.
- Excluir **antes** de subir os novos arquivos do mesmo tipo, evitando dois anexos do mesmo tipo convivendo.
- Registrar no histórico quais anexos foram removidos, para o Backoffice auditar.

## 3. Garantia informada que não aparece (ex.: 2026000761)

Verificado na base: o chamado 2026000761 está com tipo de garantia "Produto" mas **sem dias de garantia** preenchidos, e ainda está em "Aguardando Aceite".

- Tornar os dias de garantia obrigatórios sempre que o tipo for diferente de "Sem garantia" (bloqueio no envio e na correção).
- Avisar no Backoffice quando um chamado tiver tipo de garantia sem prazo, permitindo completar o dado.
- Na tela de Garantias, sinalizar os chamados com garantia incompleta para não sumirem silenciosamente.

## 4. Clientes "Módulos Vagos A" e "Módulos Vagos B" (Mega Esteio)

Existe hoje um único cliente "Módulo Vago", com o identificador fixo no código para dispensar o comunicado ao cliente.

- Cadastrar os dois novos clientes vinculados ao Mega Esteio.
- Trocar o identificador fixo por uma regra que reconheça todos os clientes do tipo "módulo vago", para os três (e futuros) ficarem automaticamente dispensados do comunicado ao cliente.

## 5. Campos de representante legal e testemunha (Webdox)

- Novo bloco no chamado: **Representante legal** (nome, CPF, e-mail, telefone) e **Testemunha** (nome, CPF, e-mail, telefone).
- Exibido e **obrigatório apenas quando o instrumento não for OC** (termo de contratação e contratos), que é o caso que segue para o Webdox. Em OC o bloco não aparece.
- Máscara e validação de CPF, e-mail e telefone.
- Dados visíveis na revisão do wizard, no detalhe do Backoffice e na exportação.
- Ajustar os rótulos de "Projuris" para "Webdox" nas telas do chamado (os campos de número de processo continuam existindo).

## Detalhes técnicos

- Banco: novas colunas em `solicitacoes` (`representante_legal_nome/cpf/email/telefone`, `testemunha_nome/cpf/email/telefone`); inserção dos clientes e vínculos com Mega Esteio; marcação para identificar clientes "módulo vago".
- Frontend: `src/pages/NovaSolicitacao.tsx` com `DetalhesStep`/`RevisaoStep` (bloco Webdox e validação de garantia), `src/pages/MinhasSolicitacoes.tsx` (`handleResubmit`: checagem de erro na exclusão, ordem excluir→subir, parcelas editáveis), `SolicitanteModals.tsx`, `BackofficeModals.tsx` e `src/lib/solicitacao-rules.ts` (regra de módulo vago).