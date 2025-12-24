import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descricao } = await req.json();

    if (!descricao || descricao.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          isVague: true, 
          suggestion: 'A descrição está muito curta. Descreva com mais detalhes o que será adquirido ou contratado.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY não está configurada');
      return new Response(
        JSON.stringify({ isVague: false, suggestion: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um assistente especializado em análise de descrições de solicitações de compras e contratações.
Sua tarefa é avaliar se a descrição fornecida é clara, específica e compreensível para processamento administrativo.

Uma boa descrição deve conter:
- O QUE será adquirido ou contratado (produto/serviço específico)
- QUANTIDADE (quando aplicável)
- PROPÓSITO ou MOTIVO da aquisição/contratação
- LOCAL ou ÁREA onde será utilizado (quando relevante)

Exemplos de descrições VAGAS:
- "material de escritório"
- "serviço de manutenção"
- "equipamentos"
- "compra de materiais"

Exemplos de descrições CLARAS:
- "Aquisição de 4 luminárias LED 60x60cm para substituição das queimadas na portaria e sala administrativa"
- "Contratação de serviço de reparo do ar-condicionado split 12000 BTUs da sala de reuniões que não está refrigerando"
- "Compra de 2 resmas de papel A4 e 10 canetas esferográficas azuis para o setor administrativo"

Responda APENAS com um JSON válido no formato:
{"isVague": boolean, "suggestion": "string com sugestão de melhoria se isVague for true, ou string vazia se for false"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Analise esta descrição de solicitação:\n\n"${descricao}"` }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ isVague: false, suggestion: '', error: 'Rate limit exceeded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ isVague: false, suggestion: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response content:', content);

    // Parse the JSON response from Gemini
    try {
      const result = JSON.parse(content.trim());
      
      return new Response(
        JSON.stringify({
          isVague: Boolean(result.isVague),
          suggestion: result.suggestion || ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ isVague: false, suggestion: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in validate-description:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ isVague: false, suggestion: '', error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
