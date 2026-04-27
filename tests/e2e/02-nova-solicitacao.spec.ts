import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth';

test.describe('Jornada 2 — Wizard Nova Solicitação', () => {
  test('shell carrega para usuário autenticado e wizard mostra 1ª etapa', async ({ page }) => {
    await loginAs(page, 'solicitante');
    await page.goto('/nova-solicitacao');
    // Step indicator deve aparecer com a primeira etapa ativa
    await expect(page.locator('body')).toContainText(/empreendimento|tipo|descrição/i, {
      timeout: 10_000,
    });
  });
});