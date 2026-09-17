const { chromium } = require('playwright');
const path = require('node:path'); const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const EVID = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-0929'; const OUT = path.join(EVID, 'capturas');
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
const VEGE = '/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3';
async function settle(p) { try { await p.waitForLoadState('networkidle', { timeout: 15000 }); } catch { await p.waitForTimeout(2000); } await p.waitForTimeout(800); }
async function login(p) { await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await settle(p); await p.getByLabel('Email o usuario').fill(USER); await p.getByLabel('Contraseña').fill(PASS); await p.getByRole('button', { name: 'Iniciar sesión' }).click(); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 }); await settle(p); }
(async () => {
  const browser = await chromium.launch(); const report = {};
  // 1) logout desde la carpa Vegetativo (desktop): timeline
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const log = []; const t = { t0: Date.now() };
    p.on('request', (r) => { if (r.url().includes('/api/')) log.push({ t: Date.now() - t.t0, req: r.method() + ' ' + r.url().replace(BASE, ''), auth: !!r.headers()['authorization'] }); });
    p.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) log.push({ t: Date.now() - t.t0, res: r.status() + ' ' + r.url().replace(BASE, '') }); });
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push({ t: Date.now() - t.t0, console: m.type() + ': ' + m.text().slice(0, 150) }); });
    p.on('pageerror', (e) => log.push({ t: Date.now() - t.t0, pageerror: e.message.slice(0, 150) }));
    await login(p); await p.goto(BASE + VEGE, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(3000);
    const consolaAntes = log.filter(x => x.console || x.pageerror || x.res);
    await p.screenshot({ path: path.join(OUT, 'carpa-vegetativo-desktop.png'), fullPage: true });
    const vege = await p.evaluate(() => ({ text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 700), readings: Array.from(document.querySelectorAll('main *')).filter(e => /^\d+([.,]\d+)?\s?(°C|%|kPa|ppm)$/.test(e.textContent.trim())).map(e => e.textContent.trim() + ' [' + String(e.className).split(/\s+/).slice(0, 5).join('.') + ']').slice(0, 12) }));
    log.length = 0; t.t0 = Date.now(); log.push({ t: 0, mark: 'estable en ' + p.url() });
    await p.getByRole('button', { name: 'Menú de usuario' }).click(); await p.waitForTimeout(400); log.push({ t: Date.now() - t.t0, mark: 'click Cerrar sesión' });
    await p.getByRole('menuitem', { name: /Cerrar sesión/ }).click(); await p.waitForURL('**/login**', { timeout: 15000 }).catch(() => {}); log.push({ t: Date.now() - t.t0, mark: 'en ' + p.url() });
    await p.waitForTimeout(5000);
    report.logoutDesdeCarpa = { consolaAntes, vege, summary: { reqSinAuth: log.filter(x => x.req && !x.auth).length, http4xx: log.filter(x => x.res).length, consola: log.filter(x => x.console || x.pageerror).length }, log };
    await ctx.close();
  }
  // 2) móvil: buscador de artefactos escribe y filtra; carpa vegetativo móvil
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errors = [];
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); }); p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
    await login(p); await p.goto(BASE + '/artefactos', { waitUntil: 'domcontentloaded' }); await settle(p);
    const countNames = () => p.evaluate(() => { const main = document.querySelector('main'); const names = ['vege-led-150', 'vege-temp-hum', 'Termohigometro Indoor', 'Tapo Camara', 'flora-humidificador', 'Operación Tanque Riego', 'Switch Tanque Riego']; const txt = main.innerText; return { visibles: names.filter(n => txt.includes(n)), empty: /No hay dispositivos que coincidan/.test(txt), h2: Array.from(main.querySelectorAll('h2')).map(h => h.textContent.trim()).slice(0, 4) }; });
    const antes = await countNames();
    const input = p.getByPlaceholder('Buscar dispositivo...');
    const box = await input.boundingBox();
    await input.tap(); await input.fill('vege'); await p.waitForTimeout(800);
    const conVege = await countNames(); await p.screenshot({ path: path.join(OUT, 'artefactos-movil-busqueda-vege.png'), fullPage: true });
    await input.fill('zzzz'); await p.waitForTimeout(800); const sinMatch = await countNames(); await p.screenshot({ path: path.join(OUT, 'artefactos-movil-busqueda-vacia.png') });
    report.artefactosBusqueda = { inputBox: box, antes, conVege, sinMatch, sw: await p.evaluate(() => document.documentElement.scrollWidth) };
    await p.goto(BASE + VEGE, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, 'carpa-vegetativo-movil.png'), fullPage: true });
    report.vegeMovil = { sw: await p.evaluate(() => document.documentElement.scrollWidth), text: await p.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 500)) };
    // notificaciones: tipos de control
    await p.goto(BASE + '/notificaciones', { waitUntil: 'domcontentloaded' }); await settle(p);
    report.notificaciones = await p.evaluate(() => ({ nativeCheckbox: document.querySelectorAll('input[type=checkbox]').length, radixCheckbox: document.querySelectorAll('[role=checkbox]').length, emojis: (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length, sw: document.documentElement.scrollWidth, sample: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 400) }));
    report.movilErrors = errors; await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(EVID, 'critic-extra.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ logoutDesdeCarpa: { consolaAntes: report.logoutDesdeCarpa.consolaAntes, summary: report.logoutDesdeCarpa.summary, vege: report.logoutDesdeCarpa.vege, primeros: report.logoutDesdeCarpa.log.slice(0, 12) }, artefactosBusqueda: report.artefactosBusqueda, vegeMovil: report.vegeMovil, notificaciones: report.notificaciones, movilErrors: report.movilErrors }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
