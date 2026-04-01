import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'WhatsmiauTest_4cca4bbe'

const DEST_NUMBERS = [
  { number: '5541998749629', name: 'Guilherme Marques' },
  { number: '5541991684980', name: 'Jonatas Ferreira' },
]

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

    const { protocolo, numeros_oc, valor, empreendimento, fornecedor_razao, solicitacao_id } = await req.json()

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

    // Send text message to all recipients
    for (const dest of DEST_NUMBERS) {
      await fetch(`${WHATSMIAU_BASE}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: dest.number,
          text: message,
          delay: 1200,
        }),
      })
    }

    // Try to send PDF if solicitacao_id is provided
    if (solicitacao_id) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data: docs } = await supabase
          .from('documentos_emitidos')
          .select('storage_path, nome_arquivo')
          .eq('solicitacao_id', solicitacao_id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (docs && docs.length > 0) {
          const { data: signedUrlData } = await supabase.storage
            .from('documentos-emitidos')
            .createSignedUrl(docs[0].storage_path, 3600) // 1 hour

          if (signedUrlData?.signedUrl) {
            for (const dest of DEST_NUMBERS) {
              await fetch(`${WHATSMIAU_BASE}/message/sendMedia/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: {
                  apikey: apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  number: dest.number,
                  mediatype: 'document',
                  media: signedUrlData.signedUrl,
                  fileName: docs[0].nome_arquivo || `OC_${protocolo}.pdf`,
                  delay: 2000,
                }),
              })
            }
            console.log('PDF sent to all recipients')
          }
        }
      } catch (pdfErr) {
        console.error('PDF send error (non-fatal):', pdfErr)
      }
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
