

## Correções no Painel Projuris

### Problemas identificados

1. **Colunas por posição fixa**: O import usa `row[0]`, `row[6]`, etc. — quando a planilha muda a ordem das colunas, os dados ficam errados. A nova planilha tem ordem diferente (col 0 = Data finalização, antes era Data Requisição).

2. **Número Requisição vs Nº Fluig**: "Número Requisição" é o identificador do Projuris. "Nº Fluig" é o número Fluig. O import precisa mapear pelo **header** e não pela posição.

3. **Exibir data da última atualização**: Mostrar `updated_at` (data/hora da última importação) na tela.

4. **Tela separada para finalizadas**: A visão principal mostra apenas em aberto; finalizadas/canceladas/reprovadas ficam em outra sub-aba.

---

### Mudanças

**`ProjurisImport.tsx`** — Refatorar para mapeamento dinâmico por header:
- Ler a primeira linha (header), normalizar removendo acentos e lowercase
- Mapear cada coluna pelo nome (ex: "numero requisicao" → campo `numero_requisicao`, "n fluig" → `numero_fluig`, "status" → `status`, etc.)
- Não depender mais de índices fixos
- Usar "Número Requisição" como chave primária (`numero_requisicao`)

**`ProjurisVisaoStatus.tsx`** — Filtrar apenas registros em aberto:
- Query padrão exclui `FINALIZADA`, `CANCELADA`, `REPROVADA`
- Adicionar coluna "Últ. Atualização" mostrando `updated_at` formatado com data e hora
- KPIs contam apenas os em aberto

**`TabProjuris.tsx`** — Adicionar 5ª sub-aba "Finalizadas":
- Nova aba mostra somente registros com status `FINALIZADA`, `CANCELADA`, `REPROVADA`
- Tabela simples sem drag-and-drop, apenas consulta

**Novo: `ProjurisFinalizadas.tsx`** — Componente para a aba de finalizadas:
- Lista read-only com filtros de busca e empreendimento
- Sem drag-and-drop

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/monitoramento/projuris/ProjurisImport.tsx` | Refatorar parser para mapear por header |
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Filtrar em aberto + coluna updated_at |
| `src/components/monitoramento/projuris/ProjurisFinalizadas.tsx` | Criar — aba de finalizadas |
| `src/components/monitoramento/TabProjuris.tsx` | Adicionar aba "Finalizadas" |

