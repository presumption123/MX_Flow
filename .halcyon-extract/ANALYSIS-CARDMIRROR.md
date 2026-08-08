# CardMirror — Architectural Analysis

**Analyzed:** 2026-08-07
**Source:** <https://github.com/ant981228/cardmirror> (default branch `main`)
**Local copy:** `/Users/ananthmangalam/Desktop/Coding/MX_Flow/.halcyon-extract/cardmirror`
**Version analyzed:** `0.1.0-beta.30` (per `package.json`)

**Acquisition note.** `git clone --depth 1` failed twice inside the tool sandbox — not
a network problem, but a filesystem restriction on creating `.git/hooks/`
(`Operation not permitted`). I retrieved the full tree instead via
`curl https://codeload.github.com/ant981228/cardmirror/tar.gz/refs/heads/main` and
extracted it. **The working tree is complete and byte-identical to the branch tip**,
but there is **no `.git` directory**, so commit history, tags, and branches were not
examined. Everything below is read from actual source files, not inferred.

---

## 0. Executive summary (read this first)

| Dimension | Finding |
| --- | --- |
| License | **PolyForm Noncommercial 1.0.0 — NOT open source.** Commercial use requires a separate license from the author. |
| Language / stack | TypeScript 5.7 (strict), Vite 6, ProseMirror, Electron 42, Vitest |
| Document model | **ProseMirror** — a purpose-built debate schema (17 node types, 20 mark types) |
| Scale | ~115k lines in `src/`, ~11k in the Electron shell, ~59k in 286 test files |
| `.docx` support | **Yes — hand-rolled OOXML importer/exporter**, the project's dominant correctness criterion |
| Real-time collab | **Already shipped — but Loro CRDT, not Yjs** |
| Companion-app IPC | **Already shipped** — a documented, frozen loopback HTTP protocol (`cardmirror-bridge`) |
| Maturity | Genuinely production-grade in the editor core; beta-labeled |

**Bottom line:** technically this is an *outstanding* baseline — far more complete than
you probably expect, and it has already solved three of your four integration
questions. The blocking issue is **legal, not technical**: the license forbids
commercial use, and it is viral on notice requirements.

---

## 1. License

### The exact license

`LICENSE` (147 lines) — **PolyForm Noncommercial License 1.0.0**.
Canonical text: <https://polyformproject.org/licenses/noncommercial/1.0.0/>

`package.json` declares it indirectly:

```json
  "license": "SEE LICENSE IN LICENSE",
  "author": "Anthony Trufanov",
```

This is **not** an OSI-approved open-source license, and it is **not** free software.
The repository is publicly readable ("source available"), which is a different thing.
Treat any description of this project as "open source" as inaccurate.

### What it permits

> ## Noncommercial Purposes
>
> Any noncommercial purpose is a permitted purpose.

> ## Changes and New Works License
>
> The licensor grants you an additional copyright license to
> make changes and new works based on the software for any
> permitted purpose.

So a **derivative work is explicitly allowed** — but only for a *permitted purpose*,
and "permitted purpose" is defined exhaustively as noncommercial:

> ## Personal Uses
>
> Personal use for research, experiment, and testing for
> the benefit of public knowledge, personal study, private
> entertainment, hobby projects, amateur pursuits, or religious
> observance, without any anticipated commercial application,
> is use for a permitted purpose.

> ## Noncommercial Organizations
>
> Use by any charitable organization, educational institution,
> public research organization, public safety or health
> organization, environmental protection organization,
> or government institution is use for a permitted purpose
> regardless of the source of funding or obligations resulting
> from the funding.

Note that a school, university, or debate program **is** a permitted user. A
for-profit company selling a debate app **is not**.

### Attribution requirements for a derivative work

Two obligations, both mandatory:

**(a) Propagate the terms and the Required Notice.** From the `Notices` section:

> You must ensure that anyone who gets a copy of any part of
> the software from you also gets a copy of these terms or the
> URL for them above, as well as copies of any plain-text lines
> beginning with `Required Notice:` that the licensor provided
> with the software.

The Required Notice you must carry verbatim is `LICENSE` lines 5–13:

```
Required Notice: Copyright (c) 2026 Anthony Trufanov. CardMirror is
built on ProseMirror (<https://prosemirror.net/>), the rich-text
editor framework by Marijn Haverbeke (<https://marijnhaverbeke.nl/>),
used under the MIT License. ProseMirror's copyright notices are
preserved in the project's `node_modules/` and acknowledged in the
README. The application's interface icons are from the Untitled UI
free icons (<https://www.untitledui.com/free-icons>), © Untitled UI,
used under their free license. Third-party attributions and license
terms are collected in `THIRD-PARTY-NOTICES.md`.
```

**(b) Carry the third-party notices.** `THIRD-PARTY-NOTICES.md` covers ProseMirror,
fast-xml-parser, fflate, nspell, tinyld, electron-updater, koffi (all MIT), bundled
fonts (OFL 1.1 / Apache 2.0 / DejaVu), the SCOWL-derived Hunspell dictionary, Vosk
(Apache 2.0), and Untitled UI icons.

### Licensing landmines specific to your plan

1. **You cannot sublicense or relicense.** > "These terms do not allow you to
   sublicense or transfer any of your licenses to anyone else." Your `.hal` app
   would have to ship under PolyForm Noncommercial too (or under a separate
   commercial grant negotiated with the author).
2. **The Untitled UI icons are separately restricted** and are the tightest
   constraint in the tree. Per `THIRD-PARTY-NOTICES.md`:
   > **You are not allowed to:**
   > - Sell, sublicense, or distribute the icons (in original or modified form).
   > - Create derivative icon libraries based on the icons.

   The upstream `.svg` files are deliberately *not* committed; `scripts/gen-icons.mjs`
   bakes the used glyphs into `src/editor/icons.css` as mask images. If you fork, you
   inherit that generated file and its restriction. **Plan to replace the icon set.**
3. **The 32-day cure clause** means an inadvertent violation is survivable if you fix
   it promptly after written notice — but all licenses terminate if you do not.
4. **Practical recommendation:** if there is *any* commercial intent — now or later —
   contact Anthony Trufanov for a separate license *before* writing code against this
   baseline. The author already runs a private fork ("Advanced Verbatim"), which
   suggests dual-licensing is a conversation he is equipped to have.

---

## 2. Tech stack

### Runtime targets

Three, all from **one shared renderer bundle**:

1. **Browser web app** (`https://cardmirror.app`, Cloudflare Workers static assets)
2. **Installable PWA** (service worker via `vite-plugin-pwa`, web build only)
3. **Electron desktop app** (`apps/desktop/`) — reuses the same Vite build with
   `--base=./`

There is a fourth, minor target: a Node CLI (`bin/round-trip.ts`) and a bundled
read-only tool (`packaging/cardmirror-read/`).

The platform seam is a single interface, `Host` in `src/editor/host/types.ts`, chosen
once at module load:

```ts
export function getHost(): Host {
  if (cached) return cached;
  // Native wrappers win over plain browser since they expose richer
  // capabilities (real file paths, in-place saves, native menus).
  if (typeof window !== 'undefined' && window.electronAPI !== undefined) {
    cached = new ElectronHost();
    return cached;
  }
  // Tauri detection will land here when the Tauri host is built.
  cached = new BrowserHost();
  return cached;
}
```

### Languages

- **TypeScript** — everything in `src/`, `apps/desktop/src/`, `tests/`. `type: "module"`, ESM throughout.
- **Python** — `relay/server.py` (771 lines), the optional self-hostable collaboration relay.
- **PowerShell** — `apps/desktop/resources/flow/verbatim-flow.ps1`, the Windows Excel COM helper.
- **Node .mjs** — build scripts (`scripts/gen-icons.mjs`, `scripts/check-doc-links.mjs`).

### Root dependencies (`package.json`, verbatim)

```json
  "dependencies": {
    "fast-xml-parser": "^4.5.0",
    "fflate": "^0.8.3",
    "loro-crdt": "1.13.6",
    "loro-prosemirror": "0.4.3",
    "nspell": "^2.1.5",
    "prosemirror-commands": "^1.6.2",
    "prosemirror-history": "^1.4.1",
    "prosemirror-keymap": "^1.2.2",
    "prosemirror-model": "^1.24.1",
    "prosemirror-state": "^1.4.3",
    "prosemirror-tables": "^1.8.5",
    "prosemirror-transform": "^1.10.2",
    "prosemirror-view": "^1.37.0",
    "tinyld": "^1.3.4"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^29.1.1",
    "patch-package": "8.0.1",
    "tsx": "^4.21.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^2.1.0"
  }
```

Roles:

| Package | Role |
| --- | --- |
| `prosemirror-*` | The editor core. Schema, state, view, transforms, keymap, history, tables. |
| `fast-xml-parser` | OOXML parsing for `.docx` import |
| `fflate` | ZIP codec for `.docx`, gzip codec for `.cmir` |
| `loro-crdt` / `loro-prosemirror` | **CRDT for real-time co-editing (pinned exact versions)** |
| `nspell` | Hunspell-in-JS spellchecker |
| `tinyld` | Source-language detection for the translator |

**Notably absent:** no React/Vue/Svelte, no `docx`/`mammoth`/`officegen`, no
Yjs, no Tailwind, no state-management library. The UI is hand-written DOM with a
single `style.css` (plus generated `icons.css`). This is a deliberately
dependency-light codebase.

### Desktop dependencies (`apps/desktop/package.json`)

```
electron-updater ^6.8.3     # auto-update
koffi            ^3.0.2     # FFI to libvosk for voice recognition
electron         ^42.2.0    (dev)
electron-builder ^26.8.1    (dev)
typescript       ^5.7.2     (dev)
```

### Relay (`relay/requirements.txt`)

```
fastapi>=0.109
uvicorn[standard]>=0.27
sqlalchemy>=2.0
psycopg2-binary>=2.9
```

### Build tooling

- **Vite 6** — renderer bundling and dev server
- **tsc** — Electron main-process build and repo-wide `--noEmit` typecheck
- **esbuild** — bundles the file-index utility process and the read CLI
- **electron-builder** — packaging/distribution
- **Vitest 2** with `jsdom` + `fake-indexeddb`
- **patch-package** — one patch: `patches/loro-prosemirror+0.4.3.patch`
- Node **22** (`.node-version`)

---

## 3. Repository layout

```
cardmirror/
├── LICENSE                     PolyForm Noncommercial 1.0.0 + Required Notice
├── THIRD-PARTY-NOTICES.md      Attribution for all bundled third-party material
├── PROJECT.md                  Orientation/index — start here
├── ARCHITECTURE.md             44 KB. The real design doc (19 sections)
├── README.md                   Install, build-from-source, public API
├── MANUAL.md                   142 KB user manual
├── CHANGELOG.md                284 KB user-facing release notes
├── DETAILED_CHANGELOG.md       792 KB contributor-facing release notes
├── PRIVACY.md / TERMS.md       Product legal docs
├── index.html                  341 lines. The app shell + entire ribbon markup
├── timer.html                  Second Vite entry: pop-out speech timer window
├── package.json                Root manifest (renderer + core)
├── vite.config.ts              Build config, PWA gating, loro wasm handling
├── vitest.config.ts            Test config
├── tsconfig.json               Strict TS config
├── wrangler.jsonc              Cloudflare Workers deploy config for the web app
│
├── src/                        THE SHARED CORE — 293 files, ~115k lines
│   ├── index.ts                Public API barrel (schema/import/export/native)
│   ├── docid.ts                Stable per-document UUID stamping/reading
│   ├── doc-repair.ts           Post-import structural repair (ragged tables etc.)
│   ├── anchor-docx.ts          Injects source anchors into exported .docx
│   ├── schema/                 ProseMirror schema — THE DOCUMENT MODEL
│   │   ├── nodes.ts            (37 KB) 17 node specs
│   │   ├── marks.ts            (20 KB) 20 mark specs
│   │   ├── ids.ts              Stable heading UUIDs ↔ Word bookmarks
│   │   ├── migrate.ts          Legacy-shape heal passes run on every load
│   │   ├── salvage.ts          Last-resort drop-invalid-subtrees recovery
│   │   ├── footnotes.ts        Footnote content typing
│   │   └── slice-check.ts      Clipboard slice validation
│   ├── import/                 .docx → schema
│   │   ├── importer.ts         (64 KB) The OOXML → ProseMirror converter
│   │   ├── html-paste.ts       (36 KB) Clipboard HTML → schema (Word/Docs/web)
│   │   ├── comments.ts         word/comments.xml → Thread[]
│   │   └── footnotes.ts        word/footnotes.xml + endnotes.xml
│   ├── export/                 schema → .docx
│   │   ├── exporter.ts         (41 KB) ProseMirror → OOXML
│   │   ├── transform-for-export.ts  Pre-export normalization pass
│   │   └── docx-numbering.ts   numbering.xml emission
│   ├── ooxml/                  Low-level OOXML/ZIP/crypto primitives
│   │   ├── docx.ts             ZIP package read/write (Docx class)
│   │   ├── styles.ts           (17 KB) Word style table handling
│   │   ├── decrypt-docx.ts     (15 KB) Encrypted (password) .docx support
│   │   ├── aes.ts / sha512.ts  Crypto primitives for the above
│   │   ├── parse.ts / xml.ts   XML helpers over fast-xml-parser
│   │   └── style-clean/        Stylepox / cruft removal on import
│   ├── native/                 THE .cmir SAVE FORMAT
│   │   ├── index.ts            serializeNative / parseNative / salvage
│   │   └── codec.ts            gzip container (fflate), magic-byte sniffing
│   ├── editor/                 THE UI LAYER — 205 entries, the bulk of the app
│   │   ├── index.ts            (9,910 lines) Boot, EditorView, plugin assembly
│   │   ├── ribbon-commands.ts  (6,683 lines) Command registry + default keymap
│   │   ├── settings.ts         (5,247 lines) Settings model + persistence
│   │   ├── multi-pane-shell.ts (3,360 lines) Three-slot multi-doc workspace
│   │   ├── style.css           All app styling
│   │   ├── icons.css           Generated Untitled UI mask images (see license!)
│   │   ├── plugin-api.ts       PUBLIC PLUGIN API SURFACE
│   │   ├── plugin-registry.ts  Plugin command registration
│   │   ├── flow-port.ts        Verbatim Flow (Excel COM) send/pull commands
│   │   ├── file-search.ts      Command-palette file + in-file object search
│   │   ├── headings.ts         Outline collection, heading ranges, cite text
│   │   ├── host/               PLATFORM ABSTRACTION
│   │   │   ├── types.ts        The `Host` interface (open/save/journal/spawn)
│   │   │   ├── browser-host.ts (26 KB) File System Access API + IndexedDB
│   │   │   ├── electron-host.ts(46 KB) IPC to the main process
│   │   │   └── index.ts        getHost() singleton + platform detection
│   │   ├── collab/             REAL-TIME CO-EDITING (Loro CRDT) — 17 files
│   │   │   ├── collab-session.ts (51 KB) LoroDoc + encrypted room transport
│   │   │   ├── collab-ui.ts      (52 KB) Session UI
│   │   │   ├── room-client.ts    Relay HTTP/SSE client
│   │   │   ├── collab-crypto.ts  E2E encryption, share codes
│   │   │   ├── causal-mark-heal.ts / collab-invariants.ts  CRDT merge repair
│   │   │   └── collab-cursors.ts Presence/remote cursors
│   │   ├── ai/                  Anthropic-backed features (17 files)
│   │   ├── pairing/             Encrypted card sharing (9 files)
│   │   ├── voice/               Vosk voice control (10 files)
│   │   ├── fonts/               Bundled webfonts + LICENSES.md
│   │   └── dict/                en.aff + en.dic Hunspell dictionary
│   └── tools/                  cardmirror-read CLI / MCP server / mirror
│
├── apps/desktop/               ELECTRON SHELL — 31 files, ~11k lines
│   ├── package.json            Desktop manifest + electron-builder config
│   └── src/
│       ├── main.ts             (130 KB) Main process: windows, menus, IPC
│       ├── preload.ts          (44 KB) contextBridge → window.electronAPI
│       ├── bridge-handshake.ts CROSS-APP DISCOVERY PROTOCOL (see §8c)
│       ├── fast-paste-bridge.ts(31 KB) The loopback HTTP server (/insert, /jump, /docs)
│       ├── flow-bridge.ts      Windows Excel COM bridge via PowerShell
│       ├── file-index-core.ts  FILE SEARCH INDEX (see §8d)
│       ├── file-index-service.ts  utilityProcess entry for the above
│       ├── doc-writes.ts       Atomic file writes + change-on-disk guard
│       ├── plugin-manager.ts   Plugin install/verify/load
│       ├── pairing-ipc.ts      (32 KB) Card-sharing IPC
│       ├── relay-stream.ts     SSE plumbing into the renderer
│       ├── external-consent.ts Per-app consent for bridge callers
│       └── voice/              Vosk model management + FFI
│
├── relay/                      Self-hostable FastAPI relay (Docker) for collab
├── tests/                      286 test files, ~59k lines, 10 suites
├── benchmarks/                 Round-trip performance benchmark
├── bin/round-trip.ts           CLI: docx → schema → docx
├── scripts/                    gen-icons, gen-new-template, check-doc-links
├── packaging/                  AUR package + bundled read-only CLI
├── patches/                    loro-prosemirror+0.4.3.patch
├── reference-docs/
│   └── cardmirror-plugin-api.md  (27 KB) THE FROZEN CROSS-APP CONTRACT
├── dev/                        Mock relay + relay contract/load harnesses
├── spikes/voice-recognizer/    Experimental spike
├── public/                     PWA icons
└── web-redirect/               GitHub Pages redirect stub
```

---

## 4. The document model

### It is ProseMirror

Not Slate, not Lexical, not raw `contenteditable`, not custom. The schema is
assembled in `src/schema/index.ts`:

```ts
import { Schema } from 'prosemirror-model';
import { nodes } from './nodes.js';
import { marks } from './marks.js';

export const schema = new Schema({ nodes, marks });
```

`ARCHITECTURE.md §1` is titled "Why ProseMirror", and `README.md` credits it as the
source of "nearly every editor primitive CardMirror leans on".

### The central design decision: flat headings, tree-structured cards

From the header comment of `src/schema/nodes.ts`:

```ts
/**
 * ProseMirror node specs.
 *
 * Design choice (see DECISIONS.md):
 *
 *   Most heading-level nodes (pocket, hat, block, analytic) are *flat
 *   paragraphs with inline content*, not tree containers. This matches
 *   how Word represents them in OOXML (paragraphs with Heading1-3 /
 *   Analytic styles, hierarchy implicit in document order + outline
 *   level). Tree-shaped grouping ("the cards under hat 2") is a derived
 *   view — the navigation panel walks paragraphs grouped by outline
 *   level — not a schema constraint.
 *
 *   `card` *is* tree-structured: it has a required `tag` child, optional
 *   cite_paragraph or analytic, and zero+ card_body paragraphs. This
 *   matches the user's mental model of cards as objects we can move /
 *   send / drag / select as units.
 *
 *   Heading-like nodes (pocket, hat, block, tag, analytic) carry a
 *   stable `id` attribute (UUID) for transclusion targeting per
 *   ARCHITECTURE.md §4 and §12.
 */
```

This is the single most important thing to understand about the model, and it is a
*correct and hard-won* decision — the hierarchy is flat in the schema because that is
how Word stores it, so round-trip is lossless by construction.

### The root content expression

```ts
const BLOCK_CONTENT =
  '(paragraph | pocket | hat | block | card | analytic_unit | undertag | cite_paragraph | card_body | table | transclusion_ref | self_ref)*';

export const nodes: { [name: string]: NodeSpec } = {
  /** Top-level container. Sequence of block-level content. */
  doc: { content: BLOCK_CONTENT },
```

Order matters and is load-bearing:

```ts
 * Order matters: ProseMirror's `splitBlock` calls `defaultBlockAt` to
 * pick the type for a freshly-created paragraph at the doc level (e.g.
 * Enter at the end of an existing paragraph), and `defaultBlockAt`
 * returns the FIRST textblock in the alternation. Putting `paragraph`
 * first ensures Enter on a normal paragraph creates another normal
 * paragraph rather than a Pocket.
```

### The card node — the core evidence unit

```ts
  card: {
    // Order matters: ProseMirror's splitBlock command (and other
    // schema-driven defaults) calls `defaultBlockAt` to pick the
    // "natural" type for a freshly-created paragraph in this slot.
    // It returns the FIRST textblock in the alternation. Putting
    // `card_body` first ensures that pressing Enter at the start of a
    // cite (or anywhere else inside a card) creates a normal body
    // paragraph — never an undertag. Undertag styling is reserved for
    // text the user explicitly opts into.
    content: 'tag (card_body | undertag | cite_paragraph | table)*',
    defining: true,
    isolating: true,
    attrs: numberingCardAttrs,
    parseDOM: [{
      tag: 'div.pmd-card',
      getAttrs: (dom: HTMLElement) => {
        const r = dom.getAttribute('data-num-role');
        return {
          numRole: r === 'number' || r === 'sub' ? r : 'none',
          numRestart: dom.getAttribute('data-num-restart') === 'true',
        };
      },
    }],
    toDOM: (node) => {
      const attrs: Record<string, string> = {
        class: 'pmd-card',
        style: intrinsicHeightStyle(node),
      };
      const role = node.attrs['numRole'];
      if (role && role !== 'none') attrs['data-num-role'] = String(role);
      if (node.attrs['numRestart'] === true) attrs['data-num-restart'] = 'true';
      return ['div', attrs, 0];
    },
  },
```

A `card` **requires** a `tag` as its first child, and is both `defining` and
`isolating` — so it survives paste normalization and blocks cross-boundary
selections/edits. Analytics are *not* card children; an `analytic` anchors its own
peer node, `analytic_unit`, with the same shape:

```ts
  analytic_unit: {
    // Same alternation shape as `card` — see its content expression's
    // comment for why `card_body` comes first.
    content: 'analytic (card_body | undertag | cite_paragraph | table)*',
    defining: true,
    isolating: true,
    attrs: numberingCardAttrs,
```

### The heading nodes

`pocket` / `hat` / `block` / `tag` / `analytic` are all `content: 'inline*'` textblocks
carrying `headingAttrs`. Representative pair:

```ts
  pocket: {
    content: 'inline*',
    attrs: headingAttrs,
    defining: true,
    parseDOM: [{
      tag: 'h1.pmd-pocket',
      getAttrs: (dom: HTMLElement) => ({ indent: readIndentFromStyle(dom) }),
    }],
    toDOM: (node) => {
      const attrs: Record<string, string> = {
        class: 'pmd-pocket',
        'data-id': String(node.attrs['id'] ?? ''),
      };
      const style = indentToStyle(node.attrs['indent']);
      if (style) attrs['style'] = style;
      return ['h1', attrs, 0];
    },
  },

  /** Card label. Heading-level outline-4 with stable id. Card-only. */
  tag: {
    content: 'inline*',
    attrs: headingAttrs,
    defining: true,
    parseDOM: [{
      tag: 'h4.pmd-tag',
      getAttrs: (dom: HTMLElement) => ({ indent: readIndentFromStyle(dom) }),
    }],
    toDOM: (node) => {
      const attrs: Record<string, string> = {
        class: 'pmd-tag',
        'data-id': String(node.attrs['id'] ?? ''),
      };
      const style = indentToStyle(node.attrs['indent']);
      if (style) attrs['style'] = style;
      return ['h4', attrs, 0];
    },
  },
```

`h1`/`h2`/`h3`/`h4` map to Word's Heading1–3 and outline-level-4 respectively.

### Shared attribute groups

```ts
/** Paragraph-level left indent in OOXML dxa (twentieths of a point;
 *  1440 dxa = 1 inch = 96 CSS px, so px = dxa / 15). Default 0.
 *  Applied to every node that serializes to `<w:p>` so the value
 *  round-trips through docx untouched. */
const indentAttr = {
  indent: {
    default: 0 as number,
    validate: (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0,
  },
};

/** OOXML `<w:spacing>` attributes captured verbatim for round-trip. */
const spacingAttr = {
  spacing: {
    default: null as Record<string, string> | null,
    validate: (v: unknown) =>
      v === null ||
      (typeof v === 'object' && v !== null && !Array.isArray(v)),
  },
};

const headingAttrs = {
  id: {
    default: null as string | null,
    validate: (v: unknown) => (v === null || typeof v === 'string'),
  },
  ...indentAttr,
  ...spacingAttr,
};
```

`indent` and `spacing` exist purely so OOXML values survive a round trip untouched —
a good pattern to copy. Every node spec uses ProseMirror's `validate` hook, which
means a malformed JSON document is rejected at `nodeFromJSON` time rather than
corrupting state.

### Full node inventory (17)

| Node | Content | Purpose |
| --- | --- | --- |
| `doc` | `BLOCK_CONTENT` | Root |
| `text` | — | Inline text |
| `image` | atom | Inline image; base64 `data`, `contentType`, `widthEmu`, `heightEmu`, `alt` |
| `transclusion_ref` | atom/NodeView | Read-only live view of another doc's range |
| `self_ref` | atom/NodeView | In-document live copy |
| `pocket` | `inline*` | Heading 1 |
| `hat` | `inline*` | Heading 2 |
| `block` | `inline*` | Heading 3 (+ `numRestart`) |
| `card` | `tag (card_body \| undertag \| cite_paragraph \| table)*` | Evidence card |
| `tag` | `inline*` | Card label (outline 4) |
| `cite_paragraph` | `inline*` | Citation line |
| `card_body` | `inline*` | Card prose |
| `analytic` | `inline*` | Analytic label (outline 4, color #1F3864) |
| `analytic_unit` | `analytic (card_body \| undertag \| cite_paragraph \| table)*` | Analytic-rooted peer of `card` |
| `undertag` | `inline*` | Undertag paragraph |
| `paragraph` | `inline*` | Generic body text (+ `alignment`) |
| `table` / `table_row` / `table_cell` / `table_header` | prosemirror-tables | Tables (+ opaque `rawTblPr`/`rawTcPr`) |

The `image` node is deliberately self-contained:

```ts
   * The image bytes are stored as base64 in the `data` attr so the doc
   * is self-contained and survives JSON round-trips through localStorage,
   * collaboration sync, undo/redo, etc. without a separate manifest.
```

This is directly relevant to your `.hal` plan — see §8a.

### Full mark inventory (20)

From the `src/schema/marks.ts` header:

```ts
/**
 * ProseMirror mark specs.
 *
 * The two main mark families (the rest are documented inline):
 *
 * 1. Named-style emphasis marks — round-trip to a Word character style:
 *    - cite_mark   ↔ rStyle "Style13ptBold" (Cite)
 *    - underline_mark ↔ rStyle "StyleUnderline" + direct <w:u w:val="single"/>
 *      (dual representation per NOTES-verbatim.md §5 gotcha #1)
 *    - emphasis_mark ↔ rStyle "Emphasis"
 *    - undertag_mark ↔ rStyle "UndertagChar"
 *    - analytic_mark ↔ rStyle "AnalyticChar"
 *
 * 2. Direct-formatting marks — round-trip to OOXML run properties:
 *    - bold      ↔ <w:b/>
 *    - italic    ↔ <w:i/> + <w:iCs/>
 *    - superscript ↔ <w:vertAlign w:val="superscript"/>
 *    - subscript ↔ <w:vertAlign w:val="subscript"/>
 *    - link      ↔ <w:hyperlink>...</w:hyperlink>  (URL in attrs)
 *    - highlight ↔ <w:highlight w:val="..."/>      (named color)
 *    - font_color ↔ <w:color w:val="..."/>         (RGB hex)
 *    - font_size ↔ <w:sz w:val="..."/>             (half-points)
 *    - shading   ↔ <w:shd w:fill="..."/>           (RGB hex; protected highlight)
 */
```

The three evidence marks are mutually exclusive by schema:

```ts
  cite_mark: {
    ...namedStyleMark(),
    // The three named-style "evidence" marks are mutually exclusive
    // — at most one of {cite, underline, emphasis} on any character.
    // Symmetric so that whichever mark is being added via tr.addMark
    // strips the others automatically. For passive coexistence
    // (legacy import data carrying overlapping marks), the named-
    // style normalizer plugin enforces cite/emphasis precedence over
    // underline.
    excludes: 'cite_mark underline_mark emphasis_mark',
    parseDOM: [{ tag: 'span.pmd-cite' }],
    toDOM: () => ['span', { class: 'pmd-cite' }, 0],
  },
```

There are two distinct underline marks, which is a subtlety worth internalizing:

```ts
  /**
   * Direct underline (no named style). Used in structural textblocks
   * (tag / analytic / pocket / hat / block / undertag) where applying
   * the named-style "Underline" would semantically mis-classify the
   * text. Round-trips to a bare `<w:u w:val="single"/>` with no
   * `<w:rStyle/>`. The named-style-normalizer plugin keeps the
   * body-vs-structural invariant (no underline_direct in body, no
   * underline_mark in structural).
   */
  underline_direct: {
    inclusive: true,
    parseDOM: [{ tag: 'u' }],
    toDOM: () => ['u', 0],
  },
```

Mark **order in the object literal is load-bearing** — it sets DOM nesting rank:

```ts
  // `font_size` is listed first so it renders as the OUTERMOST DOM
  // wrapper. CSS paints an inline element's background/border on a box
  // sized by its OWN font-size, not its descendants'. Putting font_size
  // outermost means visible wrappers (emphasis box, highlight band,
  // strikethrough line, etc.) inherit the per-run size and size their
  // boxes correctly when the user scales text up or down. Order within
  // this object literal sets mark rank: earlier = lower rank = outer
  // DOM.
```

Full list: `font_size`, `cite_mark`, `underline_mark`, `underline_direct`,
`emphasis_mark`, `undertag_mark`, `analytic_mark`, `pilcrow_marker`, `bold`,
`bold_off`, `italic`, `strikethrough`, `superscript`, `subscript`, `link`, `shading`,
`highlight`, `font_color`, `font_family`, `comment_range`.

### In memory vs. on disk

- **In memory:** a ProseMirror `Node` tree inside an `EditorState`, mutated only
  through transactions.
- **On disk (native):** `PMNode.toJSON()` inside a small envelope, minified, gzipped
  — see §5.
- **On disk (interchange):** OOXML inside a ZIP — a real `.docx`.
- **On the wire (collab):** a Loro CRDT document, encrypted before it reaches the relay.

---

## 5. File formats

### Formats read and written

| Format | Read | Write | Code |
| --- | --- | --- | --- |
| `.docx` (OOXML) | ✅ | ✅ | `src/import/`, `src/export/`, `src/ooxml/` |
| `.docx` password-encrypted | ✅ | ❌ | `src/ooxml/decrypt-docx.ts` |
| `.cmir` (native) | ✅ | ✅ | `src/native/` |
| HTML clipboard | ✅ | ✅ | `src/import/html-paste.ts`, `src/editor/clipboard-write.ts` |
| Encrypted card bundles | ✅ | ✅ | `src/editor/pairing/` |

### `.cmir` — the native format (critical prior art for `.hal`)

**It is gzipped JSON, not a ZIP.** From `src/native/index.ts`:

```ts
/**
 * CardMirror native file format (`.cmir`).
 *
 * The "no-roundtrip" save path: serialize the ProseMirror document
 * straight to JSON with a small format envelope, persist it as-is,
 * and parse it back without any conversion loss.
 * ...
 * Format shape (current `formatVersion`):
 *
 *   {
 *     "format": "cardmirror-doc",
 *     "formatVersion": 1,
 *     "createdBy": "CardMirror 0.x",
 *     "createdAt": "2026-…",
 *     "doc": { ...PM-doc JSON },
 *     "threads": [ ...Thread[] ]   // optional
 *   }
 *
 * On disk: minified JSON, gzip-compressed (legacy plaintext files
 * still parse). Future enhancements (binary frame for images, etc.)
 * can ride formatVersion bumps; v1 keeps it simple.
 */
```

The envelope type:

```ts
export interface NativeFile {
  format: typeof FORMAT_ID;
  formatVersion: number;
  /** App version that produced the file. Informational. */
  createdBy: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ProseMirror doc JSON. Round-tripped via `PMNode.toJSON` and
   *  `Schema.nodeFromJSON`. */
  doc: unknown;
  /** Comment threads, if any. Omitted from the file when empty. */
  threads?: Thread[];
  /** Stable per-document UUID linking the local Learn annotation layer
   *  (flashcards / AI threads / schedule) to this doc across renames and
   *  format changes. Minted on first save; absent on older files. */
  docId?: string;
}
```

Serialization is a two-function chokepoint:

```ts
/** Serialize a ProseMirror doc + optional threads to bytes in the
 *  CardMirror native format. */
export function serializeNative(
  doc: PMNode,
  opts: SerializeNativeOptions = {},
): Uint8Array {
  return gzip(buildNativeEnvelope(doc, opts));
}
```

The container is self-describing by magic bytes (`src/native/codec.ts`):

```ts
 * Format is self-describing by magic bytes, so old plaintext files and
 * new compressed files coexist with no version flag:
 *
 *   - legacy plaintext always begins with `{` (0x7B);
 *   - gzip always begins with 0x1F 0x8B.
```

**Two production-hardened patterns worth stealing verbatim for `.hal`:**

1. **Save-time structural tripwire** — every save runs `doc.check()`, and an invalid
   doc is healed before writing:

```ts
function tripwireForSave(doc: PMNode): PMNode {
  try {
    doc.check();
    return doc;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const healedDoc = healTables(healCards(healAnalyticUnits(doc)));
    ...
```

2. **Load-time heal chain + explicit reject + opt-in salvage**:

```ts
    doc = stripImageVisualMarks(
      dropEmptyZones(
        healTables(
          healCards(
            healAnalyticUnits(
              flattenNestedZones(
                splitInCardAnalytics(stampMissingHeadingIds(schema.nodeFromJSON(file.doc))),
              ),
            ),
          ),
        ),
      ),
    );
```

There is even a specific error message for undownloaded cloud placeholder files —
a nice signal of field maturity:

```ts
  if (bytes.length === 0) {
    throw new Error(
      'This file is empty or hasn’t finished downloading. If it lives in Dropbox ' +
        'or iCloud Drive, it may be set to “online only” — make it available ' +
        'offline (in Finder, right-click → Make available offline / Download Now), ' +
        'then open it again.',
    );
  }
```

### `.docx` import path

`src/import/index.ts` → `fromDocx()` / `fromDocxFull()`:

```ts
export async function fromDocx(
  bytes: Uint8Array | ArrayBuffer,
  provenanceOut?: Map<string, number>,
): Promise<PMNode> {
  const docx = await Docx.load(bytes);
  const documentXml = await docx.readText('word/document.xml');
  if (!documentXml) throw new Error('docx is missing word/document.xml');
  const relsXml = await docx.readText('word/_rels/document.xml.rels');
  const stylesXml = await docx.readText('word/styles.xml');

  const mediaParts: MediaPartsMap = new Map();
  for (const path of docx.paths()) {
    if (!path.startsWith('word/media/')) continue;
    const partBytes = await docx.readBinary(path);
    if (!partBytes) continue;
    const part: MediaPart = {
      bytes: partBytes,
      contentType: inferContentType(path),
    };
    mediaParts.set(path, part);
  }
  ...
  return checkImportedDoc(
    repairDoc(
      importDoc(documentXml, relsXml, mediaParts, stylesXml, {...}, provenanceOut),
    ),
  );
}
```

`fromDocxFull` additionally returns comment threads and the stamped `docId`.

### `.docx` export path

`src/export/index.ts` → `toDocx()`:

```ts
export async function toDocx(doc: PMNode, opts: ExportOptions = {}): Promise<Uint8Array> {
  const result = exportDoc(doc, opts);
  const docx = Docx.empty(opts.defaultFont ? { defaultFont: opts.defaultFont } : undefined);
  docx.writeText('word/document.xml', result.documentXml);
  docx.writeText('word/_rels/document.xml.rels', result.relsXml);
  for (const part of result.mediaParts) {
    docx.writeBinary(part.path, part.bytes);
  }
  if (result.numberingXml) { ... }
  if (result.footnotesXml) { ... }
  if (result.endnotesXml) { ... }
  if (result.commentsXml && result.commentsExtendedXml) { ... }
  if (opts.docId) {
    await docx.writeDocId(opts.docId);
  }
  return docx.toBuffer();
}
```

There is a hard-won bug fix embedded in the comments content-type handling that tells
you how carefully this has been tested against real Word:

```ts
        // The exact string from the Open XML SDK's WordprocessingCommentsExPart —
        // Word validates each part's declared content type against its
        // relationship, and a mismatch here fails the WHOLE package
        // ("unreadable content", recoverable), even though every part's
        // XML is valid. Field report 2026-07-23 (Lily S., mac Word).
```

### The round-trip contract (`ARCHITECTURE.md §3`)

> **A CardMirror user on a Verbatim team is a full participant in the file
> ecosystem.** Files leaving CardMirror are visually and semantically
> indistinguishable from Verbatim's own output...
>
> We do **not** commit to byte equivalence — Word's docx isn't byte-stable
> across saves anyway (rsids, timestamps). Semantic equivalence is the
> contract.

Explicitly dropped on import and never emitted (`§19`): section properties
(`<w:sectPr>` — margins, page size, columns), revision IDs (`<w:rsid*>`), non-heading
bookmarks, and localization. Footnotes/endnotes are listed as out-of-scope in §19 but
have in fact since shipped (`src/import/footnotes.ts`, `src/schema/footnotes.ts`,
`footnote_ref` node) — the roadmap section is slightly stale.

---

## 6. Editor capabilities

All commands route through one registry (`RibbonCommandId` in
`src/editor/ribbon-commands.ts`, ~6,700 lines), which is what makes every one of them
rebindable from a single settings panel.

### Default keybindings (verbatim from `DEFAULT_RIBBON_KEYS`)

```ts
export const DEFAULT_RIBBON_KEYS: Record<RibbonCommandId, string | string[]> = {
  setPocket: 'F4',
  setHat: 'F5',
  setBlock: 'F6',
  setTag: 'F7',
  setAnalytic: 'Mod-F7',
  setUndertag: 'Mod-F8',
  moveContainerUp: 'Mod-Alt-ArrowUp',
  moveContainerDown: 'Mod-Alt-ArrowDown',
  toggleBold: 'Mod-b',
  toggleItalic: 'Mod-i',
  toggleStrikethrough: '',
  toggleSuperscript: 'Mod-Shift-=',
  toggleSubscript: 'Mod-=',
  applyCite: 'F8',
  applyUnderline: ['F9'],
  toggleUnderlineTyping: 'Mod-u',
  toggleReadingMarker: 'Mod-Shift-d',
  applyEmphasis: 'F10',
  emphasizeAcronym: 'Alt-F10',
  applyHighlight: 'F11',
  highlightAcronym: 'Alt-F11',
  underlineAcronym: '',
  applyShading: 'Mod-F11',
  condenseDefault: 'F3',
  condenseNoIntegrity: 'Alt-F3',
  condenseNoIntegrityWithPilcrows: 'Mod-Alt-F3',
  condenseWithWarning: '',
  uncondense: 'Mod-Alt-Shift-F3',
  toggleCase: 'Shift-F3',
  copyPreviousCite: 'Alt-F8',
  pasteAsText: 'F2',
  pasteCondensed: '',
  clearToNormal: 'F12',
  shrink: 'Mod-8',
  smartShrink: 'Mod-Alt-8',
  regrow: 'Mod-Shift-8',
```

Plus, further down the same table:

```ts
  addNoteToSelection: 'Mod-Shift-n',
  aiAskAboutSelection: 'Mod-Shift-q',
  aiCreateCite: 'Mod-Shift-x',
  translate: 'Mod-Shift-t',
  repairText: 'Mod-Shift-r',
  repairFormatting: 'Mod-Alt-r',
  toggleVoice: 'Mod-Shift-V',
  openCardCutter: 'Mod-Alt-c',
  newDocument: getHost().kind === 'electron' ? 'Mod-n' : 'Mod-Alt-n',
  openFile: 'Mod-o',
  save: 'Mod-s',
  saveAs: 'Mod-Shift-s',
  saveSendDoc: 'Mod-Alt-s',
  saveMarkedCards: 'Mod-Alt-m',
  sendToSpeechAtCursor: '`',
  sendToSpeechAtEnd: 'Alt-`',
  sendToDropzone: 'Mod-`',
```

### Command families

**Structural** (`F4`–`F7`, `Mod-F7`, `Mod-F8`) — set Pocket / Hat / Block / Tag /
Analytic / Undertag. From `ARCHITECTURE.md §13`:

> Conversion handles every cursor position (in-place for doc-level textblocks,
> dissolve-wrapper for tag/analytic, split-card for in-card body slots) and preserves
> heading IDs across heading↔heading changes. Promotion strips direct formatting and
> named-style marks — the destination's typography defines the run's identity —
> except the same-tier tag↔analytic swap, which preserves it.

**Marks** (`F8` cite, `F9` underline, `F10` emphasis, `F11` highlight, `Mod-F11`
shading):

> Body text holds at most one of cite / underline / emphasis (enforced by schema
> `excludes` and the strip set). The `Alt-` variants (Alt-F10, Alt-F11) mark the first
> letter of each word, for acronyms.

**Condense family** (`F3`, `Alt-F3`, `Mod-Alt-F3`, `Mod-Alt-Shift-F3`):

> collapses whitespace and merges paragraphs, with three modes (paragraph integrity,
> pilcrows, or neither) and a `headingMode` governing how selections that touch
> structure behave. Pilcrows round-trip as a 6-pt ¶ run, Verbatim's canonical encoding.

**Shrink/regrow** (`Mod-8`, `Mod-Alt-8`, `Mod-Shift-8`) — the Verbatim "shrink
unhighlighted text" behavior. `font_size` carries an `origin: 'shrink'` provenance
attr so CRDT merge repair can distinguish machine-applied sizes from user-chosen ones.

**F2 paste-as-text** is armed-mode rather than one-shot:

> browsers won't let a web app read the clipboard without a prompt, so F2 sets a flag
> that the next Ctrl/Cmd-V consumes, stripping marks.

**Color panel** — split buttons for highlight / shading / font color with swatch
pickers and a Word-style paintbrush mode. 15 Word named highlight colors; arbitrary
hex for shading and font color, with a computed luminance band (`colorBand()`) so CSS
can force readable contrast.

**Cleanup commands shipped:** Convert Analytics to Tags, Convert Cited Analytics to
Tags, Fix Formatting Gaps, Remove Hyperlinks, Select Similar Formatting.

**Tables:** insert, add/delete row/column, merge/split cells, delete table (all
unbound by default; via prosemirror-tables).

**Beyond Verbatim parity:** read mode, send-to-speech, three-slot multi-doc workspace,
command-palette file search, find/replace, spaced-repetition flashcards ("Learn"),
AI cite formatting / alt-text / OCR repair / translation, spellcheck, autosave +
crash recovery, encrypted card sharing, real-time co-editing, transclusion
(read-only live views + editable linked copies), display-only card numbering,
voice control, and a speech timer with a pop-out window.

---

## 7. Entry points

### Web / renderer boot

1. `index.html` (341 lines) — the app shell. Contains the **entire ribbon markup as
   static HTML** (`#formatting-panel`, `#cite-panel`, `#color-panel`,
   `#doc-menu-panel`, `#numbering-panel`, `#nav-panel`, …), plus:
   ```html
   <link rel="stylesheet" href="/src/editor/style.css" />
   <link rel="stylesheet" href="/src/editor/icons.css" />
   ```
2. `src/editor/index.ts` (9,910 lines) — the real entry point. Runs at import,
   assembles plugins via `buildEditorPlugins()`, and constructs the view at line 5360:
   ```ts
   view = new EditorView(editorEl, {
   ```
3. `vite.config.ts` declares two HTML entries:
   ```ts
     build: {
       rollupOptions: {
         input: {
           main: path.resolve(__dirname, 'index.html'),
           timer: path.resolve(__dirname, 'timer.html'),
         },
       },
     },
   ```

### Desktop boot

`apps/desktop/src/main.ts` (130 KB) → creates BrowserWindow with
`apps/desktop/src/preload.ts` (44 KB), which exposes `window.electronAPI` via
`contextBridge`. The renderer detects that global and selects `ElectronHost`.

### The programmatic public API

`src/index.ts` — small, clean, and clearly intended as the library surface:

```ts
/**
 * Public API for CardMirror.
 *
 * Four layers:
 *   - Schema:   the ProseMirror schema (typed-tree document model).
 *   - Import:   .docx → schema doc.
 *   - Export:   schema doc → .docx.
 *   - Native:   schema doc ↔ .cmir (CardMirror's lossless native
 *               file format, no Verbatim round-trip).
 */

export {
  schema, nodes, marks,
  newHeadingId, bookmarkNameForId, idFromBookmarkName, HEADING_BOOKMARK_PREFIX,
} from './schema/index.js';

export { fromDocx, fromDocxFull, importDoc, importComments } from './import/index.js';

export { toDocx, exportDoc } from './export/index.js';
export type { ExportResult, ExportOptions } from './export/index.js';

export {
  serializeNative, serializeNativeAsync, parseNative, parseNativeSalvage,
  NativeDamagedError, looksLikeNative, setSaveHealListener, NATIVE_FILE_EXTENSION,
} from './native/index.js';

export { Docx } from './ooxml/docx.js';
export { readDocIdFromBytes, stampDocId } from './docid.js';
```

**This is the layer a derivative should build on.** Note that `package.json` has
`"private": true` and no `main`/`exports` field, so it is not currently consumable as
an npm package — you would consume it as a fork or a path/workspace dependency.

### The plugin extension surface

`src/editor/plugin-api.ts` — the sanctioned in-app extension point:

```ts
export interface CardMirrorPluginApi {
  readonly appVersion: string;
  extractSelection(): ExtractResult | ExtractError;
  jumpToSource(token: string): Promise<JumpResult>;
  flowApps(): Promise<FlowAppInfo[]>;
  flowPost(appId: string, route: string, body: unknown): Promise<FlowPostResult>;
  docInfo(): { docId: string; docTitle: string } | null;
  showToast(message: string): void;
  storage: PluginStorage;
  settings: PluginSettingsApi;
}
```

Caveats from `README.md`:

> - **Plugins are full-trust code.** They run inside the editor with the same access
>   the editor has, so installs are limited to a curated allowlist...
> - **The plugin-facing API surface is a draft** (a sandboxed v2 may change it); the
>   bridge handshake and HTTP routes are frozen.

---

## 8. Extension points and gaps

This is the section that matters most for your plan. **Three of your four items
already exist in some form** — read carefully before planning to build them.

### (a) ZIP-based `.hal` format (document.json + metadata.json + manifest.json)

**Status: not present, but the seam is excellent.** `.cmir` is *gzipped JSON*, not a
ZIP. You are changing the container, not the model.

The good news: the codebase already funnels every read and write through one
chokepoint. `ARCHITECTURE.md §3` states it explicitly:

> ...round-tripped through `serializeNative` / `parseNative` (`native/index.ts`), the
> single chokepoint every reader and writer funnels through (`docid.ts` is the one
> direct-bytes bypass).

**Files/functions to modify:**

| File | What to change |
| --- | --- |
| `src/native/codec.ts` | Replace `gzip`/`gunzip`/`isGzip` with `zipSync`/`unzipSync` from `fflate` (already a dependency — it does both). Keep the magic-byte sniff: ZIP is `PK\x03\x04` (`0x50 0x4B`), so you can support `.cmir` gzip, legacy plaintext, and `.hal` ZIP simultaneously. |
| `src/native/index.ts` | `buildNativeEnvelope()` (line ~147) currently emits one JSON blob. Split it into your three members. `serializeNative()` / `serializeNativeAsync()` wrap it. `parseNativeImpl()` (line ~227) reads it back. `NATIVE_FILE_EXTENSION = 'cmir'` → add/replace with `'hal'`. |
| `src/native/index.ts` | The `NativeFile` interface is your `metadata.json` — `format`, `formatVersion`, `createdBy`, `createdAt`, `threads`, `docId` are already exactly metadata. `doc` becomes `document.json`. `manifest.json` is new. |
| `src/index.ts` | Re-export the new names. |
| `src/editor/host/types.ts` | `JournalEntry.format: 'cmir' \| 'docx' \| null` and `SpawnWindowPayload.format` — add `'hal'`. |
| `src/editor/file-search.ts` | `fileFormat()` and `FileIndexQuery.formats: 'both' \| 'cmir' \| 'docx'`. |
| `src/editor/index.ts` | `runSaveFlow()` (line 7589), `runSaveAsFlow()` (7282), `runSaveSendDocFlow()` (7430), `runSaveMarkedCardsFlow()` (7513) — the save orchestration and its `FileFilter` lists. |
| `apps/desktop/src/main.ts` | OS file associations, the open-with handler, and dialog filters. |
| `apps/desktop/package.json` | `electron-builder` `fileAssociations`. |
| `src/editor/bulk-compress-*.ts` | Precedent for a whole-library migration tool — reuse the pattern to convert `.cmir` → `.hal`. |

**The big design question a ZIP container raises:** images are currently base64 inside
the doc JSON. A ZIP container is the natural place to break them out into separate
members and reference them from a `manifest.json`. But note the deliberate reasoning
against that today:

```ts
   * The image bytes are stored as base64 in the `data` attr so the doc
   * is self-contained and survives JSON round-trips through localStorage,
   * collaboration sync, undo/redo, etc. without a separate manifest.
```

If you externalize images you must handle collab sync, undo/redo, and clipboard
separately. The `.cmir` docstring anticipates exactly this: *"Future enhancements
(binary frame for images, etc.) can ride formatVersion bumps."*

**Also copy:** `tripwireForSave()` and the load-time heal chain / `parseNativeSalvage`
split. These exist because of real field incidents ("both hollow-shell field
incidents") and you will want them.

### (b) Yjs-based real-time collaboration

**Status: real-time collaboration already ships — with Loro, not Yjs.** This is a
*replacement* decision, not an integration task, and it is the single biggest
technical judgment call in your plan.

What exists (`src/editor/collab/`, 17 files, ~200 KB):

```ts
import { LoroDoc, VersionVector, decodeImportBlobMeta } from 'loro-crdt';
import { LoroSyncPlugin, updateLoroToPmState } from 'loro-prosemirror';
```

```
 * Data flow:
 *   outbound  editor → LoroSyncPlugin → LoroDoc → (flush timer)
 *             export update-since-lastSent → encrypt → POST /updates
 *   inbound   SSE update frame (or catch-up GET) → decrypt →
 *             importBatch → Loro events → LoroSyncPlugin → editor
```

Both Loro packages are **pinned to exact versions** (`loro-crdt: 1.13.6`,
`loro-prosemirror: 0.4.3`) and there is a local patch
(`patches/loro-prosemirror+0.4.3.patch`) — a sign of hard-won stability.

Crucially, mark expansion behavior is configured from the schema, and this logic is
CRDT-specific:

```ts
/** Mirrors loro-prosemirror's configLoroTextStyle: PM `inclusive` is the
 *  local statement of Peritext expand behavior; the CRDT-level config
 *  makes CONCURRENT boundary insertions honor the same intent. Must be
 *  set before any ops are created on the doc. */
function configTextStyle(doc: LoroDoc): void {
  doc.configTextStyle(
    Object.fromEntries(
      Object.entries(schema.marks).map(([name, type]) => [
        name,
        { expand: type.spec.inclusive !== false ? ('after' as const) : ('none' as const) },
      ]),
    ),
  );
}
```

There is also an entire subsystem devoted to repairing CRDT merge artifacts specific
to this schema — `causal-mark-heal.ts` (15 KB), `collab-invariants.ts`,
`collab-repair.ts` — plus ~30 collab test files including fuzz and adversarial
"hollow document" suites.

**My honest recommendation: keep Loro.** Switching to Yjs would mean rewriting
`collab-session.ts` (51 KB), `collab-cursors.ts`, `collab-persist.ts`,
`collab-comments.ts`, `causal-mark-heal.ts`, and the relay's room protocol — and
re-deriving the mark-merge invariants from scratch. Loro's Peritext-style rich-text
marks are arguably a *better* fit for this schema than Yjs's, because the
mutually-exclusive `cite/underline/emphasis` marks and shrink-provenance sizes need
precise concurrent-boundary semantics.

**If you must use Yjs anyway,** the seam is narrow and well-chosen. Swap the
`LoroSyncPlugin` for `y-prosemirror`'s `ySyncPlugin` and reimplement:

| File | Role to reimplement |
| --- | --- |
| `src/editor/collab/collab-session.ts` | Doc + transport + version bookkeeping (`lastSentVersion`, `applyRemote`) |
| `src/editor/collab/collab-cursors.ts` | Presence → `y-protocols/awareness` |
| `src/editor/collab/collab-persist.ts` | Snapshot/restore |
| `src/editor/collab/causal-mark-heal.ts` | Yjs-specific equivalent (must be re-derived) |
| `src/editor/collab/room-client.ts` | Relay HTTP/SSE client (could stay; blobs are opaque) |
| `relay/server.py` | Can stay as-is — it stores opaque encrypted blobs |
| `vite.config.ts` | Drop the loro wasm dev shim and `optimizeDeps.exclude` |
| `patches/` | Drop the loro-prosemirror patch |

### (c) IPC bridge to a companion Electron "flow" app

**Status: this already exists, is documented, and is explicitly frozen.** Do not
build a new one — implement the existing protocol in your flow app.

There are **two separate, unrelated mechanisms**, and conflating them is the easiest
mistake to make here:

**1. `cardmirror-bridge` — the general companion-app protocol.** This is the one you
want. `apps/desktop/src/bridge-handshake.ts`:

```ts
/**
 * cardmirror-bridge — the published cross-app handshake standard.
 *
 * A shared per-platform directory where each debate app writes TWO files:
 *
 *   `<appId>.json`          IDENTITY — schema/app/appVersion/kind. Written on
 *                           first launch, NEVER deleted. This is what app
 *                           pickers list, so a closed app stays selectable.
 *   `<appId>.session.json`  SESSION — port/token/pid. Rotated per launch,
 *                           deleted on quit. Its absence = the app isn't
 *                           running right now.
 * ...
 * CardMirror mirrors its fast-paste endpoint here as kind "editor"; flowing apps
 * register as kind "flow". All cross-app transport is brokered HERE — renderer
 * plugins never see tokens or sockets.
 */
```

Discovery directory (from `reference-docs/cardmirror-plugin-api.md` §4):

- macOS: `~/Library/Application Support/cardmirror-bridge/`
- Windows: `%APPDATA%/cardmirror-bridge/`
- Linux: `$XDG_DATA_HOME/cardmirror-bridge/`

Identity + session files:

```json
{ "schema": 1, "app": "ebb", "appVersion": "0.3.0", "kind": "flow" }
{ "port": 17700, "token": "hoyfR3k9vXqLmZ2wN8cT1bUj", "pid": 12345 }
```

CardMirror **serves** these routes (`apps/desktop/src/fast-paste-bridge.ts`,
`http.createServer` at line 782):

| Route | Purpose |
| --- | --- |
| `GET /ping` | Liveness + capability probe (`schema: 2`) |
| `GET /docs` | Every open doc across all windows/panes → opaque session-scoped `target` tokens |
| `POST /insert` | Insert text into a doc, with `role`: `card`/`body`/`cite`/`inline`/`pocket`/`hat`/`block`/`tag`/`analytic` |
| `POST /jump` | Inverse search — focus + scroll + select an extracted item's source |

And CardMirror **calls out** to flow apps via `flowApps()` / `flowPost()`
(`bridge-handshake.ts` lines 219 and 247), surfaced to plugins through
`src/editor/plugin-api.ts`.

Security properties already handled: `127.0.0.1` only, `X-Bridge-Token` constant-time
compare, `X-App-Id` identification, per-app user consent
(`apps/desktop/src/external-consent.ts`), rejection of any request carrying
`Origin`/`Referer`, `0700`/`0600` file modes, pid-liveness checks, and atomic
tmp+rename writes.

The spec says plainly:

> This section and section 5 are the frozen cross-app contract. Flowing apps build
> against this file format and these routes. Changes require a schema bump.

**What to do:** have your flow app write `<yourapp>.json` with `kind: "flow"` and
`<yourapp>.session.json`, serve `GET /ping` plus whatever routes you want CardMirror
plugins to POST to, and consume CardMirror's `/docs`, `/insert`, and `/jump`. If you
need new capabilities, extend `fast-paste-bridge.ts` (add a route) and
`bridge-handshake.ts` (bump `BRIDGE_SCHEMA`).

**2. `flow-port.ts` — the Verbatim Flow Excel integration.** This is *not* an IPC
bridge to a companion app; it is a Windows-only COM bridge to Microsoft Excel:

```ts
/**
 * Verbatim Flow port (renderer side).
 *
 * Mirrors the Verbatim Word add-in's "Send to Flow": serialize the
 * selected blocks the way Verbatim does, then hand them to the Windows
 * COM bridge (`ElectronHost.flowSend`) which writes them down the Flow
 * workbook's active column. Windows-only; on any other host the commands
 * toast that and do nothing. Requires NO modification to Verbatim Flow.
 */
```

Backed by `apps/desktop/src/flow-bridge.ts`, which drives a long-lived
`powershell.exe` running `resources/flow/verbatim-flow.ps1`.

**However**, `flow-port.ts` is still valuable to you as a model, because
`selectionCells()` is exactly the "what text should go to the flow" logic you need:

```ts
/** Body prose — excluded in "headings only" mode (Verbatim's
 *  OutlineLevel<>BodyText filter). Everything else (pocket/hat/block/tag/
 *  analytic/cite/undertag) is a heading/label and is kept. */
const BODY_TYPE = 'card_body';

export interface SendOptions {
  /** cell = all blocks joined into ONE cell; column = one cell per block. */
  mode: 'cell' | 'column';
  /** Skip card body prose, sending only headings/tags/cites. */
  headingsOnly: boolean;
}
```

Also note `PROJECT.md` lists "Verbatim Flow integration" under **Planned**, and
`ARCHITECTURE.md §19` says "**Verbatim Flow integration** — CardMirror's take on
Verbatim's Excel-based flowing tool." So a native flow app is a direction the author
himself has staked out — worth a conversation rather than a silent fork.

### (d) Full-text search index worker

**Status: an out-of-process index worker exists, but it indexes filenames, not
content.** This is the one item that is genuinely mostly-missing, and the codebase
tells you so directly.

`ARCHITECTURE.md §11`:

> **File search (shipped).** The command palette's `f` prefix recurses the configured
> search root for `.cmir` files by filename; Enter opens one, Tab dives in to parse it
> and list its structural objects (blocks, tags, cites, analytics) so you can search
> within it and insert a match as a slice. The recursive *file listing* is cached in
> the main process with per-file mtime + size and refreshed in the background;
> *content* search is still parse-on-demand, one file at a time.

`src/editor/file-search.ts`:

```ts
 * Two layers, both on-demand (no persistent index yet; see
 * ARCHITECTURE.md §11 "corpus search"):
 *   1. File layer  — match `.cmir` filenames recursively found under
 *      the configured search root (the palette does the I/O).
 *   2. Object layer — once a file is picked, parse it and surface its
 *      structural objects (blocks / tags / cites / …) so the user can
 *      search WITHIN it and insert one.
```

**The infrastructure is already built and is exactly the right shape.** From
`apps/desktop/src/file-index-core.ts`:

```ts
 * Motivation (2026-07-30): the browser process paid for the index
 * (load, walk, persist) and every launch shipped the whole corpus over
 * IPC into the renderer (structured-cloning ~55k entries), which
 * stalled both processes during the seconds after boot...
 * Moving index AND search here means the corpus never crosses a process
 * boundary again: the renderer sends a query, a few KB of ranked rows come back.
```

And the extension hook is *already commented in the code*:

```ts
/** On-disk entry shape — unchanged from the main-process era so the
 *  existing cache file carries over. `size` is unused today but kept
 *  for a future content index (reparse only changed files). */
export interface StoredEntry {
  path: string;
  relPath: string;
  mtimeMs: number;
  size: number;
}
```

**Files/functions to modify:**

| File | What to change |
| --- | --- |
| `apps/desktop/src/file-index-core.ts` | `createFileIndexCore()` — add a content-extraction pass to the scan; extend `StoredEntry` with a token/postings payload; use the existing `mtimeMs` + `size` to reparse only changed files. |
| `apps/desktop/src/file-index-service.ts` | The `utilityProcess` entry — a thin message shim; extend the message protocol for content queries. |
| `src/editor/file-search.ts` | `searchFiles()` / `matchesAllTokens()` / `FileIndexQuery` — add content-hit ranking. Kept pure/DOM-free deliberately so both processes share it. |
| `src/native/index.ts` | `parseNative` is how you get a doc to index. Consider a cheaper text-only extraction path that skips full schema validation. |
| `src/editor/file-search-client.ts` | Renderer-side IPC client. |
| `apps/desktop/src/cmir-index-prune.ts` | Root pruning; extend for the content store. |
| `src/editor/quick-cards-match.ts` | The shared ranking algorithm (`matchesAllTokens`) — reuse so palette semantics don't drift. |

Note the index worker is **desktop-only** (`utilityProcess`). The web build has no
equivalent; you would need a Web Worker + IndexedDB path for parity.

---

## 9. Notable limitations

**Legal/licensing (the dominant risk)**
- PolyForm Noncommercial forbids commercial use; no sublicensing.
- Untitled UI icons cannot be redistributed even in modified form — `src/editor/icons.css` is a liability in a fork. Budget for an icon replacement.
- `package.json` is `"private": true` with no `main`/`exports` — not consumable as a library without forking or a workspace setup.

**Architecture**
- **Monolithic UI files.** `src/editor/index.ts` is 9,910 lines; `ribbon-commands.ts` 6,683; `settings.ts` 5,247; `multi-pane-shell.ts` 3,360; `apps/desktop/src/main.ts` ~130 KB. Navigable but a real onboarding tax, and merge-conflict-prone if you track upstream.
- **No UI framework.** Hand-rolled DOM. Consistent and fast, but there is no component model to hook into; UI extension means editing large imperative files.
- **Renderer-scoped state.** Much of the app's state lives in module-level singletons in `index.ts` (`view`, `setActiveView`, resolver-injection patterns like `setZoomStateResolver`, `setReadModeStateResolver`). Multi-instance embedding would be awkward.
- **Plugins are full-trust** by the author's own admission; a sandboxed v2 is contemplated and would break the API.
- **The plugin API is explicitly a draft** — only the bridge handshake and HTTP routes are frozen.
- **Tauri host is stubbed, not built** (`// Tauri detection will land here`).

**Document model gaps**
- **No numbered/bulleted lists.** Listed as planned; needs real schema additions (`bullet_list`/`ordered_list`/`list_item`) plus `<w:numPr>`/`numbering.xml`. A genuine gap for an evidence editor.
- **No section/page layout** (`<w:sectPr>`: margins, page size, columns) — deliberately out of scope. If `.hal` ever needs print fidelity, this is new work.
- **No revision IDs / track changes.**
- **No non-heading bookmarks.**
- **No document version history** — "undo + autosave suffice for v1".
- **No schema migration/versioning discipline**: `ARCHITECTURE.md §19` says "while the user base is small, breaking changes are recoverable by hand". `formatVersion` is still `1`. For a production app you must build real migrations.
- Images are base64-inline, which bloats docs and the CRDT.

**Search**
- No content/full-text index (§8d). Corpus content search is parse-on-demand, one file at a time.
- The index worker is desktop-only; no web equivalent.

**Platform**
- Verbatim Flow integration is Windows-only (Excel COM via PowerShell).
- Voice recognition needs `koffi` FFI + runtime-downloaded Vosk models.
- AI features require a user-supplied Anthropic API key; no server middleman, so no key management, rate limiting, or cost controls.

**Ops/quality**
- Localization is explicitly out of scope; English only.
- Accessibility is partial — "fuller screen-reader support and accessibility presets" is on the roadmap.
- The round-trip test suite depends on a private `.docx` corpus (`CARDMIRROR_DOCS_DIR`); on a fresh clone those tests **skip silently**, so out-of-the-box `npm test` verifies substantially less than CI does for the author. Assemble your own fixture corpus early.
- Co-editing is user-visible "experimental".
- `ARCHITECTURE.md §19` is somewhat stale (lists footnotes as out-of-scope though they shipped).

---

## 10. Build & run

Requires **Node 22** (`.node-version`).

```sh
# From the repo root
npm install                 # also runs `patch-package` via postinstall

# Web edition (Vite dev server → http://localhost:5173/)
npm run dev

# Desktop edition (builds Electron main + starts Vite + launches the window)
npm run desktop:dev

# Production web build / preview
npm run build
NO_PWA=1 npm run build      # skip the service worker for local iteration

# Quality gates
npm test                    # vitest run (286 test files)
npm run test:watch
npm run test:bench          # vitest bench --run
npm run typecheck           # tsc --noEmit, strict

# Round-trip a real .docx through the schema
npm run round-trip path/to/input.docx [path/to/output.docx]

# Test round-trip against your own corpus (otherwise these tests skip)
CARDMIRROR_DOCS_DIR="/path/to/your/docx/files" npm test
CARDMIRROR_DOCS_DIR="/path/to/your/docx/files" npm run test:bench

# Desktop packaging
npm run desktop:install     # npm --prefix apps/desktop install
npm run desktop:build       # tsc main process
npm run desktop:pack        # electron-builder --dir  (unpacked)
npm run desktop:dist        # electron-builder        (installers)
npm run desktop:release     # electron-builder --publish always

# Misc
npm run check:links         # validate doc cross-links
npm run gen:new-template    # regenerate the blank-doc template
npm run build:readtool      # bundle the read-only CLI
```

Self-hosted collaboration relay:

```sh
cd relay
RELAY_TOKEN=$(openssl rand -hex 24) docker compose up -d
# Then: Settings → Collaboration → Custom relay URL = http://<host>:8410/relay
```

Note `desktop:pack`/`dist`/`release` run `fetch:voice` and `fetch:koffi-cross` first,
which download Vosk and koffi binaries — these need network access and will fail in a
restricted environment.

---

## 11. Assessment for your use case

### Where it is strong

1. **The document model is right, and it is the hard part.** A ProseMirror schema
   purpose-built for debate evidence — cards with required tags, mutually exclusive
   cite/underline/emphasis marks, stable heading UUIDs, flat headings matching Word's
   own representation. Reproducing this from scratch is many months of work, and most
   of the design decisions are non-obvious until you have hit the bug that motivates
   them (the comments in `nodes.ts` and `marks.ts` are essentially a field guide).
2. **`.docx` round-trip is a moat.** ~100 KB of hand-written OOXML import/export
   tuned against real Verbatim files, including encrypted `.docx`, comments,
   footnotes, tables with opaque property preservation, and Word content-type quirks
   discovered in the field. No off-the-shelf library gets you here.
3. **Three of your four extension points are already solved or scaffolded.**
   Companion-app IPC is a frozen, documented, security-reviewed protocol. Real-time
   collab ships. The out-of-process search index exists and left you an explicit hook.
4. **Real engineering discipline.** 286 test files with fuzz and adversarial suites,
   strict TypeScript, save/load structural tripwires motivated by named field
   incidents, atomic writes, crash journals, per-card `contain-intrinsic-size`
   estimates for scroll performance. The commentary quality is unusually high.
5. **Excellent documentation.** `ARCHITECTURE.md` (19 sections), a 142 KB manual, and
   a 27 KB frozen integration spec. You will not be reverse-engineering intent.

### Where it will fight you

1. **The license is the whole ballgame.** Noncommercial-only, no sublicensing, plus
   icon restrictions. If your app is or may become commercial, resolve this with the
   author *before* building. Everything else on this list is a normal engineering
   cost; this one is binary.
2. **Loro vs. Yjs is a real fork in the road.** If you are committed to Yjs, you are
   discarding ~200 KB of hardened, schema-aware CRDT code and re-deriving mark-merge
   invariants. I would push back on that requirement unless there is a strong external
   reason.
3. **`.hal` as ZIP is easy; externalizing images is not.** The container swap is
   contained to two files. Breaking images out of the doc JSON ripples into collab,
   undo, and clipboard.
4. **Monoliths make upstream tracking painful.** If the author keeps shipping (and the
   changelogs suggest a very high velocity), rebasing a fork across 10k-line files
   will hurt. Decide early: hard fork, or build alongside as a plugin + companion app.
5. **The "separate flow app" may be a collision.** The author has Verbatim Flow
   integration on the roadmap as a first-party feature.

### The strategic question you should decide first

Given that the bridge protocol is *frozen and published specifically so companion flow
apps can integrate*, there are two viable shapes:

- **(A) Fork CardMirror into your `.hal` editor.** Full control; you own `.hal`, Yjs
  if you insist, and the search index. Costs: license negotiation, icon replacement,
  and permanent divergence from a fast-moving upstream.
- **(B) Build the flow app against the existing bridge, and contribute `.hal`/search
  upstream.** Dramatically less work, no divergence, and it is exactly the integration
  path the author designed for. Costs: you do not control the editor's roadmap, and
  `.hal` would need to be acceptable upstream.

Your brief says "use cardmirror as its baseline/foundation," which implies (A) — but
the existence of a frozen companion-app protocol and a roadmap entry for first-party
flow integration means (B) deserves an explicit decision rather than a default.

### Confidence and caveats

- **High confidence:** license terms, dependency versions, schema/node/mark
  definitions, `.cmir` format, import/export entry points, keybinding defaults, bridge
  protocol, search index design, build commands. All read directly from source.
- **Medium confidence:** completeness of the command inventory. `ribbon-commands.ts`
  is 6,683 lines and I read the keybinding table and registry comments, not every
  command implementation. `MANUAL.md` (142 KB) is the exhaustive user-facing list.
- **Lower confidence / not examined:** `src/editor/index.ts` in full (9,910 lines) —
  I read its exported surface and boot path, not all of it. Same for
  `apps/desktop/src/main.ts` (~130 KB), `settings.ts`, and the AI/voice/pairing
  subsystems, which I surveyed structurally rather than line by line.
- **Not accessible:** git history, branches, tags, issues, and PRs (tarball download,
  no `.git`). Also the private `.docx` reference corpus, so I could not actually
  execute the round-trip suite to verify fidelity claims empirically — those claims
  come from the docs and the test code, not from a run.
- **Not run:** I did not `npm install`, build, or execute the test suite.
