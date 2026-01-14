import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  match: boolean;
  valorPdf: number | null;
  valorEsperado: number;
  diferenca: number | null;
}

/**
 * Parses a Brazilian monetary string to a number
 * Examples: "257,96" -> 257.96, "1.234,56" -> 1234.56, "R$ 257,96" -> 257.96
 */
function parseMonetaryValue(value: string): number | null {
  if (!value) return null;
  
  try {
    // Remove R$, spaces, and other non-numeric chars except . and ,
    let cleaned = value.replace(/[R$\s]/g, '').trim();
    
    // Brazilian format: 1.234,56 (dot for thousands, comma for decimals)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Remove thousand separators (dots) and replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // Only comma - it's the decimal separator
      cleaned = cleaned.replace(',', '.');
    }
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    
    return Math.round(parsed * 100) / 100; // Round to 2 decimal places
  } catch (e) {
    console.error('[validate-oc-value] Error parsing value:', e);
    return null;
  }
}

serve(async (req) => {
  console.log('[validate-oc-value] Request received:', req.method);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, valorEsperado } = await req.json();

    if (!pdfBase64) {
      console.error('[validate-oc-value] No PDF provided');
      return new Response(
        JSON.stringify({ error: 'PDF não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (valorEsperado === undefined || valorEsperado === null) {
      console.error('[validate-oc-value] No expected value provided');
      return new Response(
        JSON.stringify({ error: 'Valor esperado não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[validate-oc-value] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[validate-oc-value] Expected value:', valorEsperado);
    console.log('[validate-oc-value] PDF base64 length:', pdfBase64.length);

    // Use AI vision to extract the total value from the PDF (as image)
    const systemPrompt = `Você é um especialista em leitura de documentos de Ordem de Compra (OC).
Sua tarefa é extrair o VALOR TOTAL da OC do documento fornecido.

INSTRUÇÕES:
1. Procure por "TOTAL GERAL OC" ou "TOTAL" no documento
2. Extraia APENAS o valor numérico total em reais
3. Retorne o valor no formato brasileiro (ex: 257,96)
4. Se não encontrar, retorne "NAO_ENCONTRADO"

IMPORTANTE: Retorne APENAS o valor numérico (ex: "257,96") ou "NAO_ENCONTRADO". Nada mais.`;

    const userPrompt = `Analise esta Ordem de Compra (OC) e extraia o VALOR TOTAL.
Procure especificamente por "TOTAL GERAL OC:" ou similar.
Retorne APENAS o valor numérico (ex: "257,96") ou "NAO_ENCONTRADO".`;

    console.log('[validate-oc-value] Calling AI Gateway for OCR...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:application/pdf;base64,${pdfBase64}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[validate-oc-value] AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro na análise do documento',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('[validate-oc-value] AI response:', JSON.stringify(aiData));

    const extractedValue = aiData.choices?.[0]?.message?.content?.trim() || '';
    console.log('[validate-oc-value] Extracted value from AI:', extractedValue);

    // Parse the extracted value
    const valorEsperadoNum = typeof valorEsperado === 'string' 
      ? parseFloat(valorEsperado) 
      : valorEsperado;

    let result: ValidationResult;

    if (!extractedValue || extractedValue === 'NAO_ENCONTRADO' || extractedValue.toUpperCase().includes('NAO')) {
      console.log('[validate-oc-value] Value not found in document');
      result = {
        match: false,
        valorPdf: null,
        valorEsperado: valorEsperadoNum,
        diferenca: null,
      };
    } else {
      const valorPdf = parseMonetaryValue(extractedValue);
      console.log('[validate-oc-value] Parsed PDF value:', valorPdf);

      if (valorPdf === null) {
        result = {
          match: false,
          valorPdf: null,
          valorEsperado: valorEsperadoNum,
          diferenca: null,
        };
      } else {
        // Allow tolerance of R$ 0.01 for rounding differences
        const diferenca = Math.round((valorPdf - valorEsperadoNum) * 100) / 100;
        const match = Math.abs(diferenca) <= 0.01;

        result = {
          match,
          valorPdf,
          valorEsperado: valorEsperadoNum,
          diferenca: match ? 0 : diferenca,
        };
      }
    }

    console.log('[validate-oc-value] Validation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-oc-value] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
