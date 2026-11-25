"""Elige la última versión de cada pieza (sin preview, low ni versiones viejas) y saca una tira de
6 cuadros por trabajo para mirar rápido qué tiene. Uso: python3 strips.py <trabajo> [índices a saltear...]
Escribe 'finals' en inventory.json y las tiras en <trabajo>/strips/NN.jpg."""
import json, re, subprocess, sys, os
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.path.join(HERE, 'node_modules/ffmpeg-static/ffmpeg')
WORK = sys.argv[1]; SKIP = {int(x) for x in sys.argv[2:]}
inv = json.load(open(f'{WORK}/inventory.json'))
out = f'{WORK}/strips'; os.makedirs(out, exist_ok=True)
def base(n):
    b = os.path.splitext(n.lower())[0]
    b = re.sub(r'\(\d\)|_\d$|preview|low|sfx|musica \d+|apple ?prores ?\d*|_?ver s\w*', '', b)
    b = re.sub(r'[ _-]*v\d+\b', '', b)
    return re.sub(r'[ _-]+', ' ', b).strip()
def finals(vids):
    groups = {}
    for v in vids:
        if re.search(r'preview|low', v['name'], re.I) and len(vids) > 1: continue
        groups.setdefault(base(v['name']), []).append(v)
    return [sorted(g, key=lambda v: v['name'])[-1] for g in groups.values()]
plan = []
for i, j in enumerate(inv):
    f = finals(j['videos']); j['finals'] = [v['path'] for v in f]
    if i in SKIP or not f: continue
    if len(f) >= 4: picks = [(v, v['dur'] * 0.45) for v in f[:6]]
    else:
        n = 6 // len(f); picks = [(v, v['dur'] * (k + 1) / (n + 1)) for v in f for k in range(n)][:6]
    plan.append((i, picks))
json.dump(inv, open(f'{WORK}/inventory.json', 'w'), ensure_ascii=False, indent=1)
def grab(a):
    i, k, v, t = a
    subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', v['path'], '-frames:v', '1', '-vf', 'scale=-2:300', f'{out}/_{i:02d}_{k}.jpg'])
with ThreadPoolExecutor(4) as ex: list(ex.map(grab, [(i, k, v, t) for i, p in plan for k, (v, t) in enumerate(p)]))
for i, picks in plan:
    ins = [f'{out}/_{i:02d}_{k}.jpg' for k in range(len(picks)) if os.path.exists(f'{out}/_{i:02d}_{k}.jpg')]
    if not ins: continue
    args = [FF, '-v', 'error', '-y'] + sum([['-i', p] for p in ins], [])
    if len(ins) > 1: args += ['-filter_complex', ''.join(f'[{k}]' for k in range(len(ins))) + f'hstack=inputs={len(ins)}']
    subprocess.run(args + [f'{out}/{i:02d}.jpg'])
    print(i, inv[i]['job'], '| finales:', len(inv[i]['finals']))
