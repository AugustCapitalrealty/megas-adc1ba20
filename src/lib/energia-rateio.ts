// Engine de cálculo do rateio de energia — replica a aba MEMÓRIA DE CÁLCULO
// da planilha do Mega Curitiba (08/2025). 100% determinístico, sem I/O.

export interface EnergiaTarifas {
  // Demanda
  demanda_usd: number;        // R$/kW   (E6)
  demanda_isenta: number;     // R$/kW   (E7)
  ultrapassagem: number;      // R$/kW   (E8 = E6*2)
  // Tarifa de energia
  te_ponta: number;           // R$/kWh  (E11)
  tusd_ponta: number;         // R$/kWh  (E12)
  te_fora: number;            // R$/kWh  (E13)
  tusd_fora: number;          // R$/kWh  (E14)
  iluminacao_publica: number; // R$ fixo (E15)
  // Tributos
  pis_pct: number;            // 0..1    (E18)
  cofins_pct: number;         // 0..1    (E19)
  icms_pct: number;           // 0..1    (E21)
  bandeira_valor: number;     // R$/100kWh (E24)
  // Perdas globais (kWh)
  perdas_copel_ponta_kwh: number;  // E40
  perdas_copel_fora_kwh: number;   // E41
  perdas_energy_ponta_kwh: number; // E45
  perdas_energy_fora_kwh: number;  // E46
  // Lançamento financeiro
  cred_deb_fatura: number;    // E50 (R$)
  // Fotovoltaico (kWh) — abate consumo da ÁREA COMUM, saldo carryover entre meses
  fotovoltaico_saldo_inicial_ponta_kwh: number;
  fotovoltaico_saldo_inicial_fora_kwh: number;
  fotovoltaico_geracao_ponta_kwh: number;
  fotovoltaico_geracao_fora_kwh: number;
}

export interface EnergiaLancamentoInput {
  modulo_id: string;
  identificador: string;
  cliente_nome: string;
  area_m2: number;
  demanda_contratada_kw: number;  // F
  demanda_usd_medida_kw: number;  // G
  consumo_ponta_kwh: number;      // Q
  consumo_fora_kwh: number;       // T
  ajuste_manual_reais: number;    // BW
  is_area_comum?: boolean;        // só ÁREA COMUM recebe abatimento fotovoltaico
}

export interface MemoriaLinha {
  modulo_id: string;
  identificador: string;
  cliente_nome: string;
  area_m2: number;
  // Demanda
  demanda_contratada: number; // F
  demanda_usd: number;        // G
  demanda_isenta: number;     // H
  ultrapassagem: number;      // I
  rs_demanda_usd: number;     // J
  rs_demanda_isenta: number;  // K
  rs_ultrapassagem: number;   // L
  rs_demanda_total: number;   // M
  // Consumo
  consumo_ponta: number;      // Q (=O=P)
  consumo_fora: number;       // T (=R=S)
  consumo_total: number;      // U
  // Custo kWh/mês
  rs_te_ponta: number;        // W
  rs_tusd_ponta: number;      // X
  rs_ponta: number;           // Y
  rs_te_fora: number;         // Z
  rs_tusd_fora: number;       // AA
  rs_fora: number;            // AB
  rs_consumo_total: number;   // AC
  rs_kwh: number;             // AD
  rs_consumo_demanda: number; // AF
  // Perdas
  perdas_ponta_kwh: number;   // AH
  perdas_fora_kwh: number;    // AI
  perdas_kwh: number;         // AJ
  rs_perdas_te_ponta: number; // AL
  rs_perdas_tusd_ponta: number;// AM
  rs_perdas_te_fora: number;  // AN
  rs_perdas_tusd_fora: number;// AO
  rs_perdas: number;          // AP
  consumo_total_com_perdas: number; // AR
  rs_consumo_demanda_perdas: number; // AT
  // ICMS
  icms_te_ponta: number;      // AV
  icms_tusd_ponta: number;    // AW
  icms_te_fora: number;       // AX
  icms_tusd_fora: number;     // AY
  icms_demanda: number;       // AZ
  icms_total: number;         // BA
  // PIS/COFINS
  piscof_te_ponta: number;    // BC
  piscof_tusd_ponta: number;  // BD
  piscof_te_fora: number;     // BE
  piscof_tusd_fora: number;   // BF
  piscof_demanda: number;     // BG
  piscof_demanda_isenta: number; // BH
  piscof_total: number;       // BI
  // Outros
  iluminacao_publica: number; // BK
  bandeira_ponta: number;     // BM
  bandeira_fora: number;      // BN
  bandeira_total: number;     // BO
  cobranca_total: number;     // BQ
  cred_deb_rateado: number;   // BS
  fotovoltaico: number;       // BU (negativo)
  ajuste_manual: number;      // BW
  total_fatura_energy: number;// BY
  total_fatura_copel: number; // CA
  // Validação
  bate: boolean;              // CL
}

export interface MemoriaResultado {
  linhas: MemoriaLinha[];
  totais: MemoriaLinha;
  fotovoltaico: {
    disponivel_ponta_kwh: number;
    disponivel_fora_kwh: number;
    consumido_ponta_kwh: number;
    consumido_fora_kwh: number;
    saldo_final_ponta_kwh: number;
    saldo_final_fora_kwh: number;
    abatimento_reais: number;
  };
}

const z = (n: number) => (Number.isFinite(n) ? n : 0);

export function calcularMemoria(
  tarifas: EnergiaTarifas,
  lancamentos: EnergiaLancamentoInput[],
): MemoriaResultado {
  // Passo 1: denominadores de rateio
  // - consumoTotalGeral: usado para itens sem posto tarifário (iluminação pública, créd/déb)
  // - consumoPontaTotal / consumoForaTotal: usados no rateio de PERDAS por posto
  //   (perdas ponta rateadas só pelo consumo ponta; idem fora). Sem isso, clientes
  //   com perfil ponta/fora diferente da média assumiam perdas distorcidas.
  const consumoPontaTotal = lancamentos.reduce((s, l) => s + z(l.consumo_ponta_kwh), 0);
  const consumoForaTotal = lancamentos.reduce((s, l) => s + z(l.consumo_fora_kwh), 0);
  const consumoTotalGeral = consumoPontaTotal + consumoForaTotal;

  const perdasPontaTotal = z(tarifas.perdas_copel_ponta_kwh) + z(tarifas.perdas_energy_ponta_kwh);
  const perdasForaTotal = z(tarifas.perdas_copel_fora_kwh) + z(tarifas.perdas_energy_fora_kwh);

  // Fotovoltaico (kWh): saldo inicial + geração do mês disponíveis para abater
  // o consumo da ÁREA COMUM. O remanescente vira saldo final (carryover).
  const disponivelPontaKwh =
    z(tarifas.fotovoltaico_saldo_inicial_ponta_kwh) + z(tarifas.fotovoltaico_geracao_ponta_kwh);
  const disponivelForaKwh =
    z(tarifas.fotovoltaico_saldo_inicial_fora_kwh) + z(tarifas.fotovoltaico_geracao_fora_kwh);
  const areaComum = lancamentos.find((l) => l.is_area_comum);
  const consumidoPontaKwh = areaComum ? Math.min(disponivelPontaKwh, z(areaComum.consumo_ponta_kwh)) : 0;
  const consumidoForaKwh = areaComum ? Math.min(disponivelForaKwh, z(areaComum.consumo_fora_kwh)) : 0;
  const saldoFinalPontaKwh = Math.max(0, disponivelPontaKwh - consumidoPontaKwh);
  const saldoFinalForaKwh = Math.max(0, disponivelForaKwh - consumidoForaKwh);
  // valor R$ abatido da linha área comum (TE+TUSD do mês)
  const abatimentoReais = -(
    consumidoPontaKwh * (z(tarifas.te_ponta) + z(tarifas.tusd_ponta)) +
    consumidoForaKwh * (z(tarifas.te_fora) + z(tarifas.tusd_fora))
  );

  const linhas = lancamentos.map<MemoriaLinha>((l) => {
    const F = z(l.demanda_contratada_kw);
    const G = z(l.demanda_usd_medida_kw);
    const H = G <= F ? F - G : 0;
    const I = G > F ? G - F : 0;
    const J = G >= F ? F * tarifas.demanda_usd : G * tarifas.demanda_usd;
    const K = H * tarifas.demanda_isenta;
    const L = I * tarifas.ultrapassagem;
    const M = J + K + L;

    const Q = z(l.consumo_ponta_kwh);
    const T = z(l.consumo_fora_kwh);
    const U = Q + T;

    const W = Q * tarifas.te_ponta;
    const X = Q * tarifas.tusd_ponta;
    const Y = W + X;
    const Z = T * tarifas.te_fora;
    const AA = T * tarifas.tusd_fora;
    const AB = Z + AA;
    const AC = Y + AB;
    const AD = U > 0 ? AC / U : 0;
    const AF = AC + M;

    // Rateio de perdas SEPARADO por posto tarifário.
    const ratioPonta = consumoPontaTotal > 0 ? Q / consumoPontaTotal : 0;
    const ratioFora = consumoForaTotal > 0 ? T / consumoForaTotal : 0;
    const AH = ratioPonta * perdasPontaTotal;
    const AI = ratioFora * perdasForaTotal;
    const AJ = AH + AI;
    const AL = AH * tarifas.te_ponta;
    const AM = AH * tarifas.tusd_ponta;
    const AN = AI * tarifas.te_fora;
    const AO = AI * tarifas.tusd_fora;
    const AP = AL + AM + AN + AO;

    const AR = U + AJ;
    const AT = AF + AP;

    const AV = W * tarifas.icms_pct;
    const AW = X * tarifas.icms_pct;
    const AX = Z * tarifas.icms_pct;
    const AY = AA * tarifas.icms_pct;
    const AZ = J * tarifas.icms_pct;
    const BA = AV + AW + AX + AY + AZ;

    const piscof = tarifas.pis_pct + tarifas.cofins_pct;
    const BC = (W - W * tarifas.icms_pct) * piscof;
    const BD = (X - X * tarifas.icms_pct) * piscof;
    const BE = (Z - Z * tarifas.icms_pct) * piscof;
    const BF = (AA - AA * tarifas.icms_pct) * piscof;
    const BG = (J - J * tarifas.icms_pct) * piscof;
    const BH = K * piscof;
    const BI = BC + BD + BE + BF + BG + BH;

    const BK = consumoTotalGeral > 0 ? (tarifas.iluminacao_publica / consumoTotalGeral) * U : 0;
    const BM = ((Q + AH) / 100) * tarifas.bandeira_valor;
    const BN = ((T + AI) / 100) * tarifas.bandeira_valor;
    const BO = BM + BN;

    const BQ = AT + BK + BO;
    const BS = consumoTotalGeral > 0 ? (U / consumoTotalGeral) * tarifas.cred_deb_fatura : 0;
    const BU = l.is_area_comum ? abatimentoReais : 0;
    const BW = z(l.ajuste_manual_reais);
    const BY = BQ + BS + BW + BU;
    const CA = BY - L;

    return {
      modulo_id: l.modulo_id,
      identificador: l.identificador,
      cliente_nome: l.cliente_nome,
      area_m2: z(l.area_m2),
      demanda_contratada: F, demanda_usd: G, demanda_isenta: H, ultrapassagem: I,
      rs_demanda_usd: J, rs_demanda_isenta: K, rs_ultrapassagem: L, rs_demanda_total: M,
      consumo_ponta: Q, consumo_fora: T, consumo_total: U,
      rs_te_ponta: W, rs_tusd_ponta: X, rs_ponta: Y,
      rs_te_fora: Z, rs_tusd_fora: AA, rs_fora: AB,
      rs_consumo_total: AC, rs_kwh: AD, rs_consumo_demanda: AF,
      perdas_ponta_kwh: AH, perdas_fora_kwh: AI, perdas_kwh: AJ,
      rs_perdas_te_ponta: AL, rs_perdas_tusd_ponta: AM,
      rs_perdas_te_fora: AN, rs_perdas_tusd_fora: AO, rs_perdas: AP,
      consumo_total_com_perdas: AR, rs_consumo_demanda_perdas: AT,
      icms_te_ponta: AV, icms_tusd_ponta: AW, icms_te_fora: AX,
      icms_tusd_fora: AY, icms_demanda: AZ, icms_total: BA,
      piscof_te_ponta: BC, piscof_tusd_ponta: BD, piscof_te_fora: BE,
      piscof_tusd_fora: BF, piscof_demanda: BG, piscof_demanda_isenta: BH, piscof_total: BI,
      iluminacao_publica: BK, bandeira_ponta: BM, bandeira_fora: BN, bandeira_total: BO,
      cobranca_total: BQ, cred_deb_rateado: BS, fotovoltaico: BU, ajuste_manual: BW,
      total_fatura_energy: BY, total_fatura_copel: CA,
      bate: Math.abs(BY - CA) < 0.01,
    };
  });

  // Linha de totais
  const totais = linhas.reduce<MemoriaLinha>(
    (acc, l) => {
      const keys = Object.keys(acc) as (keyof MemoriaLinha)[];
      for (const k of keys) {
        const v = (l as any)[k];
        if (typeof v === 'number') (acc as any)[k] += v;
      }
      return acc;
    },
    {
      modulo_id: '__total__',
      identificador: 'TOTAL',
      cliente_nome: '',
      area_m2: 0,
      demanda_contratada: 0, demanda_usd: 0, demanda_isenta: 0, ultrapassagem: 0,
      rs_demanda_usd: 0, rs_demanda_isenta: 0, rs_ultrapassagem: 0, rs_demanda_total: 0,
      consumo_ponta: 0, consumo_fora: 0, consumo_total: 0,
      rs_te_ponta: 0, rs_tusd_ponta: 0, rs_ponta: 0,
      rs_te_fora: 0, rs_tusd_fora: 0, rs_fora: 0,
      rs_consumo_total: 0, rs_kwh: 0, rs_consumo_demanda: 0,
      perdas_ponta_kwh: 0, perdas_fora_kwh: 0, perdas_kwh: 0,
      rs_perdas_te_ponta: 0, rs_perdas_tusd_ponta: 0,
      rs_perdas_te_fora: 0, rs_perdas_tusd_fora: 0, rs_perdas: 0,
      consumo_total_com_perdas: 0, rs_consumo_demanda_perdas: 0,
      icms_te_ponta: 0, icms_tusd_ponta: 0, icms_te_fora: 0,
      icms_tusd_fora: 0, icms_demanda: 0, icms_total: 0,
      piscof_te_ponta: 0, piscof_tusd_ponta: 0, piscof_te_fora: 0,
      piscof_tusd_fora: 0, piscof_demanda: 0, piscof_demanda_isenta: 0, piscof_total: 0,
      iluminacao_publica: 0, bandeira_ponta: 0, bandeira_fora: 0, bandeira_total: 0,
      cobranca_total: 0, cred_deb_rateado: 0, fotovoltaico: 0, ajuste_manual: 0,
      total_fatura_energy: 0, total_fatura_copel: 0,
      bate: true,
    },
  );
  totais.rs_kwh = totais.consumo_total > 0 ? totais.rs_consumo_total / totais.consumo_total : 0;

  return {
    linhas,
    totais,
    fotovoltaico: {
      disponivel_ponta_kwh: disponivelPontaKwh,
      disponivel_fora_kwh: disponivelForaKwh,
      consumido_ponta_kwh: consumidoPontaKwh,
      consumido_fora_kwh: consumidoForaKwh,
      saldo_final_ponta_kwh: saldoFinalPontaKwh,
      saldo_final_fora_kwh: saldoFinalForaKwh,
      abatimento_reais: abatimentoReais,
    },
  };
}

export const DEFAULT_TARIFAS: EnergiaTarifas = {
  demanda_usd: 0, demanda_isenta: 0, ultrapassagem: 0,
  te_ponta: 0, tusd_ponta: 0, te_fora: 0, tusd_fora: 0,
  iluminacao_publica: 0,
  pis_pct: 0.0165, cofins_pct: 0.076, icms_pct: 0.19,
  bandeira_valor: 0,
  perdas_copel_ponta_kwh: 0, perdas_copel_fora_kwh: 0,
  perdas_energy_ponta_kwh: 0, perdas_energy_fora_kwh: 0,
  cred_deb_fatura: 0,
  fotovoltaico_saldo_inicial_ponta_kwh: 0,
  fotovoltaico_saldo_inicial_fora_kwh: 0,
  fotovoltaico_geracao_ponta_kwh: 0,
  fotovoltaico_geracao_fora_kwh: 0,
};

// ── Consolidação por cliente ─────────────────────────────
// Um cliente (ex.: Mercado Livre) pode ocupar N módulos. A cobrança é UMA
// fatura por cliente que soma todos os módulos dele. Esta função agrupa as
// linhas da memória de cálculo por cliente.
export interface FaturaCliente {
  cliente_key: string;          // `${cliente_id}::${contrato_id}`, `VAGO:${modulo_id}` ou `AREA_COMUM`
  cliente_nome: string;
  contrato_id: string | null;
  contrato_numero: string | null;
  modulos: string[];            // lista de identificadores dos módulos
  area_m2: number;
  consumo_ponta: number;
  consumo_fora: number;
  consumo_total: number;
  demanda_usd: number;
  rs_demanda_total: number;
  rs_consumo_total: number;
  rs_perdas: number;
  icms_total: number;
  piscof_total: number;
  iluminacao_publica: number;
  bandeira_total: number;
  cred_deb_rateado: number;
  fotovoltaico: number;
  ajuste_manual: number;
  total_fatura_energy: number;
  total_fatura_copel: number;
}

export function agruparPorCliente(
  linhas: MemoriaLinha[],
  modulos: Array<{ id: string; cliente_id: string | null; identificador: string; contrato_id?: string | null; contrato_numero?: string | null }>,
): FaturaCliente[] {
  const moduloMap = new Map(modulos.map(m => [m.id, m]));
  const acc = new Map<string, FaturaCliente>();

  for (const l of linhas) {
    const m = moduloMap.get(l.modulo_id);
    const isArea = (l.identificador || '').toUpperCase().includes('ÁREA COMUM')
      || (l.identificador || '').toUpperCase().includes('AREA COMUM');
    const contratoId = m?.contrato_id ?? null;
    const contratoNumero = m?.contrato_numero ?? null;
    const key = isArea
      ? 'AREA_COMUM'
      : (m?.cliente_id ? `${m.cliente_id}::${contratoId ?? 'SEM'}` : `VAGO:${l.modulo_id}`);
    const nome = isArea ? 'Área Comum' : (l.cliente_nome || 'Vago');

    let bucket = acc.get(key);
    if (!bucket) {
      bucket = {
        cliente_key: key,
        cliente_nome: nome,
        contrato_id: isArea ? null : contratoId,
        contrato_numero: isArea ? null : contratoNumero,
        modulos: [],
        area_m2: 0,
        consumo_ponta: 0, consumo_fora: 0, consumo_total: 0,
        demanda_usd: 0,
        rs_demanda_total: 0, rs_consumo_total: 0, rs_perdas: 0,
        icms_total: 0, piscof_total: 0,
        iluminacao_publica: 0, bandeira_total: 0,
        cred_deb_rateado: 0, fotovoltaico: 0, ajuste_manual: 0,
        total_fatura_energy: 0, total_fatura_copel: 0,
      };
      acc.set(key, bucket);
    }
    bucket.modulos.push(l.identificador);
    bucket.area_m2 += l.area_m2;
    bucket.consumo_ponta += l.consumo_ponta;
    bucket.consumo_fora += l.consumo_fora;
    bucket.consumo_total += l.consumo_total;
    bucket.demanda_usd += l.demanda_usd;
    bucket.rs_demanda_total += l.rs_demanda_total;
    bucket.rs_consumo_total += l.rs_consumo_total;
    bucket.rs_perdas += l.rs_perdas;
    bucket.icms_total += l.icms_total;
    bucket.piscof_total += l.piscof_total;
    bucket.iluminacao_publica += l.iluminacao_publica;
    bucket.bandeira_total += l.bandeira_total;
    bucket.cred_deb_rateado += l.cred_deb_rateado;
    bucket.fotovoltaico += l.fotovoltaico;
    bucket.ajuste_manual += l.ajuste_manual;
    bucket.total_fatura_energy += l.total_fatura_energy;
    bucket.total_fatura_copel += l.total_fatura_copel;
  }

  // Área Comum sempre por último, demais por total desc
  return Array.from(acc.values()).sort((a, b) => {
    if (a.cliente_key === 'AREA_COMUM') return 1;
    if (b.cliente_key === 'AREA_COMUM') return -1;
    return b.total_fatura_energy - a.total_fatura_energy;
  });
}