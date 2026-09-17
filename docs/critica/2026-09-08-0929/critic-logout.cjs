const { chromium } = require('playwright');
const BASE = 'https://cultivo.ramsesvii.com';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
async function login(p) {
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await p.getByLabel('Email o usuario').fill(USER); await p.getByLabel('Contraseña').fill(PASS);
  await p.getByRole('button', { name: 'Iniciar sesión' }).click(); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(3000);
}
function watch(p, log, t0ref) {
  p.on('request', (r) => { if (r.url().includes('/api/')) log.push({ t: Date.now() - t0ref.t0, req: r.method() + ' ' + r.url().replace(BASE, ''), auth: !!r.headers()['authorization'] }); });
  p.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) log.push({ t: Date.now() - t0ref.t0, res: r.status() + ' ' + r.url().replace(BASE, '') }); });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push({ t: Date.now() - t0ref.t0, console: m.type() + ': ' + m.text().slice(0, 120) }); });
  p.on('pageerror', (e) => log.push({ t: Date.now() - t0ref.t0, pageerror: e.message.slice(0, 120) }));
}
(async () => {
  const browser = await chromium.launch();
  const all = {};
  for (const [name, opts, from] of [
    ['desktop-1', { viewport: { width: 1440, height: 900 } }, 'menu'],
    ['desktop-2', { viewport: { width: 1440, height: 900 } }, 'menu'],
    ['desktop-3', { viewport: { width: 1440, height: 900 } }, 'menu'],
    ['movil-sheet-1', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'sheet'],
    ['movil-sheet-2', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'sheet'],
    ['desktop-desde-sala', { viewport: { width: 1440, height: 900 } }, 'menu-sala'],
  ]) {
    const ctx = await browser.newContext(opts); const p = await ctx.newPage(); const log = []; const t0ref = { t0: Date.now() }; watch(p, log, t0ref);
    await login(p);
    if (from === 'menu-sala') { await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(3000); }
    log.length = 0; t0ref.t0 = Date.now(); log.push({ t: 0, mark: 'estable en ' + p.url() });
    if (from.startsWith('menu')) { await p.getByRole('button', { name: 'Menú de usuario' }).click(); await p.waitForTimeout(400); log.push({ t: Date.now() - t0ref.t0, mark: 'click Cerrar sesión' }); await p.getByRole('menuitem', { name: /Cerrar sesión/ }).click(); }
    else { await p.getByRole('button', { name: 'Más' }).tap(); await p.waitForTimeout(500); log.push({ t: Date.now() - t0ref.t0, mark: 'tap Cerrar sesión (sheet)' }); await p.getByRole('dialog').getByRole('button', { name: /Cerrar sesión/ }).tap(); }
    await p.waitForURL('**/login**', { timeout: 15000 }).catch(() => {});
    log.push({ t: Date.now() - t0ref.t0, mark: 'en ' + p.url() });
    await p.waitForTimeout(5000);
    const tokens = await p.evaluate(() => Object.keys(localStorage).filter(k => /token|session/i.test(k)));
    const summary = { reqSinAuth: log.filter(x => x.req && !x.auth).length, reqTotal: log.filter(x => x.req).length, http4xx: log.filter(x => x.res).length, consola: log.filter(x => x.console || x.pageerror).length, tokensRestantes: tokens };
    all[name] = { summary, log };
    console.log(name, JSON.stringify(summary));
    await ctx.close();
  }
  require('node:fs').writeFileSync('/opt/apps/cultivo-admin/docs/critica/2026-09-08-0929/critic-logout.json', JSON.stringify(all, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
