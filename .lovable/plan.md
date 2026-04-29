# Plano: Login Dionatan + Detecção de Requisições Removidas no Projuris

## Diagnóstico

### 1. Problema do Dionatan
Conferi a base e ele **consegue autenticar** normalmente:
- Profile existe (`Dionatan Rek`, `megaitajai@capitalrealty.com.br`), `approved = true`.
- Tem entrada em `user_roles` com role `solicitante`.
- `last_sign_in_at` foi às 12:35 de hoje — login está funcionando.

O que está acontecendo é outro erro, visível no console e no print enviado:

```
TypeError: Failed to fetch dynamically imported module:
  /assets/MinhasSolicitacoes-D8_M63iu.js
DOMException: Falha ao executar 'insertBefore' em 'Node'...
```

Causa: o navegador dele guardou um `index.html` antigo que aponta para um chunk JS (`MinhasSolicitacoes-D8_M63iu.js`) que não existe mais após o último deploy. Quando o React tenta carregar a página via `lazy()`, o fetch falha e o componente Suspense quebra com o erro do `insertBefore`. Para o usuário, parece "não consegue logar" — na verdade é a tela seguinte que crasha.

### 2. Import Projuris
Hoje o `ProjurisImport.tsx` faz apenas `upsert` — registros que **saíram** da planilha permanecem na nossa base para sempre, criando "fantasmas" como o caso do 3830.

## O que será implementado

### A. Resiliência a chunks antigos (corrige Dionatan e qualquer outro usuário no mesmo estado)

1. **Recovery automático no `ErrorBoundary`** (`src/components/ErrorBoundary.tsx`):
   - Detectar erros do tipo `Failed to fetch dynamically imported module` ou `Importing a module script failed`.
   - Quando detectado, fazer `window.location.reload()` automático **uma única vez** (usando `sessionStorage` como flag para evitar loop).
   - Se já recarregou e o erro voltou, mostrar mensagem clara: *"Sua versão está desatualizada. Limpe o cache (Ctrl+Shift+R) ou abra em janela anônima."*

2. **Retry no `lazy()`** (`src/App.tsx`):
   - Criar helper `lazyWithRetry(importFn)` que tenta o import 2x antes de falhar (cobre falhas momentâneas de rede sem reload).

3. **Cabeçalhos de cache no `index.html`**:
   - Adicionar `<meta http-equiv="Cache-Control" content="no-cache">` para reduzir chance de `index.html` ficar preso em cache.

### B. Detecção de requisições removidas da planilha Projuris

Modificar `src/components/monitoramento/projuris/ProjurisImport.tsx`:

1. Após processar o CSV, montar um `Set` com todos os `numero_requisicao` presentes na planilha importada.
2. Buscar no banco todas as requisições **não finalizadas** (`status NOT IN ('FINALIZADA','CANCELADA','REPROVADA')`) e identificar as que **não estão** no Set.
3. Mostrar uma nova seção no modal: **"Requisições removidas do Projuris"** com:
   - Lista (número, status, requisitante, fornecedor, data).
   - Checkbox para selecionar quais excluir.
   - Botão "Excluir selecionadas da nossa base" → `delete` em `projuris_requisicoes` por id.
   - Botão "Manter todas" para fechar sem excluir.
4. Antes de excluir, confirmar com `AlertDialog`.

### Detalhes técnicos

```text
ErrorBoundary
 ├─ getDerivedStateFromError(err)
 │   └─ if isChunkLoadError(err) && !sessionStorage.getItem('chunk-reload')
 │        sessionStorage.setItem('chunk-reload','1'); window.location.reload();
 │   └─ else render fallback
```

```text
ProjurisImport (após upsert bem-sucedido)
 ├─ planilhaSet = new Set(records.map(r => r.numero_requisicao))
 ├─ select id, numero_requisicao, status, requisitante, ... 
 │    from projuris_requisicoes
 │    where status not in (closed)
 ├─ removidos = banco.filter(b => !planilhaSet.has(b.numero_requisicao))
 └─ setRemovidos(removidos) → renderiza seção de revisão
```

Não há mudança de schema nem de RLS — o usuário Backoffice já tem permissão de delete em `projuris_requisicoes`.

## Arquivos a alterar

- `src/components/ErrorBoundary.tsx` — auto-reload em chunk error.
- `src/App.tsx` — `lazyWithRetry` em volta dos `lazy()`.
- `index.html` — meta no-cache.
- `src/components/monitoramento/projuris/ProjurisImport.tsx` — fluxo de revisão e exclusão de removidos.

## O que pedir ao Dionatan agora

Enquanto a correção não sobe, peça para ele:
1. Pressionar **Ctrl + Shift + R** na tela de erro, ou
2. Abrir o app em **janela anônima**.

Isso vai limpar o `index.html` cacheado e ele entra normalmente.
