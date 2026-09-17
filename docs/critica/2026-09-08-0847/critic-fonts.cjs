const { chromium } = require('playwright');
const BASE = 'https://cultivo.ramsesvii.com';
const USER = process.env.CULTIVO_ADMIN_USER, PASS = process.env.CULTIVO_ADMIN_PASSWORD;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await p.getByLabel('Email o usuario').fill(USER); await p.getByLabel('Contraseña').fill(PASS);
  await p.getByRole('button', { name: 'Iniciar sesión' }).click(); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    await document.fonts.ready;
    const loaded = Array.from(document.fonts).map(f => `${f.family} ${f.weight} ${f.status}`);
    const meta = Array.from(document.querySelectorAll('h2')).map(h => h.nextElementSibling)[0];
    const span = meta && meta.querySelector('span');
    const cs = span ? getComputedStyle(span) : null;
    const measure = (font, text) => { const c = document.createElement('canvas').getContext('2d'); c.font = font; return c.measureText(text).width; };
    const font = cs ? `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}` : null;
    return { loaded, bodyFont: getComputedStyle(document.body).fontFamily, spanText: span?.textContent, spanFont: font,
      spaceWidth: font ? measure(font, ' ') : null, letterN: font ? measure(font, 'n') : null,
      spanHTML: meta?.innerHTML.slice(0, 200), wordSpacing: cs?.wordSpacing, letterSpacing: cs?.letterSpacing };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
