import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'WhatsmiauTest_4cca4bbe'

const DEST_NUMBERS = [
  { number: '5541998749629', name: 'Guilherme' },
  { number: '5541991684980', name: 'Jonatas' },
]

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Na Fila',
  em_analise: 'Em Análise',
  pendente_correcao: 'Correção Necessária',
  aprovado: 'Em Lançamento',
  em_processamento: 'Em Aprovação',
  oc_ac_emitida: 'OC Emitida',
  aguardando_aceite: 'Aguardando Aceite',
  aguardando_informacoes: 'Aguardando Informações',
  aguardando_nf_boleto: 'Aguardando NF/Boleto',
  nf_boleto_enviados: 'NF/Boleto Enviados',
  enviado_pagamento: 'Enviado Pagamento',
  liberado_fornecedor: 'Liberada Fornecedor',
  enviado_fornecedor: 'Enviada Fornecedor',
  aguardando_execucao: 'Aguardando Execução',
  concluida: 'Finalizada',
  cancelado: 'Cancelada',
  rejeitado: 'Rejeitada',
}

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

function getGreeting(): string {
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24
  if (brtHour < 12) return '☀️ Bom dia'
  if (brtHour < 17) return '🌤️ Boa tarde'
  return '🌙 Fechamento do dia'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('WHATSMIAU_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'WHATSMIAU_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // BRT date range
    const now = new Date()
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const todayStr = brt.toISOString().split('T')[0]
    const startOfDay = `${todayStr}T00:00:00-03:00`
    const endOfDay = `${todayStr}T23:59:59-03:00`
    const dayFormatted = `${todayStr.split('-')[2]}/${todayStr.split('-')[1]}/${todayStr.split('-')[0]}`

    // Fetch all solicitacoes
    const { data: allSol, error: solErr } = await supabase
      .from('solicitacoes')
      .select('id, protocolo, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr

    // Today's new
    const newToday = allSol?.filter(s =>
      new Date(s.created_at) >= new Date(startOfDay) && new Date(s.created_at) <= new Date(endOfDay)
    ) || []

    // Today's updated (excluding new)
    const updatedToday = allSol?.filter(s =>
      new Date(s.updated_at) >= new Date(startOfDay) &&
      new Date(s.updated_at) <= new Date(endOfDay) &&
      !newToday.find(n => n.id === s.id)
    ) || []

    // Status counts
    const statusCounts: Record<string, number> = {}
    allSol?.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })

    // Active (not finished/cancelled)
    const finishedStatuses = ['concluida', 'cancelado', 'rejeitado']
    const totalActive = allSol?.filter(s => !finishedStatuses.includes(s.status)).length || 0

    // Status changes today
    const { data: historico } = await supabase
      .from('historico_solicitacoes')
      .select('solicitacao_id, status_novo, created_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .not('status_novo', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build highlights
    const highlights: string[] = []
    const seenIds = new Set<string>()

    newToday.slice(0, 5).forEach(s => {
      seenIds.add(s.id)
      highlights.push(`🆕 #${s.protocolo} — Nova (${EMP_LABELS[s.empreendimento] || s.empreendimento})`)
    })

    historico?.forEach(h => {
      if (highlights.length >= 10 || seenIds.has(h.solicitacao_id)) return
      seenIds.add(h.solicitacao_id)
      const sol = allSol?.find(s => s.id === h.solicitacao_id)
      if (sol) {
        highlights.push(`🔄 #${sol.protocolo} → ${STATUS_LABELS[h.status_novo] || h.status_novo}`)
      }
    })

    // Counts
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

    // Build formatted message
    let msg = `${greeting}! 📋\n`
    msg += `*BA Chamados — ${dayFormatted}*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`

    // Priority actions
    const urgentCount = naFila + pendCorrecao + aguardInfo
    if (urgentCount > 0) {
      msg += `🔴 *Ações Pendentes (${urgentCount})*\n`
      if (naFila > 0) msg += `   📥 Na Fila: *${naFila}*\n`
      if (pendCorrecao > 0) msg += `   ⚠️ Correção: *${pendCorrecao}*\n`
      if (aguardInfo > 0) msg += `   📬 Aguard. Info: *${aguardInfo}*\n`
      msg += `\n`
    }

    // Pipeline
    msg += `📊 *Pipeline (${totalActive} ativas)*\n`
    if (emAnalise > 0) msg += `   🔍 Em Análise: ${emAnalise}\n`
    if (emProcessamento > 0) msg += `   🔄 Em Aprovação: ${emProcessamento}\n`
    if (ocEmitida > 0) msg += `   📄 OC Emitida: ${ocEmitida}\n`
    if (liberadas > 0) msg += `   ✅ Liberadas: ${liberadas}\n`
    if (enviadas > 0) msg += `   📤 Enviadas: ${enviadas}\n`
    if (aguardExec > 0) msg += `   🔧 Aguard. Execução: ${aguardExec}\n`
    if (aguardNf > 0) msg += `   🧾 Aguard. NF/Boleto: ${aguardNf}\n`
    msg += `\n`

    // Today's activity
    msg += `📈 *Movimento Hoje*\n`
    msg += `   🆕 Novas: ${newToday.length}\n`
    msg += `   🔄 Atualizadas: ${updatedToday.length}\n`

    if (highlights.length > 0) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n`
      msg += `🔔 *Destaques*\n`
      msg += highlights.join('\n')
      msg += '\n'
    }

    msg += `\n🔗 megas.lovable.app`

    // Send to all recipients
    for (const dest of DEST_NUMBERS) {
      const sendRes = await fetch(`${WHATSMIAU_BASE}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: dest.number,
          text: msg,
          delay: 1200,
        }),
      })
      const sendData = await sendRes.json()
      console.log(`Sent to ${dest.name}:`, sendRes.ok, JSON.stringify(sendData).substring(0, 200))
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Resumo enviado via WhatsApp',
      stats: {
        newToday: newToday.length,
        updatedToday: updatedToday.length,
        totalActive,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Daily digest error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
