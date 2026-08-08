"""Linearize the embedded in-app help corpus from a minified bundle into markdown."""
import re
import sys

src = open(sys.argv[1], encoding="utf-8", errors="replace").read()

TOKEN = re.compile(
    r"""(?P<key>\b(?:id|title|summary|bullets|text|sub|label|keys|when)\s*:)|"""
    r'''(?P<str>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|'''
    r"(?P<open>\[)|(?P<close>\])",
    re.S,
)


def unquote(raw):
    body = raw[1:-1]
    body = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), body)
    for a, b in [("\\n", "\n"), ("\\t", "\t"), ('\\"', '"'), ("\\'", "'"), ("\\\\", "\\")]:
        body = body.replace(a, b)
    return body


out = []
pending = None
depth = 0
for m in TOKEN.finditer(src):
    if m.group("key"):
        pending = m.group("key")[:-1].strip()
    elif m.group("open"):
        depth += 1
    elif m.group("close"):
        depth = max(0, depth - 1)
    elif m.group("str"):
        val = unquote(m.group("str")).strip()
        if not val or len(val) < 2:
            pending = None
            continue
        if pending == "title":
            out.append(f"\n\n## {val}\n")
        elif pending == "summary":
            out.append(f"\n_{val}_\n")
        elif pending in ("text", None):
            out.append(f"- {val}")
        elif pending == "label":
            out.append(f"- **{val}**")
        elif pending == "keys":
            out.append(f"  - `{val}`")
        elif pending == "id":
            pass
        else:
            out.append(f"- ({pending}) {val}")
        pending = None

print("\n".join(out))
