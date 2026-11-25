"""Suma trabajos ya armados (build.mjs) a la web: copia las piezas a assets/archivo/<slug>/, agrega el
cuadro en la grilla de su año (crea el año si no existe) y su ficha en el JSON del visor, y actualiza
el total del encabezado.
Uso: python3 add.py <trabajo> <index.html|motion.html> <año> slug slug ... [--sacar slug:01,04 ...]
Con --sacar se dejan afuera piezas puntuales (por número) antes de copiar."""
import json, re, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
args = sys.argv[1:]; drop = {}
if '--sacar' in args:
    i = args.index('--sacar')
    for d in args[i + 1:]: s, n = d.split(':'); drop[s] = n.split(',')
    args = args[:i]
WORK, PAGE, YEAR, SLUGS = args[0], args[1], int(args[2]), args[3:]
cfg = {e['slug']: e for e in json.load(open(f'{WORK}/config.json'))}
page = os.path.join(SITE, PAGE); s = open(page).read()

def items(slug):
    its = json.load(open(f'{WORK}/out/{slug}/items.json'))
    return [{'src': i['src'], 'w': i['w'], 'h': i['h'], 'video': i['video']} for i in its if i['src'][:2] not in drop.get(slug, [])]
def tile(slug, its):
    e = cfg[slug]; f = its[0]; esc = lambda t: t.replace('&', '&amp;')
    return f'''          <li class="arch__item">
            <a class="arch__link" href="assets/archivo/{slug}/{f['video']}" target="_blank" rel="noopener" data-arch="{slug}">
              <span class="arch__media"><img src="assets/archivo/{slug}/{f['src']}" loading="lazy" decoding="async" alt=""><video muted loop playsinline preload="none" data-src="assets/archivo/{slug}/{f['video']}" aria-hidden="true" tabindex="-1"></video></span>
              <span class="arch__title">{esc(e['title'])}</span>
              <span class="arch__kind">{esc(e['kind'])} · {len(its)} piezas</span>
              <span class="sr-only">(ver el trabajo completo)</span>
            </a>
          </li>
'''
m = re.search(r'id="archivo-data">(.*?)</script>', s, re.S); data = json.loads(m.group(1))
html = ''
for slug in SLUGS:
    if slug in data: sys.exit(f'{slug} ya está en {PAGE}')
    its = items(slug); d = os.path.join(SITE, 'assets/archivo', slug)
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    for it in its:
        for k in ('src', 'video'): shutil.copy(f'{WORK}/out/{slug}/{it[k]}', f'{d}/{it[k]}')
    data[slug] = {'title': cfg[slug]['title'], 'kind': cfg[slug]['kind'], 'year': YEAR, 'href': cfg[slug].get('href', ''), 'items': its}
    html += tile(slug, its)
# El JSON queda ordenado por año (de más nuevo a más viejo): "Siguiente trabajo" sigue la grilla.
data = dict(sorted(data.items(), key=lambda kv: -int(kv[1]['year'])))
s = s[:m.start(1)] + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n    ' + s[m.end(1):]
blocks = [(int(b.group(1)), b.start()) for b in re.finditer(r'      <div class="arch__year">\n        <h3 class="arch__y">(\d{4})</h3>', s)]
mine = [p for y, p in blocks if y == YEAR]
if mine:
    end = s.index('        </ul>\n', mine[0]); s = s[:end] + html + s[end:]
else:
    block = f'      <div class="arch__year">\n        <h3 class="arch__y">{YEAR}</h3>\n        <ul class="arch__grid">\n{html}        </ul>\n      </div>\n'
    older = [p for y, p in blocks if y < YEAR]
    if older: at = older[0]
    else: last = blocks[-1][1]; at = s.index('        </ul>\n      </div>\n', last) + len('        </ul>\n      </div>\n')
    s = s[:at] + block + s[at:]
years = sorted({int(v['year']) for v in data.values()})
rng = f'{years[0]}–{years[-1]}' if len(years) > 1 else str(years[0])
s = re.sub(r'(<p class="arch__total">)(\d+) (trabajos|proyectos) · [\d–]+', lambda x: f'{x.group(1)}{len(data)} {x.group(3)} · {rng}', s, count=1)
open(page, 'w').write(s)
print(PAGE, len(data), 'trabajos en total; sumados:', ', '.join(SLUGS))
