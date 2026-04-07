import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://megas.lovable.app'

const STATUS_LABELS: Record<string, string> = {
  recebido: '📥 Backoffice',
  em_analise: '🔍 Em análise',
  pendente_correcao: '⚠️ Correção necessária',
  aguardando_informacoes: '❓ Aguardando requisitante',
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

// --- Normalize payload from Google Chat ---
// Google Chat HTTP endpoint sends nested payload under `chat.*`
// Legacy/test format uses top-level `type`, `message`, etc.
interface NormalizedEvent {
  eventType: string
  spaceName: string
  userEmail: string
  userDisplayName: string
  messageText: string
}

function normalizePayload(body: any): NormalizedEvent {
  const chat = body.chat

  // Format 1: Nested under body.chat (real Google Chat HTTP endpoint)
  if (chat) {
    let eventType = 'UNKNOWN'
    let spaceName = ''
    let messageText = ''

    if (chat.messagePayload) {
      eventType = 'MESSAGE'
      spaceName = chat.messagePayload.space?.name || ''
      messageText = chat.messagePayload.message?.argumentText || chat.messagePayload.message?.text || ''
    } else if (chat.addedToSpacePayload) {
      eventType = 'ADDED_TO_SPACE'
      spaceName = chat.addedToSpacePayload.space?.name || ''
    } else if (chat.removedFromSpacePayload) {
      eventType = 'REMOVED_FROM_SPACE'
      spaceName = chat.removedFromSpacePayload.space?.name || ''
    } else if (chat.buttonClickedPayload) {
      eventType = 'CARD_CLICKED'
    }

    return {
      eventType,
      spaceName,
      userEmail: chat.user?.email || '',
      userDisplayName: chat.user?.displayName || '',
      messageText: messageText.replace(/@[\w\s]+/g, '').trim(),
    }
  }

  // Format 2: Legacy top-level keys (test payloads / older format)
  const eventType = body.type || body.eventType || ''
  const rawText = body.message?.argumentText || body.message?.text || ''

  return {
    eventType,
    spaceName: body.space?.name || '',
    userEmail: body.user?.email || '',
    userDisplayName: body.user?.displayName || '',
    messageText: rawText.replace(/@[\w\s]+/g, '').trim(),
  }
}

// --- Response builders ---

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

function buildHelpText() {
  return { text: '🤖 Não entendi. Digite um *número de protocolo* (ex: `2025000001`) para consultar, ou *ajuda* para ver os comandos.' }
}

function buildNotFoundText(query: string) {
  return { text: `🔍 Nenhuma solicitação encontrada com o protocolo *${query}*. Verifique o número e tente novamente.` }
}

// --- Main handler ---

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
    const body = await req.json()

    // Diagnostic logs
    console.log('GChat payload keys:', JSON.stringify(Object.keys(body)))
    if (body.chat) {
      console.log('GChat chat keys:', JSON.stringify(Object.keys(body.chat)))
    }

    const event = normalizePayload(body)
    console.log(`GChat normalized → type=${event.eventType}, space=${event.spaceName}, user=${event.userEmail}, text="${event.messageText}"`)

    const json = (data: any) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })

    // ADDED_TO_SPACE
    if (event.eventType === 'ADDED_TO_SPACE') {
      console.log('Flow: ADDED_TO_SPACE')
      return json(buildWelcomeCard())
    }

    // REMOVED_FROM_SPACE
    if (event.eventType === 'REMOVED_FROM_SPACE') {
      console.log('Flow: REMOVED_FROM_SPACE')
      return json({})
    }

    // MESSAGE
    if (event.eventType === 'MESSAGE') {
      const text = event.messageText.toLowerCase()
      console.log('Flow: MESSAGE, clean text:', text)

      // Greetings / help
      const greetings = ['ajuda', 'help', 'oi', 'olá', 'ola', 'hi', 'hello', 'menu', 'start', 'início', 'inicio']
      if (greetings.includes(text)) {
        console.log('Flow: welcome')
        return json(buildWelcomeCard())
      }

      // Protocol lookup
      const protocolMatch = text.match(/(\d{4,})/)
      if (protocolMatch) {
        const q = protocolMatch[1]
        console.log('Flow: protocol search for', q)

        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data: sols, error } = await supabase
          .from('solicitacoes')
          .select('id, protocolo, tipo, status, empreendimento, valor, descricao, created_at')
          .or(`protocolo.eq.${q},protocolo.ilike.%${q}%`)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('DB error:', error)
          return json({ text: '⚠️ Erro ao consultar o banco de dados. Tente novamente.' })
        }

        if (!sols || sols.length === 0) {
          return json(buildNotFoundText(q))
        }

        return json(buildProtocolCard(sols[0]))
      }

      // Unrecognized
      console.log('Flow: help (unrecognized)')
      return json(buildHelpText())
    }

    // CARD_CLICKED
    if (event.eventType === 'CARD_CLICKED') {
      console.log('Flow: CARD_CLICKED')
      return json(buildWelcomeCard())
    }

    // FALLBACK — always return something valid
    console.log('Flow: FALLBACK, eventType:', event.eventType)
    return json(buildWelcomeCard())

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ text: '⚠️ Erro interno do bot. Tente novamente.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
