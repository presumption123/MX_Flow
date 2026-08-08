import json
import os
import struct
import sys


def extract(asar_path, out_dir):
    with open(asar_path, "rb") as fh:
        blob = fh.read()

    (a, pickle_size, c, json_size) = struct.unpack("<IIII", blob[0:16])
    print("hdr ints:", a, pickle_size, c, json_size)
    header, _end = json.JSONDecoder().raw_decode(
        blob[16 : 16 + json_size].decode("utf-8", "replace")
    )
    base = 8 + pickle_size

    manifest = []

    def walk(node, path, rel=""):
        for name, entry in node.get("files", {}).items():
            target = os.path.join(path, name)
            relpath = f"{rel}/{name}" if rel else name
            manifest.append((relpath, entry.get("size", "")))
            if "files" in entry:
                if relpath.split("/")[0] == "node_modules" and relpath.count("/") >= 1:
                    continue
                os.makedirs(target, exist_ok=True)
                walk(entry, target, relpath)
            elif "offset" in entry:
                start = base + int(entry["offset"])
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, "wb") as out:
                    out.write(blob[start : start + int(entry["size"])])
            else:
                # unpacked or link entries have no inline payload
                pass

    os.makedirs(out_dir, exist_ok=True)
    walk(header, out_dir)
    with open(out_dir + "_manifest.txt", "w") as fh:
        for relpath, size in manifest:
            fh.write(f"{size}\t{relpath}\n")


if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2])
    print("extracted", sys.argv[1], "->", sys.argv[2])
