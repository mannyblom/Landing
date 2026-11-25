// Hoja de las imágenes fijas armadas por stills.mjs. Uso: node sheetstills.mjs <trabajo> <salida.jpg> slug ...
import sharp from 'sharp'; import fs from 'node:fs';
const [WORK, out, ...slugs] = process.argv.slice(2); const H = 300, LH = 26, W = 1300; const comps = []; let y = 0;
for (const s of slugs) {
  const dir = `${WORK}/stills/${s}`; if (!fs.existsSync(`${dir}/items.json`)) continue;
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${LH}"><text x="4" y="19" font-family="Helvetica" font-size="18" fill="#fff">${s}</text></svg>`), top: y, left: 0 }); y += LH;
  let x = 0;
  for (const it of JSON.parse(fs.readFileSync(`${dir}/items.json`))) { const b = await sharp(`${dir}/${it.src}`).resize({ height: H }).toBuffer(); const m = await sharp(b).metadata(); comps.push({ input: b, top: y, left: x }); x += m.width + 8; }
  y += H + 10;
}
await sharp({ create: { width: W, height: y, channels: 3, background: '#222' } }).composite(comps).jpeg({ quality: 75 }).toFile(out);
