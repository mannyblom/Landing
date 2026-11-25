# Herramientas del Archivo

Scripts para pasar trabajos de los discos a la sección Archivo (Film y Motion). Sacan de los exports
finales un fotograma `.webp` y un clip `.mp4` de 4 s por pieza, sin audio, y los suman a la web.
No se publican: Vercel ignora esta carpeta (`.vercelignore`).

## Instalar (una vez)

```bash
cd tools/archivo
npm install
npx playwright install chromium webkit   # solo para check.mjs
```

`node_modules/` y `work/` (inventarios y piezas en proceso) no se suben a GitHub.

## Pasos

1. **Inventario.** Busca carpetas EXPORT o RENDER y anota cada video.
   `python3 inventory.py work/<nombre> "/Volumes/<disco>" "<carpeta>" ...`
2. **Tiras para elegir.** Un vistazo de cada trabajo con la última versión de cada video.
   `python3 strips.py work/<nombre>` y `node pages.mjs work/<nombre>` → `work/<nombre>/page-N.jpg`
3. **Configuración.** En `work/<nombre>/config.json`, un trabajo por entrada:
   `{"slug": "clan-eterea", "page": "film", "title": "Clan", "kind": "Fashion film · Etérea",
   "src": [[17, "Reel"]], "n": 6}`. `src` son pares [índice del inventario, regex del nombre del
   archivo, cantidad opcional]; `n`, el total de piezas. `"bg": "#efefef"` para videos con transparencia.
4. **Piezas.** `node build.mjs work/<nombre> [slug,slug]` → `work/<nombre>/out/<slug>/`
5. **Revisar.** `node sheet.mjs work/<nombre> hoja.jpg slug slug ...` (cada pieza lleva su número).
6. **Sumar a la web.** `python3 add.py work/<nombre> index.html 2025 slug slug ... [--sacar slug:02,05]`
   (`motion.html` para Motion). Crea el año si no existe y actualiza el total.
6b. **Imágenes fijas (opcional).** Para sumar fotogramas, un cuadro sobre blanco y un collage de tres
   a trabajos que ya están en la web: `work/<nombre>/stills.json` (ver el encabezado de `stills.mjs`),
   `node stills.mjs work/<nombre>`, revisar con `node sheetstills.mjs work/<nombre> hoja.jpg slug ...` y
   sumar con `python3 addstills.py work/<nombre> index.html slug ... [--sacar slug:f02]`. Descarta los
   cuadros con texto encima (`textiness.mjs`) y los parecidos a lo ya publicado.
7. **Probar.** Con la web local en el puerto 4173: `node check.mjs http://127.0.0.1:4173/ slug slug`

## Criterios

- Nombre y año salen de la carpeta. Los trabajos sin publicación van con `"href": ""` (el visor no
  muestra el enlace).
- Afuera: entrevistas y testimonios, tomas de ecommerce, capacitaciones largas, y material de
  terceros (stock con marca de agua, recortes de noticieros).
- Antes de publicar se mira la hoja de contactos y la web local.
