

# Aumentar tamanho dos modais secundários

## Problema
Os modais de detalhes abrem com tamanhos menores do que o necessário, dificultando a leitura do conteúdo.

## Alterações

### 1. `src/components/monitoramento/OCDetalhesModal.tsx`
- **De:** `max-w-3xl max-h-[85vh]`
- **Para:** `max-w-5xl w-[95vw] max-h-[90vh]`

### 2. `src/pages/Backoffice.tsx` — modais menores
Os seguintes modais serão ampliados:

| Modal | Atual | Novo |
|-------|-------|------|
| Registro OC | `max-w-2xl max-h-[85vh]` | `max-w-4xl w-[90vw] max-h-[90vh]` |
| NF/Boleto | `max-w-lg` | `max-w-2xl w-[80vw]` |
| Edit Fluig/RM | `max-w-md` | `max-w-lg w-[80vw]` |
| Edit Projuris | `max-w-md` | `max-w-lg w-[80vw]` |

O modal principal de detalhes do Backoffice (`max-w-4xl w-[95vw] h-[90vh]`) já está grande — sem alteração.

**2 arquivos, ~5 linhas alteradas.**

