# Dev helper: deep-merges fragments/<name>.json ({"sw": {...}, "en": {...}}) into src/sw.json and src/en.json.
import json, sys, os
here = os.path.dirname(os.path.abspath(__file__))
def deep(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict): deep(a[k], v)
        else: a[k] = v
    return a
for name in sys.argv[1:]:
    frag = json.load(open(os.path.join(here, 'fragments', name + '.json')))
    for loc in ('sw', 'en'):
        p = os.path.join(here, 'src', loc + '.json')
        cur = json.load(open(p)) if os.path.exists(p) else {}
        deep(cur, frag[loc])
        json.dump(cur, open(p, 'w'), ensure_ascii=False, indent=2)
        open(p, 'a').write('\n')
