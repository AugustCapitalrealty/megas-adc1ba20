

## Melhorias na Tela Projuris — Visão por Status

### Mudanças

**1. Remover coluna "Últ. Atualização" da tabela — mover para abaixo do botão de importar**
- No `TabProjuris.tsx`, exibir a data/hora da última importação (mais recente `updated_at` dos registros) como texto pequeno abaixo do botão de importar planilha.
- Na tabela de `ProjurisVisaoStatus`, remover a coluna "Últ. Atualização".

**2. Adicionar novas colunas na tabela**
- **Data Requisição**: Formatar `data_requisicao` como `dd/MM/yyyy`
- **Tempo Parado**: Calcular dias entre `data_requisicao` (ou `data_ultimo_envio_aprovacao` para quem está aguardando aprovação) e hoje. Exibir com badge colorido (verde < 7d, amarelo 7-14d, vermelho > 14d)
- **Fornecedor**: Exibir `cliente_fornecedor` truncado (apenas nome, sem CNPJ, pegar antes do " - ")

**3. Vincular com solicitações internas**
- Após carregar os dados do Projuris, buscar na tabela `solicitacoes` os registros onde `numero_projuris` corresponde ao `numero_requisicao` do Projuris
- Quando existir match, mostrar um ícone/badge clicável com o protocolo da solicitação interna na linha
- No modal de detalhes, exibir a solicitação vinculada com link

### Colunas finais da tabela
Seq. | Nº Req. | Status | Responsável | Empreendimento | Data Req. | Tempo Parado | Fornecedor | Vínculo

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Trocar colunas, adicionar tempo parado, fornecedor, vínculo com solicitações |
| `src/components/monitoramento/TabProjuris.tsx` | Mover última atualização para abaixo do import |
| `src/components/monitoramento/projuris/ProjurisDetalhesModal.tsx` | Adicionar seção de solicitação vinculada |

### Detalhes técnicos

- **Vínculo**: Query `supabase.from('solicitacoes').select('id, protocolo, numero_projuris, status').not('numero_projuris', 'is', null)` → criar mapa `numero_projuris → {protocolo, id, status}`
- **Tempo parado**: `differenceInDays(new Date(), new Date(row.data_requisicao))` usando date-fns
- **Fornecedor**: `row.cliente_fornecedor?.split(' - ')[0]` para pegar só o nome

