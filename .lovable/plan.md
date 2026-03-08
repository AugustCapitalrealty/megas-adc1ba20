

# Etapa 2 — Extrair Modais + Batch Actions

## O que será feito

### 1. Extrair Modais para `BackofficeModals.tsx`

Mover todos os 8 modais (linhas 1556-2753 do `Backoffice.tsx`) para um novo componente:

- **Details Modal** (detalhes da solicitação)
- **Action Modal** (assumir/rejeitar/processar/ajuste)
- **Registro OC Modal** (registrar OC com validação PDF)
- **NF/Boleto View Modal** (visualizar documentos fiscais)
- **Edit Fluig Modal** (editar número Fluig/RM)
- **Edit Fluig Cadastro Modal** (Fluig de cadastro contábil)
- **Edit Projuris Modal** (número Projuris)
- **Confirmation Modal** (confirmações genéricas)

O componente `BackofficeModals` receberá via props todo o state e handlers necessários. O `TransferOwnershipModal` continua inline pois já é um componente externo.

**Resultado:** `Backoffice.tsx` reduzido de ~2756 para ~1600 linhas.

### 2. Batch Actions com Barra Flutuante

Adicionar seleção múltipla e ações em lote:

- **Checkbox** em cada card (no `BackofficeSolicitacaoCard`)
- **State** `selectedIds: Set<string>` no `Backoffice.tsx`
- **Barra flutuante** no rodapé: "N selecionadas — [Assumir Todas] [Exportar]"
- Ações suportadas: **Assumir em lote** (só para status `recebido`/`em_analise`) e **Exportar selecionadas**

```text
┌─────────────────────────────────────────────────────────┐
│ ☑ 3 selecionadas    [Limpar]  [Exportar]  [Assumir]    │
└─────────────────────────────────────────────────────────┘
```

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/backoffice/BackofficeModals.tsx` | **Criar** — todos os modais extraídos |
| `src/components/backoffice/BatchActionBar.tsx` | **Criar** — barra flutuante de ações em lote |
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | **Editar** — adicionar checkbox de seleção |
| `src/pages/Backoffice.tsx` | **Editar** — remover modais inline, adicionar state de seleção, integrar novos componentes |

