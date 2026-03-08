

# Melhorar Cabeçalho do PDF com Nova Logo

## Problema
A logo atual (fundo branco) fica mal posicionada sobre a faixa laranja — cria um bloco branco feio. A nova logo enviada tem fundo branco com o "M" laranja e texto preto, então precisa de fundo claro.

## Solução
Redesenhar o header para usar fundo **branco** com uma faixa laranja fina como acento, posicionando a logo com respiro adequado.

### Novo layout do header
```text
┌─────────────────────────────────────┐
│  [LOGO Mega]     Demonstrativo de   │  ← fundo branco
│  Centro Logístico     Rateio        │
│                  entre Condomínios   │
├═════════════════════════════════════┤  ← linha laranja grossa (4px)
```

### Alterações em `src/lib/rateio-pdf.ts`
1. Copiar a nova logo para `src/assets/logos/logo-mega_1.png`
2. Trocar faixa laranja cheia por fundo branco + linha laranja inferior (acento)
3. Logo maior (~55x28) sobre fundo branco — sem recorte
4. Título em cinza escuro/preto (não mais branco)
5. Subtítulo em cinza médio

**2 arquivos alterados** (copiar logo + editar rateio-pdf.ts header).

