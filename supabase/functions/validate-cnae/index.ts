import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 20 requests per minute per IP
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;

interface CNAEInput {
  descricao: string;
  cnae_principal_codigo: number;
  cnae_principal_descricao: string;
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
}

interface ValidationResult {
  status: 'compativel' | 'incompativel' | 'insuficiente';
  score_confianca: number;
  justificativa_curta: string;
  itens_extraidos: string[];
  cnaes_considerados: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT, RATE_WINDOW_MS);
  
  if (!rateLimitResult.allowed) {
    console.log(`[validate-cnae] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { descricao, cnae_principal_codigo, cnae_principal_descricao, cnaes_secundarios }: CNAEInput = await req.json();

    // Validação básica
    if (!descricao || descricao.length < 20) {
      return new Response(JSON.stringify({
        status: 'insuficiente',
        score_confianca: 0,
        justificativa_curta: 'Descrição muito curta para análise.',
        itens_extraidos: [],
        cnaes_considerados: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!cnae_principal_codigo || !cnae_principal_descricao) {
      return new Response(JSON.stringify({
        status: 'insuficiente',
        score_confianca: 0,
        justificativa_curta: 'CNAE do fornecedor não disponível para análise.',
        itens_extraidos: [],
        cnaes_considerados: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(JSON.stringify({
        status: 'insuficiente',
        score_confianca: 0,
        justificativa_curta: 'Serviço de validação indisponível.',
        itens_extraidos: [],
        cnaes_considerados: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Montar lista de CNAEs
    const cnaesSecundariosFormatted = (cnaes_secundarios || [])
      .map(c => `${c.codigo} - ${c.descricao}`)
      .join('\n');

    const systemPrompt = `Você é um especialista em análise de compatibilidade entre descrições de compras/contratações empresariais e CNAEs (Classificação Nacional de Atividades Econômicas) de fornecedores brasileiros.

Sua tarefa é analisar se a descrição do serviço/produto solicitado é compatível com as atividades permitidas pelo CNAE do fornecedor.

Regras de classificação:
- COMPATIVEL: A descrição claramente se enquadra no CNAE principal ou em algum dos CNAEs secundários. Exemplos: "instalação elétrica" para CNAE de eletricista, "manutenção de ar condicionado" para CNAE de refrigeração.
- INCOMPATIVEL: A descrição parece estar fora do escopo de atuação do fornecedor. Exemplos: contratar pintura de um fornecedor de TI, contratar serviços de jardinagem de uma empresa de contabilidade.
- INSUFICIENTE: A descrição é muito vaga, genérica ou técnica demais para determinar compatibilidade. Exemplos: "serviços diversos", "materiais", "reparo geral".

Seja pragmático: muitas empresas têm CNAEs secundários amplos. Se houver razoável possibilidade de compatibilidade, classifique como COMPATIVEL.

IMPORTANTE: Retorne APENAS usando a função fornecida, não adicione texto explicativo fora da função.`;

    const userPrompt = `Analise a compatibilidade:

**CNAE Principal:** ${cnae_principal_codigo} - ${cnae_principal_descricao}

**CNAEs Secundários:**
${cnaesSecundariosFormatted || 'Nenhum'}

**Descrição da Solicitação:**
"${descricao}"

Avalie e retorne o resultado usando a função validate_cnae_compatibility.`;

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'validate_cnae_compatibility',
              description: 'Retorna o resultado da validação de compatibilidade entre descrição e CNAE.',
              parameters: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['compativel', 'incompativel', 'insuficiente'],
                    description: 'Resultado da validação'
                  },
                  score_confianca: {
                    type: 'number',
                    description: 'Score de confiança de 0 a 100'
                  },
                  justificativa_curta: {
                    type: 'string',
                    description: 'Justificativa em até 2 linhas explicando o resultado'
                  },
                  itens_extraidos: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Palavras-chave extraídas da descrição (ex: instalação elétrica, manutenção, pintura)'
                  },
                  cnaes_considerados: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Códigos CNAE considerados na análise (principal e/ou secundários)'
                  }
                },
                required: ['status', 'score_confianca', 'justificativa_curta', 'itens_extraidos', 'cnaes_considerados'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'validate_cnae_compatibility' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Limite de validações atingido. Tente novamente em alguns segundos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required',
          message: 'Créditos insuficientes para validação.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'insuficiente',
        score_confianca: 0,
        justificativa_curta: 'Não foi possível validar no momento.',
        itens_extraidos: [],
        cnaes_considerados: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extrair resultado do tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      try {
        const result: ValidationResult = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (parseError) {
        console.error('Erro ao parsear resultado:', parseError);
      }
    }

    // Fallback se não conseguir extrair
    return new Response(JSON.stringify({
      status: 'insuficiente',
      score_confianca: 0,
      justificativa_curta: 'Não foi possível processar a resposta da validação.',
      itens_extraidos: [],
      cnaes_considerados: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na validação CNAE:', error);
    return new Response(JSON.stringify({
      status: 'insuficiente',
      score_confianca: 0,
      justificativa_curta: 'Erro interno na validação.',
      itens_extraidos: [],
      cnaes_considerados: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
