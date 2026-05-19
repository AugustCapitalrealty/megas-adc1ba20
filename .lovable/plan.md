## Dois bugs no rascunho

### Bug 1 — Valor errado ao carregar
Em `NovaSolicitacao.tsx` o load do rascunho faz `setValor(String(s.valor))` (linhas 335, 344, 345). O estado `valor` guarda **centavos como string só de dígitos**: `valorNumerico = parseFloat(valor.replace(/\D/g,'')) / 100`.

Resultado: um rascunho com `valor = 1000` reabre como "R$ 10,00". Para `770.37` o parser remove o ponto e gera "77037"/100 = 770,37 (coincidência), mas qualquer valor inteiro ou com mais dígitos quebra.

**Fix**: converter usando o mesmo padrão do `duplicateFrom` (linha 70 do hook):
```ts
setValor(String(Math.round(Number(s.valor) * 100)));
setValorServico(String(Math.round(Number(s.valor_servico) * 100)));
setValorMaterial(String(Math.round(Number(s.valor_material) * 100)));
```

### Bug 2 — Anexos "perdidos" bloqueiam envio
Ao reabrir o rascunho, `existingAnexos` é carregado só para o banner informativo. O mapa `formState.anexos[tipo]` continua vazio, então toda validação (`!!formState.anexos[att.tipo]`) considera os obrigatórios faltando — e o "Enviar Solicitação" fica bloqueado mesmo com o arquivo salvo no servidor.

Pontos afetados:
- `NovaSolicitacao.tsx` linhas 160, 192, 557, 630 (`canSubmit`, `requiredAttachments`, `missingAttachments`)
- `useNovaSolicitacaoErrors.ts` linha 108 (erro inline na etapa Anexos)
- `uploadAnexos` no submit/promoção — não pode tentar reenviar o que já está lá

**Fix**: tratar anexos já persistidos como satisfazendo o requisito.

1. Derivar `existingAnexoTipos = new Set(existingAnexos.map(a => a.tipo))`.
2. Função helper `hasAnexo(tipo)` = `!!formState.anexos[tipo] || existingAnexoTipos.has(tipo)`.
3. Trocar todas as checagens `!!formState.anexos[a.tipo]` por `hasAnexo(a.tipo)` em `NovaSolicitacao.tsx` e em `useNovaSolicitacaoErrors.ts` (passar o `Set` como novo parâmetro opcional do `computeStepErrors`/`useStepErrors`).
4. Em `AnexosStep`, exibir um chip "✓ já enviado: nome.pdf" para cada `tipo` em `existingAnexos` (apenas leitura, com botão "Substituir" que limpa do banner local e abre input — substituição já é coberta pelo dedup do `uploadAnexos`).
5. No promote (linha ~755), o `uploadAnexos` continua só processando o que estiver em `formState.anexos` (novos uploads), então não duplica nem tenta reenviar.

## Arquivos

- `src/pages/NovaSolicitacao.tsx` — fix valor + propagar `existingAnexoTipos` para validações.
- `src/hooks/useNovaSolicitacaoErrors.ts` — aceitar set de anexos persistidos.
- `src/components/nova-solicitacao/steps/AnexosStep.tsx` — render dos anexos já salvos com opção de substituir.

## Não escopo

- Excluir anexo individual já salvo (será feito junto com a feature "Excluir rascunho").
