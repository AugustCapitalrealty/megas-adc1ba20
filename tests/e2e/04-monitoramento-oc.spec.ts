import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth';

test.describe('Jornada 4 — Monitoramento OC', () => {
  test('painel renderiza para usuário backoffice', async ({ page }) => {
    await loginAs(page, 'backoffice');
    await page.goto('/monitoramento-oc');
    await expect(page).not.toHaveURL(/\/login/);
  });
});