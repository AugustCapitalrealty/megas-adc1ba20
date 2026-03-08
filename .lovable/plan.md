

# Lote 3: Polish — Header Nav + Empty States

## #1 Header Nav — Tooltips para Telas Intermediarias

Na faixa 768-1280px, os labels da nav ficam apertados. Solução: em telas `md` a `xl`, mostrar apenas icones com tooltip; acima de `xl`, mostrar icone + label normalmente. O botao "Nova" ganha shadow e cor mais forte como CTA principal.

**Arquivo**: `src/components/layout/AppLayout.tsx`
- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider`
- NavLinks: em desktop, envolver cada link em `Tooltip`. Usar classes responsivas: label visivel apenas em `xl:inline` e escondido em `md`
- Botao "Nova": adicionar `shadow-md` e `bg-primary text-white` sempre (nao apenas quando ativo)

## #9 Empty States com Ilustracoes SVG Inline

Substituir o icone generico (`FileText 12x12`) por ilustracoes SVG inline leves e engajantes no Dashboard e MinhasSolicitacoes.

**Arquivo**: `src/pages/Dashboard.tsx` (empty state linhas 322-338)
- Substituir `FileText` por SVG ilustrativo inline (documento com estrela/checkmark, 80x80px) usando cores do design system (`hsl(var(--primary))`)
- Adicionar checklist visual: "✓ Conta criada", "○ Criar primeira solicitação"

**Arquivo**: `src/components/WelcomeTour.tsx`
- Adicionar ilustracao SVG no primeiro step (foguete estilizado) em vez do icone basico

## Arquivos Impactados
- `src/components/layout/AppLayout.tsx` — nav tooltips + CTA highlight
- `src/pages/Dashboard.tsx` — empty state ilustrado + checklist
- `src/components/WelcomeTour.tsx` — ilustracao no step 1

