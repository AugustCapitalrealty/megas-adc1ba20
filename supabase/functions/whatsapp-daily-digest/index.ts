import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'BAChamados'
const DEST_NUMBER = '5541998749629'

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

    // Get today's date range (BRT = UTC-3)
    const now = new Date()
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const todayStr = brt.toISOString().split('T')[0]
    const startOfDay = `${todayStr}T00:00:00-03:00`
    const endOfDay = `${todayStr}T23:59:59-03:00`

    // Format date for display
    const dayFormatted = `${todayStr.split('-')[2]}/${todayStr.split('-')[1]}/${todayStr.split('-')[0]}`

    // Count solicitations by status (all active)
    const { data: allSol, error: solErr } = await supabase
      .from('solicitacoes')
      .select('id, protocolo, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr

    // Today's new solicitations
    const newToday = allSol?.filter(s =>
      new Date(s.created_at) >= new Date(startOfDay) && new Date(s.created_at) <= new Date(endOfDay)
    ) || []

    // Today's updated solicitations (excluding newly created)
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

    // Empreendimento labels
    const empLabels: Record<string, string> = {
      mega_curitiba: 'Mega Curitiba',
      mega_itajai: 'Mega Itajaí',
      mega_esteio: 'Mega Esteio',
      mega_canoas: 'Mega Canoas',
      todos: 'Todos',
    }

    // Status labels for highlights
    const statusLabels: Record<string, string> = {
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

    // Build highlights (max 10)
    const highlights: string[] = []

    // New today
    newToday.slice(0, 5).forEach(s => {
      highlights.push(`• #${s.protocolo} — Nova (${empLabels[s.empreendimento] || s.empreendimento})`)
    })

    // Status changes today
    const { data: historico } = await supabase
      .from('historico_solicitacoes')
      .select('solicitacao_id, status_novo, created_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .not('status_novo', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    const seenIds = new Set(newToday.map(s => s.id))
    historico?.forEach(h => {
      if (highlights.length >= 10 || seenIds.has(h.solicitacao_id)) return
      seenIds.add(h.solicitacao_id)
      const sol = allSol?.find(s => s.id === h.solicitacao_id)
      if (sol) {
        highlights.push(`• #${sol.protocolo} — ${statusLabels[h.status_novo] || h.status_novo}`)
      }
    })

    // Active counts
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
    const concluidas = statusCounts['concluida'] || 0
    const canceladas = statusCounts['cancelado'] || 0

    // Build message
    let message = `📋 *Resumo do Dia — BA Chamados*\n`
    message += `📅 ${dayFormatted}\n\n`
    message += `📊 *Visão Geral:*\n`
    message += `📥 Na Fila: ${naFila}\n`
    message += `🔍 Em Análise: ${emAnalise}\n`
    message += `⚠️ Pendentes Correção: ${pendCorrecao}\n`
    message += `📬 Aguardando Informações: ${aguardInfo}\n`
    message += `🔄 Em Aprovação: ${emProcessamento}\n`
    message += `📄 OC Emitida: ${ocEmitida}\n`
    message += `✅ Liberadas: ${liberadas}\n`
    message += `📤 Enviadas Fornecedor: ${enviadas}\n`
    message += `🔧 Aguardando Execução: ${aguardExec}\n`
    message += `🧾 Aguardando NF/Boleto: ${aguardNf}\n\n`

    message += `📈 *Hoje:*\n`
    message += `🆕 Novas: ${newToday.length}\n`
    message += `🔄 Atualizadas: ${updatedToday.length}\n\n`

    if (highlights.length > 0) {
      message += `🔔 *Destaques:*\n`
      message += highlights.join('\n')
      message += '\n\n'
    }

    message += `🔗 Acesse: https://megas.lovable.app`

    // Send via WhatsApp
    const sendRes = await fetch(`${WHATSMIAU_BASE}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: DEST_NUMBER,
        text: message,
        delay: 1200,
      }),
    })

    const sendData = await sendRes.json()

    if (!sendRes.ok) {
      console.error('WhatsApp send error:', sendData)
      return new Response(JSON.stringify({
        error: 'Falha ao enviar mensagem',
        details: sendData,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('WhatsApp digest sent successfully:', sendData)

    return new Response(JSON.stringify({
      success: true,
      message: 'Resumo diário enviado via WhatsApp',
      stats: {
        newToday: newToday.length,
        updatedToday: updatedToday.length,
        totalActive: allSol?.filter(s => !['concluida', 'cancelado', 'rejeitado'].includes(s.status)).length,
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
