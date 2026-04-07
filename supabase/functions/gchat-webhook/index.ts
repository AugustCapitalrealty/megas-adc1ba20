import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://megas.lovable.app'

const STATUS_LABELS: Record<string, string> = {
  recebido: '📥 Na fila',
  em_analise: '🔍 Em análise',
  pendente_correcao: '⚠️ Correção necessária',
  aguardando_informacoes: '❓ Aguardando informações',
  aprovado: '✅ Em lançamento',
  em_processamento: '⏳ Em aprovação',
  oc_ac_emitida: '📄 OC/AC emitida',
  aguardando_aceite: '🤝 Aguardando aceite',
  liberado_fornecedor: '🚀 Liberada p/ fornecedor',
  enviado_fornecedor: '📨 Enviada ao fornecedor',
  aguardando_execucao: '🔧 Aguardando execução',
  aguardando_nf_boleto: '🧾 Aguardando NF/Boleto',
  nf_boleto_enviados: '📩 NF/Boleto enviados',
  enviado_pagamento: '💰 Enviado p/ pagamento',
  concluida: '✅ Concluída',
  cancelado: '❌ Cancelada',
  rejeitado: '🚫 Rejeitada',
}

const EMPREENDIMENTO_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

function buildWelcomeCard() {
  return {
    cardsV2: [{
      cardId: 'welcome',
      card: {
        header: {
          title: '👋 Olá! Sou o Bot Megas',
          subtitle: 'Assistente de Solicitações BA Chamados',
          imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/smart_toy/default/48px.svg',
          imageType: 'CIRCLE',
        },
        sections: [
          {
            header: 'O que posso fazer',
            widgets: [
              {
                decoratedText: {
                  startIcon: { knownIcon: 'DESCRIPTION' },
                  text: '<b>Consultar protocolo</b>',
                  bottomLabel: 'Digite o número (ex: 2025000001)',
                },
              },
              {
                decoratedText: {
                  startIcon: { knownIcon: 'BOOKMARK' },
                  text: '<b>Resumos automáticos</b>',
                  bottomLabel: 'Enviados 2x ao dia (09h e 13h)',
                },
              },
              {
                decoratedText: {
                  startIcon: { knownIcon: 'FLIGHT_ARRIVAL' },
                  text: '<b>Alertas em tempo real</b>',
                  bottomLabel: 'OC emitida, correção solicitada',
                },
              },
            ],
          },
          {
            widgets: [{
              columns: {
                columnItems: [{
                  horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'CENTER',
                  widgets: [{
                    buttonList: {
                      buttons: [{
                        text: 'Abrir Sistema',
                        onClick: { openLink: { url: APP_URL } },
                        color: { red: 0.0, green: 0.45, blue: 0.85, alpha: 1 },
                      }],
                    },
                  }],
                }],
              },
            }],
          },
        ],
      },
    }],
  }
}

function buildProtocolCard(sol: any) {
  const statusLabel = STATUS_LABELS[sol.status] || sol.status
  const empreendimentoLabel = EMPREENDIMENTO_LABELS[sol.empreendimento] || sol.empreendimento
  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sol.valor || 0)
  const data = new Date(sol.created_at).toLocaleDateString('pt-BR')

  return {
    cardsV2: [{
      cardId: `protocol-${sol.protocolo}`,
      card: {
        header: {
          title: `📋 Protocolo ${sol.protocolo}`,
          subtitle: `${sol.tipo} — ${empreendimentoLabel}`,
        },
        sections: [
          {
            widgets: [
              {
                decoratedText: {
                  startIcon: { knownIcon: 'INVITE' },
                  topLabel: 'Status',
                  text: statusLabel,
                },
              },
              {
                decoratedText: {
                  startIcon: { knownIcon: 'DOLLAR' },
                  topLabel: 'Valor',
                  text: valor,
                },
              },
              {
                decoratedText: {
                  startIcon: { knownIcon: 'CLOCK' },
                  topLabel: 'Criada em',
                  text: data,
                },
              },
              {
                decoratedText: {
                  startIcon: { knownIcon: 'DESCRIPTION' },
                  topLabel: 'Descrição',
                  text: (sol.descricao || '').substring(0, 200) + ((sol.descricao || '').length > 200 ? '...' : ''),
                  wrapText: true,
                },
              },
            ],
          },
          {
            widgets: [{
              columns: {
                columnItems: [{
                  horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'CENTER',
                  widgets: [{
                    buttonList: {
                      buttons: [{
                        text: 'Ver Detalhes',
                        onClick: { openLink: { url: APP_URL } },
                        color: { red: 0.0, green: 0.45, blue: 0.85, alpha: 1 },
                      }],
                    },
                  }],
                }],
              },
            }],
          },
        ],
      },
    }],
  }
}

function buildHelpMessage() {
  return {
    text: '🤖 Não entendi. Digite um *número de protocolo* (ex: `2025000001`) para consultar o status, ou digite *ajuda* para ver os comandos disponíveis.',
  }
}

function buildNotFoundMessage(query: string) {
  return {
    text: `🔍 Nenhuma solicitação encontrada com o protocolo *${query}*. Verifique o número e tente novamente.`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ text: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const event = await req.json()
    console.log('GChat event type:', event.type, 'space:', event.space?.name)

    // ADDED_TO_SPACE — bot was added to a DM or space
    if (event.type === 'ADDED_TO_SPACE') {
      console.log('Bot added to space:', event.space?.name, 'by:', event.user?.email)
      return new Response(JSON.stringify(buildWelcomeCard()), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // REMOVED_FROM_SPACE — just log
    if (event.type === 'REMOVED_FROM_SPACE') {
      console.log('Bot removed from space:', event.space?.name)
      return new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // MESSAGE — user sent a message
    if (event.type === 'MESSAGE') {
      const text = (event.message?.text || '').trim()
      // Remove bot mention if present (e.g. "@Bot Megas protocolo")
      const cleanText = text.replace(/@[\w\s]+/g, '').trim()

      console.log('Message from:', event.user?.email, 'text:', cleanText)

      // Check if it's a help command
      if (['ajuda', 'help', 'oi', 'olá', 'ola', 'hi', 'hello', 'menu', 'start', 'início', 'inicio'].includes(cleanText.toLowerCase())) {
        return new Response(JSON.stringify(buildWelcomeCard()), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Check if it looks like a protocol number (digits, possibly with year prefix)
      const protocolMatch = cleanText.match(/(\d{4,})/)
      if (protocolMatch) {
        const protocolQuery = protocolMatch[1]

        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Search by protocol (exact or partial match)
        const { data: solicitacoes, error } = await supabase
          .from('solicitacoes')
          .select('id, protocolo, tipo, status, empreendimento, valor, descricao, created_at')
          .or(`protocolo.eq.${protocolQuery},protocolo.ilike.%${protocolQuery}%`)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('DB error:', error)
          return new Response(JSON.stringify({ text: '⚠️ Erro ao consultar o banco de dados. Tente novamente.' }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (!solicitacoes || solicitacoes.length === 0) {
          return new Response(JSON.stringify(buildNotFoundMessage(protocolQuery)), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(buildProtocolCard(solicitacoes[0])), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Default: help message
      return new Response(JSON.stringify(buildHelpMessage()), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Unknown event type
    return new Response(JSON.stringify({ text: '' }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ text: '⚠️ Erro interno do bot.' }), {
      status: 200, // Google Chat expects 200 even on errors
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
