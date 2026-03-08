

# Fix: Mostrar acompanhamento jurídico quando há número Projuris

## Problema
A solicitação 2026000128 tem número Projuris atribuído pelo backoffice, mas o `JuridicoTracker` não aparece para o solicitante porque a condição atual exige `instrumento_juridico !== 'oc'`. Solicitações com instrumento jurídico = OC mas que receberam Projuris ficam sem visibilidade do acompanhamento.

## Solução
Alterar a condição de exibição do `JuridicoTracker` em **MinhasSolicitacoes.tsx** e **Backoffice.tsx** para também renderizar quando `numero_projuris` estiver preenchido.

### Arquivos

**`src/pages/MinhasSolicitacoes.tsx`** (linha ~1308):
```
// De:
{(sol as any).instrumento_juridico && (sol as any).instrumento_juridico !== 'oc' && (

// Para:
{((sol as any).instrumento_juridico && (sol as any).instrumento_juridico !== 'oc') || (sol as any).numero_projuris) && (
```

**`src/pages/Backoffice.tsx`** (linha ~1996):
Mesma lógica — mostrar tracker quando há `numero_projuris` OU `instrumento_juridico !== 'oc'`.

2 arquivos, 2 linhas cada. Sem migrations.

