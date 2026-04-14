

## Melhorias no Vínculo e Reorganização — Projuris

### Problemas

1. O hyperlink de vínculo redireciona para `/backoffice?id=...` — deveria abrir o `OCDetalhesModal` diretamente com os detalhes da solicitação
2. O visual do link está ruim (texto pequeno, pouco destaque)
3. A ordem das colunas precisa ser reorganizada para melhor leitura

### Mudanças

**1. Vínculo abre OCDetalhesModal ao invés de navegar**
- Na tabela (`ProjurisVisaoStatus.tsx`): ao clicar no vínculo, abrir o `OCDetalhesModal` com o `solicitacaoId` e `protocolo`
- No modal de detalhes (`ProjurisDetalhesModal.tsx`): mesmo comportamento — o botão de vínculo abre o `OCDetalhesModal`
- Adicionar estado para controlar o modal de detalhes da solicitação

**2. Melhorar visual do vínculo**
- Badge colorido com ícone ao invés de link simples
- Mais visível e consistente com o design do sistema

**3. Reorganizar ordem das colunas**
Nova ordem: Seq. | Nº Req. | Fornecedor | Empreend. | Status | Responsável | Data Req. | Parado | Vínculo

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Reorganizar colunas, integrar OCDetalhesModal para vínculo |
| `src/components/monitoramento/projuris/ProjurisDetalhesModal.tsx` | Vínculo abre OCDetalhesModal ao invés de navegar |

