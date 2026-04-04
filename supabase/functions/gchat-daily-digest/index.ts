import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
}

function getGreeting(): { text: string; emoji: string } {
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24
  if (brtHour < 12) return { text: 'Bom dia', emoji: '☀️' }
  if (brtHour < 17) return { text: 'Atualização da tarde', emoji: '🌤️' }
  return { text: 'Fechamento do dia', emoji: '🌙' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookUrl = Deno.env.get('GCHAT_WEBHOOK_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const dayFormatted = `${todayStr.split('-')[2]}/${todayStr.split('-')[1]}/${todayStr.split('-')[0]}`

    const { data: allSol, error: solErr } = await supabase
      .from('solicitacoes')
      .select('id, protocolo, status, empreendimento, created_at, updated_at')

    if (solErr) throw solErr

    const newToday = allSol?.filter(s =>
      new Date(s.created_at) >= new Date(startOfDay) && new Date(s.created_at) <= new Date(endOfDay)
    ) || []

    const updatedToday = allSol?.filter(s =>
      new Date(s.updated_at) >= new Date(startOfDay) &&
      new Date(s.updated_at) <= new Date(endOfDay) &&
      !newToday.find(n => n.id === s.id)
    ) || []

    const statusCounts: Record<string, number> = {}
    allSol?.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })

    const finishedStatuses = ['concluida', 'cancelado', 'rejeitado']
    const totalActive = allSol?.filter(s => !finishedStatuses.includes(s.status)).length || 0

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

    // Build Google Chat Card v2 with improved UI
    const sections: any[] = [
      {
        header: `<b><font color="#D32F2F">⚠️ AÇÕES CRÍTICAS</font></b>`,
        widgets: [
          {
            columns: {
              columnItems: [
                {
                  horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'CENTER',
                  widgets: [
                    { textParagraph: { text: `<b><font size=5 color="#D32F2F">${naFila}</font></b>` } },
                    { textParagraph: { text: `<font size=2>Na Fila</font>` } },
                  ],
                },
                {
                  horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'CENTER',
                  widgets: [
                    { textParagraph: { text: `<b><font size=5 color="#F57C00">${pendCorrecao}</font></b>` } },
                    { textParagraph: { text: `<font size=2>Correção</font>` } },
                  ],
                },
                {
                  horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'CENTER',
                  widgets: [
                    { textParagraph: { text: `<b><font size=5 color="#FBC02D">${aguardInfo}</font></b>` } },
                    { textParagraph: { text: `<font size=2>Info</font>` } },
                  ],
                },
              ],
            },
          },
          {
            textParagraph: {
              text: `<font color="#999" size=1>Total de ${urgentCount} itens requerem ação imediata</font>`,
            },
          },
        ],
      },
      { divider: { topSpacing: 'SPACING_MEDIUM' } },
    ]

    // Active section
    const activeWidgets: any[] = []
    const activeItems = [
      { label: 'Em Análise', count: emAnalise, color: '#1E88E5' },
      { label: 'Em Aprovação', count: emProcessamento, color: '#43A047' },
      { label: 'OC Emitida', count: ocEmitida, color: '#3949AB' },
      { label: 'Liberadas', count: liberadas, color: '#00897B' },
      { label: 'Enviadas', count: enviadas, color: '#6A1B9A' },
      { label: 'Aguard. Execução', count: aguardExec, color: '#F57C00' },
      { label: 'Aguard. NF/Boleto', count: aguardNf, color: '#5E35B1' },
    ].filter(i => i.count > 0)

    if (activeItems.length > 0) {
      // Row 1: 3 items
      if (activeItems.length >= 1) {
        activeWidgets.push({
          columns: {
            columnItems: activeItems.slice(0, 3).map(item => ({
              horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'CENTER',
              widgets: [
                { textParagraph: { text: `<b><font size=4 color="${item.color}">${item.count}</font></b>` } },
                { textParagraph: { text: `<font size=1 color="#666">${item.label}</font>` } },
              ],
            })),
          },
        })
      }
      // Row 2: next 3 items
      if (activeItems.length > 3) {
        activeWidgets.push({
          columns: {
            columnItems: activeItems.slice(3, 6).map(item => ({
              horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'CENTER',
              widgets: [
                { textParagraph: { text: `<b><font size=4 color="${item.color}">${item.count}</font></b>` } },
                { textParagraph: { text: `<font size=1 color="#666">${item.label}</font>` } },
              ],
            })),
          },
        })
      }
      // Row 3: remaining
      if (activeItems.length > 6) {
        activeWidgets.push({
          columns: {
            columnItems: activeItems.slice(6).map(item => ({
              horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'CENTER',
              widgets: [
                { textParagraph: { text: `<b><font size=4 color="${item.color}">${item.count}</font></b>` } },
                { textParagraph: { text: `<font size=1 color="#666">${item.label}</font>` } },
              ],
            })),
          },
        })
      }

      activeWidgets.push({
        textParagraph: {
          text: `<font color="#999" size=1>📊 Total: <b>${totalActive}</b> solicitações ativas</font>`,
        },
      })

      sections.push({
        header: `<b><font color="#1E88E5">📈 EM MOVIMENTO</font></b>`,
        collapsible: false,
        widgets: activeWidgets,
      })

      sections.push({ divider: { topSpacing: 'SPACING_MEDIUM' } })
    }

    // Movement section
    const totalMovement = newToday.length + updatedToday.length
    const movWidgets: any[] = []

    if (Object.keys(movByEmp).length > 0) {
      const empEntries = Object.entries(movByEmp).sort((a, b) => 
        (b[1].novas + b[1].atualizadas) - (a[1].novas + a[1].atualizadas)
      )

      for (const [emp, counts] of empEntries) {
        const total = counts.novas + counts.atualizadas
        const novasEmoji = counts.novas > 0 ? '🆕' : '·'
        const atualizadasEmoji = counts.atualizadas > 0 ? '🔄' : '·'
        
        movWidgets.push({
          decoratedText: {
            topLabel: `${novasEmoji} Novas | ${atualizadasEmoji} Atualizadas`,
            text: `<b>${emp}</b>: ${counts.novas} + ${counts.atualizadas} = <font color="#1E88E5"><b>${total}</b></font>`,
            startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' },
          },
        })
      }
    } else {
      movWidgets.push({ 
        textParagraph: { 
          text: '<i><font color="#999">📭 Sem movimentação hoje</font></i>' 
        } 
      })
    }

    movWidgets.push({
      textParagraph: {
        text: `<font color="#999" size=1>Total: <b>${newToday.length}</b> novas | <b>${updatedToday.length}</b> atualizadas</font>`,
      },
    })

    sections.push({
      header: `<b><font color="#43A047">🔄 RESUMO DO DIA</font></b>`,
      collapsible: totalMovement > 8,
      widgets: movWidgets,
    })

    sections.push({ divider: { topSpacing: 'SPACING_MEDIUM' } })

    // Link button
    sections.push({
      widgets: [{
        buttonList: {
          buttons: [{
            text: '� Abrir BA Chamados',
            onClick: { openLink: { url: 'https://megas.lovable.app' } },
          }],
        },
      }],
    })

    // Summary footer
    const criticalSummary = `🔴 ${urgentCount} crítico${urgentCount !== 1 ? 's' : ''} · 📊 ${totalActive} ativo${totalActive !== 1 ? 's' : ''} · 🔄 ${totalMovement} mudança${totalMovement !== 1 ? 's' : ''}`
    
    sections.push({
      widgets: [{
        textParagraph: {
          text: `<font size=1 color="#999">${criticalSummary}</font>`,
        },
      }],
    })

    const cardPayload = {
      cardsV2: [{
        cardId: 'daily-digest',
        card: {
          header: {
            title: `${greeting.emoji} ${greeting.text}!`,
            subtitle: `BA Chamados — ${dayFormatted} | ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          },
          sections,
        },
      }],
    }

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

    return new Response(JSON.stringify({
      success: true,
      message: 'Resumo enviado via Google Chat',
      stats: { newToday: newToday.length, updatedToday: updatedToday.length, totalActive },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('GChat daily digest error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
