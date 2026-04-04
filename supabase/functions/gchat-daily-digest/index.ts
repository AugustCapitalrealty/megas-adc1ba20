import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildCard,
  createButtonWidget,
  createFooterSummary,
  createStatGrid,
  sendGChatMessage,
} from '../_shared/gchat-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CARD_VERSION = 'gchat-daily-digest-v3-radar-2026-04-04'
const APP_URL = 'https://megas.lovable.app'

const COLORS = {
  critical: '#D32F2F',
  warning: '#F57C00',
  alert: '#FBC02D',
  info: '#1E88E5',
  success: '#43A047',
  accent: '#00897B',
  purple: '#6A1B9A',
  indigo: '#3949AB',
  violet: '#5E35B1',
  muted: '#999999',
}

const FINISHED_STATUSES = ['concluida', 'cancelado', 'rejeitado']

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajai',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

type Greeting = {
  title: string
  salute: string
}

type CountMetric = {
  label: string
  count: number
  color: string
}

type MovementMetric = {
  label: string
  novas: number
  atualizadas: number
}

function getGreeting(): Greeting {
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24

  if (brtHour < 12) {
    return { title: 'Radar da manha', salute: 'Bom dia' }
  }

  if (brtHour < 17) {
    return { title: 'Pulso da tarde', salute: 'Boa tarde' }
  }

  return { title: 'Fechamento operacional', salute: 'Boa noite' }
}

function pluralize(
  value: number,
  singular: string,
  plural: string = `${singular}s`
) {
  return `${value} ${value === 1 ? singular : plural}`
}

function sectionHeader(title: string, subtitle: string, color: string) {
  return (
    `<b><font color="${color}">${title}</font></b>` +
    `<br/><font size=1 color="${COLORS.muted}">${subtitle}</font>`
  )
}

function buildOverviewMessage(
  urgentCount: number,
  totalActive: number,
  totalMovement: number
) {
  if (totalActive === 0) {
    return 'Nao ha solicitacoes ativas neste momento.'
  }

  if (urgentCount === 0 && totalMovement === 0) {
    return 'Operacao estavel, sem gargalos criticos no momento.'
  }

  if (urgentCount === 0) {
    return `Sem prioridades imediatas. ${pluralize(totalMovement, 'movimento registrado')} hoje.`
  }

  if (urgentCount <= 3) {
    return `${pluralize(urgentCount, 'prioridade aberta')} pedindo uma passada rapida na fila.`
  }

  return `${pluralize(urgentCount, 'item critico')} concentrados em fila, correcoes e retorno de informacoes.`
}

function buildStatusSummary(items: CountMetric[]) {
  return items
    .map((item) => `${item.label.toLowerCase()}: ${item.count}`)
    .join(' | ')
}

function createEmptyStateWidget(title: string, detail: string) {
  return {
    decoratedText: {
      topLabel: title,
      text: `<font color="${COLORS.success}"><b>Tudo sob controle</b></font>`,
      bottomLabel: detail,
      startIcon: { knownIcon: 'CHECK_CIRCLE' },
      wrapText: true,
    },
  }
}

function createMovementWidget(item: MovementMetric, isTopVolume: boolean) {
  const parts: string[] = []

  if (item.novas > 0) {
    parts.push(
      `<font color="${COLORS.success}"><b>${item.novas}</b> nova${item.novas === 1 ? '' : 's'}</font>`
    )
  }

  if (item.atualizadas > 0) {
    parts.push(
      `<font color="${COLORS.info}"><b>${item.atualizadas}</b> atualizada${item.atualizadas === 1 ? '' : 's'}</font>`
    )
  }

  return {
    decoratedText: {
      topLabel: isTopVolume ? `${item.label} | maior volume` : item.label,
      text: parts.join(' | '),
      bottomLabel: `Total no dia: ${item.novas + item.atualizadas}`,
      startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' },
      wrapText: true,
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
      .select('id, status, empreendimento, created_at, updated_at')

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

    const totalActive =
      allSol?.filter((item) => !FINISHED_STATUSES.includes(item.status)).length || 0

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

    const priorityMetrics: CountMetric[] = [
      { label: 'Na fila', count: naFila, color: COLORS.critical },
      { label: 'Correcao', count: pendCorrecao, color: COLORS.warning },
      { label: 'Info pend.', count: aguardInfo, color: COLORS.alert },
    ].filter((item) => item.count > 0)

    const activeMetrics: CountMetric[] = [
      { label: 'Analise', count: emAnalise, color: COLORS.info },
      { label: 'Aprovacao', count: emProcessamento, color: COLORS.success },
      { label: 'OC emitida', count: ocEmitida, color: COLORS.indigo },
      { label: 'Liberadas', count: liberadas, color: COLORS.accent },
      { label: 'Enviadas', count: enviadas, color: COLORS.purple },
      { label: 'Execucao', count: aguardExec, color: COLORS.warning },
      { label: 'NF/Boleto', count: aguardNf, color: COLORS.violet },
    ].filter((item) => item.count > 0)

    const movementEntries: MovementMetric[] = Object.entries(movementByEmp)
      .map(([label, counts]) => ({
        label,
        novas: counts.novas,
        atualizadas: counts.atualizadas,
      }))
      .sort(
        (a, b) =>
          b.novas + b.atualizadas - (a.novas + a.atualizadas) ||
          b.novas - a.novas ||
          a.label.localeCompare(b.label)
      )

    const visibleMovementEntries = movementEntries.slice(0, 4)
    const hiddenMovementCount = Math.max(movementEntries.length - visibleMovementEntries.length, 0)

    const overviewWidgets: any[] = [
      {
        textParagraph: {
          text:
            `<b>${greeting.salute}.</b> ${buildOverviewMessage(urgentCount, totalActive, totalMovement)}`,
        },
      },
      ...createStatGrid([
        {
          value: urgentCount,
          label: urgentCount === 1 ? 'Prioridade' : 'Prioridades',
          color: urgentCount > 0 ? COLORS.critical : COLORS.success,
        },
        {
          value: totalActive,
          label: 'Ativas',
          color: COLORS.info,
        },
        {
          value: totalMovement,
          label: 'Mov. hoje',
          color: totalMovement > 0 ? COLORS.warning : COLORS.muted,
        },
      ]),
      createFooterSummary(
        `Atualizado as ${generatedAt} | ${pluralize(newToday.length, 'nova', 'novas')} | ${pluralize(updatedToday.length, 'atualizacao', 'atualizacoes')}`
      ),
    ]

    const priorityWidgets: any[] =
      priorityMetrics.length > 0
        ? [
            ...createStatGrid(
              priorityMetrics.map((item) => ({
                value: item.count,
                label: item.label,
                color: item.color,
              }))
            ),
            createFooterSummary(`Foco agora: ${buildStatusSummary(priorityMetrics)}`),
          ]
        : [
            createEmptyStateWidget(
              'Sem prioridades imediatas',
              'Fila, correcoes e pedidos de informacao estao zerados.'
            ),
          ]

    const activeWidgets: any[] =
      activeMetrics.length > 0
        ? [
            ...createStatGrid(
              activeMetrics.map((item) => ({
                value: item.count,
                label: item.label,
                color: item.color,
              }))
            ),
            createFooterSummary(`Total na operacao: ${totalActive} solicitacoes ativas`),
          ]
        : [
            {
              textParagraph: {
                text: `<font color="${COLORS.muted}">Sem etapas ativas no pipeline agora.</font>`,
              },
            },
          ]

    const movementWidgets: any[] =
      visibleMovementEntries.length > 0
        ? [
            ...visibleMovementEntries.map((item, index) =>
              createMovementWidget(item, index === 0)
            ),
            ...(hiddenMovementCount > 0
              ? [
                  createFooterSummary(
                    `Mais ${hiddenMovementCount} empreendimento${hiddenMovementCount === 1 ? '' : 's'} com movimentacao hoje`
                  ),
                ]
              : []),
          ]
        : [
            {
              textParagraph: {
                text: `<font color="${COLORS.muted}">Nenhuma nova entrada ou atualizacao registrada hoje.</font>`,
              },
            },
          ]

    movementWidgets.push(
      createFooterSummary(
        `Hoje no total: ${pluralize(newToday.length, 'nova', 'novas')} | ${pluralize(updatedToday.length, 'atualizacao', 'atualizacoes')}`
      )
    )
    movementWidgets.push(createButtonWidget([{ text: 'Abrir BA Chamados', url: APP_URL }]))

    const sections: Array<{ header?: string; widgets: any[] }> = [
      {
        widgets: overviewWidgets,
      },
      {
        header: sectionHeader(
          'PRIORIDADES IMEDIATAS',
          urgentCount > 0
            ? `${pluralize(urgentCount, 'item pedindo atencao', 'itens pedindo atencao')} agora`
            : 'Nenhum gargalo critico para destravar',
          urgentCount > 0 ? COLORS.critical : COLORS.success
        ),
        widgets: priorityWidgets,
      },
      {
        header: sectionHeader(
          'FLUXO ATIVO',
          activeMetrics.length > 0
            ? `${pluralize(activeMetrics.length, 'frente ativa', 'frentes ativas')} no pipeline`
            : 'Sem solicitacoes em andamento',
          COLORS.info
        ),
        widgets: activeWidgets,
      },
      {
        header: sectionHeader(
          'MOVIMENTO DE HOJE',
          totalMovement > 0
            ? `${pluralize(totalMovement, 'mudanca registrada', 'mudancas registradas')} no dia`
            : 'Sem movimentacao registrada ate agora',
          totalMovement > 0 ? COLORS.warning : COLORS.muted
        ),
        widgets: movementWidgets,
      },
    ]

    const cardHeader = {
      title: greeting.title,
      subtitle: `BA Chamados | ${dayFormatted} | ${generatedAt}`,
    }

    const cardPayload = buildCard(cardHeader.title, cardHeader.subtitle, sections)

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

    const gchatRes = await sendGChatMessage(webhookUrl, cardPayload)
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
