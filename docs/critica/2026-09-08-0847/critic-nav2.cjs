const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const EVID = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-0847';
const OUT = path.join(EVID, 'capturas');
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
const SECADO = '/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75';
const report = {};
function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error') bucket.push('console.error: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400) bucket.push(`HTTP ${r.status()}: ${r.url()}`); });
}
async function settle(page) { try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { await page.waitForTimeout(2000); } await page.waitForTimeout(800); }
async function login(ctx) {
  const p = await ctx.newPage(); await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.getByLabel('Email o usuario').fill(USER); await p.getByLabel('Contraseña').fill(PASS);
  await p.getByRole('button', { name: 'Iniciar sesión' }).click(); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 }); await settle(p); await p.close();
}
(async () => {
  const browser = await chromium.launch();
  // DESKTOP
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await login(ctx);
    const p = await ctx.newPage(); const errors = []; watch(p, errors); const r = {};
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
    const toggle = p.getByRole('button', { name: /Colapsar el menú/ });
    await toggle.click(); await p.waitForTimeout(500);
    r.collapsedWidth = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    r.ls = await p.evaluate(() => localStorage.getItem('cultivo.sidebar.collapsed'));
    await p.screenshot({ path: path.join(OUT, 'home-desktop-sidebar-colapsada.png') });
    await p.reload({ waitUntil: 'domcontentloaded' }); await settle(p);
    r.afterReloadWidth = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    await p.getByRole('button', { name: /Expandir el menú|Expandir/ }).click().catch(async () => { await p.locator('aside button[aria-label]').last().click(); });
    await p.waitForTimeout(400);
    r.expandedWidth = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    await p.getByRole('button', { name: 'Menú de usuario' }).click(); await p.waitForTimeout(500);
    r.userMenu = await p.evaluate(() => Array.from(document.querySelectorAll('[role=menu] [role^=menuitem]')).map(e => e.textContent.trim()));
    await p.screenshot({ path: path.join(OUT, 'home-desktop-menu-usuario.png') });
    await p.keyboard.press('Escape');
    // home alerts heading
    r.homeAlertsHeading = await p.evaluate(() => Array.from(document.querySelectorAll('h2')).map(h => h.parentElement?.innerText.replace(/\s+/g,' ').slice(0,120)));
    // Secado carpa (sensor offline con valor stale en el status)
    await p.goto(BASE + SECADO, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, 'carpa-secado-desktop.png'), fullPage: true });
    r.secado = await p.evaluate(() => ({ text: document.querySelector('main')?.innerText.replace(/\s+/g,' ').slice(0, 900), readings: Array.from(document.querySelectorAll('main *')).filter(e => /^\d+([.,]\d+)?\s?(°C|%|kPa)$/.test(e.textContent.trim())).map(e => e.textContent.trim() + ' [' + String(e.className).split(/\s+/).slice(0,5).join('.') + ']').slice(0, 12) }));
    // automatizaciones a 10s
    await p.goto(BASE + '/automatizaciones', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(10000);
    await p.screenshot({ path: path.join(OUT, 'automatizaciones-desktop-10s.png'), fullPage: true });
    r.automatizaciones10s = await p.evaluate(() => ({ h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()), text: document.querySelector('main')?.innerText.replace(/\s+/g,' ').slice(0, 300) }));
    // logout desde el menú de usuario
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
    await p.getByRole('button', { name: 'Menú de usuario' }).click(); await p.waitForTimeout(400);
    await p.getByRole('menuitem', { name: /Cerrar sesión/ }).click();
    try { await p.waitForURL('**/login**', { timeout: 15000 }); r.logout = { ok: true, url: p.url() }; } catch (e) { r.logout = { ok: false, url: p.url() }; }
    r.tokenAfterLogout = await p.evaluate(() => Object.keys(localStorage).filter(k => /token/i.test(k)));
    await p.screenshot({ path: path.join(OUT, 'logout-desktop.png') });
    r.errors = errors; report.desktop = r; await ctx.close();
  }
  // MOVIL
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await login(ctx);
    const p = await ctx.newPage(); const errors = []; watch(p, errors); const r = {};
    await p.goto(BASE + SECADO, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, 'carpa-secado-movil.png'), fullPage: true });
    r.secado = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, text: document.querySelector('main')?.innerText.replace(/\s+/g,' ').slice(0, 700) }));
    // seguimientos: selects nativos y ancho de botones
    await p.goto(BASE + '/seguimientos', { waitUntil: 'domcontentloaded' }); await settle(p);
    r.seguimientos = await p.evaluate(() => ({ selects: document.querySelectorAll('select').length, combos: document.querySelectorAll('[role=combobox]').length, buttons: Array.from(document.querySelectorAll('button')).filter(b => /Agregar Planta|Registrar Evento/.test(b.textContent)).map(b => { const x = b.getBoundingClientRect(); return b.textContent.trim() + ` l=${Math.round(x.left)} r=${Math.round(x.right)}`; }) }));
    // artefactos buscador
    await p.goto(BASE + '/artefactos', { waitUntil: 'domcontentloaded' }); await settle(p);
    r.artefactosSearch = await p.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => ({ ph: i.placeholder, w: Math.round(i.getBoundingClientRect().width) })));
    // logout desde el sheet Más
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
    await p.getByRole('button', { name: 'Más' }).tap(); await p.waitForTimeout(500);
    await p.getByRole('dialog').getByRole('button', { name: /Cerrar sesión/ }).tap();
    try { await p.waitForURL('**/login**', { timeout: 15000 }); r.logout = { ok: true, url: p.url() }; } catch (e) { r.logout = { ok: false, url: p.url() }; }
    await p.screenshot({ path: path.join(OUT, 'logout-movil.png') });
    r.errors = errors; report.movil = r; await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(EVID, 'critic-nav2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
