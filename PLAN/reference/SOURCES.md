# Where the specification came from

Authorization: the owner of the original applications granted permission for this reimplementation.

## Primary sources (authoritative, in priority order)

| # | Source | File | Why it ranks here |
|---|--------|------|-------------------|
| 1 | Halcyon Flow's own in-app manual | `HELP-FLOW-INAPP.md` | 12 chapters, 40 KB, extracted verbatim from the shipped renderer bundle. The app's own description of its behavior. |
| 2 | Halcyon Docs' own in-app manual | `HELP-DOCS-INAPP.md` | 14 chapters, 65 KB, same provenance. |
| 3 | IPC channel inventory | `IPC-CHANNELS.txt` | ~200 channel names recovered from the V8 bytecode string tables of both main processes. Defines the real process boundary. |
| 4 | Real file-format samples | `fixtures/upstream/` | `new-template.jflow`, `new-template.hal`, `sample.hal` taken from the installed apps. Ground truth for the parsers. |
| 5 | Shipped stylesheets | `upstream-flow.css`, `upstream-docs.css` | Design tokens, verbatim. Not heavily minified. |
| 6 | Shipped dependency manifests | `upstream-*-package.json` | The exact library set and versions the originals use. |

When two sources disagree, the lower number wins.

## Not available

**`https://www.halcyondebate.org/#/docs` is paywalled.** The route renders, then shows
"The Guide is for Halcyon subscribers — Sign in with an active subscription to read the full
manuals and setup guide." Confirmed by rendering the SPA in a browser; a plain HTTP fetch returns
only the marketing landing page and never reaches the gate.

This costs us nothing. The site advertises exactly "full manuals for both apps, plus account,
billing, and setup" — the two app manuals are items 1 and 2 above, recovered in full, and account
and billing are out of scope for a local workalike. **Do not spend loop iterations trying to reach
this URL.**

## How the sources were recovered

Both apps are Electron. The steps, in case anything needs re-deriving:

1. `Contents/Resources/app.asar` extracted with `asar_extract.py` (a ~40-line pure-Python asar
   reader — this machine has no Node, so `npx @electron/asar` is unavailable).
2. The main process is compiled to V8 bytecode with `bytenode`; each `electron/*.cjs` is a
   two-line loader for a sibling `.jsc`. The bytecode is not decompilable, but V8 keeps string
   literals in the constant pool, so channel names, file names, and paths were recoverable by
   scanning for printable runs.
3. The renderers are ordinary minified JS and fully readable.
4. Both renderers embed their help manual as string literals in an array of
   `{id, title, summary, bullets[]}` chapter objects. `help_to_md.py` linearizes that region into
   markdown. Note the two bundles use different quoting — Docs uses `"` and Flow uses backticks —
   and a tokenizer that ignores template literals will desync and silently drop most chapters.

## A note on CardMirror

Halcyon Docs registers `org.halcyondebate.cmir` / `.cmir` "CardMirror Document" as a first-class
document type in its `Info.plist`, and its bundle contains a full CardMirror importer and exporter
with format identifier `cardmirror-doc`. Building this clone on
[CardMirror](https://github.com/ant981228/cardmirror) is therefore not a substitution for what the
original does — it is what the original already does.
