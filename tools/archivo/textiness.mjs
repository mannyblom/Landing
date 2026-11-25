// Detecta texto sobreimpreso (logos, placas, subtítulos): cuenta los bordes de blanco casi puro
// contra algo oscuro. Da alto con letras encima y bajo en cielos o paredes claras.
import sharp from 'sharp';
sharp.cache(false); // los temporales se reutilizan con el mismo nombre: sin caché, cada lectura es la real
export async function textiness(img) {
  const { data, info } = await sharp(img).resize({ width: 480 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info; const L = (x, y) => { const i = (y * w + x) * 3; return Math.min(data[i], data[i + 1], data[i + 2]); };
  let t = 0;
  for (let y = 0; y < h - 2; y++) for (let x = 0; x < w - 2; x++) {
    const a = L(x, y); if (a < 225) continue;
    if (L(x + 2, y) < a - 90 || L(x, y + 2) < a - 90) t++;
  }
  return t / (w * h) * 1000;
}
