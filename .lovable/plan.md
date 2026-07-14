## Problema

O CNPJ 43708379000100 não retorna porque a BrasilAPI está devolvendo **HTTP 503** (indisponível) para esse cadastro específico. Confirmado via chamada direta:

```
curl https://brasilapi.com.br/api/cnpj/v1/43708379000100
→ 500 "Request failed with status code 503"
```

Hoje, quando a API falha, `useCNPJ.lookupCNPJ` retorna `null` e o usuário só vê "Erro ao consultar CNPJ", sem alternativa. Não existe caminho para cadastrar um CNPJ nacional manualmente — o formulário `InternationalSupplierForm` só serve para fornecedores estrangeiros.

## O que vou fazer

### 1. Melhorar diagnóstico da falha na API (`src/hooks/useCNPJ.ts`)
- `fetchCNPJFromAPI` passa a retornar um objeto de status (`{ data | null, reason: 'not_found' | 'unavailable' | 'network' }`) em vez de só `null`, para distinguir "CNPJ não existe" de "API fora do ar".
- `lookupCNPJ` expõe esse motivo (`apiStatus`) para o componente decidir se oferece o modo manual.

### 2. Novo formulário de contingência (`src/components/ManualSupplierForm.tsx`)
Componente novo, espelhado no `InternationalSupplierForm`, mas para CNPJ nacional. Campos:
- **CNPJ** (pré-preenchido com o que o usuário digitou, validação de dígito)
- **Razão social** * / Nome fantasia
- **E-mail** / Telefone
- **CEP, Logradouro, Número, Complemento, Bairro, Cidade, UF** (com máscara)
- **CNAE principal** (código + descrição, opcional)
- **MEI?** (checkbox)
- Aviso visível: "Cadastro manual — dados não validados pela Receita Federal. Preencha com cuidado."

Ao salvar: `insert` na tabela `fornecedores` com `tipo_fornecedor='nacional'` e **sem** `ultima_atualizacao_api` (para que o próximo `RefreshCw` tente enriquecer automaticamente quando a BrasilAPI voltar). Retorna o `Fornecedor` para o `onChange`.

### 3. Integrar o fallback no `SupplierSearch.tsx`
- Ao clicar em "Buscar" e receber `apiStatus === 'unavailable'` ou `'network'`, mostrar um bloco de alerta abaixo do input:
  > "A Receita Federal (BrasilAPI) está indisponível no momento para este CNPJ. Você pode **cadastrar manualmente** e atualizar os dados depois."
  > `[Cadastrar manualmente]`
- Botão abre o `ManualSupplierForm` no lugar do input (mesmo padrão do `showIntlForm`).
- Também adiciono um botão discreto "Cadastrar manualmente" no dropdown "CNPJ não encontrado" para o caso de `not_found` — útil se o usuário precisar seguir mesmo sem retorno.
- Toast informativo quando cai no modo manual, para deixar claro o motivo.

### 4. Botão "Atualizar dados da Receita Federal" (já existe)
Nenhuma mudança de lógica: como o cadastro manual grava `ultima_atualizacao_api = null`, o botão continuará funcionando para enriquecer os dados quando a API estiver disponível novamente.

## Fora de escopo
- Retry automático / proxy alternativo para BrasilAPI.
- Migração de banco (todos os campos usados já existem em `fornecedores`).
- Alterar o fluxo de fornecedor internacional.

## Arquivos afetados
- `src/hooks/useCNPJ.ts` (retornar motivo do erro)
- `src/components/ManualSupplierForm.tsx` (novo)
- `src/components/SupplierSearch.tsx` (integrar fallback)
