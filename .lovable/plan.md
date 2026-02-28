

# Plano: Melhorias de Experiência do Usuário (UX)

Após análise detalhada do codebase, identifiquei melhorias organizadas por impacto.

---

## 1. Página 404 — Em português e com navegação

**Arquivo:** `src/pages/NotFound.tsx`

Atualmente está em inglês ("Oops! Page not found") e sem layout corporativo. Trocar para português, adicionar logo Mega, e botão estilizado para voltar ao Dashboard.

---

## 2. Página Index — Redirecionar para Dashboard

**Arquivo:** `src/pages/Index.tsx`

A rota `/` renderiza um "Welcome to Your Blank App" genérico do template. O `App.tsx` já aponta `/` para `<Dashboard />`, mas o `Index.tsx` ainda tem o conteúdo padrão. Substituir por redirect ou pelo Dashboard propriamente.

**Verificação:** O `App.tsx` já mapeia `/` para `<Dashboard />`, então o `Index.tsx` não é usado. Porém, se alguém importar diretamente, deve redirecionar. Limpar esse arquivo.

---

## 3. Loading states mais informativos

**Arquivos:** `src/App.tsx` (SuspenseFallback), `src/pages/Login.tsx`, `src/pages/MinhasSolicitacoes.tsx`

Os loading states são apenas um spinner sem contexto. Adicionar o logo Mega e texto sutil "Carregando..." para dar feedback visual ao usuário e manter a identidade da marca durante transições.

---

## 4. Breadcrumbs nas páginas internas

**Arquivo:** `src/components/layout/AppLayout.tsx`

Não há breadcrumbs. Adicionar uma barra sutil abaixo do header com o caminho atual (ex: "Dashboard > Solicitações > #AC-2025-042") para orientação do usuário.

**Implementação:** Criar um componente `Breadcrumb` simples que lê a rota atual e exibe labels correspondentes.

---

## 5. Scroll-to-top ao navegar entre páginas

**Arquivo:** `src/App.tsx`

Ao navegar entre páginas, o scroll permanece na posição anterior. Adicionar um componente `ScrollToTop` que reseta o scroll ao mudar de rota.

---

## 6. Confirmação visual ao copiar protocolo

**Arquivo:** `src/components/ui/SolicitacaoCard.tsx`

O protocolo `#AC-2025-XXX` não tem ação de copiar. Adicionar click-to-copy no número do protocolo com feedback visual (tooltip "Copiado!").

---

## 7. Empty states mais amigáveis

**Arquivos:** `src/pages/MinhasSolicitacoes.tsx`, `src/pages/Backoffice.tsx`

Quando não há resultados de busca ou filtro, o estado vazio deve ter ilustração/ícone contextual e sugestão de ação clara, ao invés de apenas texto.

---

## 8. Skeleton loading nos cards de solicitação

**Arquivo:** `src/pages/MinhasSolicitacoes.tsx`, `src/pages/Dashboard.tsx`

Substituir o spinner centralizado por skeletons que simulam a forma dos cards durante carregamento, evitando layout shift e dando percepção de velocidade.

---

## 9. Toast de sucesso ao submeter formulário NovaSolicitação

**Verificação:** Já existe. Porém o feedback de navegação pós-submit pode ser melhorado com um estado intermediário de "Enviado com sucesso" antes do redirect.

---

## 10. Acessibilidade: foco visível e aria-labels

**Arquivos:** Vários componentes

Adicionar `focus-visible` rings consistentes e `aria-label` nos botões de ação que só têm ícone (ex: botão de expandir, botão de copiar).

---

## Ordem de Implementação

1. **Página 404 em português** — rápido, alto impacto visual
2. **Limpar Index.tsx** — eliminar conteúdo genérico
3. **ScrollToTop** — melhoria de navegação imediata
4. **Loading com logo Mega** — identidade durante transições
5. **Skeleton loading nos cards** — percepção de velocidade
6. **Click-to-copy no protocolo** — micro-interação útil
7. **Breadcrumbs** — orientação contextual
8. **Empty states melhorados** — feedback mais amigável
9. **Acessibilidade (aria-labels)** — conformidade e usabilidade

