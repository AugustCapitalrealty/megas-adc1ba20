import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendGChatMessageAuth } from '../_shared/gchat-auth.ts'

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

    const body = await req.json()
    const { tipo, protocolo, numeros_oc, valor, descricao, empreendimento, fornecedor_razao, solicitacao_id, motivo, status } = body

    // === CORRECTION NOTIFICATION ===
    if (tipo === 'correcao') {
      if (!protocolo) {
        return new Response(JSON.stringify({ error: 'Missing protocolo' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const descResumo = descricao && descricao.length > 200 ? `${descricao.substring(0, 200)}...` : (descricao || '')

      const correctionCard = {
        cardsV2: [{
          cardId: `correcao-${protocolo}`,
          card: {
            header: {
              title: `🔴 Correção Solicitada — #${protocolo}`,
              subtitle: empreendimento || '',
            },
            sections: [
              {
                widgets: [
                  { decoratedText: { topLabel: 'Status', text: `<b><font color="#D32F2F">${status || 'Correção Necessária'}</font></b>`, startIcon: { knownIcon: 'TICKET' } } },
                  { decoratedText: { topLabel: 'Motivo', text: motivo || 'Sem motivo informado', startIcon: { knownIcon: 'EDIT' }, wrapText: true } },
                  ...(descResumo ? [{ textParagraph: { text: `<font size=1 color="#666">📝 ${descResumo}</font>` } }] : []),
                ],
              },
              {
                widgets: [{
                  buttonList: {
                    buttons: [{ text: '🔗 Abrir no Sistema', onClick: { openLink: { url: 'https://megas.lovable.app' } } }],
                  },
                }],
              },
            ],
          },
        }],
      }

      const gchatRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correctionCard),
      })

      if (!gchatRes.ok) {
        const errBody = await gchatRes.text()
        throw new Error(`Google Chat webhook failed [${gchatRes.status}]: ${errBody}`)
      }
      await gchatRes.text()

      return new Response(JSON.stringify({ success: true, tipo: 'correcao' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === OC NOTIFICATION (default) ===
    if (!protocolo || !numeros_oc) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const valorFormatted = valor
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
      : 'N/A'

    const descricaoResumo = descricao && descricao.length > 300
      ? `${descricao.substring(0, 300)}...`
      : (descricao || 'N/A')

    // Build sections
    const sections: any[] = []

    // Details section
    sections.push({
      widgets: [
        {
          decoratedText: {
            topLabel: 'Número(s) da OC',
            text: `<b>${numeros_oc}</b>`,
            startIcon: { knownIcon: 'DESCRIPTION' },
          },
        },
        {
          decoratedText: {
            topLabel: 'Empreendimento',
            text: EMP_LABELS[empreendimento] || empreendimento || 'N/A',
            startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' },
          },
        },
        {
          decoratedText: {
            topLabel: 'Valor',
            text: `<b>${valorFormatted}</b>`,
            startIcon: { knownIcon: 'DOLLAR' },
          },
        },
        ...(fornecedor_razao ? [{
          decoratedText: {
            topLabel: 'Fornecedor',
            text: fornecedor_razao,
            startIcon: { knownIcon: 'MEMBERSHIP' },
          },
        }] : []),
      ],
    })

    // Description section
    sections.push({
      header: '📝 Descrição',
      collapsible: descricaoResumo.length > 150,
      widgets: [{
        textParagraph: { text: descricaoResumo },
      }],
    })

    // PDF link if available
    let pdfUrl: string | null = null
    if (solicitacao_id) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const numerosList = String(numeros_oc).split(',').map((n: string) => n.trim()).filter(Boolean)

        const { data: docs } = await supabase
          .from('documentos_emitidos')
          .select('storage_path, nome_arquivo, numero_documento')
          .eq('solicitacao_id', solicitacao_id)
          .in('numero_documento', numerosList)
          .order('created_at', { ascending: false })
          .limit(1)

        if (docs && docs.length > 0) {
          const { data: signedUrlData } = await supabase.storage
            .from('documentos-emitidos')
            .createSignedUrl(docs[0].storage_path, 3600)

          if (signedUrlData?.signedUrl) {
            pdfUrl = signedUrlData.signedUrl
          }
        }
      } catch (e) {
        console.error('PDF lookup error (non-fatal):', e)
      }
    }

    // Buttons
    const buttons: any[] = [
      {
        text: '🔗 Abrir no Sistema',
        onClick: { openLink: { url: 'https://megas.lovable.app' } },
      },
    ]

    if (pdfUrl) {
      buttons.push({
        text: '📄 Baixar PDF da OC',
        onClick: { openLink: { url: pdfUrl } },
      })
    }

    sections.push({
      widgets: [{
        buttonList: { buttons },
      }],
    })

    const cardPayload = {
      cardsV2: [{
        cardId: `oc-${protocolo}`,
        card: {
          header: {
            title: `📄 OC Emitida — #${protocolo}`,
            subtitle: `${EMP_LABELS[empreendimento] || empreendimento || ''} • ${valorFormatted}`,
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

    return new Response(JSON.stringify({ success: true, pdfIncluded: !!pdfUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('GChat OC notify error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
