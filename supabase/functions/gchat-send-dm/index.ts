import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { sendGChatDM } from "../_shared/gchat-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, text, card } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build message: card takes priority, otherwise simple text
    let message: Record<string, unknown>
    if (card) {
      message = card
    } else {
      const messageText = text || '👋 Olá! Esta é uma mensagem do Megas Bot.'
      message = { text: messageText }
    }

    console.log(`Sending DM to ${email}...`)
    const result = await sendGChatDM(email, message)
    console.log(`DM sent successfully to ${email}: space=${result.spaceName}`)

    return new Response(JSON.stringify({
      success: true,
      email,
      spaceName: result.spaceName,
      messageId: result.messageId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('gchat-send-dm error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
