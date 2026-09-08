/**
 * Compara el color de estado de la misma lectura en /, /sala y la carpa, inyectando la
 * respuesta de /devices/:id/status en el navegador. No toca la base ni la app publicada.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const SHOTS = '/opt/apps/cultivo-admin/docs/rediseno-2026-09/capturas/rangos-r2-20260908';
const CARPA = '/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75'; // Secado -> rangos CURADO
const out = {};

const CASOS = {
  // ideal 18-28 / amplio 15-30 · hum ideal 40-65 / amplio 30-75
  todo_ok: { temperature: 24, humidity: 55 },      // vpd ~1.34 -> ok
  mixto: { temperature: 29, humidity: 20 },        // temp warn, humedad danger, vpd danger
};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', process.env.CULTIVO_ADMIN_USER);
  await page.fill('input[type="password"]', process.env.CULTIVO_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(1200);
}

/** Color computado de cada número visible que termina en °C, % o kPa. */
async function tonos(page) {
  // En la carpa el valor va como <p>24<span>°C</span></p>; en home y /sala como un solo <span>.
  return page.$$eval('span, p', (els) =>
    els
      .filter((e) => e.children.length <= 1 && /^-?\d+(\.\d+)?\s?(°C|%|ppm|kPa)$/.test(e.textContent.trim().replace(/\s+/g, ' ')))
      .map((e) => ({ texto: e.textContent.trim().replace(/\s+/g, ' '), color: getComputedStyle(e).color })));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page);

  for (const [caso, lectura] of Object.entries(CASOS)) {
    await page.route('**/api/devices/*/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ device: {}, status: { online: true, state: 'off', ...lectura } }),
      }));

    const resultado = {};
    for (const [nombre, url] of [['home', '/'], ['sala', '/sala'], ['carpa', CARPA]]) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3500);
      resultado[nombre] = await tonos(page);
      await page.screenshot({ path: `${SHOTS}/color-${caso}-${nombre}.png`, fullPage: true });
    }
    out[caso] = resultado;
    await page.unroute('**/api/devices/*/status');
  }

  fs.writeFileSync('/tmp/rangos-evidencia/qa-colores.json', JSON.stringify(out, null, 2));
  for (const [caso, r] of Object.entries(out)) {
    console.log(`\n=== ${caso} ===`);
    for (const [pantalla, vals] of Object.entries(r)) {
      console.log(' ', pantalla, JSON.stringify(vals));
    }
  }
  await browser.close();
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
