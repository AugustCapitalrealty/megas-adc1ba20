import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CARD_VERSION = 'gchat-daily-digest-v2-compat-2026-04-04'
const APP_URL = 'https://megas.lovable.app'

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajai',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

function getGreeting(): { text: string; emoji: string } {
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24

  if (brtHour < 12) return { text: 'Bom dia', emoji: 'Sol' }
  if (brtHour < 17) return { text: 'Atualizacao da tarde', emoji: 'Atualizacao' }
  return { text: 'Fechamento do dia', emoji: 'Noite' }
}

function createCountWidget(
  topLabel: string,
  count: number,
  color: string,
  detail: string
) {
  return {
    decoratedText: {
      topLabel,
      text: `<font color="${color}"><b>${count}</b></font><br><font color="#999999">${detail}</font>`,
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookUrl = Deno.env.get('GCHAT_WEBHOOK_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const requestBody = await req.json().catch(() => ({}))
    const triggerType = typeof requestBody?.time === 'string' ? requestBody.time : 'scheduled'

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'GCHAT_WEBHOOK_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const todayStr = brt.toISOString().split('T')[0]
    const startOfDay = `${todayStr}T00:00:00-03:00`
    const endOfDay = `${todayStr}T23:59:59-03:00`
    const [year, month, day] = todayStr.split('-')
    const dayFormatted = `${day}/${month}/${year}`

    const { data: allSol, error: solErr } = await supabase
      .from('solicitacoes')
      .select('id, protocolo, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr

    const newToday = allSol?.filter((item) => {
      const createdAt = new Date(item.created_at)
      return createdAt >= new Date(startOfDay) && createdAt <= new Date(endOfDay)
    }) || []

    const updatedToday = allSol?.filter((item) => {
      const updatedAt = new Date(item.updated_at)
      return (
        updatedAt >= new Date(startOfDay) &&
        updatedAt <= new Date(endOfDay) &&
        !newToday.find((newItem) => newItem.id === item.id)
      )
    }) || []

    const statusCounts: Record<string, number> = {}
    allSol?.forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
    })

    const finishedStatuses = ['concluida', 'cancelado', 'rejeitado']
    const totalActive = allSol?.filter((item) => !finishedStatuses.includes(item.status)).length || 0

    const movementByEmp: Record<string, { novas: number; atualizadas: number }> = {}

    newToday.forEach((item) => {
      const emp = EMP_LABELS[item.empreendimento] || item.empreendimento || 'Outros'
      if (!movementByEmp[emp]) movementByEmp[emp] = { novas: 0, atualizadas: 0 }
      movementByEmp[emp].novas += 1
    })

    updatedToday.forEach((item) => {
      const emp = EMP_LABELS[item.empreendimento] || item.empreendimento || 'Outros'
      if (!movementByEmp[emp]) movementByEmp[emp] = { novas: 0, atualizadas: 0 }
      movementByEmp[emp].atualizadas += 1
    })

    const naFila = statusCounts['recebido'] || 0
    const emAnalise = statusCounts['em_analise'] || 0
    const pendCorrecao = statusCounts['pendente_correcao'] || 0
    const aguardInfo = statusCounts['aguardando_informacoes'] || 0
    const emProcessamento = statusCounts['em_processamento'] || 0
    const ocEmitida = statusCounts['oc_ac_emitida'] || 0
    const liberadas = statusCounts['liberado_fornecedor'] || 0
    const enviadas = statusCounts['enviado_fornecedor'] || 0
    const aguardExec = statusCounts['aguardando_execucao'] || 0
    const aguardNf = statusCounts['aguardando_nf_boleto'] || 0

    const greeting = getGreeting()
    const urgentCount = naFila + pendCorrecao + aguardInfo
    const totalMovement = newToday.length + updatedToday.length
    const generatedAt = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })

    const sections: any[] = [
      {
        widgets: [
          {
            textParagraph: {
              text:
                `<b>Resumo operacional</b><br>` +
                `<font color="#D32F2F">Pendentes: <b>${urgentCount}</b></font> ` +
                `| <font color="#1E88E5">Ativas: <b>${totalActive}</b></font> ` +
                `| <font color="#43A047">Movimento hoje: <b>${totalMovement}</b></font>`,
            },
          },
          {
            textParagraph: {
              text: `<font color="#999999">Card version: ${CARD_VERSION} | trigger: ${triggerType}</font>`,
            },
          },
        ],
      },
    ]

    if (urgentCount > 0) {
      const urgentWidgets = [
        createCountWidget('Na fila', naFila, '#D32F2F', 'Solicitacoes aguardando triagem'),
        createCountWidget('Correcao pendente', pendCorrecao, '#F57C00', 'Itens que voltaram para ajuste'),
        createCountWidget('Aguardando informacoes', aguardInfo, '#FBC02D', 'Dependem de complemento para seguir'),
      ].filter((widget) => !widget.decoratedText.text.includes('<b>0</b>'))

      sections.push({
        header: 'Acoes que pedem atencao',
        widgets: urgentWidgets,
      })
    }

    const activeItems = [
      { label: 'Em analise', count: emAnalise, color: '#1E88E5' },
      { label: 'Em aprovacao', count: emProcessamento, color: '#43A047' },
      { label: 'OC emitida', count: ocEmitida, color: '#3949AB' },
      { label: 'Liberadas', count: liberadas, color: '#00897B' },
      { label: 'Enviadas', count: enviadas, color: '#6A1B9A' },
      { label: 'Aguardando execucao', count: aguardExec, color: '#F57C00' },
      { label: 'Aguardando NF/Boleto', count: aguardNf, color: '#5E35B1' },
    ].filter((item) => item.count > 0)

    if (activeItems.length > 0) {
      sections.push({
        header: 'Fluxo ativo',
        widgets: [
          ...activeItems.map((item) => ({
            decoratedText: {
              topLabel: item.label,
              text: `<font color="${item.color}"><b>${item.count}</b></font>`,
            },
          })),
          {
            textParagraph: {
              text: `<font color="#999999">Total de solicitacoes ativas: <b>${totalActive}</b></font>`,
            },
          },
        ],
      })
    }

    const movementWidgets: any[] = []

    if (Object.keys(movementByEmp).length > 0) {
      const empEntries = Object.entries(movementByEmp).sort(
        (a, b) => (b[1].novas + b[1].atualizadas) - (a[1].novas + a[1].atualizadas)
      )

      for (const [emp, counts] of empEntries) {
        const parts = []
        if (counts.novas > 0) parts.push(`<font color="#43A047">Novas: <b>${counts.novas}</b></font>`)
        if (counts.atualizadas > 0) {
          parts.push(`<font color="#1E88E5">Atualizadas: <b>${counts.atualizadas}</b></font>`)
        }

        movementWidgets.push({
          decoratedText: {
            topLabel: emp,
            text: `${parts.join(' | ')}<br><font color="#999999">Total no dia: <b>${counts.novas + counts.atualizadas}</b></font>`,
            startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' },
          },
        })
      }
    } else {
      movementWidgets.push({
        textParagraph: {
          text: '<i><font color="#999999">Sem movimentacao hoje</font></i>',
        },
      })
    }

    movementWidgets.push({
      textParagraph: {
        text:
          `<font color="#999999">Fechamento do dia: <b>${newToday.length}</b> novas ` +
          `| <b>${updatedToday.length}</b> atualizadas</font>`,
      },
    })

    sections.push({
      header: 'Resumo do dia',
      collapsible: totalMovement > 8,
      widgets: movementWidgets,
    })

    sections.push({
      widgets: [
        {
          buttonList: {
            buttons: [
              {
                text: 'Abrir BA Chamados',
                onClick: { openLink: { url: APP_URL } },
              },
            ],
          },
        },
      ],
    })

    sections.push({
      widgets: [
        {
          textParagraph: {
            text:
              `<font color="#999999">Resumo rapido: ${urgentCount} pendentes ` +
              `| ${totalActive} ativas | ${totalMovement} mudancas hoje</font>`,
          },
        },
      ],
    })

    const cardHeader = {
      title: `${greeting.emoji} ${greeting.text}!`,
      subtitle: `BA Chamados - ${dayFormatted} | ${generatedAt}`,
    }

    const cardPayload = {
      cardsV2: [
        {
          cardId: 'daily-digest',
          card: {
            header: cardHeader,
            sections,
          },
        },
      ],
    }

    console.log(
      'GCHAT_DAILY_DIGEST_PAYLOAD',
      JSON.stringify({
        cardVersion: CARD_VERSION,
        triggerType,
        header: cardHeader,
        sectionHeaders: sections.map((section) => section.header || '[widgets-only]'),
        urgentCount,
        totalActive,
        totalMovement,
      })
    )

    const gchatRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardPayload),
    })

    if (!gchatRes.ok) {
      const errBody = await gchatRes.text()
      throw new Error(`Google Chat webhook failed [${gchatRes.status}]: ${errBody}`)
    }

    await gchatRes.text()

    console.log(
      'GCHAT_DAILY_DIGEST_SENT',
      JSON.stringify({
        cardVersion: CARD_VERSION,
        triggerType,
        status: gchatRes.status,
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resumo enviado via Google Chat',
        cardVersion: CARD_VERSION,
        stats: { newToday: newToday.length, updatedToday: updatedToday.length, totalActive },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('GChat daily digest error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
