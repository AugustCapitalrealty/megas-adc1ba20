const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHATSMIAU_BASE = 'https://api.whatsmiau.dev'
const INSTANCE_NAME = 'WhatsmiauTest_4cca4bbe'

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

    const { action } = await req.json().catch(() => ({ action: 'status' }))

    // List existing instances
    const listRes = await fetch(`${WHATSMIAU_BASE}/evolution/instances`, {
      headers: { apikey: apiKey },
    })
    const instances = await listRes.json()

    if (action === 'status') {
      const bachamados = Array.isArray(instances)
        ? instances.find((i: any) => i.instanceName === INSTANCE_NAME || i.name === INSTANCE_NAME)
        : null

      return new Response(JSON.stringify({
        instances: instances,
        bachamados: bachamados || null,
        connected: bachamados?.connectionStatus === 'open' || bachamados?.state === 'open' || false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'configure_webhook') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

      const webhookRes = await fetch(`${WHATSMIAU_BASE}/webhook/set/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            events: ['messages.upsert'],
            webhookByEvents: false,
          },
        }),
      })
      const webhookData = await webhookRes.json()

      return new Response(JSON.stringify({
        message: 'Webhook configurado com sucesso!',
        webhookUrl,
        response: webhookData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create') {
      const existing = Array.isArray(instances)
        ? instances.find((i: any) => i.instanceName === INSTANCE_NAME || i.name === INSTANCE_NAME)
        : null

      if (existing) {
        const connectRes = await fetch(`${WHATSMIAU_BASE}/evolution/instance/connect/${existing._id || existing.id}`, {
          headers: { apikey: apiKey },
        })
        const connectData = await connectRes.json()

        return new Response(JSON.stringify({
          message: 'Instância já existe. Escaneie o QR code para conectar.',
          instance: existing,
          qrcode: connectData,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const createRes = await fetch(`${WHATSMIAU_BASE}/evolution/instance/create`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: INSTANCE_NAME,
          qrcode: true,
        }),
      })
      const createData = await createRes.json()

      return new Response(JSON.stringify({
        message: 'Instância criada! Escaneie o QR code para conectar.',
        instance: createData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida. Use "status", "create" ou "configure_webhook".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Whatsmiau setup error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
