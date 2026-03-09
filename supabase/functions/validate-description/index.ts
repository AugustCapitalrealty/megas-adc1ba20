import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 20 requests per minute per IP
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT, RATE_WINDOW_MS);
  
  if (!rateLimitResult.allowed) {
    console.log(`[validate-description] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não está configurada');
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta descrição de solicitação:\n\n"${descricao}"` }
        ],
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
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ isVague: false, suggestion: '', error: 'Payment required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ isVague: false, suggestion: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response content:', content);

    // Parse the JSON response from the AI
    try {
      // Remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      }
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      const result = JSON.parse(jsonContent);
      
      return new Response(
        JSON.stringify({
          isVague: Boolean(result.isVague),
          suggestion: result.suggestion || ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', content);
      // If we can't parse, assume description is okay
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
