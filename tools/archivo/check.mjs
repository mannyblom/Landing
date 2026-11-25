// Prueba la web local: abre trabajos en Chrome y Safari (compu y celular), avanza, cierra y vuelve
// a abrir, y revisa que arranque en la pieza 1, que corran los clips y que no haya errores.
// Uso: node check.mjs <url de la página> slug slug ...   (ej.: http://127.0.0.1:4173/ clan-2026 erre-aw26)
import { chromium, webkit } from 'playwright';
const [url, ...slugs] = process.argv.slice(2);
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await engine.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    const p = await ctx.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(e.message)); p.on('response', (r) => r.status() >= 400 && errors.push(r.status() + ' ' + r.url()));
    await p.goto(url); await p.waitForTimeout(2000);
    const st = () => p.evaluate(() => `${document.querySelector('[data-v-title]').textContent} ${document.querySelector('[data-v-count]').textContent} scroll=${Math.round(document.querySelector('[data-v-stage]').scrollLeft)} clips=${[...document.querySelectorAll('.viewer__slide video')].filter((v) => !v.paused).length}`);
    const log = [];
    for (const slug of slugs) {
      const t = p.locator(`[data-arch="${slug}"]`); await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
      if (w < 500) await t.tap(); else await t.click();
      await p.waitForTimeout(1800); log.push(await st());
      await p.locator('[data-v-next]').click(); await p.waitForTimeout(700);
      await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
    }
    const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(name, w, log.join(' | '), '| scroll lateral:', side, '| errores:', errors.length ? errors.slice(0, 3) : 'ninguno');
    await ctx.close();
  }
  await b.close();
}
