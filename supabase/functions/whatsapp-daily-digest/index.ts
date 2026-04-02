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
  if (brtHour < 17) return '🌤️ Atualização da tarde'
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

    // Group movement by empreendimento
    const movByEmp: Record<string, { novas: number; atualizadas: number }> = {}
    newToday.forEach(s => {
      const emp = EMP_LABELS[s.empreendimento] || s.empreendimento || 'Outros'
      if (!movByEmp[emp]) movByEmp[emp] = { novas: 0, atualizadas: 0 }
      movByEmp[emp].novas++
    })
    updatedToday.forEach(s => {
      const emp = EMP_LABELS[s.empreendimento] || s.empreendimento || 'Outros'
      if (!movByEmp[emp]) movByEmp[emp] = { novas: 0, atualizadas: 0 }
      movByEmp[emp].atualizadas++
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

    // Active (replacing "Pipeline")
    msg += `📊 *Ativas (${totalActive})*\n`
    if (emAnalise > 0) msg += `   🔍 Em Análise: ${emAnalise}\n`
    if (emProcessamento > 0) msg += `   🔄 Em Aprovação: ${emProcessamento}\n`
    if (ocEmitida > 0) msg += `   📄 OC Emitida: ${ocEmitida}\n`
    if (liberadas > 0) msg += `   ✅ Liberadas: ${liberadas}\n`
    if (enviadas > 0) msg += `   📤 Enviadas: ${enviadas}\n`
    if (aguardExec > 0) msg += `   🔧 Aguard. Execução: ${aguardExec}\n`
    if (aguardNf > 0) msg += `   🧾 Aguard. NF/Boleto: ${aguardNf}\n`
    msg += `\n`

    // Today's activity grouped by empreendimento
    const totalMovement = newToday.length + updatedToday.length
    msg += `📈 *Movimento Hoje (${totalMovement})*\n`
    if (Object.keys(movByEmp).length > 0) {
      for (const [emp, counts] of Object.entries(movByEmp)) {
        const parts: string[] = []
        if (counts.novas > 0) parts.push(`${counts.novas} nova${counts.novas > 1 ? 's' : ''}`)
        if (counts.atualizadas > 0) parts.push(`${counts.atualizadas} atualizada${counts.atualizadas > 1 ? 's' : ''}`)
        msg += `   🏢 ${emp}: ${parts.join(', ')}\n`
      }
    } else {
      msg += `   Sem movimentação hoje\n`
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
