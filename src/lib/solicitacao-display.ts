import { differenceInDays, differenceInHours } from 'date-fns';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';

/**
 * Returns a non-empty supplier display name, treating empty/whitespace strings
 * as "missing". Prefers nome_fantasia, falls back to razao_social.
 */
export function getFornecedorDisplay(
  razaoSocial?: string | null,
  nomeFantasia?: string | null,
): string | null {
  const fantasia = (nomeFantasia ?? '').trim();
  if (fantasia) return fantasia;
  const razao = (razaoSocial ?? '').trim();
  if (razao) return razao;
  return null;
}

/** Formats an empreendimento enum into its human label, with safe fallback. */
export function formatEmpreendimento(emp?: string | null): string {
  if (!emp) return '—';
  const label = (EMPREENDIMENTO_LABELS as Record<string, string>)[emp];
  if (label) return label;
  // fallback: "mega_canoas" -> "Mega Canoas"
  return emp
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Returns a compact "1h" / "3d" tone for SLA, plus an `atrasado` flag. */
export function getSlaTone(
  createdAt: string | Date,
  status: string,
  dataAprovacao?: string | null,
): { tempo: string; atrasado: boolean } {
  const dias = differenceInDays(new Date(), new Date(createdAt));
  const horas = differenceInHours(new Date(), new Date(createdAt));
  const tempo = dias === 0 ? `${Math.max(horas, 0)}h` : `${dias}d`;
  const atrasadoAnalise = dias > 5 && ['recebido', 'em_analise'].includes(status);
  let diasApr: number | null = null;
  if (dataAprovacao) diasApr = differenceInDays(new Date(), new Date(dataAprovacao));
  const atrasadoEmissao =
    diasApr !== null && diasApr > 3 && ['aprovado', 'em_processamento'].includes(status);
  return { tempo, atrasado: atrasadoAnalise || atrasadoEmissao };
}
