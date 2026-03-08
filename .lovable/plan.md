

# Plano: Abrir modal Fluig automaticamente após solicitar cadastro

## Problema
Quando o backoffice clica em "Solicitar Cadastro", o sistema registra no histórico mas não abre o campo para preencher o número Fluig. O fluxo ideal é: solicitar cadastro → abrir modal do Fluig para preenchimento.

## Mudança

**`src/pages/Backoffice.tsx`** — `handleSolicitarCadastro`:

Após registrar "Cadastro solicitado à Contabilidade" com sucesso (linha ~829), verificar se a solicitação ainda não tem `numero_chamado_fluig`. Se não tiver, abrir automaticamente o modal de edição do Fluig chamando `openEditFluig(sol)`.

```
// Após setCadastroStatus e toast de sucesso:
if (!sol.numero_chamado_fluig) {
  openEditFluig(sol);
}
```

Isso só abre o modal na primeira ação (solicitar cadastro), não na segunda (cadastro concluído), e apenas se o Fluig ainda não estiver preenchido.

