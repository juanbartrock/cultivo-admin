const { chromium } = require('playwright');
const path = require('node:path');
const BASE = 'https://cultivo.ramsesvii.com';
const OUT = '/tmp/verif-r2/capturas';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
if (!USER || !PASS) { console.error('sin credenciales'); process.exit(2); }

const SECADO = 'ba2f7493-8f0b-45f1-99b6-5427d014de75';
const ROUTES = [
  ['home', '/'], ['sala', '/sala'], ['seguimientos', '/seguimientos'],
  ['automatizaciones', '/automatizaciones'], ['artefactos', '/artefactos'],
  ['notificaciones', '/notificaciones'], ['admin-usuarios', '/admin/usuarios'],
];
const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const out = {};

// #7: la consola se mira entera, warnings incluidos
function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') bucket.push(m.type() + ': ' + m.text().slice(0, 160)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 160)));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) bucket.push(`HTTP ${r.status()}: ${r.url().replace(BASE,'')}`); });
}
async function settle(p) { try { await p.waitForLoadState('networkidle', { timeout: 15000 }); } catch {} await p.waitForTimeout(800); }
async function login(ctx) {
  const p = await ctx.newPage();
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.getByLabel('Email o usuario').fill(USER); await p.getByLabel('Contraseña').fill(PASS);
  await p.getByRole('button', { name: 'Iniciar sesión' }).click();
  await p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 }); await settle(p); await p.close();
}

// #3: cualquier elemento de lectura con color de estado dentro del panel de ambiente
const SECADO_SCAN = () => {
  const bad = [];
  const COLORS = ['text-blue-400', 'text-orange-400', 'text-danger', 'text-warn', 'text-cultivo-green-400'];
  for (const el of document.querySelectorAll('main *')) {
    const cls = String(el.className);
    if (!/text-3xl|text-2xl|font-bold/.test(cls)) continue;
    for (const c of COLORS) if (cls.split(/\s+/).includes(c)) bad.push(el.tagName.toLowerCase() + ' "' + el.textContent.trim().slice(0, 20) + '" ' + c);
  }
  const metrics = Array.from(document.querySelectorAll('main .grid > div')).map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 60)).filter(t => /Temperatura|Humedad|CO₂|VPD/.test(t));
  return { coloredReadings: bad, metrics, mainText: document.querySelector('main')?.innerText.replace(/\s+/g,' ').slice(0, 320) };
};

(async () => {
  const browser = await chromium.launch();

  // ---- #7 consola limpia + #4 buscador + #3 carpa Secado, en los dos viewports ----
  for (const [vp, opts] of [['movil', MOVIL], ['desktop', DESKTOP]]) {
    const ctx = await browser.newContext(opts); await login(ctx);
    out[vp] = { routes: {} };
    for (const [slug, route] of ROUTES) {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await settle(p);
      const rec = { console: errors };
      if (slug === 'artefactos') {
        rec.search = await p.evaluate(() => {
          const i = document.querySelector('input[placeholder="Buscar dispositivo..."]');
          return i ? { ph: i.placeholder, w: Math.round(i.getBoundingClientRect().width) } : null;
        });
        // escribir de verdad y comprobar que filtra
        await p.fill('input[placeholder="Buscar dispositivo..."]', 'vege');
        await p.waitForTimeout(600);
        rec.searchTyped = await p.evaluate(() => ({
          value: document.querySelector('input[placeholder="Buscar dispositivo..."]')?.value ?? null,
          rows: document.querySelectorAll('main table tbody tr, main [data-device-row]').length,
        }));
        await p.screenshot({ path: path.join(OUT, `artefactos-${vp}-buscador.png`) });
      }
      out[vp].routes[slug] = rec;
      await p.close();
    }
    // carpa Secado
    {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(`${BASE}/sala/carpa/${SECADO}`, { waitUntil: 'domcontentloaded' }); await settle(p);
      await p.waitForTimeout(2500);
      out[vp].secado = { console: errors, ...(await p.evaluate(SECADO_SCAN)) };
      await p.screenshot({ path: path.join(OUT, `carpa-secado-${vp}.png`), fullPage: false });
      await p.close();
    }
    await ctx.close();
  }

  // ---- #1 logout desde el sheet Más en 390 px ----
  {
    const ctx = await browser.newContext(MOVIL); await login(ctx);
    const p = await ctx.newPage(); const log = []; let t0 = Date.now();
    p.on('request', r => { if (r.url().includes('/api/')) log.push({ t: Date.now()-t0, req: r.method()+' '+r.url().replace(BASE,''), auth: !!r.headers()['authorization'] }); });
    p.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) log.push({ t: Date.now()-t0, res: r.status()+' '+r.url().replace(BASE,'') }); });
    p.on('console', m => { if (m.type() === 'error') log.push({ t: Date.now()-t0, console: m.text().slice(0,120) }); });
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(3000);
    log.length = 0; t0 = Date.now(); log.push({ t: 0, mark: 'estable en /, tap en Más' });
    await p.getByRole('button', { name: 'Más' }).tap(); await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, 'mas-sheet-movil.png') });
    log.push({ t: Date.now()-t0, mark: 'tap Cerrar sesión' });
    await p.getByRole('button', { name: /Cerrar sesión/ }).tap();
    await p.waitForURL('**/login**', { timeout: 15000 }).catch(() => {});
    log.push({ t: Date.now()-t0, mark: 'en ' + p.url() });
    await p.waitForTimeout(4000);
    await p.screenshot({ path: path.join(OUT, 'logout-movil.png') });
    out.logoutMovil = log;
    await p.close(); await ctx.close();
  }

  // ---- #8 sensor con metadata en la base y sin status: no debe pintar color ----
  {
    const ctx = await browser.newContext(DESKTOP); await login(ctx);
    const p = await ctx.newPage(); const errors = []; watch(p, errors);
    // se le mete metadata al sensor y se hace fallar /status, que es el escenario del hallazgo
    await p.route('**/api/sections', async (route) => {
      const res = await route.fetch(); const body = await res.json();
      const patched = body.map(s => ({ ...s, devices: (s.devices ?? []).map(d =>
        d.type === 'SENSOR' ? { ...d, metadata: { temperature: 41.5, humidity: 12 } } : d) }));
      await route.fulfill({ response: res, json: patched });
    });
    await p.route('**/api/devices/*/status', route => route.abort());
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(2500);
    out.metadataFallback = await p.evaluate(() => Array.from(document.querySelectorAll('a[href^="/sala/carpa/"]'))
      .filter(a => a.querySelector('.tabular-nums'))
      .map(a => ({ text: a.innerText.replace(/\s+/g,' ').slice(0,110),
                   danger: a.querySelectorAll('.text-danger').length,
                   warn: a.querySelectorAll('.text-warn').length,
                   has415: a.innerText.includes('41.5') || a.innerText.includes('41,5') })));
    await p.screenshot({ path: path.join(OUT, 'home-metadata-sin-status.png') });
    await p.close(); await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
