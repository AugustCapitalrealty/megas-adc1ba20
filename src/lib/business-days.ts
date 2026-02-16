import { addDays, isSameDay, isWeekend, format } from 'date-fns';

/**
 * Calculates the number of business days between two dates,
 * excluding weekends (Saturday/Sunday) and holidays.
 *
 * @param inicio - Start date (inclusive)
 * @param fim - End date (inclusive)
 * @param feriados - Array of holiday date strings in 'YYYY-MM-DD' format
 * @returns Number of business days (0 if same day)
 */
export function calcularDiasUteis(
  inicio: Date,
  fim: Date,
  feriados: string[] = [],
): number {
  // Normalize to start of day
  const startDate = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const endDate = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());

  if (endDate <= startDate) return 0;

  const feriadoSet = new Set(feriados);
  let count = 0;
  let current = addDays(startDate, 1); // Start counting from next day

  while (current <= endDate) {
    if (!isWeekend(current) && !feriadoSet.has(format(current, 'yyyy-MM-dd'))) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
}

/**
 * Checks if two dates are the same calendar day.
 */
export function isMesmoDia(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
