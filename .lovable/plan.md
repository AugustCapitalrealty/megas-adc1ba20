

# Melhorias de Navegação e Funcionalidade da Plataforma

## Problema Principal

Existem vários links e botões na plataforma que navegam para páginas mas **não levam o usuário ao item correto**. O usuário chega na tela e precisa procurar manualmente. Identifiquei **7 problemas concretos** em 5 arquivos.

---

## Problemas Encontrados

### 1. Dashboard — Cards de Solicitações Recentes não buscam o protocolo

**Onde:** Ao clicar em uma solicitação recente no Dashboard (ex: #2026000141)

**Bug:** O click navega para `/minhas-solicitacoes` sem nenhum parâmetro. O usuário cai na lista geral e precisa procurar manualmente.

**Correção:** Navegar com `?search=PROTOCOLO` para que a solicitação apareça filtrada e auto-expandida.

---

### 2. Dashboard — KPI "Pendentes" do backoffice envia filtro errado

**Onde:** Dashboard no modo backoffice, card "Aguardando Solicitante"

**Bug:** Usa `filter=correcoes` que é um filtro da aba de **Minhas Solicitações** (visão do solicitante). Para backoffice, deveria navegar para o `/backoffice` com o filtro correto, não para `/minhas-solicitacoes`.

**Correção:** Manter a navegação para `/minhas-solicitacoes?filter=correcoes` mas garantir que admin/backoffice automaticamente mude o `viewMode` para `empreendimento` (já implementado parcialmente, só falta aplicar para `filter` além de `search`).

---

### 3. PendingActionsCard — Filtro "NF/Boleto" envia filtro inexistente

**Onde:** Card de "Ações Pendentes" no Dashboard e em Minhas Solicitações

**Bug:** O botão "NF/Boleto" envia `filter=aguardando_nf`, mas **esse tab não existe**. Os tabs válidos são: `todas`, `com_backoffice`, `correcoes`, `oc_emitida`, `liberadas`, `reprovadas`, `concluidas`. As solicitações aguardando NF/Boleto estão na aba `liberadas`.

**Correção:** Mudar `aguardando_nf` para `liberadas` no `PendingActionsCard`.

---

### 4. Notificações — Click não filtra pela solicitação

**Onde:** Sino de notificações no header

**Bug:** Ao clicar numa notificação que tem `solicitacao_id`, navega para `/minhas-solicitacoes` sem parâmetros. O usuário precisa procurar manualmente a solicitação.

**Correção:** Buscar o protocolo da solicitação e navegar com `?search=PROTOCOLO`.

---

### 5. MinhasSolicitacoes — URL param `filter` não aplica viewMode para admin

**Onde:** Quando admin chega via link com `?filter=correcoes` (vindo do Dashboard)

**Bug:** O auto-switch para `viewMode = 'empreendimento'` só funciona quando tem `?search=`. Quando chega com `?filter=` o admin fica no modo `minhas` e pode não ver todas as solicitações.

**Correção:** Aplicar a mesma lógica de auto-switch quando houver `filter` na URL.

---

### 6. DashboardSLA / DashboardEficiencia — Links de protocolo não expandem

**Onde:** Tabelas de drill-down nos dashboards SLA e Eficiência

**Bug:** Navegam para `/minhas-solicitacoes?search=PROTOCOLO` o que funciona parcialmente (filtra), mas se o admin não tem a solicitação, fica vazio. Deveria considerar navegar para o backoffice quando o usuário é backoffice/admin.

**Correção:** Para usuários backoffice/admin, esses links devem navegar para `/backoffice?search=PROTOCOLO` ao invés de `/minhas-solicitacoes`.

---

### 7. Backoffice — Não suporta `?search=` na URL

**Onde:** Página do Backoffice

**Bug:** A página do Backoffice não lê parâmetros da URL. Quando redirecionamos protocolos para lá, o campo de busca não é preenchido.

**Correção:** Adicionar leitura de `useSearchParams` ao Backoffice, igual ao que fizemos no MinhasSolicitacoes.

---

## Seção Técnica

### Arquivos a modificar

| Arquivo | Alteração |
|---|---|
| `src/pages/Dashboard.tsx` | Solicitações recentes: navegar com `?search=protocolo`; |
| `src/components/PendingActionsCard.tsx` | Trocar filtro `aguardando_nf` por `liberadas` |
| `src/components/NotificationBell.tsx` | Buscar protocolo antes de navegar; usar `?search=protocolo` |
| `src/pages/MinhasSolicitacoes.tsx` | Auto-switch viewMode quando `filter` estiver na URL |
| `src/pages/DashboardSLA.tsx` | Para backoffice/admin, navegar para `/backoffice?search=` |
| `src/pages/DashboardEficiencia.tsx` | Para backoffice/admin, navegar para `/backoffice?search=` |
| `src/pages/Backoffice.tsx` | Ler `?search=` da URL para preencher o campo de busca |

### Detalhes de implementação

**Dashboard.tsx — Solicitações recentes:**
```text
// Linha 261: trocar
navigate('/minhas-solicitacoes')
// Por:
navigate(`/minhas-solicitacoes?search=${sol.protocolo}`)
```

**PendingActionsCard.tsx — Filtro NF/Boleto:**
```text
// Linha 67: trocar
case 'nf_boleto': return 'aguardando_nf';
// Por:
case 'nf_boleto': return 'liberadas';
```

**NotificationBell.tsx — Navegação com protocolo:**
```text
// Buscar protocolo da solicitação antes de navegar
const { data } = await supabase
  .from('solicitacoes')
  .select('protocolo')
  .eq('id', notification.solicitacao_id)
  .single();

if (data) {
  navigate(`/minhas-solicitacoes?search=${data.protocolo}`);
}
```

**MinhasSolicitacoes.tsx — Auto-switch com filter:**
```text
// Expandir a lógica existente para incluir urlFilter:
useEffect(() => {
  if ((urlSearch || urlFilter) && (hasAllAccess || userEmpreendimentos.length > 0)) {
    setViewMode('empreendimento');
  }
}, [urlSearch, urlFilter]);
```

**DashboardSLA.tsx e DashboardEficiencia.tsx — Links inteligentes:**
```text
// Usar backoffice para usuários com acesso:
const targetPath = isBackofficeOrAdmin 
  ? `/backoffice?search=${protocolo}` 
  : `/minhas-solicitacoes?search=${protocolo}`;
navigate(targetPath);
```

**Backoffice.tsx — Ler search da URL:**
```text
const [searchParams] = useSearchParams();
const urlSearch = searchParams.get('search') || '';

// Inicializar searchTerm com urlSearch
const [searchTerm, setSearchTerm] = useState(urlSearch);
```

