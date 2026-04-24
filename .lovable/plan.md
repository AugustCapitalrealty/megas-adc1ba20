## Correção da Lógica de SLA do Backoffice

### Regras de Negócio Consolidadas

O SLA do backoffice mede o tempo até a solicitação **sair das mãos do backoffice interno** (Laureane, Paloma, etc.) com meta de **3 dias úteis**. Regras precisas:

1. **Início**: na criação da solicitação (`recebido`).
2. **Pausa**: quando entra em `pendente_correcao` ou `aguardando_informacoes` (bola está com o solicitante).
3. **Reset (zera)**: quando o solicitante responde e a solicitação volta para `recebido`. **O contador reinicia do zero** — conta o tempo que o backoffice levou para reassumir e processar de novo.
4. **Fim definitivo**: quando o **primeiro número Fluig é lançado** (`numero_fluig_adicionado` ou `atualizacao_fluig`). A partir daí o painel Fluig mostra a solicitação com outro responsável (ex.: Facilities — Jonatas, Para o Papel Gestor, etc.) e **o backoffice não controla mais o tempo**.
5. **Após o Fluig**: alterações de Fluig, novas correções, idas e vindas — **nada mais conta** para o SLA do backoffice.

### Diagnóstico do Bug Atual

Protocolo `2026000159`:
- Criado `26/02 14:53` → `recebido`
- Backoffice assumiu `26/02 16:58`
- **Primeiro Fluig em `02/03 12:13`** → SLA real: **~1.7 dias úteis** ✅
- Em `24/03` voltou para `aguardando_informacoes`
- Em `30/03` solicitante respondeu → `recebido`
- A função atual continua somando esses períodos pós-Fluig, inflando para 16 dias.

A causa: na função `calcular_sla_solicitacao`, a verificação `IF data_fluig_rm IS NOT NULL THEN ... CONTINUE;` está no início do loop, mas a **detecção do primeiro Fluig acontece DEPOIS** da verificação dos blocos de pausa/reset no mesmo iteration. Pior: ao final do loop, há um bloco que soma `now() - data_inicio` se `em_contagem` ainda estiver ativo, ignorando se já houve Fluig.

### Correção SQL

Reescrever `calcular_sla_solicitacao` e `get_sla_timeline` garantindo:

- **Após o primeiro Fluig (`data_fluig_rm` setado), nenhum evento posterior altera `tempo_backoffice`** — o `CONTINUE` precisa ser absoluto.
- **Reset com zerar**: a transição `pendente_correcao/aguardando_informacoes → recebido` antes do Fluig deve **zerar `tempo_backoffice` para 0** e reiniciar a contagem (regra explícita do usuário).
- **Bloco final**: só soma `now() - data_inicio` se `data_fluig_rm IS NULL` (ainda em poder do backoffice).

```sql
-- pseudo-lógica corrigida
FOR rec IN historico ORDER BY created_at LOOP
  -- 1) Pós-Fluig: ignora absolutamente tudo (só atualiza flags auxiliares)
  IF data_fluig_rm IS NOT NULL THEN
    IF rec.acao ILIKE '%cadastro%' THEN passou_cadastro := TRUE; END IF;
    CONTINUE;
  END IF;

  -- 2) Pausa (bola com solicitante)
  IF rec.status_novo IN ('pendente_correcao','aguardando_informacoes') THEN
    IF em_contagem AND data_inicio IS NOT NULL THEN
      tempo_backoffice := tempo_backoffice + horas_uteis(data_inicio, rec.created_at);
    END IF;
    em_contagem := FALSE; data_inicio := NULL;

  -- 3) Reset/reinício (solicitante respondeu) — ZERA conforme regra
  ELSIF rec.status_anterior IN ('pendente_correcao','aguardando_informacoes')
        AND rec.status_novo IN ('recebido','em_analise') THEN
    tempo_backoffice := 0;
    em_contagem := TRUE;
    data_inicio := rec.created_at;

  -- 4) Fim definitivo: primeiro Fluig
  ELSIF rec.acao IN ('numero_fluig_adicionado','atualizacao_fluig') THEN
    IF em_contagem AND data_inicio IS NOT NULL THEN
      tempo_backoffice := tempo_backoffice + horas_uteis(data_inicio, rec.created_at);
    END IF;
    data_fluig_rm := rec.created_at;
    em_contagem := FALSE;
  END IF;

  IF rec.acao ILIKE '%cadastro%' THEN passou_cadastro := TRUE; END IF;
END LOOP;

-- Bloco final: só conta tempo aberto se AINDA não houve Fluig
IF data_fluig_rm IS NULL AND em_contagem AND data_inicio IS NOT NULL
   AND status_atual NOT IN ('cancelado','rejeitado','pendente_correcao','aguardando_informacoes') THEN
  tempo_backoffice := tempo_backoffice + horas_uteis(data_inicio, NOW());
END IF;
```

A função `get_sla_timeline` recebe o mesmo tratamento — depois do primeiro Fluig, todos os eventos viram `tipo_evento = 'andamento'` com `conta_tempo = false`.

### Validação

Após a migration:
- `2026000159` deve mostrar **~1.7 dias** (de 26/02 16:58 a 02/03 12:13).
- Solicitações que ainda **não** receberam Fluig devem continuar contando normalmente até hoje.
- Solicitações que voltaram para correção e foram respondidas **antes** do Fluig devem mostrar apenas o tempo desde a última resposta.

### Arquivos a Alterar

- **Nova migration SQL** redefinindo `calcular_sla_solicitacao` e `get_sla_timeline`.
- Nenhum componente React/TS muda — eles consomem o JSON.

Após aplicar, vou rodar uma consulta de amostra (incluindo o `2026000159`) e confirmar os números corretos.
