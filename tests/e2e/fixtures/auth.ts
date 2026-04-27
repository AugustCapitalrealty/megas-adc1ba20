import type { Page } from '@playwright/test';

/**
 * Injects a fake Supabase session into localStorage so protected routes
 * mount without going through Google OAuth.
 *
 * NOTE: This unblocks UI rendering and route guards. Network calls that
 * actually hit Supabase will fail with 401 — specs should either mock
 * those routes or assert only on UI shell behaviour.
 */
export async function loginAs(
  page: Page,
  role: 'solicitante' | 'backoffice' | 'admin' = 'solicitante'
) {
  const projectRef = 'wcxybuietfmaaqzmcmnq';
  const storageKey = `sb-${projectRef}-auth-token`;
  const userId = `e2e-${role}-user`;
  const session = {
    access_token: 'e2e.fake.jwt',
    refresh_token: 'e2e.fake.refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${role}@e2e.local`,
      user_metadata: { full_name: `E2E ${role}`, role },
      app_metadata: { provider: 'google', role },
      created_at: new Date().toISOString(),
    },
  };

  // Stub Supabase REST endpoints that block initial render so the shell
  // can mount even though no real backend is available.
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('user_roles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ user_id: userId, role }]),
      });
    }
    if (url.includes('profiles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: userId, full_name: `E2E ${role}`, status: 'aprovado', email: `${role}@e2e.local` },
        ]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: JSON.stringify(session) }
  );
}