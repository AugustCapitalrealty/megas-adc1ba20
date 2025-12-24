import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY não configurada');
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

IMPORTANTE: Responda APENAS com um JSON válido no formato especificado, sem texto adicional.`;

    const userPrompt = `Analise a compatibilidade:

**CNAE Principal:** ${cnae_principal_codigo} - ${cnae_principal_descricao}

**CNAEs Secundários:**
${cnaesSecundariosFormatted || 'Nenhum'}

**Descrição da Solicitação:**
"${descricao}"

Retorne um JSON com:
{
  "status": "compativel" | "incompativel" | "insuficiente",
  "score_confianca": número de 0 a 100,
  "justificativa_curta": "texto explicando o resultado em até 2 linhas",
  "itens_extraidos": ["palavras-chave extraídas da descrição"],
  "cnaes_considerados": ["códigos CNAE considerados"]
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
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
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Limite de validações atingido. Tente novamente em alguns segundos.' 
        }), {
          status: 429,
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
    console.log('Gemini Response:', JSON.stringify(data, null, 2));

    // Extrair resultado da resposta do Gemini
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const result: ValidationResult = JSON.parse(content.trim());
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (parseError) {
      console.error('Erro ao parsear resultado:', parseError, 'Content:', content);
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
