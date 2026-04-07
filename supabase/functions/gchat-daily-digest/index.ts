import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendGChatMessageAuth } from '../_shared/gchat-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://megas.lovable.app'

const COLORS = {
  critical: '#D32F2F',
  warning: '#F57C00',
  info: '#1E88E5',
  success: '#43A047',
  muted: '#757575',
  text: '#202124',
}

const FINISHED_STATUSES = ['concluida', 'cancelado', 'rejeitado']

function getGreeting(): { title: string; salute: string; verbo: string } {
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24
  if (brtHour < 12) return { title: 'Radar da Manhã', salute: 'Bom dia', verbo: 'Iniciamos com' }
  return { title: 'Pulso da Tarde', salute: 'Boa tarde', verbo: 'Seguimos com' }
}

function statColumn(value: number, label: string, color: string) {
  return {
    horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'CENTER',
    widgets: [
      { textParagraph: { text: `<b><font size=4 color="${color}">${value}</font></b>` } },
      { textParagraph: { text: `<font size=1 color="${COLORS.text}">${label}</font>` } },
    ],
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
      .select('id, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr

    const newToday = allSol?.filter((s) => {
      const d = new Date(s.created_at)
      return d >= new Date(startOfDay) && d <= new Date(endOfDay)
    }) || []

    const updatedToday = allSol?.filter((s) => {
      const d = new Date(s.updated_at)
      return d >= new Date(startOfDay) && d <= new Date(endOfDay) && !newToday.find((n) => n.id === s.id)
    }) || []

    // Status counts
    const sc: Record<string, number> = {}
    allSol?.forEach((s) => { sc[s.status] = (sc[s.status] || 0) + 1 })

    const totalActive = allSol?.filter((s) => !FINISHED_STATUSES.includes(s.status)).length || 0
    const naFila = sc['recebido'] || 0
    const pendCorrecao = sc['pendente_correcao'] || 0
    const aguardInfo = sc['aguardando_informacoes'] || 0
    const emAnalise = sc['em_analise'] || 0
    const emProcessamento = sc['em_processamento'] || 0
    const ocEmitida = sc['oc_ac_emitida'] || 0
    const liberadas = sc['liberado_fornecedor'] || 0
    const enviadas = sc['enviado_fornecedor'] || 0
    const aguardExec = sc['aguardando_execucao'] || 0
    const aguardNf = sc['aguardando_nf_boleto'] || 0

    const urgentCount = naFila + pendCorrecao + aguardInfo
    const totalMovement = newToday.length + updatedToday.length

    const greeting = getGreeting()
    const generatedAt = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    // --- Build intro text ---
    let introText: string
    if (totalActive === 0) {
      introText = `${greeting.salute}! Não há solicitações ativas no momento.`
    } else if (urgentCount === 0) {
      introText = `${greeting.salute}! ${greeting.verbo} <b>${totalActive} solicitações ativas</b>, sem prioridades imediatas.`
    } else {
      introText = `${greeting.salute}! ${greeting.verbo} <b>${totalActive} solicitações ativas</b>, das quais <b>${urgentCount}</b> ${urgentCount === 1 ? 'exige' : 'exigem'} atenção imediata.`
    }

    // --- SECTION 1: Intro ---
    const introSection = {
      widgets: [
        { textParagraph: { text: introText } },
      ],
    }

    // --- SECTION 2: Prioridades Imediatas ---
    const priorityWidgets: any[] = []

    if (urgentCount > 0) {
      const priorityCols: any[] = []
      if (naFila > 0) priorityCols.push(statColumn(naFila, 'Backoffice', COLORS.critical))
      if (pendCorrecao > 0) priorityCols.push(statColumn(pendCorrecao, 'Correção', COLORS.warning))
      if (aguardInfo > 0) priorityCols.push(statColumn(aguardInfo, 'Aguard. requisitante', COLORS.warning))

      priorityWidgets.push({ columns: { columnItems: priorityCols } })
    } else {
      priorityWidgets.push({
        decoratedText: {
          topLabel: 'Status',
          text: `<font color="${COLORS.success}"><b>Tudo limpo</b></font>`,
          bottomLabel: 'Fila, correções e informações pendentes zeradas',
          startIcon: { knownIcon: 'INVITE' },
        },
      })
    }

    // --- SECTION 3: Ativas ---
    const activeWidgets: any[] = []

    const activeItems = [
      { label: 'Análise', count: emAnalise, color: COLORS.info },
      { label: 'Aprovação', count: emProcessamento, color: COLORS.info },
      { label: 'OC emitida', count: ocEmitida, color: COLORS.info },
      { label: 'Liberadas p/ fornec.', count: liberadas, color: COLORS.success },
      { label: 'Enviadas', count: enviadas, color: COLORS.success },
      { label: 'Execução', count: aguardExec, color: COLORS.warning },
      { label: 'NF/Boleto', count: aguardNf, color: COLORS.warning },
    ].filter((i) => i.count > 0)

    if (activeItems.length > 0) {
      for (let i = 0; i < activeItems.length; i += 3) {
        const row = activeItems.slice(i, i + 3)
        activeWidgets.push({
          columns: {
            columnItems: row.map((item) => statColumn(item.count, item.label, item.color)),
          },
        })
      }
    } else {
      activeWidgets.push({
        textParagraph: { text: `<font color="${COLORS.muted}">Sem solicitações em andamento.</font>` },
      })
    }

    // --- SECTION 4: Movimento do dia (compacto) ---
    const movementWidgets: any[] = []

    if (totalMovement > 0) {
      const parts: string[] = []
      if (newToday.length > 0) parts.push(`<b>${newToday.length}</b> nova${newToday.length === 1 ? '' : 's'}`)
      if (updatedToday.length > 0) parts.push(`<b>${updatedToday.length}</b> atualizada${updatedToday.length === 1 ? '' : 's'}`)
      movementWidgets.push({
        decoratedText: {
          topLabel: 'Hoje',
          text: parts.join(' · '),
          startIcon: { knownIcon: 'CLOCK' },
        },
      })
    } else {
      movementWidgets.push({
        textParagraph: {
          text: `<font color="${COLORS.muted}">Sem movimentação hoje.</font>`,
        },
      })
    }

    // --- Build final card ---
    const sections = [
      introSection,
      { header: `🔴 PRIORIDADES IMEDIATAS (${urgentCount})`, widgets: priorityWidgets },
      { widgets: [{ divider: {} }] },
      { header: `📊 ATIVAS (${totalActive})`, widgets: activeWidgets },
      { widgets: [{ divider: {} }] },
      { header: `📉 MOVIMENTO DO DIA`, widgets: movementWidgets },
      {
        widgets: [
          {
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
                      color: { red: 0.12, green: 0.53, blue: 0.9, alpha: 1 },
                    }],
                  },
                }],
              }],
            },
          },
        ],
      },
    ]

    const cardPayload = {
      cardsV2: [{
        cardId: `digest-${Date.now()}`,
        card: {
          header: {
            title: greeting.title,
            subtitle: `BA Chamados • ${dayFormatted} às ${generatedAt}`,
          },
          sections,
        },
      }],
    }

    const { method, response: gchatRes } = await sendGChatMessageAuth(cardPayload)
    await gchatRes.text()
    console.log(`Digest sent via ${method}`)

    return new Response(
      JSON.stringify({ success: true, stats: { newToday: newToday.length, updatedToday: updatedToday.length, totalActive, urgentCount } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('GChat daily digest error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
