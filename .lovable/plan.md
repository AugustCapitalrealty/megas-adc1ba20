## Objetivo

Refazer o fluxo mensal de rateio para refletir como o operador realmente trabalha:

1. **Preencher a Fatura Copel** na mesma ordem e formato da fatura física (sem decimais forçados).
2. **Preencher consumo/demanda por CLIENTE** (não por módulo), porque a Copel mede tudo junto e o cliente recebe 1 fatura cobrindo todos os seus módulos.
3. **Áreas Comuns** preenchidas como "cliente" especial.
4. **Módulos Vagos** consolidados em 1 linha cuja fatura vai para a **Mega** (proprietária).
5. Simplificar a aba "Matriz por Módulo" para ser apenas visualização derivada.

---

## 1. Aba "Fatura Copel" — ordem e formato iguais à fatura

Reordenar `FaturaCopelTab` (ou substituir o bloco atual em `MemoriaCalculoTab`) para ficar **idêntico à tabela "Itens de fatura" da Copel**:

| Item                              | Unid. | Quant. | Preço unit (R$) com tributos | Valor (R$) | PIS/COFINS | ICMS | Tarifa unit. (R$) |
| --------------------------------- | ----- | ------ | ---------------------------- | ---------- | ---------- | ---- | ----------------- |
| ENERGIA ELÉTRICA TE PONTA         | kWh   | ✏️     | ✏️                            | ✏️          | ✏️          | ✏️    | ✏️                 |
| ENERGIA ELÉTRICA USD PONTA        | kWh   | ✏️     | ✏️                            | ✏️          | ✏️          | ✏️    | ✏️                 |
| ENERGIA ELÉTRICA TE F PONTA       | kWh   | ✏️     | ✏️                            | ✏️          | ✏️          | ✏️    | ✏️                 |
| ENERGIA ELÉTRICA USD F PONTA      | kWh   | ✏️     | ✏️                            | ✏️          | ✏️          | ✏️    | ✏️                 |
| DEMANDA USD                       | kW    | ✏️     | ✏️                            | ✏️          | ✏️          | ✏️    | ✏️                 |
| CONT ILUMIN PÚBLICA MUNICÍPIO     | —     | —      | —                            | ✏️          | —          | —    | —                 |

Mais o bloco lateral **Tributos** (ICMS / COFINS / PIS) com Base de Cálc. (R$), Alíquota (%), Valor (R$) — exatamente como na imagem.

**Regras de input:**
- Inputs `type="text"` com máscara livre, **sem `step` forçando casas decimais**. Aceita `43.689`, `0,549525`, `24008,18`, etc.
- Parsing pt-BR (vírgula = decimal, ponto = milhar) feito só no `onBlur`/salvar.
- Nada é "calculado" pela UI — o operador digita exatamente o que está na fatura. Validação visual: soma dos "Valor (R$)" + IP ≈ total da fatura (badge âmbar se divergir).

**Migration** — `energia_competencia_fatura_copel` recebe, para cada um dos 5 itens (TE_P, USD_P, TE_F, USD_F, DEM):  
`quant`, `preco_unit_com_tributos`, `valor`, `pis_cofins`, `icms`, `tarifa_unit` (numeric, default 0).  
Mais `iluminacao_publica`, e bloco tributos: `icms_base/aliq/valor`, `cofins_base/aliq/valor`, `pis_base/aliq/valor`.

---

## 2. Preenchimento por CLIENTE (não por módulo)

Nova aba **"Consumo por Cliente"** substitui a entrada por módulo na Matriz.

```text
Cliente             Módulos          Demanda Usada (kW)  Consumo Ponta (kWh)  Consumo Fora (kWh)
Mercado Livre       46,47,48,...,52  [   430,00   ]      [   12.500   ]       [   180.000  ]
Carrefour           12,13            [   ...      ]      [   ...      ]       [   ...      ]
ÁREA COMUM          AC               [   ...      ]      [   ...      ]       [   ...      ]
─────────────────────────────────────────────────────────────────────────────────────────
MÓDULOS VAGOS       1,5,9,...        (auto = Copel − Σ clientes)  → faturado p/ Mega
─────────────────────────────────────────────────────────────────────────────────────────
TOTAL                                Σ = Copel medido    Σ = Copel ponta      Σ = Copel f.ponta
```

**Regras:**
- Linhas geradas a partir de `cliente_id` distintos em `energia_modulos` (+ "Área Comum" + "Módulo Vago" como entidades reservadas no cadastro).
- Operador digita 3 campos por cliente (D/CP/CF). Demanda contratada do cliente = Σ `demanda_contratada_kw` dos módulos dele (read-only).
- **Linha Módulos Vagos = Copel − Σ clientes − Σ áreas comuns** (auto, read-only). Resultado financeiro vai para a **Mega** como cliente faturado.
- Badge de validação: se Σ ultrapassar Copel, mostra alerta vermelho.

**Migration** — nova tabela `energia_competencia_consumo_cliente`:
- `competencia_id`, `cliente_id` (nullable; null = Módulos Vagos), `tipo` enum (`cliente` | `area_comum` | `vago`), `demanda_usd_kw`, `consumo_ponta_kwh`, `consumo_fora_kwh`. Unique (competencia_id, cliente_id, tipo).

---

## 3. Engine de cálculo (`src/lib/energia-rateio.ts`)

- Substituir entrada `EnergiaLancamentoInput` (por módulo) por `EnergiaConsumoCliente` (por cliente).
- Para cada cliente, calcula TE/TUSD ponta+fora, demanda, ultrapassagem, ICMS, PIS/COFINS, bandeira (rateio proporcional à área dos módulos do cliente), IP (rateio proporcional), totais.
- Linha **Módulos Vagos** segue o mesmo cálculo; cliente final = "Mega" (proprietária do empreendimento).
- **Matriz por Módulo** (aba atual) vira **read-only derivada**: rateia o consumo do cliente entre seus módulos pela `area_m2` apenas para fins de relatório. Sem inputs.

---

## 4. Simplificação visual da Matriz por Módulo

- Remover inputs amarelos (D/CP/CF) — virou view-only.
- Manter colunas essenciais: Módulo, Cliente, Área m², Demanda contratada, Demanda usada (rateada), Consumo P, Consumo F, Total R$.
- Mostrar agrupamento visual por cliente (linhas zebradas + subtotal por cliente).
- Mesmo layout compacto sem scroll horizontal já entregue antes.

---

## 5. Cadastros auxiliares

- Garantir `cliente` reservado **"MEGA"** (destino dos módulos vagos) — seed se não existir.
- Garantir `cliente` reservado **"ÁREA COMUM"** — seed.
- Módulo "Area Comum" e módulos vagos do Mega Curitiba já existem (criados na rodada anterior); só associar à entidade certa.

---

## Arquivos afetados

**Migrations (novas):**
- `...add_fatura_copel_itens.sql` — colunas dos 5 itens + IP + tributos em `energia_competencia_fatura_copel`.
- `...add_consumo_por_cliente.sql` — tabela `energia_competencia_consumo_cliente` + GRANTs + RLS + seed dos clientes reservados (MEGA, ÁREA COMUM).

**Código:**
- `src/components/admin/energia/MemoriaCalculoTab.tsx` — reordenar bloco Fatura Copel, criar aba "Consumo por Cliente", tornar "Matriz por Módulo" read-only derivada.
- `src/lib/energia-rateio.ts` — nova função `calcularPorCliente()`, rateio para módulos para relatório, módulo-vago → Mega.
- `src/integrations/supabase/types.ts` — regenerado após migrations.

**Sem mudança:** `GrandezasContratadasTab` (já está OK), `ContratosTab`, `EnergiaCadastrosTab`.

---

## Validações finais

- Σ consumo clientes + área comum + vagos = Copel (badge verde) ou divergência (âmbar).
- Σ valor faturas por cliente = total Copel (badge verde) ou divergência (âmbar).
- Inputs aceitam digitação livre estilo fatura (sem step forçando decimais).
