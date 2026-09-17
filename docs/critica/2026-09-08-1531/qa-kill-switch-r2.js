// Crítico 2026-09-08-1531 (ronda 2): navegación real contra producción, sin escrituras.
// El POST /control se intercepta en el navegador (route.fulfill): nunca llega al backend.
const { chromium } = require('/opt/apps/cultivo-admin/frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const EV = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-1531';
const SHOTS = path.join(EV, 'capturas');
const BASE = 'https://cultivo.ramsesvii.com';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
if (!USER || !PASS) { console.error('faltan credenciales'); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' } },
];
const CARPA = '/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3'; // Vegetativo: vege-temp-hum (SENSOR) + vege-led-150 (LUZ pausada)
const ROUTES = [
  { slug: 'home', path: '/', wait: 40000 },
  { slug: 'sala', path: '/sala' },
  { slug: 'carpa', path: CARPA, wait: 40000 },
  { slug: 'seguimientos', path: '/seguimientos' },
  { slug: 'automatizaciones', path: '/automatizaciones' },
  { slug: 'artefactos', path: '/artefactos' },
  { slug: 'notificaciones', path: '/notificaciones' },
  { slug: 'admin-usuarios', path: '/admin/usuarios' },
];
const PAUSADOS = { 'c04963d5-c091-426f-9618-4e61ac8c015a': 'Termohigometro Indoor', 'cecc8d14-269c-4ccb-ae1c-a1dc3b366a1a': 'vege-led-150',
  'ac4df493-f610-4106-81f2-020bd3cac85a': 'vege-temp-hum', '9f253b4a-956f-46f3-b62a-0daff1a32e21': 'Operación Tanque Riego', '8b43633a-a49f-4634-823d-f49ff1492b3f': 'Switch Tanque Riego' };

async function mockWeather(page) {
  await page.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ results: [{ latitude: -34.6, longitude: -58.4, name: 'Buenos Aires', country: 'Argentina' }] }) }));
  await page.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ current: { temperature_2m: 24.8, relative_humidity_2m: 61, weather_code: 1 } }) }));
}
async function settle(page) { try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { await page.waitForTimeout(2000); } }
const rects = (page, text) => page.evaluate((t) => {
  const els = [...document.querySelectorAll('span,p,button,div,h3,a')].filter(e => e.childElementCount === 0 ? e.textContent.trim() === t : false);
  return els.map(e => { const r = e.getBoundingClientRect(); return { rects: e.getClientRects().length, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height) }; });
}, text);

(async () => {
  const browser = await chromium.launch();
  const report = [];
  const ctx0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p0 = await ctx0.newPage();
  await p0.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await p0.getByLabel('Email o usuario').fill(USER);
  await p0.getByLabel('Contraseña').fill(PASS);
  await p0.getByRole('button', { name: 'Iniciar sesión' }).click();
  await p0.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 });
  await p0.waitForFunction(() => !!window.localStorage.getItem('access_token'), null, { timeout: 15000 });
  const state = await ctx0.storageState();
  await ctx0.close();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ ...vp.opts, storageState: state });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      await mockWeather(page);
      const errors = [], statusReqs = [], writes = [], controlReqs = [];
      page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 300)); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('response', r => { if (r.status() >= 500) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
      page.on('request', r => {
        const u = r.url();
        if (/\/api\/devices\/[^/]+\/status/.test(u)) { const id = u.replace(BASE + '/api/devices/', '').replace('/status', ''); statusReqs.push(PAUSADOS[id] ? `PAUSADO:${PAUSADOS[id]}` : id); }
        if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(r.method()) && u.includes('/api/') && !u.includes('/auth/')) writes.push(r.method() + ' ' + u);
      });
      // El comando de control se intercepta: no llega al servidor.
      await page.route('**/api/devices/*/control', r => { controlReqs.push(r.request().method() + ' ' + r.request().url().replace(BASE, '') + ' ' + r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { success: true } }) }); });
      const t0 = Date.now();
      await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.waitForTimeout(route.wait || 3000);
      const r = { viewport: vp.name, route: route.path, ms: Date.now() - t0, errors, statusReqs, writes };
      r.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      r.innerWidth = await page.evaluate(() => window.innerWidth);
      if (vp.name === 'mobile') {
        const nav = page.locator('nav.fixed.bottom-0');
        r.tabBar = await nav.count() ? await nav.first().boundingBox() : null;
        if (r.tabBar) r.tabBarTopElement = await page.evaluate(() => { const n = document.querySelector('nav.fixed.bottom-0'); const b = n.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return el ? (n.contains(el) ? 'dentro de nav' : el.tagName + '.' + el.className.toString().slice(0, 60)) : null; });
      }
      r.textos = {};
      for (const t of ['Lecturas desactivadas', 'Sensor sin respuesta', 'Lecturas de sensores', 'Desactivadas', 'Lecturas off', 'General off', 'Todo en rango', 'Estado desconocido', 'Apagado', 'Encendido', 'Encender', 'Apagar', 'Sin datos del sensor'])
        r.textos[t] = await page.getByText(t, { exact: true }).count();
      r.switches = await page.locator('[role="switch"]').evaluateAll(els => els.map(e => ({ label: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked'), disabled: e.disabled, visible: !!(e.offsetWidth || e.offsetHeight) })));
      r.dashes = await page.locator('text=/^—$/').count();
      r.zeros = await page.locator('text=/^0(\\.0)?\\s*(°C|%|kPa|ppm)$/').count();
      await page.screenshot({ path: path.join(SHOTS, `${route.slug}-${vp.name}.png`), fullPage: true });
      if (vp.name === 'mobile' && ['home', 'artefactos', 'carpa'].includes(route.slug)) await page.screenshot({ path: path.join(SHOTS, `${route.slug}-${vp.name}-viewport.png`), fullPage: false });

      if (route.slug === 'carpa') {
        // Hallazgo 1: actuador pausado controlable, sin "Apagado" inventado.
        const encender = page.getByRole('button', { name: 'Encender' }).first();
        r.encenderDisabled = await encender.count() ? await encender.isDisabled() : null;
        if (await encender.count()) {
          await encender.scrollIntoViewIfNeeded();
          await encender.click();
          await page.waitForTimeout(1500);
          r.controlReqs = controlReqs;
          await page.screenshot({ path: path.join(SHOTS, `carpa-${vp.name}-tras-encender.png`), fullPage: true });
        }
        // Hallazgo 5: fila del sensor a 390.
        r.sensorRow = {};
        for (const t of ['vege-temp-hum', 'Lecturas desactivadas', 'Rangos: Por defecto', 'Lecturas', 'Historial pausado', 'Historial OFF'])
          r.sensorRow[t] = await rects(page, t);
      }
      report.push(r);
      console.log(JSON.stringify(r));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(EV, 'qa-kill-switch-r2.json'), JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
