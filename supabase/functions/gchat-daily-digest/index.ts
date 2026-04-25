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

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

const FINISHED_STATUSES = ['concluida', 'cancelado', 'rejeitado']

const SERVICE_VISUAL_ICON: Record<string, string> = {
  agendado: 'EVENT_SEAT',
  atrasado: 'CLOCK',
  oc_enviada: 'INVITE',
  oc_nao_liberada: 'CLOCK',
  aguardando_nf: 'DESCRIPTION',
  cancel_solicitado: 'STAR',
  em_processamento: 'CLOCK',
}

const SERVICE_VISUAL_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  atrasado: '⚠️ Atrasado',
  oc_enviada: 'OC enviada',
  oc_nao_liberada: 'OC não liberada',
  aguardando_nf: 'Aguardando NF',
  cancel_solicitado: 'Cancelamento solicitado',
  em_processamento: 'Em processamento',
}

const SERVICE_VISUAL_COLOR: Record<string, string> = {
  atrasado: COLORS.critical,
  oc_nao_liberada: COLORS.warning,
  aguardando_nf: COLORS.warning,
  cancel_solicitado: COLORS.warning,
  agendado: COLORS.info,
  oc_enviada: COLORS.info,
  em_processamento: COLORS.muted,
}

function computeServiceVisual(sol: { status: string; cancelamento_pendente: boolean; data_execucao_servico: string }, todayStr: string): string {
  if (sol.status === 'cancelado' || sol.status === 'rejeitado') return 'cancelado'
  if (sol.cancelamento_pendente) return 'cancel_solicitado'
  if (['concluida', 'enviado_pagamento', 'nf_boleto_enviados'].includes(sol.status)) return 'concluido'
  if (sol.status === 'aguardando_nf_boleto') return 'aguardando_nf'
  if (sol.status === 'aguardando_execucao') {
    return sol.data_execucao_servico > todayStr ? 'agendado' : 'atrasado'
  }
  if (['enviado_fornecedor', 'liberado_fornecedor'].includes(sol.status)) return 'oc_enviada'
  if (['aguardando_aceite', 'oc_ac_emitida'].includes(sol.status)) return 'oc_nao_liberada'
  return 'em_processamento'
}

function fmtCurrency(v: number): string {
  try {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return `R$ ${v.toFixed(2)}`
  }
}

function buildServicosHojeWidgets(servicos: any[], todayStr: string): any[] {
  if (!servicos || servicos.length === 0) {
    return [{ textParagraph: { text: `<font color="${COLORS.muted}">Nenhum serviço previsto para hoje.</font>` } }]
  }

  const enriched = servicos.map((s) => ({
    ...s,
    visual: computeServiceVisual(
      { status: s.status, cancelamento_pendente: !!s.cancelamento_pendente, data_execucao_servico: s.data_execucao_servico },
      todayStr,
    ),
  }))

  const priority: Record<string, number> = {
    atrasado: 0,
    oc_nao_liberada: 1,
    aguardando_nf: 1,
    cancel_solicitado: 2,
    oc_enviada: 3,
    agendado: 4,
    em_processamento: 5,
  }
  enriched.sort((a, b) => {
    const pa = priority[a.visual] ?? 9
    const pb = priority[b.visual] ?? 9
    if (pa !== pb) return pa - pb
    const ea = (a.empreendimento || '').localeCompare(b.empreendimento || '')
    if (ea !== 0) return ea
    return (a.protocolo || '').localeCompare(b.protocolo || '')
  })

  const MAX = 8
  const visible = enriched.slice(0, MAX)
  const widgets: any[] = []

  for (const s of visible) {
    const empLabel = EMP_LABELS[s.empreendimento] || s.empreendimento || ''
    const fornecedor = s.fornecedor?.nome_fantasia || s.fornecedor?.razao_social || 'Sem fornecedor'
    const desc = (s.descricao || '').slice(0, 60) + ((s.descricao || '').length > 60 ? '…' : '')
    const valor = Number(s.valor) || 0
    const color = SERVICE_VISUAL_COLOR[s.visual] || COLORS.text
    const statusLabel = SERVICE_VISUAL_LABEL[s.visual] || s.status
    widgets.push({
      decoratedText: {
        topLabel: `${empLabel} • ${s.protocolo || ''}`,
        text: `<b>${desc}</b> — ${fmtCurrency(valor)}`,
        bottomLabel: `${fornecedor} • <font color="${color}">${statusLabel}</font>`,
        startIcon: { knownIcon: SERVICE_VISUAL_ICON[s.visual] || 'EVENT_SEAT' },
        wrapText: true,
        onClick: { openLink: { url: `${APP_URL}/solicitacao/${s.id}` } },
      },
    })
  }

  if (enriched.length > MAX) {
    widgets.push({
      textParagraph: {
        text: `<font color="${COLORS.muted}">+ ${enriched.length - MAX} outro${enriched.length - MAX === 1 ? '' : 's'} — ver Calendário.</font>`,
      },
    })
  }

  widgets.push({
    buttonList: {
      buttons: [{
        text: 'Ver Calendário',
        onClick: { openLink: { url: `${APP_URL}/monitoramento-oc?tab=calendario` } },
      }],
    },
  })

  return widgets
}

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

function buildDigestCard(
  sol: any[],
  greeting: ReturnType<typeof getGreeting>,
  dayFormatted: string,
  generatedAt: string,
  startOfDay: string,
  endOfDay: string,
  subtitle: string,
  cardIdSuffix: string,
  servicosHoje: any[] = [],
  todayStr: string = '',
) {
  const newToday = sol.filter((s) => {
    const d = new Date(s.created_at)
    return d >= new Date(startOfDay) && d <= new Date(endOfDay)
  })

  const updatedToday = sol.filter((s) => {
    const d = new Date(s.updated_at)
    return d >= new Date(startOfDay) && d <= new Date(endOfDay) && !newToday.find((n: any) => n.id === s.id)
  })

  const sc: Record<string, number> = {}
  sol.forEach((s) => { sc[s.status] = (sc[s.status] || 0) + 1 })

  const totalActive = sol.filter((s) => !FINISHED_STATUSES.includes(s.status)).length
  const naFila = sc['recebido'] || 0
  const pendCorrecao = sc['pendente_correcao'] || 0
  const aguardInfo = sc['aguardando_informacoes'] || 0
  const emAprovacao = (sc['em_analise'] || 0) + (sc['em_processamento'] || 0) + (sc['aprovado'] || 0)
  const ocEmitida = (sc['oc_ac_emitida'] || 0) + (sc['aguardando_aceite'] || 0)
  const liberadas = sc['liberado_fornecedor'] || 0
  const enviadas = sc['enviado_fornecedor'] || 0
  const aguardExec = sc['aguardando_execucao'] || 0

  const urgentCount = naFila + pendCorrecao + aguardInfo
  const totalMovement = newToday.length + updatedToday.length

  let introText: string
  if (totalActive === 0) {
    introText = `${greeting.salute}! Não há solicitações ativas no momento.`
  } else if (urgentCount === 0) {
    introText = `${greeting.salute}! ${greeting.verbo} <b>${totalActive} solicitações ativas</b>, sem prioridades imediatas.`
  } else {
    introText = `${greeting.salute}! ${greeting.verbo} <b>${totalActive} solicitações ativas</b>, das quais <b>${urgentCount}</b> ${urgentCount === 1 ? 'exige' : 'exigem'} atenção imediata.`
  }

  const priorityWidgets: any[] = []
  if (urgentCount > 0) {
    const priorityCols: any[] = []
    if (naFila > 0) priorityCols.push(statColumn(naFila, 'Backoffice', COLORS.critical))
    if (pendCorrecao > 0) priorityCols.push(statColumn(pendCorrecao, 'Correção', COLORS.warning))
    if (aguardInfo > 0) priorityCols.push(statColumn(aguardInfo, 'Aguardando requisitante', COLORS.warning))
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

  const activeWidgets: any[] = []
  const activeItems = [
    { label: 'Em aprovação', count: emAprovacao, color: COLORS.info },
    { label: 'OC Emitida', count: ocEmitida, color: COLORS.info, alwaysShow: true },
    { label: 'Liberadas p/ fornecedor', count: liberadas, color: COLORS.success },
    { label: 'Enviadas', count: enviadas, color: COLORS.success },
    { label: 'Execução', count: aguardExec, color: COLORS.warning },
  ].filter((i) => i.count > 0 || (i as any).alwaysShow)

  if (activeItems.length > 0) {
    for (let i = 0; i < activeItems.length; i += 3) {
      const row = activeItems.slice(i, i + 3)
      activeWidgets.push({ columns: { columnItems: row.map((item) => statColumn(item.count, item.label, item.color)) } })
    }
  } else {
    activeWidgets.push({ textParagraph: { text: `<font color="${COLORS.muted}">Sem solicitações em andamento.</font>` } })
  }

  const movementWidgets: any[] = []
  if (totalMovement > 0) {
    const parts: string[] = []
    if (newToday.length > 0) parts.push(`<b>${newToday.length}</b> nova${newToday.length === 1 ? '' : 's'}`)
    if (updatedToday.length > 0) parts.push(`<b>${updatedToday.length}</b> atualizada${updatedToday.length === 1 ? '' : 's'}`)
    movementWidgets.push({ decoratedText: { topLabel: 'Hoje', text: parts.join(' · '), startIcon: { knownIcon: 'CLOCK' } } })
  } else {
    movementWidgets.push({ textParagraph: { text: `<font color="${COLORS.muted}">Sem movimentação hoje.</font>` } })
  }

  const sections: any[] = [
    { widgets: [{ textParagraph: { text: introText } }] },
    { header: `🔴 PRIORIDADES IMEDIATAS (${urgentCount})`, widgets: priorityWidgets },
    { widgets: [{ divider: {} }] },
    { header: `📊 ATIVAS (${totalActive})`, widgets: activeWidgets },
    { widgets: [{ divider: {} }] },
    { header: `📉 MOVIMENTO DO DIA`, widgets: movementWidgets },
  ]

  // Apenas no Radar da Manhã: lista os serviços previstos para hoje
  if (greeting.title === 'Radar da Manhã') {
    sections.push({ widgets: [{ divider: {} }] })
    sections.push({
      header: `📅 SERVIÇOS PREVISTOS PARA HOJE (${servicosHoje.length})`,
      widgets: buildServicosHojeWidgets(servicosHoje, todayStr),
    })
  }

  sections.push({
      widgets: [{
        columns: {
          columnItems: [{
            horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'CENTER',
            widgets: [{ buttonList: { buttons: [{ text: 'Abrir Sistema', onClick: { openLink: { url: APP_URL } }, color: { red: 0.12, green: 0.53, blue: 0.9, alpha: 1 } }] } }],
          }],
        },
      }],
  })

  return {
    card: {
      cardsV2: [{
        cardId: `digest-${cardIdSuffix}-${Date.now()}`,
        card: { header: { title: greeting.title, subtitle }, sections },
      }],
    },
    stats: { newToday: newToday.length, updatedToday: updatedToday.length, totalActive, urgentCount },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const coordenacaoSpace = Deno.env.get('GCHAT_SPACE_NAME') // Coordenação + Gerência (receives ALL)
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch spaces from DB
    const { data: spaces, error: spacesErr } = await supabase
      .from('gchat_spaces')
      .select('space_name, label, empreendimento')
      .eq('active', true)

    if (spacesErr) throw spacesErr

    // Time calculations
    const now = new Date()
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const todayStr = brt.toISOString().split('T')[0]
    const startOfDay = `${todayStr}T00:00:00-03:00`
    const endOfDay = `${todayStr}T23:59:59-03:00`
    const [year, month, day] = todayStr.split('-')
    const dayFormatted = `${day}/${month}/${year}`
    const generatedAt = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
    const greeting = getGreeting()

    // Fetch all solicitações once
    const { data: allSol, error: solErr } = await supabase
      .from('solicitacoes')
      .select('id, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr
    const solicitacoes = allSol || []

    // Serviços previstos para hoje (apenas no Radar da Manhã)
    let servicosHojeAll: any[] = []
    if (greeting.title === 'Radar da Manhã') {
      const { data: servicos, error: servErr } = await supabase
        .from('solicitacoes')
        .select(`
          id, protocolo, status, cancelamento_pendente, empreendimento,
          valor, descricao, data_execucao_servico, tipo_entrega,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .eq('tipo_entrega', 'servico')
        .eq('data_execucao_servico', todayStr)
        .not('status', 'in', '(cancelado,rejeitado,concluida,enviado_pagamento,nf_boleto_enviados)')
      if (servErr) console.error('Erro ao buscar serviços do dia:', servErr)
      servicosHojeAll = servicos || []
    }

    const results: any[] = []

    // Group spaces by space_name to handle multi-empreendimento (e.g. Esteio+Canoas)
    const spaceGroups = new Map<string, { label: string; empreendimentos: string[] }>()
    for (const s of (spaces || [])) {
      const existing = spaceGroups.get(s.space_name)
      if (existing) {
        if (s.empreendimento) existing.empreendimentos.push(s.empreendimento)
      } else {
        spaceGroups.set(s.space_name, {
          label: s.label,
          empreendimentos: s.empreendimento ? [s.empreendimento] : [],
        })
      }
    }

    // Send to each space from DB
    for (const [spaceName, config] of spaceGroups) {
      const isBackoffice = config.empreendimentos.length === 0

      // Filter solicitações
      const filtered = isBackoffice
        ? solicitacoes // Backoffice gets full digest
        : solicitacoes.filter((s) => config.empreendimentos.includes(s.empreendimento))

      const empLabel = isBackoffice
        ? 'BA Chamados'
        : config.empreendimentos.map((e) => EMP_LABELS[e] || e).join(' + ')

      const subtitle = `${empLabel} • ${dayFormatted} às ${generatedAt}`

      const servicosFiltered = isBackoffice
        ? servicosHojeAll
        : servicosHojeAll.filter((s) => config.empreendimentos.includes(s.empreendimento))

      const { card, stats } = buildDigestCard(
        filtered, greeting, dayFormatted, generatedAt,
        startOfDay, endOfDay, subtitle,
        isBackoffice ? 'backoffice' : config.empreendimentos.join('-'),
        servicosFiltered, todayStr,
      )

      try {
        await sendGChatMessageAuth(card, spaceName)
        console.log(`Digest sent to ${config.label} (${spaceName})`)
        results.push({ space: config.label, success: true, stats })
      } catch (e) {
        console.error(`Failed to send digest to ${config.label}:`, e)
        results.push({ space: config.label, success: false, error: (e as Error).message })
      }
    }

    // Always send FULL digest to Coordenação + Gerência (GCHAT_SPACE_NAME)
    if (coordenacaoSpace) {
      // Avoid duplicate if coordenação space is already in DB
      const alreadySent = spaceGroups.has(coordenacaoSpace)
      if (!alreadySent) {
        const subtitle = `Geral • ${dayFormatted} às ${generatedAt}`
        const { card, stats } = buildDigestCard(
          solicitacoes, greeting, dayFormatted, generatedAt,
          startOfDay, endOfDay, subtitle, 'coordenacao',
          servicosHojeAll, todayStr,
        )
        try {
          await sendGChatMessageAuth(card, coordenacaoSpace)
          console.log(`Digest sent to Coordenação (${coordenacaoSpace})`)
          results.push({ space: 'Coordenação + Gerência', success: true, stats })
        } catch (e) {
          console.error(`Failed to send digest to Coordenação:`, e)
          results.push({ space: 'Coordenação + Gerência', success: false, error: (e as Error).message })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('GChat daily digest error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
