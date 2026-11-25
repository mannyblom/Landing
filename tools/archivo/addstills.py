"""Suma a trabajos que ya están en la web las imágenes fijas de stills.mjs: van al final de su visor
(después de los clips) y actualizan el "· N piezas" del cuadro. Si se corre de nuevo, reemplaza las
imágenes anteriores (f01.webp, f02.webp..., g01.webp).
Uso: python3 addstills.py <trabajo> <index.html|motion.html> slug slug ... [--sacar slug:f02 ...]"""
import json, re, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
args = sys.argv[1:]; drop = {}
if '--sacar' in args:
    i = args.index('--sacar')
    for d in args[i + 1:]: sl, n = d.split(':'); drop[sl] = n.split(',')
    args = args[:i]
WORK, PAGE, SLUGS = args[0], args[1], args[2:]
page = os.path.join(SITE, PAGE); s = open(page).read()
m = re.search(r'id="archivo-data">(.*?)</script>', s, re.S); data = json.loads(m.group(1))
for slug in SLUGS:
    if slug not in data: sys.exit(f'{slug} no está en {PAGE}')
    dst = os.path.join(SITE, 'assets/archivo', slug)
    for f in os.listdir(dst):
        if re.match(r'[fg]\d\d\.webp$', f): os.remove(os.path.join(dst, f))
    items = [i for i in data[slug]['items'] if not re.match(r'[fg]\d\d\.webp$', i['src'])]
    new = [i for i in json.load(open(f'{WORK}/stills/{slug}/items.json')) if i['src'][:3] not in drop.get(slug, [])]
    g = f'{WORK}/stills/{slug}/grid.json'  # la grilla de 3 × 3, si se armó
    if os.path.exists(g): new += [i for i in json.load(open(g)) if i['src'][:3] not in drop.get(slug, [])]
    for i in new: shutil.copy(f'{WORK}/stills/{slug}/{i["src"]}', os.path.join(dst, i['src']))
    data[slug]['items'] = items + new
    n = len(data[slug]['items'])
    s, k = re.subn(r'(data-arch="' + re.escape(slug) + r'">.*?<span class="arch__kind">[^<]*?· )\d+ piezas?', lambda x: f'{x.group(1)}{n} piezas', s, count=1, flags=re.S)
    print(slug, f'{len(items)} clips + {len(new)} imágenes = {n} piezas', '' if k else '(no encontré el contador del cuadro)')
m = re.search(r'id="archivo-data">(.*?)</script>', s, re.S)
s = s[:m.start(1)] + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n    ' + s[m.end(1):]
open(page, 'w').write(s)
