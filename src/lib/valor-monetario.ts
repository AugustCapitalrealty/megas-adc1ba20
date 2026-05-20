/**
 * Utilitários puros para conversão de valores monetários.
 *
 * O input "valor" no formulário guarda CENTAVOS como string de dígitos
 * (ex.: "100000" representa R$ 1.000,00). Esta é a forma canônica.
 *
 * Estas funções centralizam a conversão entre:
 *  - número em reais (como vem do Postgres: `numeric`)
 *  - string de centavos (formato interno do input)
 *  - string formatada em BRL
 */

/**
 * Converte um valor (número em reais, string formatada, ou null/undefined)
 * para a string de centavos usada internamente pelo input.
 *
 * - `1000` (number)   → `"100000"`  (R$ 1.000,00)
 * - `770.37` (number) → `"77037"`
 * - `"1.234,56"`      → `"123456"`
 * - `null`/`undefined`/`NaN` → `""`
 */
export function toCentsString(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else {
    // String: aceita formato BR (1.234,56) ou EN (1234.56) ou só dígitos
    const trimmed = String(value).trim();
    if (trimmed === '') return '';
    // Heurística: se tem vírgula, assume BR (ponto = milhar, vírgula = decimal)
    if (trimmed.includes(',')) {
      const normalized = trimmed.replace(/\./g, '').replace(',', '.');
      num = parseFloat(normalized);
    } else {
      num = parseFloat(trimmed);
    }
  }

  if (!Number.isFinite(num) || Number.isNaN(num)) return '';
  if (num < 0) num = 0;

  // Math.round evita erros de ponto flutuante (ex.: 0.1 + 0.2 = 0.30000000000000004)
  const cents = Math.round(num * 100);
  return String(cents);
}

/**
 * Converte a string de centavos (formato interno) de volta para reais.
 * Idempotente: `fromCentsString("100000")` → 1000.
 */
export function fromCentsString(input: string | null | undefined): number {
  if (!input) return 0;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return 0;
  const n = parseFloat(digits) / 100;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formata um número em reais usando o locale brasileiro.
 */
export function formatBRL(value: number): string {
  if (!Number.isFinite(value)) value = 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}