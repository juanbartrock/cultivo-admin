import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { AUTH_STATE_PATH, CREDENTIALS_HELP, SHOTS_DIR, credentials } from './qa-nav.shared';

/**
 * Login por formulario, una sola vez. El estado (token en localStorage) se reutiliza en los
 * proyectos desktop y mobile, así ninguna ruta arranca con fetch del login todavía en vuelo.
 */
setup('login por formulario', async ({ page }) => {
  const creds = credentials();
  expect(creds, CREDENTIALS_HELP).not.toBeNull();

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS_DIR, 'desktop-08_login.png'), fullPage: true });

  await page.getByLabel('Email o usuario').fill(creds!.user);
  await page.getByLabel('Contraseña').fill(creds!.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45_000 });
  await page.waitForFunction(() => !!window.localStorage.getItem('access_token'), null, {
    timeout: 15_000,
  });

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
