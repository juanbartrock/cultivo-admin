/**
 * QA navegado del hallazgo 2 (rangos por etapa) contra producción.
 * Recorre home, carpa y /admin/rangos en desktop y móvil, prueba la validación del formulario
 * y cancela sin guardar. No escribe nada en la base.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');

const BASE = 'https://cultivo.ramsesvii.com';
const SHOTS = '/opt/apps/cultivo-admin/docs/rediseno-2026-09/capturas/rangos-20260908';
const USER = process.env.CULTIVO_ADMIN_USER;
const PASS = process.env.CULTIVO_ADMIN_PASSWORD;
const out = { viewports: {}, errors: [] };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', USER);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
}

async function run(name, width, height) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

  const res = { errors, steps: {} };
  await login(page);

  // --- HOME ---
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  res.steps.homeBadges = await page.$$eval('span', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => t.startsWith('Rangos:')));
  res.steps.homeScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${SHOTS}/home-${name}.png`, fullPage: true });

  // --- CARPA (la primera tarjeta) ---
  const carpaHref = await page.$eval('a[href^="/sala/carpa/"]', (a) => a.getAttribute('href'));
  await page.goto(`${BASE}${carpaHref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  res.steps.carpaHref = carpaHref;
  res.steps.carpaRangos = await page.$$eval('span', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => t.startsWith('Rangos:')));
  res.steps.carpaIdeal = await page.$$eval('p', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => t.startsWith('Ideal ')));
  res.steps.carpaScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${SHOTS}/carpa-${name}.png`, fullPage: true });

  // --- /admin/rangos ---
  await page.goto(`${BASE}/admin/rangos`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  res.steps.rangosUrl = page.url();
  res.steps.rangosFilas = await page.$$eval('td:first-child, .md\\:hidden p.text-sm', (els) =>
    els.map((e) => e.textContent.trim()));
  res.steps.rangosScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${SHOTS}/admin-rangos-${name}.png`, fullPage: true });

  // --- Editar VEGETATIVO: validación y cancelar ---
  const botones = await page.$$('button[aria-label^="Editar rangos de"]');
  res.steps.botonesEditar = botones.length;
  const objetivo = page.locator('button[aria-label="Editar rangos de Vegetativo"]:visible').first();
  await objetivo.click();
  await page.waitForSelector('#tempIdealMin', { timeout: 10000 });
  res.steps.dialogoAbierto = true;
  res.steps.valorOriginalTempIdealMin = await page.inputValue('#tempIdealMin');
  await page.screenshot({ path: `${SHOTS}/dialogo-${name}.png` });

  // min > max debe rechazarse
  await page.fill('#tempIdealMin', '30');
  await page.waitForTimeout(400);
  res.steps.errorValidacion = await page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()));
  res.steps.guardarDeshabilitado = await page
    .locator('button:has-text("Guardar"):visible').first().isDisabled();
  await page.screenshot({ path: `${SHOTS}/dialogo-invalido-${name}.png` });

  // amplio que no contiene al ideal
  await page.fill('#tempIdealMin', '18');
  await page.fill('#tempWideMin', '20');
  await page.waitForTimeout(400);
  res.steps.errorContiene = await page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()));

  // CANCELAR sin guardar
  await page.locator('button:has-text("Cancelar"):visible').first().click();
  await page.waitForTimeout(1000);
  res.steps.dialogoCerrado = (await page.$('#tempIdealMin')) === null;
  await page.screenshot({ path: `${SHOTS}/admin-rangos-tras-cancelar-${name}.png`, fullPage: true });

  // los valores en pantalla siguen intactos
  res.steps.tablaTrasCancelar = await page.$$eval('td, dd', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => /^\d/.test(t)).slice(0, 8));

  await browser.close();
  out.viewports[name] = res;
}

(async () => {
  await run('desktop', 1440, 900);
  await run('movil', 390, 844);
  fs.writeFileSync('/tmp/rangos-evidencia/qa-rangos.json', JSON.stringify(out, null, 2));
  for (const [name, res] of Object.entries(out.viewports)) {
    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(res.steps, null, 1));
    console.log('errores:', res.errors.length, res.errors.slice(0, 8));
  }
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
