Plano:

1. Atualizar a tabela "Diferença da Fatura Copel" em `FaturaCopelTab.tsx` para mostrar a ordem correta das colunas:

```text
Período | Copel (kWh) | Clientes (kWh) | Diferença (kWh)
```

2. Ajustar o texto explicativo do card para refletir a regra correta:

```text
Copel menos clientes = diferença.
```

3. Manter o cálculo já corrigido como:

```ts
Diferença = Copel - Clientes
```

4. Não alterar banco de dados, abas, salvamento ou outros cálculos além da apresentação/ordem dessa tabela.