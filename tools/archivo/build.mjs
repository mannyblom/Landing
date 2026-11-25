// Saca de los exports las piezas de cada trabajo: un fotograma .webp y un clip .mp4 de 4 s, sin audio,
// que arranca en ese mismo cuadro (así el póster y el video coinciden).
// Elige los cuadros solo: busca los cortes de plano y se queda con los más nítidos y mejor expuestos,
// repartidos en el tiempo.
// Uso: node build.mjs <trabajo> [slug,slug...]   (lee <trabajo>/config.json, escribe <trabajo>/out/<slug>/)
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
sharp.cache(false); // los temporales se reutilizan con el mismo nombre: sin caché, cada lectura es la real
import { createRequire } from 'node:module';
const FF = createRequire(import.meta.url)('ffmpeg-static');
const [WORK, only] = process.argv.slice(2);
const inv = JSON.parse(fs.readFileSync(`${WORK}/inventory.json`));
const cfg = JSON.parse(fs.readFileSync(`${WORK}/config.json`));
const OUT = `${WORK}/out`; const CLIP = 4;
const run = (args) => new Promise((res) => { const p = spawn(FF, args); let err = ''; p.stderr.on('data', (d) => { err += d; }); p.on('close', (c) => res({ c, err })); });
const meta = (file) => inv.flatMap((j) => j.videos).find((v) => v.path === file);

async function cuts(file, dur) {
  const { err } = await run(['-hide_banner', '-i', file, '-an', '-vf', "scale=160:-2,select='gt(scene,0.3)',metadata=print", '-f', 'null', '-']);
  return [0, ...[...err.matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]), dur];
}
// bg: color de fondo para videos con transparencia (si no, quedan en negro).
async function frame(file, t, w, bg, out) {
  const vf = bg ? `color=c=${bg}:s=16x16[c];[c][0]scale2ref[bgc][v];[bgc][v]overlay,scale=${w}:-2` : `scale=${w}:-2`;
  await run(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', ...(bg ? ['-filter_complex', vf] : ['-vf', vf]), out]);
}
async function score(img) {
  const s = await sharp(img).stats();
  const mean = s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3 / 255;
  const sd = s.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3 / 255;
  let sc = s.entropy * Math.sqrt(s.sharpness + 0.01) * Math.min(1, sd * 5);
  if (mean < 0.1 || mean > 0.93) sc *= 0.2; // casi negro o casi blanco
  return sc;
}
async function pick(file, k, tmp, bg) {
  const { dur } = meta(file);
  const lo = Math.min(0.8, dur * 0.05), hi = Math.max(lo + 0.1, dur - CLIP - 1.2); // ni la entrada ni el cierre
  const c = await cuts(file, dur);
  let cand = [];
  for (let i = 0; i < c.length - 1; i++) { const a = c[i], b = c[i + 1]; if (b - a < 0.6) continue; const t = a + Math.min((b - a) * 0.3, 1); if (t >= lo && t <= hi) cand.push(t); }
  const even = Math.max(10, k * 4) - cand.length;
  for (let i = 1; i <= even; i++) cand.push(lo + (hi - lo) * i / (even + 1));
  if (cand.length > 40) cand = cand.filter((_, i) => i % Math.ceil(cand.length / 40) === 0);
  const scored = [];
  for (const [i, t] of cand.entries()) { const p = `${tmp}/c${i}.jpg`; await frame(file, t, 240, bg, p); if (fs.existsSync(p)) scored.push({ t, s: await score(p) }); }
  scored.sort((a, b) => b.s - a.s);
  const gap = (hi - lo) / (k + 1) * 0.6; const chosen = [];
  for (const x of scored) { if (chosen.length >= k) break; if (chosen.every((y) => Math.abs(y.t - x.t) >= gap)) chosen.push(x); }
  return chosen.map((x) => x.t).sort((a, b) => a - b);
}
// Reparte las n piezas entre las fuentes: [índice del inventario, regex del nombre, cantidad opcional].
function plan(e) {
  // Regla por carpeta: si hay exports horizontales, se usan solo esos; si son todos verticales, esos.
  // ("vertical": true en la entrada desactiva la regla.)
  const horiz = (p) => { const v = meta(p); return v.w > v.h * 1.1; };
  const groups = e.src.map(([j, re, q]) => {
    let files = inv[j].finals.filter((p) => new RegExp(re).test(path.basename(p)));
    if (!e.vertical && files.some(horiz)) files = files.filter(horiz);
    return { files, q };
  });
  const free = groups.filter((g) => !g.q); const left = e.n - groups.reduce((a, g) => a + (g.q || 0), 0);
  free.forEach((g, i) => { g.q = Math.floor(left / free.length) + (i < left % free.length ? 1 : 0); });
  const jobs = [];
  for (const { files: f, q } of groups) {
    if (f.length >= q) for (let i = 0; i < q; i++) jobs.push([f[Math.floor(i * f.length / q)], 1]);
    else f.forEach((file, i) => jobs.push([file, Math.floor(q / f.length) + (i < q % f.length ? 1 : 0)]));
  }
  return jobs.filter(([, k]) => k > 0);
}
for (const e of cfg) {
  if (only && !only.split(',').includes(e.slug)) continue;
  const dir = `${OUT}/${e.slug}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(`${dir}/tmp`, { recursive: true });
  const items = []; let n = 0;
  for (const [file, k] of plan(e)) {
    const times = await pick(file, k, `${dir}/tmp`, e.bg);
    const m = meta(file); const vert = m.h > m.w * 1.1;
    const fw = vert ? 720 : Math.min(1280, m.w), cw = vert ? 540 : Math.min(960, m.w);
    for (const t of times) {
      const id = String(++n).padStart(2, '0');
      await frame(file, t, fw, e.bg, `${dir}/${id}.png`);
      const len = Math.min(CLIP, m.dur - t - 0.1);
      const vf = (e.bg ? `color=c=${e.bg}:s=${m.w}x${m.h}[bg];[bg][0]overlay=shortest=1,` : '') + `scale=${cw}:-2,fps=30,format=yuv420p`;
      await run(['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', file, '-t', len.toFixed(2), '-an', ...(e.bg ? ['-filter_complex', vf] : ['-vf', vf]), '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-movflags', '+faststart', `${dir}/${id}.mp4`]);
      const info = await sharp(`${dir}/${id}.png`).webp({ quality: 80 }).toFile(`${dir}/${id}.webp`); fs.rmSync(`${dir}/${id}.png`);
      items.push({ src: `${id}.webp`, w: info.width, h: info.height, video: `${id}.mp4`, from: path.basename(file), t: +t.toFixed(2) });
    }
  }
  fs.rmSync(`${dir}/tmp`, { recursive: true, force: true });
  fs.writeFileSync(`${dir}/items.json`, JSON.stringify(items, null, 1));
  const kb = Math.round(fs.readdirSync(dir).reduce((a, f) => a + fs.statSync(`${dir}/${f}`).size, 0) / 1024);
  console.log(e.slug, items.length, 'piezas', kb, 'KB');
}
