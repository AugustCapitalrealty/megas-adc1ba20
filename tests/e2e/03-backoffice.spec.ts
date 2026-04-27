import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth';

test.describe('Jornada 3 — Backoffice', () => {
  test('rota /backoffice carrega para usuário backoffice', async ({ page }) => {
    await loginAs(page, 'backoffice');
    await page.goto('/backoffice');
    // Não deve redirecionar para "/" (RequireRole bloqueia solicitantes)
    await expect(page).not.toHaveURL(/\/login/);
  });
});