import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte string de data (YYYY-MM-DD) para Date local sem problema de timezone.
 * Adiciona T12:00:00 para garantir que fique no mesmo dia em qualquer timezone.
 */
export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Adiciona T12:00:00 para garantir que fique no mesmo dia em qualquer timezone
  return new Date(dateStr + 'T12:00:00');
}

/**
 * Formata Date local para string YYYY-MM-DD (para inputs e banco)
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
