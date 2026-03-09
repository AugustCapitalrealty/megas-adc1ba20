

## Reduzir opções de envio para E-mail e WhatsApp

Mudança simples em `src/components/backoffice/BackofficeModals.tsx` (linhas 1145-1149):

Remover as opções "Correios", "Entrega presencial" e "Outro" do select, mantendo apenas:
- **E-mail**
- **WhatsApp**

