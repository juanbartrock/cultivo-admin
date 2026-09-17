const { chromium } = require('playwright');
const path = require('node:path');
const BASE = 'https://cultivo.ramsesvii.com';
const OUT = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-0745/capturas';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
const out = {};
function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error') bucket.push('console.error: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 500) bucket.push(`HTTP ${r.status()}: ${r.url()}`); });
}
async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email o usuario').fill(USER); await page.getByLabel('Contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  await page.waitForFunction(() => !!localStorage.getItem('access_token'));
  await page.close();
}
(async () => {
  const browser = await chromium.launch();
  // DESKTOP
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await login(ctx);
    const p = await ctx.newPage(); const errors = []; watch(p, errors);
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
    const r = { errors };
    const buttons = await p.evaluate(() => Array.from(document.querySelectorAll('aside button')).map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent.trim().slice(0, 40) })));
    r.asideButtons = buttons;
    const toggle = p.locator('aside button[aria-label*="olapsar"], aside button[aria-label*="Contraer"], aside button[aria-label*="Expandir"], aside button[aria-label*="menú lateral" i]').first();
    if (await toggle.count()) {
      r.toggleLabel = await toggle.getAttribute('aria-label');
      await toggle.click(); await p.waitForTimeout(500);
      r.collapsedWidth = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
      r.ls = await p.evaluate(() => localStorage.getItem('cultivo.sidebar.collapsed'));
      await p.screenshot({ path: path.join(OUT, 'home-desktop-sidebar-colapsada.png') });
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
      r.collapsedAfterReload = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
      await p.locator('aside button[aria-label*="olapsar"], aside button[aria-label*="Contraer"], aside button[aria-label*="Expandir"], aside button[aria-label*="menú lateral" i]').first().click(); await p.waitForTimeout(400);
      r.expandedWidth = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    }
    await p.locator('aside button[aria-label="Menú de usuario"]').click(); await p.waitForTimeout(500);
    r.userMenu = await p.evaluate(() => Array.from(document.querySelectorAll('[role=menu] [role^=menuitem]')).map(e => e.textContent.trim()));
    await p.screenshot({ path: path.join(OUT, 'home-desktop-menu-usuario.png') });
    await p.keyboard.press('Escape');
    out.desktopSidebar = r;

    // automatizaciones: esperar más y ver qué hay
    const a = await ctx.newPage(); const aerr = []; watch(a, aerr);
    const t0 = Date.now();
    await a.goto(BASE + '/automatizaciones', { waitUntil: 'domcontentloaded' });
    const st = { errors: aerr, samples: [] };
    for (const wait of [1000, 3000, 6000, 10000]) {
      await a.waitForTimeout(wait - (st.samples.length ? st.samples[st.samples.length - 1].t : 0));
      st.samples.push({ t: wait, text: (await a.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 220))), spinner: await a.evaluate(() => !!document.querySelector('main .animate-spin')) });
    }
    await a.screenshot({ path: path.join(OUT, 'automatizaciones-desktop-10s.png'), fullPage: true });
    st.pending = await a.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('/api/')).map(e => e.name.replace('https://cultivo.ramsesvii.com', '') + ' ' + Math.round(e.duration) + 'ms').slice(-15));
    out.automatizaciones = st; await a.close();

    // seguimientos: qué son los <select> y el 0%
    const s = await ctx.newPage(); await s.goto(BASE + '/seguimientos', { waitUntil: 'domcontentloaded' }); await s.waitForLoadState('networkidle').catch(() => {}); await s.waitForTimeout(1000);
    out.seguimientos = await s.evaluate(() => ({
      selects: Array.from(document.querySelectorAll('select')).map(el => ({ opts: Array.from(el.options).map(o => o.text).slice(0, 5), visible: !!(el.offsetWidth || el.offsetHeight), ctx: el.closest('div')?.parentElement?.innerText.replace(/\s+/g, ' ').slice(0, 120) })),
      zeroCtx: (() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const hits = []; while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (/^0%$/.test(t)) hits.push(w.currentNode.parentElement.parentElement.innerText.replace(/\s+/g, ' ').slice(0, 160)); } return hits; })(),
      combos: Array.from(document.querySelectorAll('[role=combobox]')).map(e => e.textContent.trim()),
    }));
    await s.close();
    await ctx.close();
  }
  // MOBILE: carpa title timing, Más desde seguimientos con detalle, tap real en tab bar
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' });
    await login(ctx);
    const p = await ctx.newPage(); const errs = []; watch(p, errs);
    await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
    await p.locator('a[href^="/sala/carpa/"]').first().click();
    const samples = [];
    for (const t of [300, 1000, 2500, 5000]) { await p.waitForTimeout(t - (samples.length ? samples[samples.length - 1].t : 0)); samples.push({ t, header: await p.evaluate(() => ({ title: document.querySelector('header h1')?.textContent, back: !!document.querySelector('header a[aria-label="Volver"]'), main: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 80) })) }); if (t === 300) await p.screenshot({ path: path.join(OUT, 'carpa-movil-300ms.png') }); }
    await p.screenshot({ path: path.join(OUT, 'carpa-movil-5s.png') });
    out.carpaTitle = { samples, errors: errs };
    await p.close();

    for (const from of ['/seguimientos', '/admin/usuarios']) {
      const q = await ctx.newPage(); const e2 = []; watch(q, e2);
      await q.goto(BASE + from, { waitUntil: 'domcontentloaded' }); await q.waitForLoadState('networkidle').catch(() => {}); await q.waitForTimeout(800);
      const r = { from, errors: e2 };
      r.geom = await q.evaluate(() => { const nav = document.querySelector('nav.fixed.bottom-0'); const b = nav.getBoundingClientRect(); const vv = window.visualViewport; return { navTop: Math.round(b.top), navBottom: Math.round(b.bottom), innerH: window.innerHeight, innerW: window.innerWidth, vvW: Math.round(vv.width), vvH: Math.round(vv.height), scale: vv.scale, scrollW: document.documentElement.scrollWidth }; });
      try { await q.getByRole('button', { name: 'Más' }).tap({ timeout: 6000 }); await q.waitForTimeout(500); r.sheetOpen = await q.evaluate(() => !!document.querySelector('[role=dialog]')); r.tap = 'ok'; }
      catch (e) { r.tap = 'FALLÓ: ' + String(e).split('\n').slice(0, 6).join(' | ').slice(0, 500); }
      if (!r.sheetOpen) { try { await q.getByRole('button', { name: 'Más' }).click({ force: true, timeout: 6000 }); await q.waitForTimeout(500); r.sheetOpenForced = await q.evaluate(() => !!document.querySelector('[role=dialog]')); } catch (e) { r.forcedErr = String(e).slice(0, 200); } }
      await q.screenshot({ path: path.join(OUT, `mas-desde${from.replace(/\//g, '-')}-movil.png`) });
      out['mas_' + from] = r; await q.close();
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
