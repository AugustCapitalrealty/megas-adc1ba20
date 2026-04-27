import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth';

test.describe('Jornada 5 — Garantias Vigentes', () => {
  test('painel de garantias carrega', async ({ page }) => {
    await loginAs(page, 'solicitante');
    await page.goto('/garantias');
    await expect(page).not.toHaveURL(/\/login/);
  });
});