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
  // Fotovoltaico (abate área comum)
  fotovoltaico_saldo_ponta: number;
  fotovoltaico_geracao_ponta: number;
  fotovoltaico_saldo_fora: number;
  fotovoltaico_geracao_fora: number;
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
}

const z = (n: number) => (Number.isFinite(n) ? n : 0);

export function calcularMemoria(
  tarifas: EnergiaTarifas,
  lancamentos: EnergiaLancamentoInput[],
): MemoriaResultado {
  // Passo 1: consumo total geral (denominador para rateios)
  const consumoTotalGeral = lancamentos.reduce(
    (s, l) => s + z(l.consumo_ponta_kwh) + z(l.consumo_fora_kwh),
    0,
  );

  const perdasPontaTotal = z(tarifas.perdas_copel_ponta_kwh) + z(tarifas.perdas_energy_ponta_kwh);
  const perdasForaTotal = z(tarifas.perdas_copel_fora_kwh) + z(tarifas.perdas_energy_fora_kwh);

  // Abatimento fotovoltaico (RESUMO!E47 + E48 invertidos): aplicado só na linha
  // ÁREA COMUM. A planilha usa max(saldo, geração*tarifa)*-1.
  const abatimentoPonta =
    Math.max(z(tarifas.fotovoltaico_saldo_ponta), z(tarifas.fotovoltaico_geracao_ponta)) * -1;
  const abatimentoFora =
    Math.max(z(tarifas.fotovoltaico_saldo_fora), z(tarifas.fotovoltaico_geracao_fora)) * -1;
  const abatimentoFotovoltaico = abatimentoPonta + abatimentoFora;

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

    const ratio = consumoTotalGeral > 0 ? U / consumoTotalGeral : 0;
    const AH = ratio * perdasPontaTotal;
    const AI = ratio * perdasForaTotal;
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
    const BU = l.is_area_comum ? abatimentoFotovoltaico : 0;
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

  return { linhas, totais };
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
  fotovoltaico_saldo_ponta: 0, fotovoltaico_geracao_ponta: 0,
  fotovoltaico_saldo_fora: 0, fotovoltaico_geracao_fora: 0,
};