import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'WhatsmiauTest_4cca4bbe'

const STATUS_LABELS: Record<string, string> = {
  recebido: '📥 Na Fila',
  em_analise: '🔍 Em Análise',
  pendente_correcao: '⚠️ Correção Necessária',
  aprovado: '✅ Em Lançamento',
  rejeitado: '❌ Não Aprovada',
  em_processamento: '🔄 Em Aprovação',
  oc_ac_emitida: '📄 OC Emitida',
  concluida: '🏁 Finalizada',
  aguardando_aceite: '⏳ Aguardando Aceite',
  aguardando_informacoes: '📬 Aguardando Informações',
  aguardando_nf_boleto: '🧾 Aguardando NF/Boleto',
  nf_boleto_enviados: '📨 NF/Boleto Enviados',
  enviado_pagamento: '💳 Enviado Pagamento',
  liberado_fornecedor: '✅ Liberada Fornecedor',
  enviado_fornecedor: '📤 Enviada Fornecedor',
  cancelado: '🚫 Cancelada',
  aguardando_execucao: '🔧 Aguardando Execução',
}

const EMP_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
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

    const payload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload).substring(0, 500))

    // Handle messages.upsert event
    if (payload.event !== 'messages.upsert') {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = payload.data
    if (!data || data.key?.fromMe) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const messageText = data.message?.conversation
      || data.message?.extendedTextMessage?.text
      || ''
    const senderNumber = data.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''

    if (!messageText.trim()) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract protocol number (pattern: 2026XXXXXX or just digits 7+)
    const protocolMatch = messageText.trim().match(/\b(20\d{8})\b/)
    
    let replyText = ''

    if (protocolMatch) {
      const protocolo = protocolMatch[1]
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data: sol, error } = await supabase
        .from('solicitacoes')
        .select(`
          protocolo, status, empreendimento, valor, created_at, updated_at,
          descricao, emergencial,
          fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(razao_social, nome_fantasia)
        `)
        .eq('protocolo', protocolo)
        .maybeSingle()

      if (error) {
        console.error('DB error:', error)
        replyText = `❌ Erro ao consultar. Tente novamente.`
      } else if (!sol) {
        replyText = `🔍 Solicitação *#${protocolo}* não encontrada.\n\nVerifique o número e tente novamente.`
      } else {
        const statusLabel = STATUS_LABELS[sol.status] || sol.status
        const empLabel = EMP_LABELS[sol.empreendimento] || sol.empreendimento
        const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sol.valor)
        const createdAt = new Date(sol.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const updatedAt = new Date(sol.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        const fornecedor = sol.fornecedor
          ? ((sol.fornecedor as any).nome_fantasia || (sol.fornecedor as any).razao_social || 'N/A')
          : 'N/A'
        const descricaoShort = sol.descricao?.substring(0, 100) || 'N/A'

        replyText = `📋 *Solicitação #${protocolo}*\n\n`
        replyText += `📌 Status: ${statusLabel}\n`
        replyText += `🏢 Empreendimento: ${empLabel}\n`
        replyText += `💰 Valor: ${valor}\n`
        replyText += `🏭 Fornecedor: ${fornecedor}\n`
        replyText += `📅 Abertura: ${createdAt}\n`
        replyText += `🔄 Última atualização: ${updatedAt}\n`
        if (sol.emergencial) replyText += `🚨 *EMERGENCIAL*\n`
        replyText += `\n📝 ${descricaoShort}${sol.descricao && sol.descricao.length > 100 ? '...' : ''}\n`
        replyText += `\n🔗 Acesse: https://megas.lovable.app`
      }
    } else {
      // Help message
      replyText = `👋 *BA Chamados — Consulta*\n\n`
      replyText += `Para consultar uma solicitação, envie o número do protocolo.\n\n`
      replyText += `Exemplo: *2026000312*\n\n`
      replyText += `🔗 Acesse: https://megas.lovable.app`
    }

    // Send reply
    await fetch(`${WHATSMIAU_BASE}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: senderNumber,
        text: replyText,
        delay: 1200,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
