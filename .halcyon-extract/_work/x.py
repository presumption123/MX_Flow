import re, sys, json, collections

F = "/Users/ananthmangalam/Desktop/Coding/MX_Flow/.halcyon-extract/flow/dist/assets/index-CQ8oVwJH.js"
src = open(F, encoding="utf-8", errors="replace").read()

def cmd_strings():
    out = collections.Counter()
    for m in re.finditer(r'"((?:[^"\\\n]|\\.){2,120})"', src):
        out[m.group(1)] += 1
    for m in re.finditer(r"'((?:[^'\\\n]|\\.){2,120})'", src):
        out[m.group(1)] += 1
    for m in re.finditer(r'`((?:[^`\\\n]|\\.){2,120})`', src):
        out[m.group(1)] += 1
    for s in sorted(out):
        print(f"{out[s]:5d}  {s}")

def cmd_grep():
    pat = sys.argv[2]
    before = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    after = int(sys.argv[4]) if len(sys.argv) > 4 else 400
    maxn = int(sys.argv[5]) if len(sys.argv) > 5 else 40
    n = 0
    for m in re.finditer(pat, src):
        n += 1
        if n > maxn:
            print(f"... more matches truncated")
            break
        a = max(0, m.start() - before)
        b = min(len(src), m.end() + after)
        print(f"=== @{m.start()} ===")
        print(src[a:b].replace("\n", "\\n"))
        print()

def cmd_at():
    off = int(sys.argv[2]); ln = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
    print(src[off:off+ln])

globals()["cmd_" + sys.argv[1]]()
