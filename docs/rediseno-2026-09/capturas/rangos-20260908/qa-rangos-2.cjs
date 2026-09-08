/** Segunda pasada: carpa Secado (etapa efectiva CURADO por desempate) y sheet "Más" en móvil. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const SHOTS = '/opt/apps/cultivo-admin/docs/rediseno-2026-09/capturas/rangos-20260908';
const out = {};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', process.env.CULTIVO_ADMIN_USER);
  await page.fill('input[type="password"]', process.env.CULTIVO_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function run(name, width, height) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await login(page);

  // Carpa Secado: 1 planta SECADO + 1 CURADO -> empate, gana la más avanzada
  await page.goto(`${BASE}/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const rangos = await page.$$eval('span, div', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => /^Rangos: /.test(t) && t.length < 40));
  await page.screenshot({ path: `${SHOTS}/carpa-secado-${name}.png`, fullPage: true });

  const steps = { carpaSecadoRangos: [...new Set(rangos)] };

  if (name === 'movil') {
    // El ítem "Rangos" tiene que estar en el sheet "Más"
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("Más"):visible').first().click();
    await page.waitForTimeout(800);
    steps.sheetItems = await page.$$eval('[role="dialog"] a span', (els) => els.map((e) => e.textContent.trim()));
    await page.screenshot({ path: `${SHOTS}/mas-sheet-movil.png` });
    await page.locator('[role="dialog"] a:has-text("Rangos")').click();
    await page.waitForTimeout(2500);
    steps.urlDesdeSheet = page.url();
    await page.screenshot({ path: `${SHOTS}/admin-rangos-desde-sheet-movil.png`, fullPage: true });
  }

  out[name] = { steps, errors };
  await browser.close();
}

(async () => {
  await run('desktop', 1440, 900);
  await run('movil', 390, 844);
  fs.writeFileSync('/tmp/rangos-evidencia/qa-rangos-2.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
