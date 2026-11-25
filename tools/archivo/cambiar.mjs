// Cambia clips puntuales de un trabajo ya cargado por otro fragmento del mismo video.
// Busca momentos lejos (más de 3 s) de las demás piezas del mismo video, y descarta los fragmentos
// que tengan cuadros oscuros o con texto en cualquier punto de sus 4 s. Reemplaza los archivos en la
// web (mismo nombre) y actualiza el JSON del visor.
// Uso: node cambiar.mjs <trabajo> <index.html|motion.html> slug:2 slug:1,4 ... [--con-texto]
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
sharp.cache(false); // los temporales se reutilizan con el mismo nombre: sin caché, cada lectura es la real
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { textiness } from './textiness.mjs';
const FF = createRequire(import.meta.url)('ffmpeg-static');
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2); const TEXT = args.includes('--con-texto'); // --con-texto: acepta texto encima
const FLEX = args.includes('--flexible'); // --flexible: tolera un cuadro oscuro o claro de los cuatro
const [WORK, PAGE, ...specs] = args.filter((a) => !a.startsWith('--'));
const inv = JSON.parse(fs.readFileSync(`${WORK}/inventory.json`));
const run = (args) => new Promise((res) => { const p = spawn(FF, args); let err = ''; p.stderr.on('data', (d) => { err += d; }); p.on('close', () => res(err)); });
const byName = (n) => inv.flatMap((j) => j.videos).find((v) => v.name === n);
const CLIP = 4; const tmp = `${WORK}/tmp-cambiar`; fs.mkdirSync(tmp, { recursive: true });
async function grab(file, t, w, out) { await run(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `scale=${w}:-2`, out]); return fs.existsSync(out); }
async function stats(img) {
  const s = await sharp(img).stats();
  const mean = s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3 / 255;
  const sd = s.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3 / 255;
  return { mean, score: s.entropy * Math.sqrt(s.sharpness + 0.01) * Math.min(1, sd * 5) };
}
// Un fragmento sirve si en 0, 1.3, 2.6 y 3.9 s no hay negro ni blanco plano ni texto encima.
async function clipOk(file, t) {
  let sc = 0, bad = 0;
  for (const [k, d] of [0, 1.3, 2.6, 3.9].entries()) {
    const p = `${tmp}/k${k}.jpg`; if (!(await grab(file, t + d, 480, p))) return 0;
    const s = await stats(p);
    if (s.mean < 0.12 || s.mean > 0.96 || (!TEXT && (await textiness(p)) >= 0.5)) { bad++; if (k === 0 || !FLEX || bad > 1) return 0; continue; }
    sc += s.score;
  }
  return sc;
}
const page = path.join(SITE, PAGE); let html = fs.readFileSync(page, 'utf8');
const m = html.match(/id="archivo-data">([\s\S]*?)<\/script>/); const data = JSON.parse(m[1]);
for (const spec of specs) {
  const [slug, nums] = spec.split(':'); const out = `${WORK}/out/${slug}`;
  const built = JSON.parse(fs.readFileSync(`${out}/items.json`));
  for (const n of nums.split(',').map(Number)) {
    const site = data[slug].items[n - 1]; const b = built.find((i) => i.src === site.src);
    if (!b || !site.video) { console.log(slug, n, 'no es un clip armado por build.mjs'); continue; }
    // Primero el mismo video; si no hay nada, los otros videos del trabajo.
    const pool = [b.from, ...new Set(built.map((i) => i.from).filter((f) => f !== b.from))];
    let best = null, v = null;
    for (const name of pool) {
    v = byName(name); const file = v.path;
    const near = built.filter((i) => i.from === name).map((i) => i.t); // incluye la que se cambia
    const err = await run(['-hide_banner', '-i', file, '-an', '-vf', "scale=160:-2,select='gt(scene,0.3)',metadata=print", '-f', 'null', '-']);
    const cuts = [0, ...[...err.matchAll(/pts_time:([\d.]+)/g)].map((x) => +x[1]), v.dur];
    let cand = [];
    for (let i = 0; i < cuts.length - 1; i++) if (cuts[i + 1] - cuts[i] > 0.6) cand.push(cuts[i] + Math.min((cuts[i + 1] - cuts[i]) * 0.3, 1));
    for (let i = 1; i <= 12; i++) cand.push(v.dur * i / 13);
    cand = cand.filter((t) => t > 0.5 && t < v.dur - CLIP - 0.3 && near.every((u) => Math.abs(u - t) > 3));
    for (const t of cand) { const s = await clipOk(file, t); if (s && (!best || s > best.s)) best = { t, s, name }; }
    if (best) break;
    }
    if (!best) { console.log(slug, n, 'no encontré otro fragmento que sirva'); continue; }
    v = byName(best.name); const file = v.path; b.from = best.name;
    const id = site.src.replace('.webp', ''); const vert = v.h > v.w * 1.1;
    const fw = vert ? 720 : Math.min(1280, v.w), cw = vert ? 540 : Math.min(960, v.w);
    await grab(file, best.t, fw, `${tmp}/f.png`);
    await run(['-v', 'error', '-y', '-ss', best.t.toFixed(3), '-i', file, '-t', String(CLIP), '-an', '-vf', `scale=${cw}:-2,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-movflags', '+faststart', `${out}/${id}.mp4`]);
    const info = await sharp(`${tmp}/f.png`).webp({ quality: 80 }).toFile(`${out}/${id}.webp`);
    for (const f of [`${id}.webp`, `${id}.mp4`]) fs.copyFileSync(`${out}/${f}`, path.join(SITE, 'assets/archivo', slug, f));
    b.t = +best.t.toFixed(2); b.w = info.width; b.h = info.height; site.w = info.width; site.h = info.height;
    console.log(slug, n, `cambiado: ${best.name} en ${best.t.toFixed(1)} s`);
  }
  fs.writeFileSync(`${out}/items.json`, JSON.stringify(built, null, 1));
}
html = html.replace(m[1], '\n' + JSON.stringify(data, null, 2) + '\n    ');
fs.writeFileSync(page, html); fs.rmSync(tmp, { recursive: true, force: true });
