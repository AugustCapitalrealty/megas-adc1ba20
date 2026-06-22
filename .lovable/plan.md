## Objetivo

No card da Memória de Cálculo, trocar o agrupamento de **cliente** para **contrato**. Assim, um cliente com múltiplos contratos aparece em múltiplas linhas, cada uma com seus próprios módulos e Demanda Contratada vinda do contrato. A lista é ordenada pela menor numeração de módulo.

## Mudanças (apenas em `src/components/admin/energia/MemoriaCalculoTab.tsx`)

### 1. Carregar contratos vigentes com seus módulos
- `fetchCompData` já consulta `energia_contrato_modulos` + `energia_contratos` para resolver o vigente por módulo. Estender essa mesma query para guardar também o agrupamento inverso: `contratosVigentes: Array<{ contrato_id, numero_contrato, cliente_id, demanda_contratada_kw, modulos: Modulo[] }>`.
- Novo state `contratosVigentes` populado nessa função (sem nova chamada — reaproveita o resultado).

### 2. Trocar a chave de `consumoCli`
- Hoje: `cliente_key` = `cliente.id` ou `'AREA_COMUM'`.
- Novo: `cliente_key` = `CONTRATO_<contrato_id>` ou `'AREA_COMUM'`. Mantém o nome do campo para não quebrar o JSON salvo; valores antigos por cliente continuam carregando, mas não casam mais com nenhum grupo (ficam ignorados) — aceitável já que ainda não há lançamentos em produção para os novos contratos.

### 3. Reescrever os `grupos` em `ConsumoClienteCard`
- Receber `contratosVigentes` por prop em vez de derivar de `clientes`/`modulos`.
- Um grupo por contrato:
  - `key = 'CONTRATO_' + contrato_id`
  - `nome = razão social do cliente + ' — ' + numero_contrato` (mostra qual contrato quando há mais de um)
  - `modulos = módulos vinculados ao contrato` (ordenados por número)
  - `demandaContratada = contrato.demanda_contratada_kw` (vem do contrato, não da soma dos módulos)
- Continua existindo a linha **ÁREA COMUM** (módulos cujo identificador casa "Área Comum") e a linha **MÓDULOS VAGOS → Mega** (módulos sem contrato vigente e não-área-comum).

### 4. Ordenação por módulo
- Para cada grupo, ordenar `modulos` por chave numérica natural do `identificador` (extrai o primeiro número; `'39A'` vira `39`, desempate alfabético).
- Ordenar a lista de grupos pelo menor número de módulo do grupo (o que tem módulo `1` aparece primeiro, depois `2`, etc.). Área Comum e Vagos continuam no final (Vagos sempre por último).

### 5. Rateio em `saveConsumoCli`
- Substituir a lógica que filtra módulos por `cliente_id` por: para cada entrada `CONTRATO_<id>`, usar `contratosVigentes[id].modulos`. Mantém o rateio proporcional à área (e fallback igualitário).
- `AREA_COMUM` e o resto para Vagos continuam idênticos.
- `demanda_contratada_kw` por lançamento passa a vir de `contratosVigentes` (já é a mesma fonte que `contratoPorModulo`).

## Comportamento resultante

Pelos dados atuais, a tabela passa a listar (na ordem dos módulos):

```text
VELOZ — <contrato>          1, 2
NTN — <contrato>            3, 4, 7
TORNADO — <contrato>        5
DAMASIO — <contrato>        6
HP TRADE — <contrato>       8, 9, 10
DGI — <contrato>            11
BOSCH — <contrato>          12-17, 27-30
CALAMO — <contrato>         18-23, 35-38
BOTICARIO — <contrato>      31-34
SHOPEE — <contrato>         39A, 39B, 40, 41, 54-59, 66-71
SUZANO — <contrato>         42-47
MERCADOLIVRE — <contrato>   48-52
SODEXO — <contrato>         Restaurante
ÁREA COMUM
MÓDULOS VAGOS → Mega        24, 25, 26, 53, 60-65
```

Se um cliente tiver dois contratos vigentes, aparecem duas linhas distintas, cada uma com sua Dem. Contratada e seus módulos.

## Fora de escopo

- Não mexe em telas de cadastro/contratos.
- Não migra valores antigos de `consumo_por_cliente` salvos com chave de cliente — eles são apenas ignorados pelas novas chaves.
