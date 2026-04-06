import { sendGChatMessageAuth, isApiConfigured } from '../_shared/gchat-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiConfigured = isApiConfigured()

    // Test 1: Simple text message
    const textResult = await sendGChatMessageAuth({
      text: '✅ Teste API autenticada — BA Chamados',
    })
    await textResult.response.text()

    // Test 2: Card V2
    const cardResult = await sendGChatMessageAuth({
      cardsV2: [{
        cardId: `test-${Date.now()}`,
        card: {
          header: {
            title: '🧪 Teste de Integração',
            subtitle: `BA Chamados • ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          },
          sections: [
            {
              widgets: [{
                textParagraph: {
                  text: `Modo: <b>${textResult.method === 'api' ? 'API Autenticada (Service Account)' : 'Webhook (legado)'}</b>`,
                },
              }],
            },
            {
              widgets: [{
                columns: {
                  columnItems: [
                    {
                      horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                      horizontalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: '<b><font size=4 color="#43A047">✓</font></b>' } },
                        { textParagraph: { text: '<font size=1>Texto</font>' } },
                      ],
                    },
                    {
                      horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                      horizontalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: '<b><font size=4 color="#43A047">✓</font></b>' } },
                        { textParagraph: { text: '<font size=1>Card V2</font>' } },
                      ],
                    },
                    {
                      horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                      horizontalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: `<b><font size=4 color="${apiConfigured ? '#43A047' : '#F57C00'}">${apiConfigured ? '✓' : '—'}</font></b>` } },
                        { textParagraph: { text: '<font size=1>Auth</font>' } },
                      ],
                    },
                  ],
                },
              }],
            },
            {
              widgets: [{
                buttonList: {
                  buttons: [{
                    text: 'Abrir BA Chamados',
                    onClick: { openLink: { url: 'https://megas.lovable.app' } },
                  }],
                },
              }],
            },
          ],
        },
      }],
    })
    await cardResult.response.text()

    return new Response(JSON.stringify({
      success: true,
      method: cardResult.method,
      apiConfigured,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('GChat test error:', error)
    return new Response(JSON.stringify({
      error: (error as Error).message,
      apiConfigured: isApiConfigured(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
