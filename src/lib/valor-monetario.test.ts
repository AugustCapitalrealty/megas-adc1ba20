import { describe, it, expect } from 'vitest';
import { toCentsString, fromCentsString, formatBRL } from './valor-monetario';

describe('toCentsString', () => {
  it('converte número inteiro em reais para string de centavos (regressão bug R$ 10,00)', () => {
    expect(toCentsString(1000)).toBe('100000');
  });

  it('converte valor decimal preservando precisão', () => {
    expect(toCentsString(770.37)).toBe('77037');
    expect(toCentsString(0.5)).toBe('50');
    expect(toCentsString(1.99)).toBe('199');
  });

  it('lida com erro de ponto flutuante via Math.round', () => {
    expect(toCentsString(0.1 + 0.2)).toBe('30');
  });

  it('aceita string formatada em BR (com ponto de milhar e vírgula)', () => {
    expect(toCentsString('1.234,56')).toBe('123456');
    expect(toCentsString('10,00')).toBe('1000');
  });

  it('aceita string em notação inglesa', () => {
    expect(toCentsString('1234.56')).toBe('123456');
  });

  it('retorna string vazia para null, undefined, NaN, ou string vazia', () => {
    expect(toCentsString(null)).toBe('');
    expect(toCentsString(undefined)).toBe('');
    expect(toCentsString(NaN)).toBe('');
    expect(toCentsString('')).toBe('');
    expect(toCentsString('   ')).toBe('');
  });

  it('clampa valores negativos para zero', () => {
    expect(toCentsString(-50)).toBe('0');
  });

  it('round-trip: fromCentsString(toCentsString(v)) === v para amostra de valores', () => {
    const samples = [0, 1, 10, 100, 1000, 0.01, 0.99, 1.50, 770.37, 9999.99, 50000];
    for (const v of samples) {
      const roundTrip = fromCentsString(toCentsString(v));
      expect(roundTrip).toBeCloseTo(v, 2);
    }
  });
});

describe('fromCentsString', () => {
  it('converte string de centavos em reais', () => {
    expect(fromCentsString('100000')).toBe(1000);
    expect(fromCentsString('77037')).toBe(770.37);
  });

  it('retorna 0 para entrada vazia ou inválida', () => {
    expect(fromCentsString('')).toBe(0);
    expect(fromCentsString(null)).toBe(0);
    expect(fromCentsString(undefined)).toBe(0);
    expect(fromCentsString('abc')).toBe(0);
  });

  it('ignora caracteres não numéricos', () => {
    expect(fromCentsString('R$ 100000')).toBe(1000);
  });
});

describe('formatBRL', () => {
  it('formata como moeda brasileira', () => {
    // Os caracteres exatos do espaço dependem do ICU; testamos os tokens
    const formatted = formatBRL(1000);
    expect(formatted).toContain('R$');
    expect(formatted).toContain('1.000,00');
  });

  it('lida com NaN sem quebrar', () => {
    expect(() => formatBRL(NaN)).not.toThrow();
  });
});