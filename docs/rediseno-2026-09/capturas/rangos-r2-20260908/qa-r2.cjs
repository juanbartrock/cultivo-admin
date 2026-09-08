/**
 * QA navegado de la ronda 2: /sala con la fuente compartida, footer del diálogo dentro del
 * viewport en móvil y errores por campo visibles. No guarda nada.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const SHOTS = '/opt/apps/cultivo-admin/docs/rediseno-2026-09/capturas/rangos-r2-20260908';
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
  const writes = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('request', (r) => { if (['PUT', 'PATCH', 'POST', 'DELETE'].includes(r.method()) && r.url().includes('/api/') && !r.url().includes('/auth/login')) writes.push(`${r.method()} ${r.url()}`); });

  const steps = {};
  await login(page);

  // --- H1: /sala con lecturas de la fuente compartida ---
  await page.goto(`${BASE}/sala`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  steps.salaTarjetas = await page.$$eval('a[href^="/sala/carpa/"]', (links) =>
    links.map((a) => {
      const card = a.parentElement;
      return { href: a.getAttribute('href'), texto: (card?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
    }));
  steps.salaOffline = await page.$$eval('span', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) => t === 'Sensor sin respuesta').length);
  steps.salaScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${SHOTS}/sala-${name}.png`, fullPage: true });

  // --- Home, para comparar la misma carpa ---
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  steps.homeSecado = await page.$$eval('a[href^="/sala/carpa/"]', (links) =>
    links.map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t.startsWith('Secado')));
  await page.screenshot({ path: `${SHOTS}/home-${name}.png`, fullPage: true });

  // --- H2 y H3: diálogo ---
  await page.goto(`${BASE}/admin/rangos`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('button[aria-label="Editar rangos de Vegetativo"]:visible').first().click();
  await page.waitForSelector('#tempIdealMin', { timeout: 10000 });
  await page.waitForTimeout(500);

  const rectOf = async (sel) => page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), innerHeight: window.innerHeight, inside: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  steps.footerCancelar = await rectOf('button:has-text("Cancelar"):visible');
  steps.footerGuardar = await rectOf('button:has-text("Guardar"):visible');
  await page.screenshot({ path: `${SHOTS}/dialogo-abierto-${name}.png` });

  // H3: texto
  await page.fill('#tempIdealMin', 'abc');
  await page.waitForTimeout(400);
  steps.caseTexto = {
    alerts: await page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).filter(Boolean)),
    saveEnabled: !(await page.locator('button:has-text("Guardar"):visible').first().isDisabled()),
  };
  await page.screenshot({ path: `${SHOTS}/dialogo-texto-${name}.png` });

  // H3: vacío
  await page.fill('#tempIdealMin', '');
  await page.waitForTimeout(400);
  steps.caseVacio = {
    alerts: await page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).filter(Boolean)),
    saveEnabled: !(await page.locator('button:has-text("Guardar"):visible').first().isDisabled()),
  };

  // min > max
  await page.fill('#tempIdealMin', '30');
  await page.waitForTimeout(400);
  steps.caseMinMayorMax = {
    alerts: await page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).filter(Boolean)),
    saveEnabled: !(await page.locator('button:has-text("Guardar"):visible').first().isDisabled()),
  };
  steps.footerTrasErrores = await rectOf('button:has-text("Guardar"):visible');

  await page.locator('button:has-text("Cancelar"):visible').first().click();
  await page.waitForTimeout(1200);
  steps.dialogoCerrado = (await page.$('#tempIdealMin')) === null;
  await page.screenshot({ path: `${SHOTS}/admin-rangos-tras-cancelar-${name}.png`, fullPage: true });

  steps.escrituras = writes;
  out[name] = { steps, errors };
  await browser.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await run('desktop', 1440, 900);
  await run('movil', 390, 844);
  fs.writeFileSync('/tmp/rangos-evidencia/qa-r2.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
