const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const BASE = 'https://cultivo.ramsesvii.com';
const EVID = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-0847';
const OUT = path.join(EVID, 'capturas');
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
const report = { startedAt: new Date().toISOString(), viewports: {} };

function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') bucket.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400) bucket.push(`HTTP ${r.status()}: ${r.url()}`); });
}
async function settle(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { await page.waitForTimeout(2000); }
  await page.waitForTimeout(800);
}
const DOM_SCAN = () => {
  const out = { gradients: [], blur: [], scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    bodyScroll: document.body.scrollWidth, zeros: [], dashes: (document.body.innerText.match(/—/g) || []).length,
    nativeSelects: document.querySelectorAll('select').length, nativeCheckbox: document.querySelectorAll('input[type=checkbox]').length,
    title: document.title,
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim() + (getComputedStyle(h).display === 'none' || h.offsetParent === null ? ' [oculto]' : '')).slice(0,4),
    roleHeadings: Array.from(document.querySelectorAll('[role=heading]')).map(h => h.textContent.trim()).slice(0,4),
    dangerWarnText: Array.from(document.querySelectorAll('.text-danger, .text-warn')).map(e => e.textContent.trim().slice(0,60)).slice(0,10),
    emojis: (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length,
    bodyTextHead: document.body.innerText.replace(/\s+/g, ' ').slice(0, 600),
  };
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
  const vw = window.innerWidth; out.overflowers = [];
  for (const el of els) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width > 0 && out.overflowers.length < 6) out.overflowers.push(el.tagName.toLowerCase() + '.' + String(el.className).split(/\s+/).slice(0,4).join('.') + ` right=${Math.round(r.right)}`); }
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
  return { present: true, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, innerHeight: window.innerHeight, innerWidth: window.innerWidth, withinViewport: r.bottom <= window.innerHeight + 0.5 && r.right <= window.innerWidth + 0.5 && r.left >= -0.5, items };
};

(async () => {
  const browser = await chromium.launch();
  for (const [vpName, vpOpts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext(vpOpts);
    const page = await ctx.newPage();
    const vpReport = { login: {}, routes: {}, extra: {} };
    report.viewports[vpName] = vpReport;

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
    await page.close();

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

    // carpa: primera desde /sala + muestreo del header en el tiempo
    {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(p);
      const link = p.locator('a[href^="/sala/carpa/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (href) {
        const samples = [];
        await link.click();
        for (const t of [300, 1000, 2500]) {
          await p.waitForTimeout(t === 300 ? 300 : t === 1000 ? 700 : 1500);
          samples.push({ t, ...(await p.evaluate(() => ({
            url: location.pathname,
            headerTitle: (document.querySelector('header [role=heading], header h1') || {}).textContent?.trim() ?? null,
            back: !!document.querySelector('header a[aria-label="Volver"]'),
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
            mainHead: document.querySelector('main')?.innerText.replace(/\s+/g,' ').slice(0,120) ?? null,
          }))) });
          if (t === 300) await p.screenshot({ path: path.join(OUT, `carpa-${vpName}-300ms.png`) });
        }
        await settle(p);
        await p.screenshot({ path: path.join(OUT, `carpa-${vpName}.png`), fullPage: true });
        await p.screenshot({ path: path.join(OUT, `carpa-${vpName}-viewport.png`), fullPage: false });
        const dom = await p.evaluate(DOM_SCAN);
        const tab = vpName === 'movil' ? await p.evaluate(TABBAR_SCAN) : null;
        vpReport.routes.carpa = { url: p.url(), errors, dom, tab, samples };
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
          result.afterDom = await p.evaluate(DOM_SCAN);
          await p.screenshot({ path: path.join(OUT, `sala-cambiada-${vpName}.png`), fullPage: true }); }
      } catch (e) { result.error = String(e).slice(0, 300); }
      result.errors = errors; vpReport.extra.salaSelector = result; await p.close();
    }

    // home: tarjetas de carpa y bloque de alertas
    {
      const errors = []; const p = await ctx.newPage(); watch(p, errors);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
      await p.waitForTimeout(3000);
      vpReport.extra.homeCards = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href^="/sala/carpa/"]')).map(a => ({
          href: a.getAttribute('href'),
          text: a.innerText.replace(/\s+/g, ' ').slice(0, 200),
          colored: Array.from(a.querySelectorAll('.text-danger, .text-warn')).map(e => e.textContent.trim()),
          tabular: a.querySelectorAll('.tabular-nums').length,
        }));
        const alerts = document.body.innerText.match(/Todo en rango[^\n]*/)?.[0] ?? null;
        const alertsHead = document.body.innerText.match(/Alertas[^\n]*/)?.[0] ?? null;
        return { cards, alerts, alertsHead, hasActualizar: !!Array.from(document.querySelectorAll('button')).find(b => /Actualizar/.test(b.textContent)) };
      });
      await p.screenshot({ path: path.join(OUT, `home-${vpName}-3s.png`), fullPage: true });
      vpReport.extra.homeCards.errors = errors;
      await p.close();
    }

    if (vpName === 'movil') {
      for (const from of ['/', '/seguimientos', '/admin/usuarios']) {
        const errors = []; const p = await ctx.newPage(); watch(p, errors);
        await p.goto(BASE + from, { waitUntil: 'domcontentloaded' }); await settle(p);
        const slug = from === '/' ? 'home' : from.replace(/^\//, '').replace(/\//g, '-');
        const r = { from };
        try {
          const t0 = Date.now();
          await p.getByRole('button', { name: 'Más' }).tap({ timeout: 8000 });
          r.tapMs = Date.now() - t0;
          await p.waitForTimeout(600);
          await p.screenshot({ path: path.join(OUT, `mas-sheet-desde-${slug}-movil.png`) });
          r.sheetLinks = await p.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] a, [role=dialog] button')).map(e => e.textContent.trim()));
          await p.getByRole('dialog').getByRole('link', { name: /Dispositivos/ }).tap({ timeout: 8000 });
          await p.waitForURL('**/artefactos', { timeout: 15000 }); r.landed = p.url(); r.forced = false;
        } catch (e) { r.error = String(e).slice(0, 400); }
        r.errors = errors; vpReport.extra['mas_' + slug] = r; await p.close();
      }
      // tab bar: tap real en cada pestaña desde /seguimientos
      {
        const p = await ctx.newPage(); const errors = []; watch(p, errors);
        await p.goto(BASE + '/seguimientos', { waitUntil: 'domcontentloaded' }); await settle(p);
        const r = { taps: [] };
        try {
          const labels = await p.evaluate(() => Array.from(document.querySelectorAll('nav.fixed.bottom-0 a')).map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href') })));
          for (const l of labels) {
            await p.goto(BASE + '/seguimientos', { waitUntil: 'domcontentloaded' }); await settle(p);
            try { await p.locator('nav.fixed.bottom-0 a', { hasText: l.label }).first().tap({ timeout: 6000 }); await p.waitForURL('**' + l.href, { timeout: 10000 }); r.taps.push({ ...l, ok: true, url: p.url() }); }
            catch (e) { r.taps.push({ ...l, ok: false, error: String(e).slice(0, 200) }); }
          }
        } catch (e) { r.error = String(e).slice(0, 300); }
        r.errors = errors; vpReport.extra.tabBarTaps = r; await p.close();
      }
    } else {
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
        await p.reload({ waitUntil: 'domcontentloaded' }); await settle(p);
        r.asideWidthAfterReload = await p.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
        await p.locator('aside button').first().click(); await p.waitForTimeout(400);
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
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(EVID, 'critic-nav.json'), JSON.stringify(report, null, 2));
  // resumen
  for (const [vp, r] of Object.entries(report.viewports)) {
    console.log(`\n## ${vp}  login -> ${r.login.landed} errors=${r.login.errors.length}`);
    for (const [slug, x] of Object.entries(r.routes)) {
      if (!x.dom) { console.log(slug, x); continue; }
      console.log(`${slug.padEnd(18)} sw=${x.dom.scrollWidth}/${x.dom.innerWidth} err=${x.errors.length} grad=${x.dom.gradients.length} blur=${x.dom.blur.length} sel=${x.dom.nativeSelects} chk=${x.dom.nativeCheckbox} h1=${JSON.stringify(x.dom.h1)} rh=${JSON.stringify(x.dom.roleHeadings)} zeros=${JSON.stringify(x.dom.zeros)} emojis=${x.dom.emojis} tab=${x.tab ? (x.tab.present ? `${x.tab.withinViewport ? 'inVP' : 'OUT'} items=${x.tab.items.map(i => i.label + (i.inside ? '' : '!')).join(',')}` : 'AUSENTE') : '-'}`);
      if (x.errors.length) console.log('   errors:', x.errors.slice(0, 8));
      if (x.dom.overflowers.length) console.log('   overflowers:', x.dom.overflowers);
      if (x.dom.blur.length) console.log('   blur:', x.dom.blur);
      if (x.dom.gradients.length) console.log('   gradients:', x.dom.gradients);
      if (x.samples) console.log('   samples:', JSON.stringify(x.samples));
    }
    console.log('extra:', JSON.stringify(r.extra, null, 1).slice(0, 6000));
  }
})().catch((e) => { console.error(e); process.exit(1); });
