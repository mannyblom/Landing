"""Inventario de exports: busca carpetas EXPORT/RENDER y anota duración y tamaño de cada video.
Uso: python3 inventory.py <trabajo> <raíz del disco> [subcarpetas...]
     python3 inventory.py work/disco01 "/Volumes/Disco 01" "CLAN 2025" "FOA 2024" NX
Escribe <trabajo>/inventory.json."""
import os, re, subprocess, json, sys
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.path.join(HERE, 'node_modules/ffmpeg-static/ffmpeg')
WORK, BASE, TOPS = sys.argv[1], sys.argv[2], sys.argv[3:] or sorted(os.listdir(sys.argv[2]))
FOLDERS = ('export', 'exports', 'render', 'renders')
os.makedirs(WORK, exist_ok=True)

def probe(p):
    r = subprocess.run([FF, '-hide_banner', '-i', p], capture_output=True, text=True).stderr
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r)
    v = re.search(r'Video: (\w+).*?, (\d{3,5})x(\d{3,5})', r)
    dur = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else 0
    return {'path': p, 'name': os.path.basename(p), 'size': os.path.getsize(p), 'dur': round(dur, 1),
            'codec': v.group(1) if v else '?', 'w': int(v.group(2)) if v else 0, 'h': int(v.group(3)) if v else 0}

inv = []
for top in TOPS:
    tp = os.path.join(BASE, top)
    if not os.path.isdir(tp): continue
    for dp, dns, _ in os.walk(tp):
        dns.sort()
        if dp[len(BASE):].count('/') > 5: dns[:] = []; continue
        if os.path.basename(dp).lower() not in FOLDERS: continue
        dns[:] = []
        vids = [probe(os.path.join(r, f)) for r, _, fs in os.walk(dp) for f in sorted(fs)
                if not f.startswith('._') and f.lower().endswith(('.mp4', '.mov', '.m4v'))]
        if vids: inv.append({'project': top, 'job': os.path.relpath(os.path.dirname(dp), BASE), 'folder': dp, 'videos': vids})
json.dump(inv, open(os.path.join(WORK, 'inventory.json'), 'w'), ensure_ascii=False, indent=1)
for i, j in enumerate(inv):
    print(i, f"{j['job']} ({len(j['videos'])}): " + '; '.join(f"{v['name'][:38]} {v['dur']}s {v['w']}x{v['h']}" for v in j['videos'][:4]))
