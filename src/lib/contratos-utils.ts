export const EMPREENDIMENTO_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
};

export type Situacao = 'vigente' | 'a_vencer' | 'vencido' | 'indeterminado';

export const SITUACAO_META: Record<Situacao, { label: string; intent: 'success' | 'warning' | 'danger' | 'info' }> = {
  vigente: { label: 'Vigente', intent: 'success' },
  a_vencer: { label: 'A vencer', intent: 'warning' },
  vencido: { label: 'Vencido', intent: 'danger' },
  indeterminado: { label: 'Indeterminado', intent: 'info' },
};

export function getSituacao(c: { indeterminado?: boolean | null; data_fim?: string | null }): Situacao {
  if (c.indeterminado || !c.data_fim) return 'indeterminado';
  const fim = new Date(`${c.data_fim}T12:00:00`);
  const dias = Math.floor((fim.getTime() - Date.now()) / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= 90) return 'a_vencer';
  return 'vigente';
}

export const moeda = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
