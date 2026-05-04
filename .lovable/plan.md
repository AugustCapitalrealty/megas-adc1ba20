## Diagnóstico

O usuário **Dionatan Rek** (`megaitajai@capitalrealty.com.br`) consegue **visualizar** a solicitação `#2026000407` (dona: Amanda Alexandre, empreendimento: Mega Itajaí) porque tem acesso ao empreendimento via `user_empreendimentos`. A policy de SELECT em `solicitacoes` libera o acesso por empreendimento, mas as **policies de Storage não acompanharam essa regra** — exigem que `s.user_id = auth.uid()` (dono direto) ou que o usuário seja backoffice/admin.

Resultado: Dionatan vê a OC, vê os anexos, mas o `supabase.storage.from('...').download(...)` falha silenciosamente (RLS bloqueia) e dispara o toast vermelho "Erro ao baixar documento". O mesmo problema afeta:

| Bucket | Policy atual | Problema |
|---|---|---|
| `documentos-emitidos` (OC/AC) | `s.user_id = auth.uid()` | Não cobre acesso por empreendimento |
| `documentos-fiscais` (NF/Boleto) | `(storage.foldername(name))[1] = auth.uid()` | Só o uploader baixa; não cobre dono nem empreendimento |
| `anexos` (anexos da solicitação) | `user_owns_solicitacao(...)` (só checa dono) | Não cobre acesso por empreendimento |

A função `public.user_can_access_solicitacao(uuid)` já existe e retorna true para: dono, backoffice/admin, ou usuário com vínculo ao empreendimento (incluindo `'todos'`). Vamos reaproveitá-la.

## Plano

### 1. Migração de banco — alinhar Storage RLS com `user_can_access_solicitacao`

Criar migração que:

**Bucket `anexos`** — substituir a policy SELECT existente para usar `user_can_access_solicitacao` em vez de `user_owns_solicitacao`:
```sql
DROP POLICY "Users can view anexos files" ON storage.objects;
CREATE POLICY "Users can view anexos files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anexos'
  AND user_can_access_solicitacao(((storage.foldername(name))[1])::uuid)
);
```
(UPDATE/DELETE permanecem restritos ao dono + backoffice — sem mudança.)

**Bucket `documentos-emitidos`** — remover as duas policies redundantes (`Users can download own documentos` e `Users can download their own documents`) e criar uma única que use `user_can_access_solicitacao` via JOIN com `documentos_emitidos`:
```sql
DROP POLICY "Users can download own documentos" ON storage.objects;
DROP POLICY "Users can download their own documents" ON storage.objects;
CREATE POLICY "Users can download accessible documentos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos-emitidos'
  AND EXISTS (
    SELECT 1 FROM documentos_emitidos d
    WHERE d.storage_path = storage.objects.name
      AND user_can_access_solicitacao(d.solicitacao_id)
  )
);
```

**Bucket `documentos-fiscais`** — substituir a policy de uploader-only por uma baseada em `documentos_fiscais`:
```sql
DROP POLICY "Users can view own fiscal documents" ON storage.objects;
CREATE POLICY "Users can view accessible fiscal documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos-fiscais'
  AND EXISTS (
    SELECT 1 FROM documentos_fiscais df
    WHERE df.storage_path = storage.objects.name
      AND user_can_access_solicitacao(df.solicitacao_id)
  )
);
```

### 2. Validação

Após a migração, testar manualmente como Dionatan:
- baixar OC `#064025` da solicitação `2026000407` (deve funcionar)
- baixar anexos da mesma solicitação (deve funcionar)
- continuar **sem conseguir** baixar arquivos de empreendimentos aos quais ele não tem vínculo (regressão)

Conferir também que o solicitante dono e o backoffice continuam baixando normalmente.

### 3. Sem alterações de frontend

O código de download (`AnexoCard`, `downloadDocumentoEmitido`, `downloadDocumentoFiscal`) já está correto — o problema é exclusivamente de RLS no Storage.

## Considerações

- **Segurança**: a função `user_can_access_solicitacao` é `SECURITY DEFINER` com `search_path` fixo e já é a fonte da verdade usada na policy SELECT de `solicitacoes`. Aplicá-la ao Storage deixa as duas camadas consistentes — quem vê a linha passa a poder baixar o arquivo, o que é o comportamento esperado.
- **Escopo de upload/delete**: Não vamos relaxar INSERT/UPDATE/DELETE; apenas SELECT (download). Edição/remoção de anexos continua restrita ao dono e ao backoffice.
- **Performance**: Os JOINs nas policies usam `storage_path = objects.name` (campo indexado nas tabelas `documentos_emitidos` e `documentos_fiscais`). Sem impacto perceptível.
