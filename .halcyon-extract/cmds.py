#!/usr/bin/env python3
"""Extract command-registry entries {id, label, category, defaultShortcut, aliases} from the bundle."""
import re
import sys

src = open(sys.argv[1], encoding="utf-8", errors="replace").read()

# Command objects look like: {id:"file.new",label:"New Document",category:"file",defaultShortcut:"Mod-n",...}
pat = re.compile(
    r'\{id:"([a-zA-Z][\w.]*\.[\w.]+)",label:"((?:[^"\\]|\\.)*)"([^{}]{0,400}?)(?=,run:|,enabled:|\},|\{)'
)

rows = []
for m in pat.finditer(src):
    cid, label, rest = m.group(1), m.group(2), m.group(3)
    cat = re.search(r'category:"([^"]+)"', rest)
    sc = re.search(r'defaultShortcut:"([^"]+)"', rest)
    scs = re.search(r'defaultShortcuts:\[([^\]]*)\]', rest)
    al = re.search(r'aliases:\[([^\]]*)\]', rest)
    shortcut = sc.group(1) if sc else (scs.group(1).replace('"', '') if scs else "")
    rows.append((cid, label, cat.group(1) if cat else "", shortcut,
                 al.group(1).replace('"', '') if al else ""))

seen = set()
print(f"{'id':40} {'category':14} {'shortcut':22} label / aliases")
print("-" * 130)
for cid, label, cat, sc, al in rows:
    if cid in seen:
        continue
    seen.add(cid)
    print(f"{cid:40} {cat:14} {sc:22} {label}" + (f"   [{al}]" if al else ""))
print(f"\nTOTAL unique: {len(seen)}")
