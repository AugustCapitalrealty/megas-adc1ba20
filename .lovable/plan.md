

## Mover "Solicitar Revisão" para a tela de revisão da OC

### Problema
Hoje o fluxo é: `revisar` → `decidir` (onde aparecem as opções Liberar / Solicitar Revisão) → `tipo_entrega` → `confirmar`. O usuário precisa clicar "Liberar para Fornecedor" para só então ver a opção de pedir revisão — não é intuitivo.

### Solução
Colocar os dois caminhos na tela `revisar`, eliminando o step `decidir`:

```text
ANTES:
revisar → decidir (Liberar | Revisão) → tipo_entrega → confirmar

DEPOIS:
revisar (Liberar | Solicitar Revisão) → tipo_entrega → confirmar
                                      ↘ ajuste (campo texto + botão)
```

### Mudanças em `SolicitanteModals.tsx`

**Step `revisar`** — após os documentos da OC e o aviso "Revise com atenção":
- Adicionar os dois cards de opção (Liberar / Solicitar Revisão) que hoje estão no `decidir`
- Se "Solicitar Revisão" selecionado, exibir campo de texto + botão "Solicitar Ajuste"
- Se "Liberar" selecionado, botão no footer vai para `tipo_entrega`

**Footer do `revisar`**:
- Botão "Fechar" (outline)
- Se `showAjusteField`: botão "Solicitar Ajuste" (warning)
- Se não: botão "Liberar para Fornecedor" → vai para `tipo_entrega` (pula `decidir`)

**Remover step `decidir`** completamente — o conteúdo foi absorvido pelo `revisar`.

**Step `tipo_entrega`**: botão "Voltar" volta para `revisar` (em vez de `decidir`).

**Type `aceiteStep`**: remover `'decidir'` do union type em `AceiteModalProps` e `MinhasSolicitacoes.tsx`.

