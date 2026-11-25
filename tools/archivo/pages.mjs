// Junta las tiras de strips.py en páginas con el nombre de cada trabajo, para revisarlas.
// Uso: node pages.mjs <trabajo>   → <trabajo>/page-N.jpg
import sharp from 'sharp'; import fs from 'node:fs';
const WORK = process.argv[2]; const inv = JSON.parse(fs.readFileSync(`${WORK}/inventory.json`));
const rows = inv.map((j, i) => ({ i, j })).filter(({ i }) => fs.existsSync(`${WORK}/strips/${String(i).padStart(2, '0')}.jpg`));
const W = 1600, RH = 180, LH = 26, per = 8;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
for (let p = 0; p * per < rows.length; p++) {
  const chunk = rows.slice(p * per, p * per + per); const comps = []; let y = 0;
  for (const { i, j } of chunk) {
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${LH}"><text x="4" y="19" font-family="Helvetica" font-size="18" fill="#fff">${i} · ${esc(j.job)} (${j.finals.length})</text></svg>`), top: y, left: 0 }); y += LH;
    comps.push({ input: await sharp(`${WORK}/strips/${String(i).padStart(2, '0')}.jpg`).resize({ height: RH, width: W, fit: 'inside' }).toBuffer(), top: y, left: 0 }); y += RH + 8;
  }
  await sharp({ create: { width: W, height: y, channels: 3, background: '#222' } }).composite(comps).jpeg({ quality: 70 }).toFile(`${WORK}/page-${p}.jpg`);
  console.log(`page-${p}`, chunk.map((c) => c.i).join(','));
}
