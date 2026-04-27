import { test, expect } from '@playwright/test';
import {
  classificarSolicitacao,
  calcularRateio,
} from '../../src/lib/solicitacao-rules';

/**
 * Smoke test: garante que as regras puras de classificação continuam
 * funcionando como esperado. Funciona como um contrato entre o domínio
 * e a UI — se quebrar, o wizard de Nova Solicitação classificará errado.
 */
test.describe('Regras de negócio (contrato)', () => {
  test('serviço acima de R$ 1.000 é classificado como AC', () => {
    const r = classificarSolicitacao({ valor: 1500, tipo: 'servicos' });
    expect(r.fluxo).toBe('AC');
  });

  test('serviço até R$ 1.000 é classificado como OC', () => {
    const r = classificarSolicitacao({ valor: 800, tipo: 'servicos' });
    expect(r.fluxo).toBe('OC');
  });

  test('produto sempre é OC, independente do valor', () => {
    const r = classificarSolicitacao({ valor: 50_000, tipo: 'produtos' });
    expect(r.fluxo).toBe('OC');
  });

  test('rateio de R$ 100 em 3 partes iguais soma 100 sem perda por arredondamento', () => {
    const partes = calcularRateio(100, [1, 1, 1]);
    expect(partes).toHaveLength(3);
    const soma = partes.reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(100, 2);
  });
});