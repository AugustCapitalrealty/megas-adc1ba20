## Diagnóstico

Na fatura da Copel a bandeira amarela aparece com dois números:

- **Tarifa unit. (R$)** = 0,018850 → 1,8850 R$/100 kWh (**sem** tributos, é a tarifa oficial da ANEEL)
- **Preço unit com tributos** = 0,025511 → 2,5511 R$/100 kWh (**com** PIS/COFINS e ICMS embutidos)

No código (`FaturaCopelTab.tsx` → `bandeira_valor`), esse campo é repassado direto ao motor de rateio (`src/lib/energia-rateio.ts`), que faz `bandeira = ((kWh + perdas)/100) × bandeira_valor` e soma esse resultado no total do cliente **sem aplicar imposto nenhum em cima**.

Conclusão: o preenchimento atual (1,885) está **incorreto** — está cobrando ~26% a menos de bandeira. O campo precisa da tarifa **com tributos**. Por isso a tabela interna já traz 2,5464 como padrão para a amarela (valor bruto aproximado); a fatura de junho traz 2,5511 porque o bruto depende das alíquotas do mês.

## O que fazer

### 1. Trocar o campo por dois, com o cálculo explícito

No bloco "Bandeira tarifária — como cobrar do cliente" (modo *Tarifa oficial*):

- **Tarifa ANEEL (sem tributos)** — campo editável, pré-preenchido pela bandeira vigente com o valor oficial líquido (verde 0 / amarela 1,8850 / vermelha P1 e P2 nos valores vigentes).
- **Tarifa com tributos (usada na cobrança)** — calculada automaticamente a partir das alíquotas da competência (ICMS, PIS, COFINS já cadastradas), na mesma ordem usada no resto do sistema: ICMS sobre o bruto e PIS/COFINS sobre o líquido de ICMS. Exibida em destaque e com opção de sobrescrever manualmente quando a fatura trouxer um valor diferente.

É essa tarifa com tributos que segue para `bandeira_valor`.

### 2. Conferência contra a própria fatura

Abaixo dos campos, uma linha de validação comparando a tarifa com tributos calculada com o **preço unitário com tributos** já digitado nas linhas "ADICIONAL BAND." da fatura Copel (0,025511 × 100). Se divergir mais que ~0,5%, mostra um aviso discreto sugerindo usar o valor da fatura.

### 3. Rótulos e ajuda

- Renomear o campo atual para deixar explícito "com tributos" / "sem tributos".
- Atualizar o texto do resumo (hoje "Tarifa: 1,8850 R$/100 kWh") para mostrar as duas linhas: oficial e cobrada.
- Ajustar o "Como é calculado (os dois jeitos)" para incluir o gross-up.

### 4. Compatibilidade

Competências já salvas continuam funcionando: se só existir `bandeira_tarifa_oficial` gravada, ela é lida como a tarifa com tributos (comportamento atual), e o campo líquido é derivado por engenharia reversa das alíquotas.

## Detalhes técnicos

- Alterações concentradas em `src/components/admin/energia/FaturaCopelTab.tsx`: nova constante com as tarifas ANEEL líquidas, novo campo `bandeira_tarifa_liquida` no JSONB `fatura_copel_itens`, cálculo do bruto em `bandeiraInfo`, e `bandeira_valor` passando a usar sempre a tarifa bruta.
- Nenhuma mudança em `src/lib/energia-rateio.ts` nem no banco (o JSONB já é livre).
