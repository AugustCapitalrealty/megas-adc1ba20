export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const FREQUENCIAS = [
  'MENSAL', 'QUINZENAL', 'BIMESTRAL', 'TRIMESTRAL', 'QUADRIMESTRAL',
  'SEMESTRAL', 'ANUAL', 'SOB DEMANDA',
];

export const INDICES_REAJUSTE = ['IPCA', 'IGP-M', 'Aditivo', 'Convenção'];

export const TIPOS_CONTRATACAO = ['Especializada', 'Capacitada'];

export type CriticidadeDD = 'Alta' | 'Média' | 'Baixa' | 'Pendente' | 'Não elegível';

/** Regra sugerida: vencida = Pendente, ≤30d = Alta, ≤90d = Média, senão Baixa. */
export function calcularCriticidadeDD(dataVencimento: string | null): CriticidadeDD {
  if (!dataVencimento) return 'Não elegível';
  const venc = new Date(`${dataVencimento}T12:00:00`);
  const dias = Math.ceil((venc.getTime() - Date.now()) / 86400000);
  if (dias < 0) return 'Pendente';
  if (dias <= 30) return 'Alta';
  if (dias <= 90) return 'Média';
  return 'Baixa';
}

export function criticidadeIntent(
  c: CriticidadeDD,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (c === 'Alta' || c === 'Pendente') return 'destructive';
  if (c === 'Média') return 'default';
  if (c === 'Baixa') return 'secondary';
  return 'outline';
}

export function mesesEntre(inicio: string, fim: string): number | null {
  if (!inicio || !fim) return null;
  const i = new Date(`${inicio}T12:00:00`);
  const f = new Date(`${fim}T12:00:00`);
  const meses = (f.getFullYear() - i.getFullYear()) * 12 + (f.getMonth() - i.getMonth());
  return Math.max(1, meses);
}

export function calcularValorGlobal(
  valorMensal: number,
  tipoPrazo: 'determinado' | 'indeterminado',
  inicio: string,
  fim: string,
): number {
  if (!valorMensal) return 0;
  if (tipoPrazo === 'indeterminado') return valorMensal * 12;
  const meses = mesesEntre(inicio, fim);
  return meses ? valorMensal * meses : 0;
}
