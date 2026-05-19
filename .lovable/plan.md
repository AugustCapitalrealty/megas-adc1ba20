## Bug

Ao enviar um rascunho, o trigger `validate_status_transition` rejeita com `Transição de status inválida: rascunho -> recebido` porque essa transição nunca foi cadastrada na tabela `status_transitions`.

## Correção

Migration única:

```sql
INSERT INTO public.status_transitions (status_from, status_to) VALUES
  ('rascunho', 'recebido')
ON CONFLICT DO NOTHING;
```

Sem mudanças de frontend — o fluxo de promoção já está pronto e os triggers `handle_rascunho_envio` / `notify_rascunho_promovido` continuam funcionando depois que a validação passa.
