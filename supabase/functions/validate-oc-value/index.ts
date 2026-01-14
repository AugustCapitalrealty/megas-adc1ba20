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
  rawText?: string;
}

/**
 * Extracts monetary values from text using multiple patterns
 */
function extractValorFromText(text: string): number | null {
  console.log('[validate-oc-value] Extracting value from text...');
  
  // Pattern 1: "TOTAL GERAL OC:" followed by value
  const totalGeralPattern = /TOTAL\s*GERAL\s*OC[:\s]*R?\$?\s*([0-9.,]+)/i;
  let match = text.match(totalGeralPattern);
  if (match) {
    console.log('[validate-oc-value] Found TOTAL GERAL OC pattern:', match[1]);
    return parseMonetaryValue(match[1]);
  }

  // Pattern 2: "TOTAL:" followed by value (last occurrence often is the total)
  const totalPattern = /TOTAL[:\s]*R?\$?\s*([0-9.,]+)/gi;
  const totalMatches = [...text.matchAll(totalPattern)];
  if (totalMatches.length > 0) {
    // Get the last TOTAL match (usually the grand total)
    const lastMatch = totalMatches[totalMatches.length - 1];
    console.log('[validate-oc-value] Found TOTAL pattern (last):', lastMatch[1]);
    return parseMonetaryValue(lastMatch[1]);
  }

  // Pattern 3: "VALOR TOTAL" followed by value
  const valorTotalPattern = /VALOR\s*TOTAL[:\s]*R?\$?\s*([0-9.,]+)/i;
  match = text.match(valorTotalPattern);
  if (match) {
    console.log('[validate-oc-value] Found VALOR TOTAL pattern:', match[1]);
    return parseMonetaryValue(match[1]);
  }

  // Pattern 4: Look for currency values preceded by R$
  const currencyPattern = /R\$\s*([0-9.,]+)/g;
  const currencyMatches = [...text.matchAll(currencyPattern)];
  if (currencyMatches.length > 0) {
    // Get the last R$ value (usually the total)
    const lastMatch = currencyMatches[currencyMatches.length - 1];
    console.log('[validate-oc-value] Found R$ pattern (last):', lastMatch[1]);
    return parseMonetaryValue(lastMatch[1]);
  }

  console.log('[validate-oc-value] No value pattern found');
  return null;
}

/**
 * Parses a Brazilian monetary string to a number
 * Examples: "257,96" -> 257.96, "1.234,56" -> 1234.56
 */
function parseMonetaryValue(value: string): number | null {
  try {
    // Remove spaces
    let cleaned = value.trim();
    
    // Brazilian format: 1.234,56 (dot for thousands, comma for decimals)
    // Check if it has both comma and dot
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Remove thousand separators (dots) and replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // Only comma - it's the decimal separator
      cleaned = cleaned.replace(',', '.');
    }
    // If only dot, assume it's already in correct format
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    
    console.log('[validate-oc-value] Parsed value:', value, '->', parsed);
    return Math.round(parsed * 100) / 100; // Round to 2 decimal places
  } catch (e) {
    console.error('[validate-oc-value] Error parsing value:', e);
    return null;
  }
}

/**
 * Simple text extraction from PDF by looking for text content in the raw bytes
 * This is a fallback method that works with most PDFs containing text
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(bytes);
  
  // Look for text between parentheses (PDF text objects)
  const textParts: string[] = [];
  const textRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = textRegex.exec(content)) !== null) {
    // Clean up escape sequences
    let text = match[1]
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    textParts.push(text);
  }
  
  // Also look for BT...ET blocks with Tj/TJ operators
  const btRegex = /BT\s*([\s\S]*?)\s*ET/g;
  while ((match = btRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract text from Tj operator
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
    // Extract text from TJ operator (array of strings)
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const innerTexts = arrayContent.match(/\(([^)]*)\)/g);
      if (innerTexts) {
        for (const t of innerTexts) {
          textParts.push(t.slice(1, -1));
        }
      }
    }
  }
  
  return textParts.join(' ');
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

    console.log('[validate-oc-value] Expected value:', valorEsperado);

    // Decode base64 to bytes
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[validate-oc-value] PDF size:', bytes.length, 'bytes');

    // Extract text from PDF
    const extractedText = extractTextFromPdfBytes(bytes);
    console.log('[validate-oc-value] Extracted text length:', extractedText.length);
    console.log('[validate-oc-value] Extracted text sample:', extractedText.substring(0, 500));

    // Extract value from text
    const valorPdf = extractValorFromText(extractedText);
    console.log('[validate-oc-value] Extracted PDF value:', valorPdf);

    // Calculate result
    const valorEsperadoNum = typeof valorEsperado === 'string' 
      ? parseFloat(valorEsperado) 
      : valorEsperado;

    let result: ValidationResult;

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
