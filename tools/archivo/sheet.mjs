// Hoja de contactos de las piezas ya hechas, para revisar antes de subir.
// Uso: node sheet.mjs <trabajo> <salida.jpg> slug slug ...
import sharp from 'sharp'; import fs from 'node:fs';
const [WORK, out, ...slugs] = process.argv.slice(2); const H = 260, LH = 26, W = 1700; const comps = []; let y = 0;
for (const slug of slugs) {
  const dir = `${WORK}/out/${slug}`; if (!fs.existsSync(`${dir}/items.json`)) continue;
  const items = JSON.parse(fs.readFileSync(`${dir}/items.json`));
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${LH}"><text x="4" y="19" font-family="Helvetica" font-size="18" fill="#fff">${slug.replace(/&/g, '&amp;')} (${items.length})</text></svg>`), top: y, left: 0 }); y += LH;
  let x = 0;
  for (const [n, it] of items.entries()) {
    const b = await sharp(`${dir}/${it.src}`).resize({ height: H }).toBuffer(); const m = await sharp(b).metadata();
    if (x + m.width > W) { x = 0; y += H + 6; } // no entra: sigue en otra fila
    comps.push({ input: b, top: y, left: x }, { input: Buffer.from(`<svg width="40" height="24"><rect width="40" height="24" fill="#000a"/><text x="6" y="17" font-family="Helvetica" font-size="15" fill="#fff">${String(n + 1).padStart(2, '0')}</text></svg>`), top: y, left: x });
    x += m.width + 6;
  }
  y += H + 10;
}
await sharp({ create: { width: W, height: y, channels: 3, background: '#222' } }).composite(comps).jpeg({ quality: 72 }).toFile(out);
