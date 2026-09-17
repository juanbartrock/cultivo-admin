const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = 'https://cultivo.ramsesvii.com';
const EVID = '/opt/apps/cultivo-admin/docs/critica/2026-09-08-1413';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
const VIEWPORTS = { movil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, desktop: { viewport: { width: 1440, height: 900 } } };
const out = {};
(async () => {
  const browser = await chromium.launch();
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage();
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email o usuario').fill(USER); await page.getByLabel('Contraseña').fill(PASS);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 });
    const scan = async () => page.evaluate(() => {
      // cada tarjeta: el contenedor del link + su panel hermano
      return Array.from(document.querySelectorAll('a[href^="/sala/carpa/"]')).map(a => {
        const wrap = a.parentElement; const txt = wrap.innerText.replace(/\s+/g, ' ');
        return { name: a.querySelector('h3')?.textContent.trim(), rangos: (txt.match(/Rangos: [^ ]+( [^ ]+)?/) || [null])[0], offline: /Sensor sin respuesta/.test(txt),
          readings: Array.from(wrap.querySelectorAll('span.tabular-nums')).filter(s => /°C|%|kPa|—/.test(s.textContent)).map(s => ({ v: s.textContent.trim(), tone: Array.from(s.classList).filter(c => c.startsWith('text-')).join(' ') })),
          panelText: txt.slice(0, 260) };
      });
    });
    await page.goto(BASE + '/sala', { waitUntil: 'domcontentloaded' }); try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {} await page.waitForTimeout(3000);
    out[vp] = { salaCultivo: await scan(), url: page.url() };
    // cambiar a Terraza
    await page.goto(BASE + '/sala?sala=16fab41e-a1fd-4cc0-be2d-1858e0720133', { waitUntil: 'domcontentloaded' }); try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {} await page.waitForTimeout(3000);
    out[vp].terraza = await scan();
    out[vp].errors = errs;
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(EVID + '/critic-sala.json', JSON.stringify(out, null, 2));
  for (const [vp, r] of Object.entries(out)) { console.log(`[${vp}] errors=${r.errors.length}`); for (const c of r.salaCultivo) console.log('  cultivo', JSON.stringify(c)); for (const c of r.terraza) console.log('  terraza', JSON.stringify(c)); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
