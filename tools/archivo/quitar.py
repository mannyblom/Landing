"""Saca piezas de un trabajo por su número en el visor (el del contador "3 / 10"), o un trabajo entero.
Borra los archivos que ya no usa y actualiza el "· N piezas" y el total del encabezado.
Uso: python3 quitar.py <index.html|motion.html> slug:3,5,12 slug:7 ... [--todo slug slug]
--todo saca el trabajo completo y guarda sus piezas en work/guardado/<slug>/ (fuera de la web)."""
import json, re, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
args = sys.argv[1:]; todo = []
if '--todo' in args: i = args.index('--todo'); todo = args[i + 1:]; args = args[:i]
PAGE = args[0]; page = os.path.join(SITE, PAGE); s = open(page).read()
m = re.search(r'id="archivo-data">(.*?)</script>', s, re.S); data = json.loads(m.group(1))
for spec in args[1:]:
    slug, nums = spec.split(':'); idx = sorted({int(n) - 1 for n in nums.split(',')})
    items = data[slug]['items']; out = [it for i, it in enumerate(items) if i not in idx]
    keep = {it[k] for it in out for k in ('src', 'video') if k in it}
    for i in idx:
        for k in ('src', 'video'):
            f = items[i].get(k)
            if f and f not in keep and os.path.exists(os.path.join(SITE, 'assets/archivo', slug, f)): os.remove(os.path.join(SITE, 'assets/archivo', slug, f))
    data[slug]['items'] = out
    # Si se fue la pieza 1, el cuadro de la grilla pasa a usar la nueva primera.
    first = out[0]
    s = re.sub(r'(data-arch="' + re.escape(slug) + r'">.*?<span class="arch__kind">[^<]*?· )\d+ piezas?', lambda x: f'{x.group(1)}{len(out)} piezas', s, count=1, flags=re.S)
    print(slug, f'quedan {len(out)} piezas')
for slug in todo:
    entry = data.pop(slug)
    s, n = re.subn(r'          <li class="arch__item">\n(?:(?!</li>).)*?data-arch="' + re.escape(slug) + r'".*?</li>\n', '', s, count=1, flags=re.S)
    dst = os.path.join(HERE, 'work/guardado', slug); shutil.rmtree(dst, ignore_errors=True); os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(os.path.join(SITE, 'assets/archivo', slug), dst); json.dump(entry, open(dst + '/ficha.json', 'w'), ensure_ascii=False, indent=1)
    print(slug, 'sacado entero, guardado en work/guardado/' + slug)
m = re.search(r'id="archivo-data">(.*?)</script>', s, re.S)
s = s[:m.start(1)] + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n    ' + s[m.end(1):]
s = re.sub(r'(<p class="arch__total">)\d+ (trabajos|proyectos)', lambda x: f'{x.group(1)}{len(data)} {x.group(2)}', s, count=1)
open(page, 'w').write(s)
