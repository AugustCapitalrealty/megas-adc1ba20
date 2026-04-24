import type { Empreendimento } from '@/types';

/**
 * Mapeia uma string livre de empreendimento (Projuris, Fluig, etc.)
 * para o enum interno `Empreendimento` quando possível.
 *
 * Reconhecidos:
 *   "Mega Curitiba", "MEGA CENTRO LOGÍSTICO CURITIBA"  -> 'mega_curitiba'
 *   "Mega Itajaí", "MEGA CENTRO LOGÍSTICO ITAJAÍ"      -> 'mega_itajai'
 *   "Mega Esteio", "Armazém Isolado Esteio"            -> 'mega_esteio'
 *   "Mega Canoas"                                       -> 'mega_canoas'
 */
export function mapEmpreendimentoLivre(raw: string | null | undefined): Empreendimento | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('canoas')) return 'mega_canoas';
  if (lower.includes('curitiba')) return 'mega_curitiba';
  if (lower.includes('itaja')) return 'mega_itajai';
  if (lower.includes('esteio')) return 'mega_esteio';
  return null;
}

/**
 * True se o usuário pode visualizar um item cujo empreendimento é uma
 * string livre (registros importados de sistemas externos).
 *
 * - `hasAllAccess` libera tudo (perfil "todos").
 * - Itens cujo empreendimento não casa com nenhum enum conhecido NÃO são
 *   exibidos para usuários sem acesso total — evita vazamento por dados
 *   desconhecidos / inesperados.
 */
export function canViewEmpreendimentoLivre(
  raw: string | null | undefined,
  userEmpreendimentos: Empreendimento[] | string[],
  hasAllAccess: boolean
): boolean {
  if (hasAllAccess) return true;
  const mapped = mapEmpreendimentoLivre(raw);
  if (!mapped) return false;
  return (userEmpreendimentos as string[]).includes(mapped);
}
