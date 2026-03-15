

## Duas correções pontuais

### 1. Banner "Aguardando Execução" não deve aparecer para água/energia/telefone/taxas

Contas de concessionárias (água, energia, telefone, taxas) não têm "execução de serviço" — o serviço já foi prestado pela concessionária. O banner `aguardando_execucao` não faz sentido nesse contexto.

**Arquivo:** `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` (linhas 123-148)

Mudança: Quando `sol.natureza_orcamentaria` for uma das naturezas de utilidades (`agua`, `energia_eletrica`, `telefone`, `taxa_impostos`), o banner exibe diretamente **"SERVIÇO EXECUTADO"** (verde) com subtexto "Aguardando validação do backoffice" — independentemente da data. Essas naturezas nunca mostram "Aguardando Execução".

A mesma lógica se aplica ao backoffice card se houver banner equivalente.

---

### 2. Melhorar botão de copiar e-mail no card do backoffice

**Arquivo:** `src/components/backoffice/BackofficeSolicitacaoCard.tsx` (linhas 460-470)

Mudanças:
- Trocar o botão por um ícone menor ao lado do e-mail (sem texto "Copiar e-mail")
- Adicionar feedback visual: ao clicar, o ícone muda de `Copy` para `CheckCircle` por 2 segundos com tooltip "Copiado!"
- Manter o `mailto:` link como principal interação, com o ícone de copiar como ação secundária compacta

```text
Antes:  [email@fornecedor.com]  [📋 Copiar e-mail]   ← botão grande, confuso
Depois: [email@fornecedor.com] 📋                    ← ícone discreto, feedback ✓
```

O componente precisa de um `useState` local para controlar o estado "copiado".

