import { describe, it, expect } from 'vitest';
import {
  classificarSolicitacao,
  calcularRateio,
  classificarSlaBackoffice,
} from './solicitacao-rules';

describe('classificarSolicitacao — OC vs AC', () => {
  it('valor ≤ 1000 sempre é OC', () => {
    const r = classificarSolicitacao({ valor: 1000, tipoContratacao: 'servicos' });
    expect(r.isOC).toBe(true);
    expect(r.isAC).toBe(false);
  });

  it('valor > 1000 com tipo "servicos" é AC', () => {
    const r = classificarSolicitacao({ valor: 1500, tipoContratacao: 'servicos' });
    expect(r.isAC).toBe(true);
    expect(r.isOC).toBe(false);
  });

  it('valor > 1000 com tipo material é OC acima de 1000', () => {
    const r = classificarSolicitacao({ valor: 5000, tipoContratacao: 'material_construcao' });
    expect(r.isOC).toBe(true);
    expect(r.isAC).toBe(false);
    expect(r.isOCAbove1000).toBe(true);
  });

  it('valor zero/negativo é tratado como OC default', () => {
    expect(classificarSolicitacao({ valor: 0, tipoContratacao: '' }).isOC).toBe(true);
    expect(classificarSolicitacao({ valor: -10, tipoContratacao: 'servicos' }).isOC).toBe(true);
  });
});

describe('classificarSolicitacao — instrumento jurídico (apenas AC)', () => {
  const base = { tipoContratacao: 'servicos' as const };

  it('OC sempre tem instrumento "oc"', () => {
    const r = classificarSolicitacao({ valor: 500, tipoContratacao: 'material_construcao' });
    expect(r.instrumentoJuridico).toBe('oc');
  });

  it('AC < 10.000 sem natureza especial → oc', () => {
    const r = classificarSolicitacao({ ...base, valor: 5000 });
    expect(r.instrumentoJuridico).toBe('oc');
  });

  it('AC ≥ 10.000 → termo_contratacao', () => {
    const r = classificarSolicitacao({ ...base, valor: 10000 });
    expect(r.instrumentoJuridico).toBe('termo_contratacao');
  });

  it('AC ≥ 70.000 → contrato_prestacao', () => {
    const r = classificarSolicitacao({ ...base, valor: 70000 });
    expect(r.instrumentoJuridico).toBe('contrato_prestacao');
  });

  it('obra civil sempre força contrato_empreitada (independe do valor)', () => {
    const r = classificarSolicitacao({ ...base, valor: 2000, naturezaObraCivil: true });
    expect(r.instrumentoJuridico).toBe('contrato_empreitada');
  });

  it('altura/risco força termo mesmo abaixo de 10k', () => {
    const r = classificarSolicitacao({ ...base, valor: 2000, naturezaAlturaRisco: true });
    expect(r.instrumentoJuridico).toBe('termo_contratacao');
  });

  it('preço variável força termo mesmo acima de 70k (não vira prestação)', () => {
    const r = classificarSolicitacao({ ...base, valor: 90000, naturezaPrecoVariavel: true });
    expect(r.instrumentoJuridico).toBe('termo_contratacao');
  });
});

describe('classificarSolicitacao — 3 CNPJs e Due Diligence', () => {
  const base = { tipoContratacao: 'servicos' as const };

  it('AC normal exige 3 CNPJs', () => {
    expect(classificarSolicitacao({ ...base, valor: 5000 }).requires3CNPJs).toBe(true);
  });

  it('AC emergencial dispensa 3 CNPJs', () => {
    expect(
      classificarSolicitacao({ ...base, valor: 5000, emergencial: true }).requires3CNPJs,
    ).toBe(false);
  });

  it('OC nunca exige 3 CNPJs', () => {
    expect(
      classificarSolicitacao({ valor: 800, tipoContratacao: 'material_construcao' })
        .requires3CNPJs,
    ).toBe(false);
  });

  it('Due Diligence ativa em AC ≥ 50.000', () => {
    expect(classificarSolicitacao({ ...base, valor: 49999 }).requerDueDiligence).toBe(false);
    expect(classificarSolicitacao({ ...base, valor: 50000 }).requerDueDiligence).toBe(true);
  });
});

describe('classificarSolicitacao — Retenção técnica', () => {
  const base = { tipoContratacao: 'servicos' as const };

  it('contrato de empreitada sempre exige retenção 180 dias', () => {
    const r = classificarSolicitacao({ ...base, valor: 5000, naturezaObraCivil: true });
    expect(r.requerRetencaoTecnica).toBe(true);
    expect(r.prazoLiberacaoRetencaoDias).toBe(180);
  });

  it('AC ≥ 150k com prazo > 30 dias exige retenção 90 dias', () => {
    const r = classificarSolicitacao({
      ...base,
      valor: 200000,
      dataInicio: '2025-01-01',
      dataFim: '2025-03-15',
    });
    expect(r.requerRetencaoTecnica).toBe(true);
    expect(r.prazoLiberacaoRetencaoDias).toBe(90);
  });

  it('AC ≥ 150k com prazo curto NÃO exige retenção', () => {
    const r = classificarSolicitacao({
      ...base,
      valor: 200000,
      dataInicio: '2025-01-01',
      dataFim: '2025-01-20',
    });
    expect(r.requerRetencaoTecnica).toBe(false);
  });

  it('OC nunca exige retenção técnica', () => {
    const r = classificarSolicitacao({ valor: 200000, tipoContratacao: 'material_construcao' });
    expect(r.requerRetencaoTecnica).toBe(false);
  });
});

describe('calcularRateio', () => {
  it('rateia em partes iguais e fecha no total', () => {
    const r = calcularRateio(100, [1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    expect(r).toEqual([33.33, 33.33, 33.34]);
  });

  it('rateia por área (m²)', () => {
    const r = calcularRateio(1000, [200, 300, 500]);
    expect(r).toEqual([200, 300, 500]);
  });

  it('zero/negativos são ignorados', () => {
    const r = calcularRateio(100, [0, 0, 0]);
    expect(r).toEqual([0, 0, 0]);
  });

  it('total zero retorna tudo zero', () => {
    expect(calcularRateio(0, [1, 2, 3])).toEqual([0, 0, 0]);
  });

  it('arredondamento sempre fecha no total exato', () => {
    const r = calcularRateio(99.97, [1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(99.97, 2);
  });
});

describe('classificarSlaBackoffice', () => {
  it('≤ 2 dias = no_prazo', () => {
    expect(classificarSlaBackoffice(0)).toBe('no_prazo');
    expect(classificarSlaBackoffice(2)).toBe('no_prazo');
  });
  it('> 2 e ≤ 3 = atencao', () => {
    expect(classificarSlaBackoffice(2.5)).toBe('atencao');
    expect(classificarSlaBackoffice(3)).toBe('atencao');
  });
  it('> 3 = estourado', () => {
    expect(classificarSlaBackoffice(3.1)).toBe('estourado');
    expect(classificarSlaBackoffice(10)).toBe('estourado');
  });
});