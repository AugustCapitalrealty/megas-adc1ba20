
## Diagnóstico completo

O botão "Ver OC Original" atualmente chama `navigate('/minhas-solicitacoes?search=${protocolo}')` — navega para outra página com filtro de busca, saindo do painel de garantias.

O objetivo é abrir o `OCDetalhesModal` inline (como o modal "Ver Detalhes" do Monitoramento/Projuris), sem sair da página.

O `OCDetalhesModal` já existe em `src/components/monitoramento/OCDetalhesModal.tsx` e aceita:
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `solicitacaoId: string | null`
- `protocolo: string | null`
- `onAction?: ...` (opcional — não precisamos passar)

O `GarantiaItem.id` é exatamente o `solicitacoes.id` (UUID) — confirmado no query do hook (linha 149: `id, protocolo, ...`). Todos os dados necessários já existem.

---

## Plano de implementação

### 1 — `src/pages/GarantiasVigentes.tsx`

Adicionar estado para o modal:
```ts
const [modalOpen, setModalOpen] = useState(false);
const [modalSolicitacaoId, setModalSolicitacaoId] = useState<string | null>(null);
const [modalProtocolo, setModalProtocolo] = useState<string | null>(null);
```

Substituir `handleVerOriginal`:
```ts
const handleVerOriginal = (id: string, protocolo: string) => {
  setModalSolicitacaoId(id);
  setModalProtocolo(protocolo);
  setModalOpen(true);
};
```

Adicionar `<OCDetalhesModal>` ao final do JSX:
```tsx
<OCDetalhesModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  solicitacaoId={modalSolicitacaoId}
  protocolo={modalProtocolo}
/>
```

Remover `useNavigate` (não será mais necessário).

### 2 — `src/components/garantias/GarantiaCard.tsx`

Atualizar a assinatura da prop:
```ts
onVerOriginal: (id: string, protocolo: string) => void;
```

Atualizar o `onClick` do botão:
```tsx
onClick={() => onVerOriginal(g.id, g.protocolo)}
```

Trocar ícone `ExternalLink` → `FileText` e label "Ver OC Original" → "Ver Detalhes" para alinhar com o padrão visual do resto do app.

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/GarantiasVigentes.tsx` | Estado do modal + handler + renderizar `OCDetalhesModal` |
| `src/components/garantias/GarantiaCard.tsx` | Assinatura da prop + ícone/label do botão |
