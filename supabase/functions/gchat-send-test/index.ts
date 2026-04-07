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
    let apiError: string | null = null
    let usedMethod: 'api' | 'webhook' = 'webhook'

    // Test 1: Simple text message
    try {
      const textResult = await sendGChatMessageAuth({
        text: '✅ Teste de conectividade — BA Chamados',
      })
      await textResult.response.text()
      usedMethod = textResult.method
    } catch (e) {
      apiError = (e as Error).message
    }

    // Test 2: Card V2 with improved layout
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const methodLabel = usedMethod === 'api' ? 'API Autenticada (Service Account)' : 'Webhook (legado)'
    const methodColor = usedMethod === 'api' ? '#43A047' : '#F57C00'

    const cardResult = await sendGChatMessageAuth({
      cardsV2: [{
        cardId: `test-${Date.now()}`,
        card: {
          header: {
            title: '🧪 Teste de Integração',
            subtitle: `BA Chamados • ${timestamp}`,
          },
          sections: [
            {
              widgets: [{
                decoratedText: {
                  topLabel: 'Método de Envio',
                  text: `<b><font color="${methodColor}">${methodLabel}</font></b>`,
                  startIcon: { knownIcon: usedMethod === 'api' ? 'INVITE' : 'BOOKMARK' },
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
                      verticalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: '<b><font size=4 color="#43A047">✓</font></b>' } },
                        { textParagraph: { text: '<font size=1>Texto</font>' } },
                      ],
                    },
                    {
                      horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: '<b><font size=4 color="#43A047">✓</font></b>' } },
                        { textParagraph: { text: '<font size=1>Card V2</font>' } },
                      ],
                    },
                    {
                      horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'CENTER',
                      widgets: [
                        { textParagraph: { text: `<b><font size=4 color="${apiConfigured && !apiError ? '#43A047' : '#F57C00'}">${apiConfigured && !apiError ? '✓' : '✗'}</font></b>` } },
                        { textParagraph: { text: '<font size=1>Auth API</font>' } },
                      ],
                    },
                  ],
                },
              }],
            },
            ...(apiError ? [{
              widgets: [{
                textParagraph: {
                  text: `<font size=1 color="#D32F2F">⚠ Erro API: ${apiError.substring(0, 200)}</font>`,
                },
              }],
            }] : []),
            {
              widgets: [{
                columns: {
                  columnItems: [{
                    horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'CENTER',
                    widgets: [{
                      buttonList: {
                        buttons: [{
                          text: 'Abrir Sistema',
                          onClick: { openLink: { url: 'https://megas.lovable.app' } },
                        }],
                      },
                    }],
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
      apiError,
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
