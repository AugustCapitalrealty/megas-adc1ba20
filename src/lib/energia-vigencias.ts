// ── Vigências de contrato por módulo dentro de uma competência ──────────────
// Um módulo pode trocar de cliente no meio do mês (ex.: sai dia 25, entra outro
// dia 26). Aqui recortamos todas as vigências que tocam a competência nos
// limites do mês e devolvemos o fator pro-rata (dias do período / dias do mês).
// Dias sem contrato viram um período VAGO.

export interface VigenciaRaw {
  modulo_id: string;
  vigencia_inicio: string;          // 'YYYY-MM-DD'
  vigencia_fim: string | null;
  contrato_id?: string | null;
  contrato: {
    id: string;
    numero_contrato: string | null;
    demanda_contratada_kw: number | string | null;
    cliente_id: string | null;
    ativo: boolean;
  } | null;
}

export interface PeriodoModulo {
  contrato_id: string | null;
  contrato_numero: string | null;
  cliente_id: string | null;
  demanda_contratada_kw: number;
  inicio: string;                   // 'YYYY-MM-DD' (recortado no mês)
  fim: string;                      // 'YYYY-MM-DD' (recortado no mês)
  dias: number;
  fator: number;                    // dias / dias do mês
  parcial: boolean;                 // true quando não cobre o mês inteiro
  label: string;                    // '01/07–25/07 · 25/31 dias'
}

export function diasNoMes(anoMes: string): number {
  const [yy, mm] = anoMes.split('-').map(Number);
  return new Date(yy, mm, 0).getDate();
}

/**
 * Mês de consumo de uma competência.
 * A fatura de junho cobre o consumo de maio → '2026-06' ⇒ '2026-05'.
 * Aritmética pura em string (sem Date) para não sofrer com fuso.
 */
export function mesConsumo(anoMes: string): string {
  const [yy, mm] = String(anoMes || '').split('-').map(Number);
  if (!yy || !mm) return anoMes;
  const y = mm === 1 ? yy - 1 : yy;
  const m = mm === 1 ? 12 : mm - 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Rótulo curto do período de um contrato dentro do mês: 'até 25/05' / 'a partir de 26/05'. */
export function rotuloPeriodo(p: PeriodoModulo, anoMes: string): string {
  const { inicio: mesInicio, fim: mesFim } = limitesCompetencia(anoMes);
  const comecaDepois = p.inicio > mesInicio;
  const terminaAntes = p.fim < mesFim;
  if (comecaDepois && terminaAntes) return `${ddmm(p.inicio)}–${ddmm(p.fim)}`;
  if (comecaDepois) return `a partir de ${ddmm(p.inicio)}`;
  if (terminaAntes) return `até ${ddmm(p.fim)}`;
  return '';
}

export function limitesCompetencia(anoMes: string): { inicio: string; fim: string } {
  const total = diasNoMes(anoMes);
  return { inicio: `${anoMes}-01`, fim: `${anoMes}-${String(total).padStart(2, '0')}` };
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const contarDias = (inicio: string, fim: string) =>
  Math.max(0, Math.round((toDate(fim).getTime() - toDate(inicio).getTime()) / 86400000) + 1);

/**
 * Resolve os períodos de contrato de cada módulo dentro da competência.
 * Retorna sempre pelo menos um período por módulo presente em `moduloIds`
 * (se não houver contrato no mês, um período VAGO cobrindo o mês inteiro).
 */
export function resolverPeriodosPorModulo(
  anoMes: string,
  vinculos: VigenciaRaw[],
  moduloIds: string[],
): Record<string, PeriodoModulo[]> {
  const { inicio: mesInicio, fim: mesFim } = limitesCompetencia(anoMes);
  const totalDias = diasNoMes(anoMes);

  const porModulo = new Map<string, VigenciaRaw[]>();
  for (const v of vinculos) {
    if (!v.contrato?.ativo) continue;
    if (v.vigencia_inicio > mesFim) continue;
    if (v.vigencia_fim && v.vigencia_fim < mesInicio) continue;
    const arr = porModulo.get(v.modulo_id) || [];
    arr.push(v);
    porModulo.set(v.modulo_id, arr);
  }

  const mkVago = (inicio: string, fim: string): PeriodoModulo => {
    const dias = contarDias(inicio, fim);
    const parcial = dias < totalDias;
    return {
      contrato_id: null,
      contrato_numero: null,
      cliente_id: null,
      demanda_contratada_kw: 0,
      inicio, fim, dias,
      fator: totalDias > 0 ? dias / totalDias : 0,
      parcial,
      label: parcial ? `${ddmm(inicio)}–${ddmm(fim)} · ${dias}/${totalDias} dias` : '',
    };
  };

  const out: Record<string, PeriodoModulo[]> = {};

  for (const moduloId of moduloIds) {
    const lista = (porModulo.get(moduloId) || []).slice().sort((a, b) =>
      a.vigencia_inicio < b.vigencia_inicio ? -1 : a.vigencia_inicio > b.vigencia_inicio ? 1 : 0,
    );

    if (!lista.length) {
      out[moduloId] = [mkVago(mesInicio, mesFim)];
      continue;
    }

    const periodos: PeriodoModulo[] = [];
    let cursor = mesInicio;

    for (const v of lista) {
      const ini = v.vigencia_inicio > mesInicio ? v.vigencia_inicio : mesInicio;
      const fimBruto = v.vigencia_fim && v.vigencia_fim < mesFim ? v.vigencia_fim : mesFim;
      // evita sobreposição: começa depois do período anterior
      const iniAjustado = ini > cursor ? ini : cursor;
      if (iniAjustado > fimBruto) continue;

      // lacuna antes deste contrato → módulo vago
      if (iniAjustado > cursor) periodos.push(mkVago(cursor, addDays(iniAjustado, -1)));

      const dias = contarDias(iniAjustado, fimBruto);
      const parcial = dias < totalDias;
      periodos.push({
        contrato_id: v.contrato!.id,
        contrato_numero: v.contrato!.numero_contrato || null,
        cliente_id: v.contrato!.cliente_id || null,
        demanda_contratada_kw: Number(v.contrato!.demanda_contratada_kw) || 0,
        inicio: iniAjustado,
        fim: fimBruto,
        dias,
        fator: totalDias > 0 ? dias / totalDias : 0,
        parcial,
        label: parcial ? `${ddmm(iniAjustado)}–${ddmm(fimBruto)} · ${dias}/${totalDias} dias` : '',
      });
      cursor = addDays(fimBruto, 1);
      if (cursor > mesFim) break;
    }

    if (cursor <= mesFim) periodos.push(mkVago(cursor, mesFim));
    out[moduloId] = periodos.length ? periodos : [mkVago(mesInicio, mesFim)];
  }

  return out;
}

/** Período "principal" (maior número de dias) — para telas que mostram 1 cliente. */
export function periodoPrincipal(periodos: PeriodoModulo[] | undefined): PeriodoModulo | null {
  if (!periodos || !periodos.length) return null;
  return periodos.reduce((a, b) => (b.dias > a.dias ? b : a));
}

/** true quando o módulo trocou de contrato/cliente dentro da competência. */
export function temTrocaNoMes(periodos: PeriodoModulo[] | undefined): boolean {
  return !!periodos && periodos.length > 1;
}
