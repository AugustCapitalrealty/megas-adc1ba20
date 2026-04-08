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

/**
 * Resolve which spaces should receive a notification.
 *
 * Routing rules:
 * - OC emitida → empreendimento space + coordenação
 * - Correção solicitada (by backoffice) → empreendimento space + coordenação
 * - Nova entrada (recebido) → backoffice + coordenação
 * - Solicitação corrigida (by user) → backoffice + coordenação
 */
async function getTargetSpaces(
  supabase: any,
  empreendimento: string | null,
  tipo: string,
): Promise<string[]> {
  const coordenacaoSpace = Deno.env.get('GCHAT_SPACE_NAME')

  const { data: spaces } = await supabase
    .from('gchat_spaces')
    .select('space_name, empreendimento')
    .eq('active', true)

  const targets = new Set<string>()

  // Coordenação always receives everything
  if (coordenacaoSpace) targets.add(coordenacaoSpace)

  if (!spaces || spaces.length === 0) return Array.from(targets)

  if (tipo === 'nova_entrada' || tipo === 'solicitacao_corrigida') {
    // → Backoffice space (empreendimento IS NULL)
    for (const s of spaces) {
      if (!s.empreendimento) targets.add(s.space_name)
    }
  } else {
    // OC or correction → empreendimento space
    if (empreendimento) {
      for (const s of spaces) {
        if (s.empreendimento === empreendimento) targets.add(s.space_name)
      }
    }
  }

  return Array.from(targets)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { tipo, protocolo, numeros_oc, valor, descricao, empreendimento, fornecedor_razao, solicitacao_id, motivo, status } = body

    const targetSpaces = await getTargetSpaces(supabase, empreendimento, tipo)

    // === NOVA ENTRADA (new request received) ===
    if (tipo === 'nova_entrada') {
      const empLabel = EMP_LABELS[empreendimento] || empreendimento || ''
      const valorFormatted = valor
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
        : ''

      const card = {
        cardsV2: [{
          cardId: `nova-${protocolo}`,
          card: {
            header: {
              title: `📥 Nova Solicitação — #${protocolo}`,
              subtitle: empLabel,
            },
            sections: [
              {
                widgets: [
                  { decoratedText: { topLabel: 'Empreendimento', text: empLabel, startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' } } },
                  ...(valorFormatted ? [{ decoratedText: { topLabel: 'Valor', text: `<b>${valorFormatted}</b>`, startIcon: { knownIcon: 'DOLLAR' } } }] : []),
                  ...(descricao ? [{ textParagraph: { text: `<font size=1 color="#666">📝 ${descricao.substring(0, 200)}${descricao.length > 200 ? '...' : ''}</font>` } }] : []),
                ],
              },
              { widgets: [{ buttonList: { buttons: [{ text: '🔗 Abrir no Sistema', onClick: { openLink: { url: 'https://megas.lovable.app' } } }] } }] },
            ],
          },
        }],
      }

      for (const spaceName of targetSpaces) {
        try { await sendGChatMessageAuth(card, spaceName) } catch (e) { console.error(`Failed nova_entrada to ${spaceName}:`, e) }
      }

      return new Response(JSON.stringify({ success: true, tipo: 'nova_entrada', spacesSent: targetSpaces.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === SOLICITAÇÃO CORRIGIDA (user fixed and resubmitted) ===
    if (tipo === 'solicitacao_corrigida') {
      const card = {
        cardsV2: [{
          cardId: `corrigida-${protocolo}`,
          card: {
            header: {
              title: `✅ Solicitação Corrigida — #${protocolo}`,
              subtitle: EMP_LABELS[empreendimento] || empreendimento || '',
            },
            sections: [
              {
                widgets: [
                  { decoratedText: { topLabel: 'Status', text: `<b><font color="#43A047">Corrigida e reenviada</font></b>`, startIcon: { knownIcon: 'TICKET' } } },
                  ...(descricao ? [{ textParagraph: { text: `<font size=1 color="#666">📝 ${descricao.substring(0, 200)}${descricao.length > 200 ? '...' : ''}</font>` } }] : []),
                ],
              },
              { widgets: [{ buttonList: { buttons: [{ text: '🔗 Abrir no Sistema', onClick: { openLink: { url: 'https://megas.lovable.app' } } }] } }] },
            ],
          },
        }],
      }

      for (const spaceName of targetSpaces) {
        try { await sendGChatMessageAuth(card, spaceName) } catch (e) { console.error(`Failed corrigida to ${spaceName}:`, e) }
      }

      return new Response(JSON.stringify({ success: true, tipo: 'solicitacao_corrigida', spacesSent: targetSpaces.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === CORRECTION REQUESTED (backoffice asks for fix) ===
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
              subtitle: EMP_LABELS[empreendimento] || empreendimento || '',
            },
            sections: [
              {
                widgets: [
                  { decoratedText: { topLabel: 'Status', text: `<b><font color="#D32F2F">${status || 'Correção Necessária'}</font></b>`, startIcon: { knownIcon: 'TICKET' } } },
                  { decoratedText: { topLabel: 'Motivo', text: motivo || 'Sem motivo informado', startIcon: { knownIcon: 'EDIT' }, wrapText: true } },
                  ...(descResumo ? [{ textParagraph: { text: `<font size=1 color="#666">📝 ${descResumo}</font>` } }] : []),
                ],
              },
              { widgets: [{ buttonList: { buttons: [{ text: '🔗 Abrir no Sistema', onClick: { openLink: { url: 'https://megas.lovable.app' } } }] } }] },
            ],
          },
        }],
      }

      for (const spaceName of targetSpaces) {
        try { await sendGChatMessageAuth(correctionCard, spaceName) } catch (e) { console.error(`Failed correcao to ${spaceName}:`, e) }
      }

      return new Response(JSON.stringify({ success: true, tipo: 'correcao', spacesSent: targetSpaces.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === OC NOTIFICATION (default) ===
    if (!protocolo || !numeros_oc) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const valorFormatted = valor
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
      : 'N/A'

    const descricaoResumo = descricao && descricao.length > 300
      ? `${descricao.substring(0, 300)}...`
      : (descricao || 'N/A')

    const sections: any[] = []

    sections.push({
      widgets: [
        { decoratedText: { topLabel: 'Número(s) da OC', text: `<b>${numeros_oc}</b>`, startIcon: { knownIcon: 'DESCRIPTION' } } },
        { decoratedText: { topLabel: 'Empreendimento', text: EMP_LABELS[empreendimento] || empreendimento || 'N/A', startIcon: { knownIcon: 'HOTEL_ROOM_TYPE' } } },
        { decoratedText: { topLabel: 'Valor', text: `<b>${valorFormatted}</b>`, startIcon: { knownIcon: 'DOLLAR' } } },
        ...(fornecedor_razao ? [{ decoratedText: { topLabel: 'Fornecedor', text: fornecedor_razao, startIcon: { knownIcon: 'MEMBERSHIP' } } }] : []),
      ],
    })

    sections.push({
      header: '📝 Descrição',
      collapsible: descricaoResumo.length > 150,
      widgets: [{ textParagraph: { text: descricaoResumo } }],
    })

    let pdfUrl: string | null = null
    if (solicitacao_id) {
      try {
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
            .createSignedUrl(docs[0].storage_path, 86400)
          if (signedUrlData?.signedUrl) pdfUrl = signedUrlData.signedUrl
        }
      } catch (e) {
        console.error('PDF lookup error (non-fatal):', e)
      }
    }

    const buttons: any[] = [
      { text: '🔗 Abrir no Sistema', onClick: { openLink: { url: 'https://megas.lovable.app' } } },
    ]
    if (pdfUrl) {
      buttons.push({ text: '📄 Baixar PDF (válido 24h)', onClick: { openLink: { url: pdfUrl } } })
    }
    sections.push({ widgets: [{ buttonList: { buttons } }] })

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

    for (const spaceName of targetSpaces) {
      try { await sendGChatMessageAuth(cardPayload, spaceName) } catch (e) { console.error(`Failed OC to ${spaceName}:`, e) }
    }

    return new Response(JSON.stringify({ success: true, pdfIncluded: !!pdfUrl, spacesSent: targetSpaces.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('GChat OC notify error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
