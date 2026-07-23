/**
 * Pure business rules for a Solicitação.
 * Extracted from the form hook so they can be unit-tested
 * and reused by Backoffice/Admin views without React state.
 *
 * Source of truth (hard requirements):
 *  - OC: valor ≤ 1000 OR tipo ≠ "servicos"
 *  - AC: valor > 1000 AND tipo === "servicos"
 *  - Instrumento jurídico (apenas AC):
 *      obra_civil           → contrato_empreitada
 *      altura_risco/fossa/preco_variavel → termo_contratacao
 *      valor ≥ 70000        → contrato_prestacao
 *      valor ≥ 10000        → termo_contratacao
 *      else                 → oc
 *  - 3 CNPJs obrigatórios para AC, exceto emergencial
 *  - Due Diligence para AC com valor ≥ 50.000
 *  - Retenção técnica:
 *      contrato_empreitada → 6%, 180 dias
 *      AC ≥ 150.000 com prazo > 30 dias → 6%, 90 dias
 */

export type InstrumentoJuridico =
  | 'oc'
  | 'termo_contratacao'
  | 'contrato_prestacao'
  | 'contrato_empreitada';

/**
 * ID canônico do cliente "Módulo Vago" (compartilhado entre todos os
 * empreendimentos). Como não é um cliente real, solicitações vinculadas a
 * ele não exigem o anexo `comunicado_cliente`.
 */
export const MODULO_VAGO_CLIENTE_ID = '83739dae-d131-41df-8c15-a6fa1cead116';

export interface ClassificacaoInput {
  valor: number;
  tipoContratacao: string; // '' | 'servicos' | 'material_construcao' | ...
  emergencial?: boolean;
  naturezaObraCivil?: boolean;
  naturezaAlturaRisco?: boolean;
  naturezaFossaFiltro?: boolean;
  naturezaPrecoVariavel?: boolean;
  /** ISO date string ou Date (opcional, usado p/ retenção técnica) */
  dataInicio?: string | Date | null;
  dataFim?: string | Date | null;
}

export interface ClassificacaoResultado {
  isOC: boolean;
  isAC: boolean;
  isOCAbove1000: boolean;
  instrumentoJuridico: InstrumentoJuridico;
  requerFluxoJuridico: boolean;
  requerDueDiligence: boolean;
  requerEscopoDetalhado: boolean;
  requires3CNPJs: boolean;
  requerRetencaoTecnica: boolean;
  prazoLiberacaoRetencaoDias: number | null;
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function classificarSolicitacao(input: ClassificacaoInput): ClassificacaoResultado {
  const valor = Number.isFinite(input.valor) ? Math.max(0, input.valor) : 0;
  const tipo = input.tipoContratacao || '';

  const isAC = valor > 1000 && tipo === 'servicos';
  // OC = não-AC, mas só faz sentido com tipo definido. Mantemos compat com o hook:
  // valor ≤ 1000 OU (valor > 1000 e tipo ≠ servicos)
  const isOC = valor <= 1000 || (valor > 1000 && tipo !== 'servicos');
  const isOCAbove1000 = valor > 1000 && tipo !== '' && tipo !== 'servicos';

  let instrumentoJuridico: InstrumentoJuridico = 'oc';
  if (isAC) {
    if (input.naturezaObraCivil) instrumentoJuridico = 'contrato_empreitada';
    else if (
      input.naturezaAlturaRisco ||
      input.naturezaFossaFiltro ||
      input.naturezaPrecoVariavel
    )
      instrumentoJuridico = 'termo_contratacao';
    else if (valor >= 70000) instrumentoJuridico = 'contrato_prestacao';
    else if (valor >= 10000) instrumentoJuridico = 'termo_contratacao';
    else instrumentoJuridico = 'oc';
  }

  const requerFluxoJuridico =
    isAC &&
    (valor >= 10000 ||
      !!input.naturezaObraCivil ||
      !!input.naturezaAlturaRisco ||
      !!input.naturezaFossaFiltro ||
      !!input.naturezaPrecoVariavel);

  const requerDueDiligence = isAC && valor >= 50000;
  const requerEscopoDetalhado = isAC && instrumentoJuridico !== 'oc';
  const requires3CNPJs = isAC && !input.emergencial;

  // Retenção técnica
  let requerRetencaoTecnica = false;
  let prazoLiberacaoRetencaoDias: number | null = null;
  if (instrumentoJuridico === 'contrato_empreitada') {
    requerRetencaoTecnica = true;
    prazoLiberacaoRetencaoDias = 180;
  } else if (isAC && valor >= 150000) {
    const di = toDate(input.dataInicio ?? null);
    const df = toDate(input.dataFim ?? null);
    if (di && df && diffDays(di, df) > 30) {
      requerRetencaoTecnica = true;
      prazoLiberacaoRetencaoDias = 90;
    }
  }

  return {
    isOC,
    isAC,
    isOCAbove1000,
    instrumentoJuridico,
    requerFluxoJuridico,
    requerDueDiligence,
    requerEscopoDetalhado,
    requires3CNPJs,
    requerRetencaoTecnica,
    prazoLiberacaoRetencaoDias,
  };
}

/**
 * Rateio: dado um total e uma lista de pesos (% ou m²),
 * retorna valores absolutos arredondados a 2 casas, ajustando
 * a última parcela para fechar exatamente no total.
 */
export function calcularRateio(total: number, pesos: number[]): number[] {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safePesos = pesos.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const soma = safePesos.reduce((a, b) => a + b, 0);
  if (soma <= 0 || safeTotal <= 0) return safePesos.map(() => 0);

  const valores = safePesos.map((p) => Math.round((safeTotal * p * 100) / soma) / 100);
  const somaValores = valores.reduce((a, b) => a + b, 0);
  const diff = Math.round((safeTotal - somaValores) * 100) / 100;
  if (diff !== 0 && valores.length > 0) {
    valores[valores.length - 1] = Math.round((valores[valores.length - 1] + diff) * 100) / 100;
  }
  return valores;
}

/**
 * Tier de SLA do Backoffice (em horas úteis acumuladas, máx 3 dias úteis).
 */
export type SlaStatus = 'no_prazo' | 'atencao' | 'estourado';

export function classificarSlaBackoffice(diasUteis: number): SlaStatus {
  if (!Number.isFinite(diasUteis) || diasUteis <= 2) return 'no_prazo';
  if (diasUteis <= 3) return 'atencao';
  return 'estourado';
}