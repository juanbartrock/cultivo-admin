const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const BASE = 'https://cultivo.ramsesvii.com';
const EVID = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-1413';
const OUT = path.join(EVID, 'capturas');
const USER = process.env.CULTIVO_ADMIN_USER;
const PASS = process.env.CULTIVO_ADMIN_PASSWORD;
if (!USER || !PASS) { console.error('sin credenciales'); process.exit(2); }
const SECADO = '/sala/carpa/ba2f7493-8f0b-45f1-99b6-5427d014de75';
const VEGE = '/sala/carpa/f1ed3032-cf56-4487-90a3-0d79dfd3f9b3';

const ROUTES = [
  ['home', '/'], ['sala', '/sala'], ['seguimientos', '/seguimientos'],
  ['automatizaciones', '/automatizaciones'], ['artefactos', '/artefactos'],
  ['notificaciones', '/notificaciones'], ['admin-usuarios', '/admin/usuarios'],
  ['admin-rangos', '/admin/rangos'], ['carpa-secado', SECADO], ['carpa-vegetativo', VEGE],
];
const VIEWPORTS = {
  movil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const report = { startedAt: new Date().toISOString(), viewports: {} };
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

function watch(page, bucket, writes) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') bucket.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400) bucket.push(`HTTP ${r.status()}: ${r.url()}`); });
  page.on('request', (r) => { if (['PUT', 'PATCH', 'POST', 'DELETE'].includes(r.method()) && !r.url().includes('/auth/login')) writes.push(r.method() + ' ' + r.url()); });
}
async function settle(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { await page.waitForTimeout(2000); }
  await page.waitForTimeout(800);
}
const DOM_SCAN = () => {
  const out = { gradients: [], blur: [], scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    bodyScroll: document.body.scrollWidth, zeros: [], dashes: (document.body.innerText.match(/—/g) || []).length,
    nativeSelects: document.querySelectorAll('select').length,
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).slice(0, 4),
    emojis: (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length,
    bodyTextHead: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const desc = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 4).join('.') : '');
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && out.gradients.length < 8) out.gradients.push(desc);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none' && out.blur.length < 8) out.blur.push(desc);
  }
  const m = document.body.innerText.match(/(^|\s)0(\.0+)? ?(°C|%|kPa)/g); if (m) out.zeros = m.slice(0, 10);
  return out;
};
const TABBAR_SCAN = () => {
  const nav = document.querySelector('nav.fixed.bottom-0');
  if (!nav) return { present: false };
  const r = nav.getBoundingClientRect();
  const items = Array.from(nav.querySelectorAll('a,button')).map((el) => {
    const b = el.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { label: el.textContent.trim(), inside: !!(hit && nav.contains(hit)) };
  });
  return { present: true, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right) }, innerHeight: window.innerHeight,
    withinViewport: r.bottom <= window.innerHeight + 0.5 && r.right <= window.innerWidth + 0.5, allHit: items.every(i => i.inside), items };
};
const HOME_CARDS = () => Array.from(document.querySelectorAll('a[href^="/sala/carpa/"]')).map((a) => {
  const readings = Array.from(a.querySelectorAll('p.tabular-nums, span.tabular-nums')).map((p) => ({ v: p.textContent.trim(), tone: Array.from(p.classList).filter(c => c.startsWith('text-')).join(' ') }));
  const txt = a.innerText.replace(/\s+/g, ' ');
  return { href: a.getAttribute('href'), name: a.querySelector('p,h3')?.textContent.trim(), readings, rangos: (txt.match(/Rangos: [^ ]+( [^ ]+)?/) || [null])[0], offline: /Sensor sin respuesta/.test(txt) };
});
const CARPA_SCAN = () => {
  const txt = document.body.innerText.replace(/\s+/g, ' ');
  const rangos = (txt.match(/Rangos: [^ ]+( [^ ]+)?/) || [null])[0];
  const ideal = (txt.match(/Ideal [0-9.,-]+ · amplio [0-9.,-]+ ?[^ ]*/g) || []).slice(0, 4);
  const metrics = Array.from(document.querySelectorAll('p.font-display.tabular-nums, p.font-display')).map(p => ({ v: p.textContent.trim().slice(0, 20), tone: Array.from(p.classList).filter(c => c.startsWith('text-')).join(' ') })).slice(0, 8);
  const labels = (txt.match(/(En rango|Al límite|Fuera de rango|Sensor sin respuesta|Historial pausado|Sin datos ambientales)/g) || []);
  return { rangos, ideal, metrics, labels: [...new Set(labels)] };
};
// /sala: por tarjeta (link a la carpa) lecturas con tono, etiqueta de rangos y badge offline
const SALA_SCAN = () => Array.from(document.querySelectorAll('a[href^="/sala/carpa/"]')).map((a) => {
  const card = a.closest('[class*="rounded"]') || a;
  const root = a.querySelector('span.tabular-nums') ? a : card;
  const txt = root.innerText.replace(/\s+/g, ' ');
  return { href: a.getAttribute('href'),
    readings: Array.from(root.querySelectorAll('span.tabular-nums')).filter(s => /°C|%|kPa|—/.test(s.textContent)).map(s => ({ v: s.textContent.trim(), tone: Array.from(s.classList).filter(c => c.startsWith('text-')).join(' ') })),
    rangos: (txt.match(/Rangos: [^ ]+( [^ ]+)?/) || [null])[0], offline: /Sensor sin respuesta/.test(txt) };
});
// Tonos computados de todo número con unidad visible (igual que el constructor, pero con tono de clase)
const TONOS = () => Array.from(document.querySelectorAll('span, p'))
  .filter((e) => e.children.length <= 1 && /^-?\d+(\.\d+)?\s?(°C|%|ppm|kPa)$/.test(e.textContent.trim().replace(/\s+/g, ' ')))
  .map((e) => ({ v: e.textContent.trim().replace(/\s+/g, ' '), tone: Array.from(e.classList).filter(c => c.startsWith('text-')).join(' '), color: getComputedStyle(e).color }));

(async () => {
  const browser = await chromium.launch();
  for (const [vpName, vpOpts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext(vpOpts);
    const page = await ctx.newPage();
    const vp = { login: {}, routes: {}, rangos: {}, extra: {}, colores: {} };
    const writes = [];
    const loginErrors = []; watch(page, loginErrors, writes);
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await settle(page);
    await page.screenshot({ path: path.join(OUT, `login-${vpName}.png`), fullPage: true });
    await page.getByLabel('Email o usuario').fill(USER);
    await page.getByLabel('Contraseña').fill(PASS);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
    await settle(page);
    vp.login = { landed: page.url(), errors: loginErrors.slice() };
    log(`[${vpName}] login -> ${page.url()} err=${loginErrors.length}`);

    for (const [name, route] of ROUTES) {
      const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
      const t0 = Date.now();
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await settle(p);
      await p.waitForTimeout(2500);
      const dom = await p.evaluate(DOM_SCAN);
      const tab = vpName === 'movil' ? await p.evaluate(TABBAR_SCAN) : null;
      await p.screenshot({ path: path.join(OUT, `${name}-${vpName}.png`), fullPage: true });
      const r = { url: p.url(), ms: Date.now() - t0, errors: errs, dom, tab };
      if (name === 'home') r.cards = await p.evaluate(HOME_CARDS);
      if (name.startsWith('carpa')) r.carpa = await p.evaluate(CARPA_SCAN);
      if (name === 'sala') r.sala = await p.evaluate(SALA_SCAN);
      vp.routes[name] = r;
      log(`[${vpName}] ${route} -> ${r.url} err=${errs.length} scroll=${dom.scrollWidth}/${dom.innerWidth} grad=${dom.gradients.length} blur=${dom.blur.length} zeros=${dom.zeros.length} emojis=${dom.emojis} dashes=${dom.dashes}` + (tab ? ` tab=${tab.present && tab.withinViewport && tab.allHit ? 'ok' : JSON.stringify(tab)}` : '') + (errs.length ? ' ' + JSON.stringify(errs.slice(0, 3)) : '') + (dom.blur.length ? ' blur=' + JSON.stringify(dom.blur.slice(0,2)) : ''));
      if (r.cards) log(`  cards=${JSON.stringify(r.cards)}`);
      if (r.carpa) log(`  carpa=${JSON.stringify(r.carpa)}`);
      if (r.sala) log(`  sala=${JSON.stringify(r.sala)}`);
      await p.close();
    }

    // ---- /sala: cambio de sala con el selector
    {
      const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
      await p.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); await settle(p);
      const combo = p.getByRole('combobox').first();
      const res = { before: p.url(), errors: errs };
      try {
        res.beforeText = await combo.textContent();
        await combo.click(); await p.waitForTimeout(500);
        const options = p.getByRole('option'); res.options = await options.allTextContents();
        let picked = null; for (let i = 0; i < res.options.length; i++) { if (res.options[i].trim() !== (res.beforeText || '').trim()) { picked = i; break; } }
        if (picked !== null) { await options.nth(picked).click(); await settle(p); res.after = p.url(); res.afterText = await combo.textContent(); res.salaAfter = await p.evaluate(SALA_SCAN); }
        await p.screenshot({ path: path.join(OUT, `sala-cambiada-${vpName}.png`), fullPage: true });
      } catch (e) { res.error = e.message.slice(0, 200); }
      vp.extra.salaSelector = res; log(`[${vpName}] selector sala: ${JSON.stringify({ ...res, errors: errs.length })}`);
      await p.close();
    }

    // ---- /admin/rangos: diálogo, validaciones, cancelar
    {
      const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
      const writesBefore = writes.length;
      const R = { errors: errs };
      await p.goto(BASE + '/admin/rangos', { waitUntil: 'domcontentloaded' }); await settle(p);
      R.url = p.url();
      R.stages = await p.evaluate(() => Array.from(document.querySelectorAll('button[aria-label^="Editar rangos de"]')).map(b => b.getAttribute('aria-label').replace('Editar rangos de ', '')));
      R.headerText = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400));
      await p.locator('button:visible', { hasText: 'Editar' }).first().click();
      const dialog = p.getByRole('dialog');
      await dialog.waitFor({ timeout: 10000 }); await p.waitForTimeout(500);
      R.dialogTitle = await dialog.getByRole('heading').first().textContent();
      R.inputs = await dialog.locator('input').count();
      R.initial = await dialog.evaluate((d) => Object.fromEntries(Array.from(d.querySelectorAll('input')).map(i => [i.name, i.value])));
      const FOOTER = () => { const q = (re) => Array.from(document.querySelectorAll('[role=dialog] button')).find(x => re.test(x.textContent)); const c = q(/Cancelar/).getBoundingClientRect(); const g = q(/Guardar/).getBoundingClientRect(); const d = document.querySelector('[role=dialog]').getBoundingClientRect(); const ih = window.innerHeight; return { cancelar: { top: Math.round(c.top), bottom: Math.round(c.bottom) }, guardar: { top: Math.round(g.top), bottom: Math.round(g.bottom) }, dialog: { t: Math.round(d.top), b: Math.round(d.bottom), l: Math.round(d.left), r: Math.round(d.right) }, innerHeight: ih, innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, inside: c.bottom <= ih && c.top >= 0 && g.bottom <= ih && g.top >= 0, hitCancelar: (() => { const h = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2); return !!(h && q(/Cancelar/).contains(h)); })(), hitGuardar: (() => { const h = document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2); return !!(h && q(/Guardar/).contains(h)); })() }; };
      R.footerOnOpen = await p.evaluate(FOOTER);
      await p.screenshot({ path: path.join(OUT, `admin-rangos-dialogo-${vpName}.png`), fullPage: false });
      const save = dialog.getByRole('button', { name: /^Guardar/ });
      const cancel = dialog.getByRole('button', { name: 'Cancelar' });
      R.saveEnabledInitially = await save.isEnabled();
      const alerts = async () => dialog.getByRole('alert').allTextContents();
      // 1) ideal min > ideal max
      await dialog.locator('input[name=tempIdealMin]').fill('30'); await p.waitForTimeout(300);
      R.case_minMayorMax = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      await p.screenshot({ path: path.join(OUT, `admin-rangos-dialogo-invalido-${vpName}.png`), fullPage: false });
      // 2) texto no numérico
      await dialog.locator('input[name=tempIdealMin]').fill('abc'); await p.waitForTimeout(300);
      R.case_texto = { alerts: await alerts(), saveEnabled: await save.isEnabled(), ariaInvalid: await dialog.locator('input[name=tempIdealMin]').getAttribute('aria-invalid'), errorVisible: await dialog.locator('#tempIdealMin-error').isVisible().catch(() => false) };
      await p.screenshot({ path: path.join(OUT, `admin-rangos-dialogo-texto-${vpName}.png`), fullPage: false });
      // 3) amplio no contiene ideal
      await dialog.locator('input[name=tempIdealMin]').fill('18');
      await dialog.locator('input[name=tempWideMin]').fill('20'); await p.waitForTimeout(300);
      R.case_amplioNoContiene = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      // 4) vacío
      await dialog.locator('input[name=tempWideMin]').fill(''); await p.waitForTimeout(300);
      R.case_vacio = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      // 5) coma decimal válida
      await dialog.locator('input[name=tempWideMin]').fill('15');
      await dialog.locator('input[name=vpdIdealMin]').fill('0,8'); await p.waitForTimeout(300);
      R.case_comaDecimal = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      // 6) negativo y notación exótica
      await dialog.locator('input[name=vpdIdealMin]').fill('0.8');
      await dialog.locator('input[name=co2WideMin]').fill('-5'); await p.waitForTimeout(300);
      R.case_negativo = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      await dialog.locator('input[name=co2WideMin]').fill('1e2'); await p.waitForTimeout(300);
      R.case_exponente = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      await dialog.locator('input[name=co2WideMin]').fill('300'); await p.waitForTimeout(300);
      R.restored = { alerts: await alerts(), saveEnabled: await save.isEnabled() };
      // scroll interno hasta el último campo: ¿queda visible con el pie a la vista?
      await dialog.locator('input[name=co2WideMax]').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      R.lastInputAfterScroll = await p.evaluate(() => { const i = document.querySelector('input[name=co2WideMax]'); const r = i.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { top: Math.round(r.top), bottom: Math.round(r.bottom), innerHeight: window.innerHeight, visibleAndHit: h === i }; });
      R.footerAfterScroll = await p.evaluate(FOOTER);
      await p.screenshot({ path: path.join(OUT, `admin-rangos-dialogo-final-${vpName}.png`), fullPage: false });
      await cancel.click(); await p.waitForTimeout(600);
      R.dialogClosedAfterCancel = (await p.getByRole('dialog').count()) === 0;
      await p.screenshot({ path: path.join(OUT, `admin-rangos-tras-cancelar-${vpName}.png`), fullPage: true });
      // reabrir: el borrador vuelve a los valores de la fila
      await p.locator('button:visible', { hasText: 'Editar' }).first().click(); await dialog.waitFor({ timeout: 10000 }); await p.waitForTimeout(400);
      R.reopened = await dialog.evaluate((d) => Object.fromEntries(Array.from(d.querySelectorAll('input')).map(i => [i.name, i.value])));
      R.reopenedEqualsInitial = JSON.stringify(R.reopened) === JSON.stringify(R.initial);
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      R.dialogClosedAfterEscape = (await p.getByRole('dialog').count()) === 0;
      R.writesDuring = writes.slice(writesBefore);
      vp.rangos = R;
      log(`[${vpName}] /admin/rangos: ${JSON.stringify({ ...R, errors: errs.length, headerText: undefined, initial: undefined, reopened: undefined })}`);
      await p.close();
    }

    // ---- móvil: llegar a Rangos desde el sheet Más; desktop: desde la sidebar
    {
      const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await settle(p);
      const r = { errors: errs };
      try {
        if (vpName === 'movil') {
          await p.locator('nav.fixed.bottom-0 button', { hasText: 'Más' }).tap(); await p.waitForTimeout(600);
          r.sheetItems = await p.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] a')).map(a => a.textContent.trim() + ' ' + a.getAttribute('href')));
          await p.screenshot({ path: path.join(OUT, `mas-sheet-movil.png`), fullPage: false });
          await p.locator('[role=dialog] a[href="/admin/rangos"]').tap();
        } else {
          r.sidebarItems = await p.evaluate(() => Array.from(document.querySelectorAll('aside a')).map(a => a.textContent.trim() + ' ' + a.getAttribute('href')));
          await p.locator('aside a[href="/admin/rangos"]').click();
        }
        await p.waitForURL('**/admin/rangos', { timeout: 15000 }); await settle(p);
        r.landed = p.url();
        r.tab = vpName === 'movil' ? await p.evaluate(TABBAR_SCAN) : null;
        await p.screenshot({ path: path.join(OUT, `admin-rangos-desde-menu-${vpName}.png`), fullPage: false });
      } catch (e) { r.error = e.message.slice(0, 200); }
      vp.extra.navRangos = r; log(`[${vpName}] nav a rangos: ${JSON.stringify({ ...r, errors: errs.length, tab: r.tab ? (r.tab.withinViewport && r.tab.allHit) : null })}`);
      await p.close();
    }

    // ---- colores: misma lectura inyectada en el navegador en /, /sala y carpa (sin tocar la base)
    {
      const CASOS = {
        todo_ok: { temperature: 24, humidity: 55 },   // ideal 18-28 / 40-65 -> ok; vpd ~1.34 ok
        mixto: { temperature: 29, humidity: 20 },     // temp warn (28<29<=30), hum danger (<30), vpd danger
        borde: { temperature: 30, humidity: 30 },     // borde del amplio -> warn/warn
      };
      for (const [caso, lectura] of Object.entries(CASOS)) {
        const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
        await p.route('**/api/devices/*/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ device: {}, status: { online: true, state: 'off', ...lectura } }) }));
        const res = { lectura, errors: errs };
        for (const [nombre, url] of [['home', '/'], ['sala', '/sala'], ['carpa', SECADO]]) {
          await p.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(3000);
          res[nombre] = await p.evaluate(TONOS);
          if (nombre === 'home') res.homeCards = await p.evaluate(HOME_CARDS);
          if (nombre === 'sala') res.salaCards = await p.evaluate(SALA_SCAN);
          if (nombre === 'carpa') res.carpaScan = await p.evaluate(CARPA_SCAN);
          await p.screenshot({ path: path.join(OUT, `color-${caso}-${nombre}-${vpName}.png`), fullPage: true });
        }
        await p.unroute('**/api/devices/*/status');
        vp.colores[caso] = res;
        log(`[${vpName}] colores ${caso} ${JSON.stringify(lectura)}: home=${JSON.stringify(res.home)} sala=${JSON.stringify(res.sala)} carpa=${JSON.stringify(res.carpa)} err=${errs.length}`);
        await p.close();
      }
      // rangos caídos: GET /stage-ranges -> 500 con lecturas vivas: la lectura no puede tener color
      {
        const errs = []; const p = await ctx.newPage(); watch(p, errs, writes);
        await p.route('**/api/devices/*/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ device: {}, status: { online: true, state: 'off', temperature: 29, humidity: 20 } }) }));
        await p.route('**/api/stage-ranges', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"simulado por el critico"}' }));
        const res = { errors: errs };
        for (const [nombre, url] of [['home', '/'], ['sala', '/sala'], ['carpa', SECADO]]) {
          await p.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForTimeout(3000);
          res[nombre] = await p.evaluate(TONOS);
          if (nombre === 'carpa') res.carpaScan = await p.evaluate(CARPA_SCAN);
          if (nombre === 'home') res.homeText = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300));
          await p.screenshot({ path: path.join(OUT, `rangos-caidos-${nombre}-${vpName}.png`), fullPage: true });
        }
        vp.colores.rangosCaidos = res;
        log(`[${vpName}] rangos caídos (500) con 29°C/20%: home=${JSON.stringify(res.home)} sala=${JSON.stringify(res.sala)} carpa=${JSON.stringify(res.carpa)} carpaScan=${JSON.stringify(res.carpaScan)} err=${errs.length}`);
        await p.close();
      }
    }

    vp.writes = writes;
    log(`[${vpName}] escrituras (POST/PUT/PATCH/DELETE) durante toda la corrida: ${writes.length} ${JSON.stringify(writes.slice(0, 5))}`);
    report.viewports[vpName] = vp;
    await ctx.close();
  }
  await browser.close();
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(EVID, 'critic-nav.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(EVID, 'critic-nav.txt'), lines.join('\n') + '\n');
})().catch((e) => { console.error(e); fs.writeFileSync(path.join(EVID, 'critic-nav.txt'), lines.join('\n') + '\nFATAL ' + e.stack + '\n'); process.exit(1); });
