import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'WhatsmiauTest_4cca4bbe'
const DEST_NUMBER = '5541998749629'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('WHATSMIAU_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'WHATSMIAU_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { protocolo, numeros_oc, valor, empreendimento, fornecedor_razao } = await req.json()

    if (!protocolo || !numeros_oc) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const empLabels: Record<string, string> = {
      mega_curitiba: 'Mega Curitiba',
      mega_itajai: 'Mega Itajaí',
      mega_esteio: 'Mega Esteio',
      mega_canoas: 'Mega Canoas',
      todos: 'Todos',
    }

    const valorFormatted = valor
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
      : 'N/A'

    let message = `📄 *OC Emitida — #${protocolo}*\n\n`
    message += `📋 Número(s): ${numeros_oc}\n`
    message += `🏢 Empreendimento: ${empLabels[empreendimento] || empreendimento || 'N/A'}\n`
    message += `💰 Valor: ${valorFormatted}\n`
    if (fornecedor_razao) {
      message += `🏭 Fornecedor: ${fornecedor_razao}\n`
    }
    message += `\n🔗 Acesse: https://megas.lovable.app`

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
      return new Response(JSON.stringify({ error: 'Failed to send', details: sendData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('WhatsApp OC notify error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
