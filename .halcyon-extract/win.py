#!/usr/bin/env python3
"""Extract character windows around regex matches in a minified single-line bundle."""
import re
import sys

path = sys.argv[1]
pattern = sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 200
after = int(sys.argv[4]) if len(sys.argv) > 4 else 800
limit = int(sys.argv[5]) if len(sys.argv) > 5 else 20

src = open(path, encoding="utf-8", errors="replace").read()
for i, m in enumerate(re.finditer(pattern, src)):
    if i >= limit:
        print(f"... (more matches truncated at {limit})")
        break
    lo = max(0, m.start() - before)
    hi = min(len(src), m.end() + after)
    print(f"===== match {i} @ {m.start()} =====")
    print(src[lo:hi])
    print()
