import { test, expect, Page, TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { CREDENTIALS_HELP, SHOTS_DIR, credentials } from './qa-nav.shared';

/**
 * QA de navegación real contra la app publicada.
 * La sesión la abre `qa-nav.setup.ts` con el formulario de login; acá se recorre cada ruta,
 * se captura fullPage y se falla ante console.error, pageerror o HTTP >= 500.
 *
 *   set -a; . /home/deploy/.config/secrets/cultivo-admin-login.env; set +a
 *   QA_LABEL=fase0 npm run qa:nav
 */

/** Errores de página: consola, excepciones y respuestas 5xx. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  return errors;
}

/** El VPS no siempre resuelve open-meteo: el clima se sirve mockeado (igual que smoke.spec.ts). */
async function mockWeather(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { latitude: -34.6132, longitude: -58.3772, name: 'Buenos Aires', country: 'Argentina' },
        ],
      }),
    }),
  );

  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: { temperature_2m: 24.8, relative_humidity_2m: 61, weather_code: 1 },
      }),
    }),
  );
}

/** networkidle con tope: si la app sigue con tráfico de fondo, sigue igual sin colgarse. */
async function settle(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  } catch {
    await page.waitForTimeout(2_000);
  }
}

async function capture(page: Page, info: TestInfo, slug: string) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOTS_DIR, `${info.project.name}-${slug}.png`),
    fullPage: true,
  });
}

interface Route {
  slug: string;
  title: string;
  /** Ruta fija; las que se resuelven navegando usan `resolve`. */
  path?: string;
  resolve?: (page: Page) => Promise<string>;
}

const ROUTES: Route[] = [
  { slug: '00_home', title: 'home', path: '/' },
  { slug: '01_sala', title: 'sala', path: '/sala' },
  {
    slug: '02_carpa',
    title: 'primera carpa',
    resolve: async (page) => {
      await page.goto('/sala', { waitUntil: 'domcontentloaded' });
      await settle(page);
      const link = page.locator('a[href^="/sala/carpa/"]').first();
      await expect(link, 'no hay ninguna carpa listada en /sala').toBeVisible();
      const href = await link.getAttribute('href');
      expect(href, 'la carpa no tiene href').toBeTruthy();
      return href as string;
    },
  },
  { slug: '03_ciclos', title: 'ciclos', path: '/seguimientos' },
  { slug: '04_automatizaciones', title: 'automatizaciones', path: '/automatizaciones' },
  { slug: '05_artefactos', title: 'artefactos', path: '/artefactos' },
  { slug: '06_notificaciones', title: 'notificaciones', path: '/notificaciones' },
  { slug: '07_admin_usuarios', title: 'admin de usuarios', path: '/admin/usuarios' },
  { slug: '08_admin_rangos', title: 'admin de rangos', path: '/admin/rangos' },
];

test.beforeAll(() => {
  if (!credentials()) {
    throw new Error(CREDENTIALS_HELP);
  }
});

test.describe('QA de navegación', () => {
  for (const route of ROUTES) {
    test(`recorrido: ${route.title}`, async ({ page, isMobile }, info) => {
      await mockWeather(page);

      // La resolución de la carpa navega antes de empezar a medir.
      const target = route.path ?? (await route.resolve!(page));

      const errors = watchForErrors(page);
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await settle(page);

      await capture(page, info, route.slug);

      expect(errors, `errores de página en ${target}:\n${errors.join('\n')}`).toEqual([]);

      if (!isMobile) return;

      // Con emulación móvil `window.innerWidth` acompaña al contenido (el visual viewport se
      // aleja para que entre todo), así que el ancho de referencia es el viewport configurado.
      const viewportWidth = page.viewportSize()?.width ?? 390;
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(
        scrollWidth,
        `${target} desborda a lo ancho en móvil: ${scrollWidth}px sobre un viewport de ${viewportWidth}px`,
      ).toBeLessThanOrEqual(viewportWidth);
    });
  }
});
