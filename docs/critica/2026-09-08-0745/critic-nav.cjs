const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const BASE = 'https://cultivo.ramsesvii.com';
const OUT = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-0745/capturas';
const USER = process.env.CULTIVO_ADMIN_USER;
const PASS = process.env.CULTIVO_ADMIN_PASSWORD;
if (!USER || !PASS) { console.error('sin credenciales'); process.exit(2); }

const ROUTES = [
  ['home', '/'], ['sala', '/sala'], ['seguimientos', '/seguimientos'],
  ['automatizaciones', '/automatizaciones'], ['artefactos', '/artefactos'],
  ['notificaciones', '/notificaciones'], ['admin-usuarios', '/admin/usuarios'],
];
const VIEWPORTS = {
  movil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const report = { viewports: {} };

function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error') bucket.push('console.error: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 500) bucket.push(`HTTP ${r.status()}: ${r.url()}`); });
}
async function settle(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { await page.waitForTimeout(2000); }
  await page.waitForTimeout(800);
}
const DOM_SCAN = () => {
  const out = { gradients: [], blur: [], scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    bodyScroll: document.body.scrollWidth, zeros: [], dashes: (document.body.innerText.match(/—/g) || []).length,
    nativeSelects: document.querySelectorAll('select').length, nativeCheckbox: document.querySelectorAll('input[type=checkbox]').length,
    title: document.title, h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).slice(0,3) };
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const cs = getComputedStyle(el);
    const desc = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 4).join('.') : '');
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && out.gradients.length < 12) out.gradients.push(desc);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none' && out.blur.length < 12) out.blur.push(desc);
  }
  const txt = document.body.innerText;
  const m = txt.match(/(^|\s)0(\.0+)? ?(°C|%|kPa)/g); if (m) out.zeros = m.slice(0, 10);
  // Overflow culprits
  const vw = 390; out.overflowers = [];
  if (out.scrollWidth > vw) {
    for (const el of els) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && out.overflowers.length < 6) out.overflowers.push(el.tagName.toLowerCase() + '.' + String(el.className).split(/\s+/).slice(0,4).join('.') + ` right=${Math.round(r.right)}`); }
  }
  return out;
};
const TABBAR_SCAN = () => {
  const nav = document.querySelector('nav.fixed.bottom-0');
  if (!nav) return { present: false };
  const r = nav.getBoundingClientRect();
  const items = Array.from(nav.querySelectorAll('a,button')).map((el) => {
    const b = el.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { label: el.textContent.trim(), cx: Math.round(cx), cy: Math.round(cy), inside: !!(hit && nav.contains(hit)), hit: hit ? hit.tagName.toLowerCase() + '.' + String(hit.className).split(/\s+/).slice(0,3).join('.') : null };
  });
  return { present: true, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, innerHeight: window.innerHeight, visualH: window.visualViewport ? Math.round(window.visualViewport.height) : null, visualScale: window.visualViewport ? window.visualViewport.scale : null, items };
};

(async () => {
  const browser = await chromium.launch();
  for (const [vpName, vpOpts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext(vpOpts);
    const page = await ctx.newPage();
    const vpReport = { login: {}, routes: {}, extra: {} };
    report.viewports[vpName] = vpReport;

    // login por formulario
    const loginErrors = []; watch(page, loginErrors);
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await settle(page);
    await page.screenshot({ path: path.join(OUT, `login-${vpName}.png`), fullPage: true });
    vpReport.login.dom = await page.evaluate(DOM_SCAN);
    await page.getByLabel('Email o usuario').fill(USER);
    await page.getByLabel('Contraseña').fill(PASS);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
    await settle(page);
    vpReport.login.landed = page.url(); vpReport.login.errors = loginErrors;

    for (const [slug, route] of ROUTES) {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await settle(p);
      await p.screenshot({ path: path.join(OUT, `${slug}-${vpName}.png`), fullPage: true });
      await p.screenshot({ path: path.join(OUT, `${slug}-${vpName}-viewport.png`), fullPage: false });
      const dom = await p.evaluate(DOM_SCAN);
      const tab = vpName === 'movil' ? await p.evaluate(TABBAR_SCAN) : null;
      vpReport.routes[slug] = { url: p.url(), errors, dom, tab };
      await p.close();
    }

    // carpa: primera desde /sala
    {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(p);
      const link = p.locator('a[href^="/sala/carpa/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (href) {
        await p.goto(BASE + href, { waitUntil: 'domcontentloaded' }); await settle(p);
        await p.screenshot({ path: path.join(OUT, `carpa-${vpName}.png`), fullPage: true });
        const dom = await p.evaluate(DOM_SCAN);
        const tab = vpName === 'movil' ? await p.evaluate(TABBAR_SCAN) : null;
        vpReport.routes.carpa = { url: p.url(), errors, dom, tab };
      } else vpReport.routes.carpa = { error: 'sin link a carpa' };
      await p.close();
    }

    // /sala: cambiar de sala con el selector
    {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(p);
      const combo = p.getByRole('combobox').first();
      const before = p.url(); const beforeText = await combo.textContent().catch(() => null);
      let result = { before, beforeText };
      try {
        await combo.click();
        await p.waitForTimeout(500);
        await p.screenshot({ path: path.join(OUT, `sala-selector-abierto-${vpName}.png`) });
        const options = p.getByRole('option');
        const n = await options.count(); result.options = n;
        const labels = []; for (let i = 0; i < n; i++) labels.push((await options.nth(i).textContent()).trim()); result.labels = labels;
        let picked = null; for (let i = 0; i < n; i++) { if (labels[i] !== beforeText?.trim()) { picked = i; break; } }
        if (picked !== null) { await options.nth(picked).click(); await settle(p); result.after = p.url(); result.afterText = await combo.textContent().catch(() => null);
          await p.screenshot({ path: path.join(OUT, `sala-cambiada-${vpName}.png`), fullPage: true }); }
      } catch (e) { result.error = String(e).slice(0, 300); }
      result.errors = errors; vpReport.extra.salaSelector = result; await p.close();
    }

    if (vpName === 'movil') {
      // Más -> sheet -> Dispositivos ; desde /seguimientos también
      for (const from of ['/', '/seguimientos']) {
        const errors = []; const p = await ctx.newPage(); watch(p, errors);
        await p.goto(BASE + from, { waitUntil: 'domcontentloaded' }); await settle(p);
        const r = { from };
        try {
          await p.getByRole('button', { name: 'Más' }).click({ timeout: 8000, trial: false });
          await p.waitForTimeout(600);
          await p.screenshot({ path: path.join(OUT, `mas-sheet-desde${from === '/' ? '-home' : '-seguimientos'}-movil.png`) });
          r.sheetLinks = await p.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] a, [role=dialog] button')).map(e => e.textContent.trim()));
          await p.getByRole('dialog').getByRole('link', { name: /Dispositivos/ }).click({ timeout: 8000 });
          await p.waitForURL('**/artefactos', { timeout: 15000 }); r.landed = p.url(); r.forced = false;
        } catch (e) { r.error = String(e).slice(0, 400); }
        r.errors = errors; vpReport.extra['mas_' + from] = r; await p.close();
      }
      // Top bar en carpa: flecha atrás
      const p = await ctx.newPage(); await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(p);
      const href = await p.locator('a[href^="/sala/carpa/"]').first().getAttribute('href').catch(() => null);
      if (href) { await p.locator('a[href^="/sala/carpa/"]').first().click(); await settle(p);
        vpReport.extra.carpaTopBar = await p.evaluate(() => { const h = document.querySelector('header'); return h ? { text: h.innerText.replace(/\n/g,' | ').slice(0, 200), h: Math.round(h.getBoundingClientRect().height) } : null; });
        await p.screenshot({ path: path.join(OUT, `carpa-movil-viewport.png`) }); }
      await p.close();
    } else {
      // sidebar colapsar + menú de usuario
      const p = await ctx.newPage(); const errors = []; watch(p, errors);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
      const r = {};
      try {
        r.sidebarLinks = await p.evaluate(() => Array.from(document.querySelectorAll('aside a')).map(a => a.textContent.trim() + ' -> ' + a.getAttribute('href')));
        const toggle = p.locator('aside button').first(); r.toggleLabel = await toggle.getAttribute('aria-label');
        await toggle.click(); await p.waitForTimeout(500);
        r.asideWidthCollapsed = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
        r.localStorage = await p.evaluate(() => localStorage.getItem('cultivo.sidebar.collapsed'));
        await p.screenshot({ path: path.join(OUT, `home-desktop-sidebar-colapsada.png`) });
        await toggle.click(); await p.waitForTimeout(400);
        r.asideWidthExpanded = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
        const userBtn = p.locator('aside button').last(); await userBtn.click(); await p.waitForTimeout(500);
        r.userMenu = await p.evaluate(() => Array.from(document.querySelectorAll('[role=menu] *[role^=menuitem]')).map(e => e.textContent.trim()));
        await p.screenshot({ path: path.join(OUT, `home-desktop-menu-usuario.png`) });
      } catch (e) { r.error = String(e).slice(0, 400); }
      r.errors = errors; vpReport.extra.sidebar = r; await p.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync('/opt/apps/cultivo-admin/docs/critica/2026-09-08-0745/critic-nav.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
