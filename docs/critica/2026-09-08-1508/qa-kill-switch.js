// Crítico 2026-09-08-1508: navegación real contra producción, sin escrituras.
const { chromium, devices } = require('/opt/apps/cultivo-admin/frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const EV = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-1508';
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
const ROUTES = [
  { slug: 'home', path: '/' },
  { slug: 'sala', path: '/sala' },
  { slug: 'carpa', resolve: true },
  { slug: 'seguimientos', path: '/seguimientos' },
  { slug: 'automatizaciones', path: '/automatizaciones' },
  { slug: 'artefactos', path: '/artefactos' },
  { slug: 'notificaciones', path: '/notificaciones' },
  { slug: 'admin-usuarios', path: '/admin/usuarios' },
];

async function mockWeather(page) {
  await page.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ results: [{ latitude: -34.6, longitude: -58.4, name: 'Buenos Aires', country: 'Argentina' }] }) }));
  await page.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ current: { temperature_2m: 24.8, relative_humidity_2m: 61, weather_code: 1 } }) }));
}
async function settle(page) { try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { await page.waitForTimeout(2000); } }

(async () => {
  const browser = await chromium.launch();
  const report = [];
  // Login una vez
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
      const errors = [], statusReqs = [], writes = [];
      page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 300)); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('response', r => { if (r.status() >= 500) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
      page.on('request', r => {
        const u = r.url();
        if (/\/api\/devices\/[^/]+\/status/.test(u)) statusReqs.push(u.replace(BASE + '/api/devices/', '').replace('/status', ''));
        if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(r.method()) && u.includes('/api/') && !u.includes('/auth/')) writes.push(r.method() + ' ' + u);
      });
      let target = route.path;
      if (route.resolve) {
        await page.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(page);
        target = await page.locator('a[href^="/sala/carpa/"]').first().getAttribute('href');
      }
      const t0 = Date.now();
      await page.goto(BASE + target, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.waitForTimeout(3000);
      const r = { viewport: vp.name, route: target, errors, statusReqs, writes };
      r.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      r.innerWidth = await page.evaluate(() => window.innerWidth);
      if (vp.name === 'mobile') {
        const nav = page.locator('nav.fixed.bottom-0');
        r.tabBar = await nav.count() ? await nav.first().boundingBox() : null;
        if (r.tabBar) {
          r.tabBarTopElement = await page.evaluate(() => { const n = document.querySelector('nav.fixed.bottom-0'); const b = n.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return el ? (n.contains(el) ? 'dentro de nav' : el.tagName + '.' + el.className.toString().slice(0, 60)) : null; });
        }
      }
      // Marcadores de la feature
      r.textos = {
        'Lecturas desactivadas': await page.getByText('Lecturas desactivadas', { exact: true }).count(),
        'Sensor sin respuesta': await page.getByText('Sensor sin respuesta', { exact: true }).count(),
        'Lecturas de sensores': await page.getByText('Lecturas de sensores', { exact: true }).count(),
        'Desactivadas': await page.getByText('Desactivadas', { exact: true }).count(),
        'Lecturas off': await page.getByText('Lecturas off', { exact: true }).count(),
        'General off': await page.getByText('General off', { exact: true }).count(),
      };
      r.switches = await page.locator('[role="switch"]').evaluateAll(els => els.map(e => ({ id: e.id, label: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked'), disabled: e.disabled, visible: !!(e.offsetWidth || e.offsetHeight) })));
      r.dashes = await page.locator('text=/^—$/').count();
      r.zeros = await page.locator('text=/^0(\\.0)?\\s*(°C|%|kPa)$/').count();
      await page.screenshot({ path: path.join(SHOTS, `${route.slug}-${vp.name}.png`), fullPage: true });
      // Captura del viewport tal cual (para la tab bar)
      if (vp.name === 'mobile' && ['home', 'artefactos'].includes(route.slug)) await page.screenshot({ path: path.join(SHOTS, `${route.slug}-${vp.name}-viewport.png`), fullPage: false });
      r.ms = Date.now() - t0;
      report.push(r);
      console.log(JSON.stringify(r));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(EV, 'qa-kill-switch.json'), JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
