## Mudança

Em `src/components/admin/energia/MemoriaCalculoTab.tsx`, na tabela "Consumo por Cliente", substituir a linha única "TOTAL = Copel" (com validação inline) por três linhas explícitas ao final:

1. **TOTAL Preenchido** — soma de tudo digitado (incluindo Área Comum). Para Demanda usa `sumD`, para Ponta `sumCP`, para Fora `sumCF`.
2. **TOTAL Copel** — `copelTotais.d / cp / cf` (valores da fatura Copel).
3. **Diferença (Copel − Preenchido)** — cor verde se ~0, âmbar se positiva (falta alocar), vermelha se negativa (excede). Sem o texto "p/ Vagos" embutido — só o número e o sinal.

Remover a função `validation` antiga (agora redundante). Manter o aviso "Soma das demandas excede a Copel" que já aparece abaixo da tabela.

Sem mudança de cálculo, schema ou outras abas.