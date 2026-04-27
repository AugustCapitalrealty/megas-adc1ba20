import { test, expect } from '@playwright/test';

test.describe('Jornada 1 — Login & proteção de rotas', () => {
  test('tela de login carrega com botão Google', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bem-vindo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
  });

  test('rota protegida redireciona para /login quando deslogado', async ({ page }) => {
    await page.goto('/nova-solicitacao');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('rota admin redireciona para /login quando deslogado', async ({ page }) => {
    await page.goto('/admin/excelencia');
    await expect(page).toHaveURL(/\/login$/);
  });
});