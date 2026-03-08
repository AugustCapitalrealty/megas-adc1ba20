import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

/**
 * Formata uma data no fuso horário de Brasília (America/Sao_Paulo).
 * Substitui `format(new Date(date), pattern, { locale: ptBR })` do date-fns.
 */
export function formatBR(date: Date | string, pattern: string): string {
  return formatInTimeZone(
    typeof date === 'string' ? new Date(date) : date,
    TZ,
    pattern,
    { locale: ptBR }
  );
}

/**
 * Formata data para exibição localizada (pt-BR) no fuso de Brasília.
 * Substitui `new Date().toLocaleDateString('pt-BR')`.
 */
export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { timeZone: TZ });
}

export { TZ as TIMEZONE_BR };
