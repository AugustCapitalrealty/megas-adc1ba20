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

  // Format 2: Legacy top-level keys
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

// --- Plain text responses ---

function welcomeText(): string {
  return [
    '👋 Olá! Sou o *Bot Megas* — assistente de solicitações.',
    '',
    '📋 *Consultar protocolo*: digite o número (ex: 2025000001)',
    '📊 *Resumos automáticos*: 09h e 13h',
    '🔔 *Alertas*: OC emitida, correção solicitada',
    '',
    `🔗 Abrir sistema: ${APP_URL}`,
  ].join('\n')
}

function protocolText(sol: any): string {
  const statusLabel = STATUS_LABELS[sol.status] || sol.status
  const empreendimentoLabel = EMPREENDIMENTO_LABELS[sol.empreendimento] || sol.empreendimento
  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sol.valor || 0)
  const data = new Date(sol.created_at).toLocaleDateString('pt-BR')
  const desc = (sol.descricao || '').substring(0, 120)

  return [
    `📋 *Protocolo ${sol.protocolo}*`,
    `📌 Tipo: ${sol.tipo} — ${empreendimentoLabel}`,
    `📊 Status: ${statusLabel}`,
    `💰 Valor: ${valor}`,
    `📅 Criada em: ${data}`,
    desc ? `📝 ${desc}${(sol.descricao || '').length > 120 ? '...' : ''}` : '',
    '',
    `🔗 Ver detalhes: ${APP_URL}`,
  ].filter(Boolean).join('\n')
}

function helpText(): string {
  return '🤖 Não entendi. Digite um *número de protocolo* (ex: 2025000001) para consultar, ou *oi* para ver os comandos.'
}

function notFoundText(query: string): string {
  return `🔍 Nenhuma solicitação encontrada com o protocolo *${query}*. Verifique o número e tente novamente.`
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
    console.log('GChat payload keys:', JSON.stringify(Object.keys(body)))

    const event = normalizePayload(body)
    console.log(`GChat → type=${event.eventType}, space=${event.spaceName}, user=${event.userEmail}, text="${event.messageText}"`)

    const json = (text: string) =>
      new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } })

    if (event.eventType === 'ADDED_TO_SPACE') {
      return json(welcomeText())
    }

    if (event.eventType === 'REMOVED_FROM_SPACE') {
      return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } })
    }

    if (event.eventType === 'MESSAGE') {
      const text = event.messageText.toLowerCase()

      const greetings = ['ajuda', 'help', 'oi', 'olá', 'ola', 'hi', 'hello', 'menu', 'start', 'início', 'inicio']
      if (greetings.includes(text)) {
        return json(welcomeText())
      }

      const protocolMatch = text.match(/(\d{4,})/)
      if (protocolMatch) {
        const q = protocolMatch[1]
        console.log('Protocol search:', q)

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
          return json('⚠️ Erro ao consultar o banco de dados. Tente novamente.')
        }

        if (!sols || sols.length === 0) {
          return json(notFoundText(q))
        }

        return json(protocolText(sols[0]))
      }

      return json(helpText())
    }

    if (event.eventType === 'CARD_CLICKED') {
      return json(welcomeText())
    }

    // Fallback
    return json(welcomeText())
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ text: '⚠️ Erro interno do bot. Tente novamente.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
