// Arma imágenes fijas para un trabajo, a partir de los exports: fotogramas limpios, un cuadro sobre
// fondo blanco y un collage de tres cuadros apilados (formato 4:5, 1080 × 1350, como los posteos).
// Descarta las tomas parecidas a las piezas que el trabajo ya tiene en la web.
// Uso: node stills.mjs <trabajo> [slug,slug] [--grid]   (lee <trabajo>/stills.json, escribe <trabajo>/stills/<slug>/)
// stills.json: [{"slug":"af-jeans-aw26","src":[[0,"Reel"]],"h":[[0,"4K"]],"skip":[0]}]
//   h = fuentes horizontales para el collage; skip = fotogramas a saltear (posición en el orden elegido)
//   change = fotogramas a reemplazar sin mover los demás (0 y 1 sueltos, 2 sobre blanco)
//   bands = franjas del collage a reemplazar (0 arriba); bandPos = {"1": 0.6} centro vertical de una franja
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
sharp.cache(false); // los temporales se reutilizan con el mismo nombre: sin caché, cada lectura es la real
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { textiness } from './textiness.mjs';
const FF = createRequire(import.meta.url)('ffmpeg-static');
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [WORK, only, mode] = process.argv.slice(2);
const GRID = mode === '--grid'; // solo la grilla de 3 × 3 (g01.webp), sin tocar las demás imágenes
const inv = JSON.parse(fs.readFileSync(`${WORK}/inventory.json`));
const cfg = JSON.parse(fs.readFileSync(`${WORK}/stills.json`));
const W = 1080, H = 1350;
const run = (args) => new Promise((res) => { const p = spawn(FF, args); let err = ''; p.stderr.on('data', (d) => { err += d; }); p.on('close', () => res(err)); });
const meta = (file) => inv.flatMap((j) => j.videos).find((v) => v.path === file);
const files = (src) => src.flatMap(([j, re]) => inv[j].finals.filter((p) => new RegExp(re).test(path.basename(p))));

async function grab(file, t, w, out) { await run(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `scale=${w}:-2`, out]); return fs.existsSync(out); }
async function sig(img) { return [...(await sharp(img).resize(12, 12, { fit: 'fill' }).greyscale().raw().toBuffer())]; }
const dist = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
async function score(img) {
  const s = await sharp(img).stats();
  const mean = s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3 / 255;
  const sd = s.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3 / 255;
  let sc = s.entropy * Math.sqrt(s.sharpness + 0.01) * Math.min(1, sd * 5);
  if (mean < 0.1 || mean > 0.93) sc *= 0.2;
  return sc;
}
// Candidatos: el medio de cada plano (por cortes de escena), lejos de la entrada y el cierre.
async function candidates(list, tmp, tag, per = 10, withText = false) {
  const out = [];
  for (const [fi, file] of list.entries()) {
    const { dur } = meta(file);
    const err = await run(['-hide_banner', '-i', file, '-an', '-vf', "scale=160:-2,select='gt(scene,0.3)',metadata=print", '-f', 'null', '-']);
    const c = [0, ...[...err.matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]), dur];
    let ts = [];
    for (let i = 0; i < c.length - 1; i++) if (c[i + 1] - c[i] > 0.7) ts.push((c[i] + c[i + 1]) / 2);
    ts = ts.filter((t) => t > Math.min(1, dur * 0.08) && t < dur - 1.5);
    if (ts.length > per) ts = ts.filter((_, i) => i % Math.ceil(ts.length / per) === 0);
    for (const [k, t] of ts.entries()) {
      const p = `${tmp}/${tag}${fi}_${k}.jpg`;
      // Se descartan los cuadros con texto encima (logos, placas, subtítulos).
      if (!(await grab(file, t, 480, p))) continue;
      const tx = await textiness(p);
      if (tx < 0.5 || withText) out.push({ file, t, s: await score(p), g: await sig(p), text: tx >= 0.5 });
    }
  }
  return out.sort((a, b) => b.s - a.s);
}
for (const e of cfg) {
  if (only && !only.split(',').includes(e.slug)) continue;
  const dir = `${WORK}/stills/${e.slug}`;
  if (!GRID && fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (/^f\d\d\.webp$|^items\.json$/.test(f)) fs.rmSync(`${dir}/${f}`); // la grilla queda
  fs.mkdirSync(`${dir}/tmp`, { recursive: true });
  // Lo que ya está publicado no se repite.
  const used = [];
  const pub = path.join(SITE, 'assets/archivo', e.slug);
  if (!fs.existsSync(pub)) { console.log(e.slug, 'no está en la web: se saltea'); continue; }
  // Las imágenes fijas anteriores (f01.webp...) no cuentan: se están rehaciendo.
  for (const f of fs.readdirSync(pub).filter((f) => f.endsWith('.webp') && !/^f\d\d\.webp$/.test(f))) used.push(await sig(path.join(pub, f)));
  const fresh = (c) => used.every((g) => dist(g, c.g) > 14);
  const take = (list, n) => { const got = []; for (const c of list) { if (got.length >= n) break; if (fresh(c)) { got.push(c); used.push(c.g); } } return got; };
  if (GRID) {
    // Grilla de 3 × 3 (1080 × 1440): nueve fotogramas distintos, recortados a 3:4 sin separación.
    // En la grilla sí van algunas tomas con texto (logos, placas): entre 1 y 3, en lugares al azar.
    const fl = files(e.src); // con pocos videos se buscan más momentos por video
    const all = await candidates(fl, `${dir}/tmp`, 'g', Math.max(14, Math.ceil(36 / fl.length)), true);
    let seed = [...e.slug].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    // Sin escenas repetidas: más distancia visual que en el resto y 3 s entre tomas del mismo video.
    // Tampoco repite lo que ya está en el visor como imagen fija (f01.webp...).
    // (al cuadro sobre blanco se le saca el margen antes de comparar)
    for (const f of fs.readdirSync(pub).filter((f) => /^f\d\d\.webp$/.test(f))) used.push(await sig(await sharp(path.join(pub, f)).trim({ background: '#ffffff', threshold: 10 }).toBuffer()));
    const gd = e.gridDist || 32; const picked = [];
    const distinct = (c) => used.every((g) => dist(g, c.g) > gd) && picked.every((p) => p.file !== c.file || Math.abs(p.t - c.t) > 3);
    const pick = (list, n) => { const got = []; for (const c of list) { if (got.length >= n) break; if (distinct(c)) { got.push(c); picked.push(c); used.push(c.g); } } return got; };
    const texted = pick(all.filter((c) => c.text), 1 + Math.floor(rnd() * 3));
    const nine = pick(all.filter((c) => !c.text), 9 - texted.length + (e.gridSkip || []).length).filter((_, i) => !(e.gridSkip || []).includes(i)).slice(0, 9 - texted.length);
    for (const c of texted) nine.splice(Math.floor(rnd() * (nine.length + 1)), 0, c);
    if (process.env.VER) nine.forEach((c, i) => console.log(i, path.basename(c.file), c.t.toFixed(1), c.text ? 'texto' : ''));
    if (nine.length < 9) { console.log(e.slug, 'no alcanzan las tomas para la grilla:', nine.length); continue; }
    const cw = 360, ch = 480; const cells = [];
    for (const [i, c] of nine.entries()) {
      const png = `${dir}/tmp/cell${i}.png`; await grab(c.file, c.t, 1080, png);
      cells.push({ input: await sharp(png).resize(cw, ch, { fit: 'cover', position: sharp.strategy.attention }).toBuffer(), left: (i % 3) * cw, top: Math.floor(i / 3) * ch });
    }
    await sharp({ create: { width: cw * 3, height: ch * 3, channels: 3, background: '#000' } }).composite(cells).webp({ quality: 84 }).toFile(`${dir}/g01.webp`);
    fs.writeFileSync(`${dir}/grid.json`, JSON.stringify([{ src: 'g01.webp', w: cw * 3, h: ch * 3 }]));
    fs.rmSync(`${dir}/tmp`, { recursive: true, force: true });
    console.log(e.slug, 'grilla 3 × 3'); continue;
  }
  const vert = await candidates(files(e.src), `${dir}/tmp`, 'v', 10, !!e.conTexto); // conTexto: true acepta tomas con texto
  const hor = e.h ? await candidates(files(e.h), `${dir}/tmp`, 'h', 16, !!e.conTexto) : [];
  // skip: posiciones de fotogramas a saltear tras revisarlos (ej. [0] = el primero elegido).
  const skip = e.skip || [], change = e.change || [], bands = e.bands || [];
  const pool = take(vert, 3 + skip.length + change.length);
  const singles = pool.slice(0, 3 + skip.length).filter((_, i) => !skip.includes(i));
  const spare = pool.slice(3 + skip.length);
  for (const k of change) if (spare.length) singles[k] = spare.shift(); // cambia solo esa, las demás quedan igual
  const tpool = take(hor.length >= 3 ? hor : vert, 3 + bands.length);
  const trio = tpool.slice(0, 3).sort((a, b) => a.t - b.t);
  const tspare = tpool.slice(3);
  if (tspare.length < bands.length) tspare.push(...take(vert, bands.length - tspare.length)); // si el export horizontal no alcanza, de los reels
  for (const k of bands) if (tspare.length) trio[k] = tspare.shift();
  const items = [];
  // 1 y 2: fotogramas limpios, a resolución completa del export (vertical: 1080 de ancho).
  for (const [i, c] of singles.slice(0, 2).entries()) {
    const png = `${dir}/tmp/full${i}.png`; await grab(c.file, c.t, Math.min(1080, meta(c.file).w), png);
    const info = await sharp(png).webp({ quality: 82 }).toFile(`${dir}/f0${i + 1}.webp`);
    items.push({ src: `f0${i + 1}.webp`, w: info.width, h: info.height });
  }
  // 3: el fotograma sobre fondo blanco, con margen.
  if (singles[2]) {
    const png = `${dir}/tmp/framed.png`; await grab(singles[2].file, singles[2].t, 1080, png);
    const ih = 1180; const img = await sharp(png).resize({ height: ih, width: W - 140, fit: 'inside' }).toBuffer(); const m = await sharp(img).metadata();
    await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([{ input: img, left: Math.round((W - m.width) / 2), top: Math.round((H - m.height) / 2) }]).webp({ quality: 84 }).toFile(`${dir}/f03.webp`);
    items.push({ src: 'f03.webp', w: W, h: H });
  }
  // 4: collage de tres franjas horizontales (recorte al centro de cada cuadro).
  if (trio.length === 3) {
    const band = H / 3; const parts = [];
    for (const [i, c] of trio.entries()) {
      const png = `${dir}/tmp/trio${i}.png`; await grab(c.file, c.t, 1920, png);
      // trim: saca las franjas negras que traen algunos exports antes de recortar la franja.
      const clean = await sharp(png).trim({ background: '#000000', threshold: 24 }).toBuffer();
      const bh = Math.round(band); const pos = (e.bandPos || {})[i];
      let part;
      if (pos === undefined) part = await sharp(clean).resize(W, bh, { fit: 'cover', position: sharp.strategy.attention }).toBuffer();
      else { // bandPos: centro vertical de la franja, de 0 (arriba) a 1 (abajo) del cuadro
        const full = await sharp(clean).resize({ width: W }).toBuffer(); const fh = (await sharp(full).metadata()).height;
        part = await sharp(full).extract({ left: 0, top: Math.max(0, Math.min(fh - bh, Math.round(pos * fh - bh / 2))), width: W, height: bh }).toBuffer();
      }
      parts.push({ input: part, left: 0, top: Math.round(i * band) });
    }
    await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } }).composite(parts).webp({ quality: 84 }).toFile(`${dir}/f04.webp`);
    items.push({ src: 'f04.webp', w: W, h: H });
  }
  fs.rmSync(`${dir}/tmp`, { recursive: true, force: true });
  fs.writeFileSync(`${dir}/items.json`, JSON.stringify(items, null, 1));
  console.log(e.slug, items.length, 'imágenes', hor.length >= 3 ? '(collage con el export horizontal)' : '');
}
