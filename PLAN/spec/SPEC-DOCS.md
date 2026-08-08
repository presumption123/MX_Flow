# Halcyon Docs v1.0.4 — Renderer Feature Specification

Reverse-engineered from the shipped Electron renderer bundle. Authorized by the app owner.

**Artifacts analyzed**

| File | Size | Role |
|---|---|---|
| `docs/dist/assets/index-_xe_r3zj.js` | 1.97 MB | Main renderer (React 18 + zustand + ProseMirror + Yjs + Anthropic SDK + jszip/fflate + fast-xml-parser) |
| `docs/dist/assets/index-B8a2VacW.js` | 9 KB | Vite entry/preload shim |
| `docs/dist/assets/halWorker-DmERcIoA.js` | 149 KB | **`.hal` *save* worker only** (see §7.4 — it is not a reader and not a search index) |
| `docs/dist/assets/index-DGbCrDfI.css` | 17 KB | Document-canvas stylesheet (`.sd-*`) |
| `docs/dist/assets/en-thd_CVWn.js` / `en-CVEPTkpv.js` | 552 KB / 3 KB | `dictionary-en` payload + loader (spellcheck) |
| `ipc_strings.txt`, `preload_strings.txt` | — | IPC channels + `contextBridge` surface recovered from main/preload V8 bytecode |

### Method note

The main bundle is a single minified line, so everything below was recovered by targeted character-window
extraction (`.halcyon-extract/win.py`) and structured regex mining (`.halcyon-extract/cmds.py`) rather than
sequential reading. Two artifacts made this unusually high-confidence:

1. **A complete user manual is compiled into the bundle** as the array `J_` (offsets 1,696,941–1,760,807; ~64 KB,
   14 sections). It is rendered by the Information window's "Manual" tab. Where this document quotes prose in
   *italics with a "manual" attribution*, that is the vendor's own description, not my inference.
2. **A machine-readable command registry** (147 entries with `id`/`label`/`category`/`defaultShortcut`/`aliases`)
   and a **settings search registry** (130 entries with section + key + label + aliases) are both present as data,
   so §4, §5 and §17 are exhaustive rather than sampled.

Anything I could not confirm from the bundle is explicitly labelled **[INFERENCE]**.

> **Not evidence:** `.halcyon-extract/cardmirror/` is a checkout of a *different* application — `cardmirror`
> v0.1.0-beta.30 by Anthony Trufanov, which uses `loro-crdt`, not Yjs. Halcyon Docs *interoperates* with its
> `.cmir` files (§8.4) but shares no code. Nothing in this document is sourced from that tree.

### Internal codename

The product's internal name is **Superdocs**: the DOM/CSS prefix is `sd-`, style ids are `SDBody`/`SDCite`/
`SDAnalytic`/`SDUndertag`/`SDUnderlineChar`/`SDAnalyticChar`, exported `.docx` files carry
`<dc:creator>Superdocs</dc:creator>`, and the docx custom property key is `SuperdocsDocumentId`.

---

## 1. Screen inventory

### 1.1 Top-level views

The root store (`T`, a zustand store) holds a single `view` discriminant. Evidence: `openFind(){if(e().view==="dashboard"||!In(e())){t({folderSearchOpen:!0});return}...}`.

| View | Description |
|---|---|
| **Sign-in** | Gate before everything. Manual: *"Halcyon Docs opens to a sign-in screen… There is no unverified offline mode. If Halcyon cannot re-verify an open session for 15 minutes, the sign-in screen returns over your saved work, and it lifts by itself once the connection is back."* Sub-screens for 2FA (`"Enter your code"`, `"Resend code"`), password reset (`"Send reset link"`), email confirmation, and `"Sign Out Other Device & Continue"`. |
| **`dashboard`** | Folder sidebar + Recent/Pinned + start actions. Command `view.dashboard` ("Folders & Dashboard", aliases `dashboard, main menu, folders, home, back to dashboard, library`). |
| **`editor`** | The multi-pane document workspace. |

Auth states are `"loggedOut" | "authenticating" | "active"` (`He` store; `mc=()=>He.getState().status==="active"`).

### 1.2 Editor chrome

- **Tab strip** — `tabLocation: "top" | "bottom" | "left" | "right"` (default `"top"`), `tabStripWidth: 168`, `"Drag to resize the tab strip"`.
- **Toolbar (ribbon)** — horizontally scrollable (`.sd-toolbar-row{overflow-x:auto}`). Clusters named in the
  manual: **Text**, **Paragraph**, **Styles**, **Card**, **Doc**, **Table**, **Insert**, **Numbering**, **View**,
  **Search**, **Share**, **AI Tools** (only when `aiEnabled`).
- **Split panes** — up to 3 (`"Split is full (3 max)"`), `workspace.focusPane1..3` on `Mod-1/2/3`,
  `splitGroups` in the store, `"Close split pane"`, `"End split group"`.
- **Status bar** — live word count, reader read-times, `LIVE` collaboration chip, and the update chip.
- **Dropzone shelf** — optional, `showDropzoneShelf: false`.

### 1.3 Panels (docked)

| Panel | Toggle | State key |
|---|---|---|
| Navigation / outline | `Mod-Alt-n` (`view.navPane`) | `navOpen`, width `navWidth: 280` |
| Comments | `Mod-Alt-m` (`view.commentsPane`) | `commentsOpen`, width `commentsWidth: 300` |
| Round Timer | header control | `halcyon-timer-v1`, can pop out to its own always-on-top window |
| Find / Find & Replace bar | `Mod-f` / `Mod-h` | `findOpen`, `findReplaceOpen`, `findDocId` |

### 1.4 Modals and overlays

Recovered from `*Open` store flags and `open*/close*` actions:

`commandSearchOpen`, `docSearchOpen`, `folderSearchOpen`, `settingsOpen`, `informationOpen`, `exportOpen`,
`convertOpen`, `wikiCreatorOpen`, `libraryOptimizeOpen`, `emailChainOpen`, `repairOpen`, `accountMenuOpen`,
`modalOpen`, `topOpen`.

Plus dialogs identified by `role="dialog"` / `aria-label`: `Command Search`, `Ask AI`, `Insert hyperlink`,
`Sync Cutting Across Doc`, `Standardize Highlighting (with Exception)`, `Standardize Backgrounds (with Exception)`,
`Activate your account`, `Review our updated policies`, `Image settings`, `Spelling suggestions`, `Export document`,
`Unsaved changes`, `File Changed on Disk`, `Software update`, `Report a Bug`, `Suggest a Feature`,
`Collaborate…`, `Messaging…`, `Create Wiki…`, `Optimize library`, `Convert…`.

Contextual popovers: `sd-link-menu`, `sd-link-prompt`, `sd-link-hover`, `sd-image-menu`, `sd-spell-menu`,
`sd-anno-menu`, `sd-transclusion-menu`, `sd-footnote-popover`, `sd-ask-ai`.

### 1.5 Onboarding

A guided tour (`tutorialCompleted` setting, `help.replayTutorial`) anchors on command ids via
`anchor:"cmd:structure.pocket"` and punches a hole in an overlay with `url(#halcyon-tour-hole)`. Tour steps found:
`structure` ("Build the debate skeleton", F4→F7), `createCard` ("Cut a card"), plus steps titled
`"Navigate the outline"`, `"Mark up a card"`, `"Send a card to your speech"`, `"Read it at the podium"`,
`"Two ways to search"`, `"Work on a file together"`, `"Bring your Word files in"`, `"The toolbar"`.

### 1.6 Information window

Four tabs (manual §"The Information Window"): **Personal** (name, school, code, notes — synced with Halcyon Flow
via `halcyon:personal-read`/`-write`), **Tournament Schedule** (undoable table), **Manual** (the embedded `J_`
guide, with `Ctrl+F` retargeted to a manual-search box), and **What Halcyon Offers** (`help.pitch`).

---

## 2. The ProseMirror schema (complete)

Located at bundle offsets ~242,480–251,000. Constructed as `L = new Schema({nodes: tq, marks: nq})`.
`topNode` is not passed, so it defaults to `doc` (the first key).

### 2.1 Shared helpers

```js
// Block-level presentation attrs shared by every text block  (minified: kl)
const blockAttrs = {
  indent:   { default: 0    },   // integer; rendered as margin-left: (indent*1.6)em + data-indent
  listType: { default: null },   // "bullet" | "ordered" | null  -> data-list
  spacing:  { default: null },
  align:    { default: null },   // "center" | "right" | "justify" -> data-align + text-align
};

// toDOM attribute builder (minified: vl)
function blockDOM(node, base) {
  const attrs = { ...base }, style = [];
  const i = Number(node.attrs.indent) || 0;
  if (i > 0) { attrs["data-indent"] = String(i); style.push(`margin-left:${(i * 1.6).toFixed(2)}em`); }
  if (node.attrs.listType) attrs["data-list"] = String(node.attrs.listType);
  const a = node.attrs.align;
  if (a === "center" || a === "right" || a === "justify") {
    attrs["data-align"] = String(a); style.push(`text-align:${a}`);
  }
  if (style.length) attrs.style = style.join(";");
  return attrs;
}

// parseDOM attribute reader (minified: Sl)
function blockAttrsFromDOM(dom) {
  const out = {};
  const n = parseInt(dom.getAttribute("data-indent") ?? "", 10);
  if (Number.isFinite(n) && n > 0) out.indent = n;
  const l = dom.getAttribute("data-list");
  if (l === "bullet" || l === "ordered") out.listType = l;
  const a = dom.getAttribute("data-align") || (dom.style && dom.style.textAlign);
  if (a === "center" || a === "right" || a === "justify") out.align = a;
  return out;
}

// Content expression reused by live_view and linked_copy  (minified: yI)
const TRANSCLUDABLE =
  "(pocket | hat | block | card | analytic_unit | paragraph | table | image_block)*";

// Container attrs for card / analytic_unit  (minified: bI)
const containerAttrs = {
  sid:        { default: null  },  // stable id, "n_<12 nanoid chars>"
  numRole:    { default: "none" }, // "none" | "number" | "sub"
  numRestart: { default: false },
};

// contain-intrinsic-size hint written into style= for card/analytic_unit (minified: eq)
const sizeHint = (node) =>
  `contain-intrinsic-size: auto ${Math.max(6, Math.round(node.nodeSize / 64) + 4)}em`;
```

### 2.2 Heading factory

`pocket`, `hat`, and `block` are all produced by one factory (minified `_k`). Note that **only `block` (level 3)
gets a `numRestart` attribute, and its default is `true`** — the opposite of `card`/`analytic_unit`, whose
`numRestart` defaults to `false`.

```js
function heading(level) {                  // level ∈ {1,2,3}
  return {
    attrs: {
      sid: { default: null },
      ...blockAttrs,
      ...(level === 3 ? { numRestart: { default: true } } : {}),
    },
    content: "inline*",
    group: "docblock",
    defining: true,
    parseDOM: [{
      tag: `[data-sd-heading="${level}"]`,
      priority: 60,
      getAttrs(dom) {
        const a = blockAttrsFromDOM(dom);
        if (level === 3 && dom.getAttribute("data-num-restart") === "false") a.numRestart = false;
        const sid = dom.getAttribute("data-sid");
        if (sid) a.sid = sid;
        return a;
      },
    }],
    toDOM(node) {
      const a = blockDOM(node, {
        "data-sd-heading": String(level),
        "data-sid": node.attrs.sid ?? "",
      });
      if (level === 3 && node.attrs.numRestart === false) a["data-num-restart"] = "false";
      return ["p", a, 0];
    },
  };
}
```

### 2.3 Nodes (18)

```js
const nodes = {
  doc: { content: "docblock+", marks: "comment_range" },

  text: { group: "inline" },

  paragraph: {
    attrs: blockAttrs,
    content: "inline*",
    group: "docblock cardcontent",
    parseDOM: [{ tag: "p", getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "paragraph" }), 0],
  },

  pocket: heading(1),   // outline level 1
  hat:    heading(2),   // outline level 2
  block:  heading(3),   // outline level 3

  card: {
    attrs: containerAttrs,
    content: "tag (cardcontent)*",
    group: "docblock",
    marks: "comment_range",
    defining: true,
    isolating: true,
    parseDOM: [{ tag: '[data-sd="card"]', getAttrs: containerAttrsFromDOM }],
    toDOM: (n) => ["section", containerDOM(n, "card"), 0],
  },

  analytic_unit: {
    attrs: containerAttrs,
    content: "analytic (cardcontent)*",
    group: "docblock",
    marks: "comment_range",
    defining: true,
    isolating: true,
    parseDOM: [{ tag: '[data-sd="analytic-unit"]', getAttrs: containerAttrsFromDOM }],
    toDOM: (n) => ["section", containerDOM(n, "analytic-unit"), 0],
  },

  // Read-only mirror of another section (renders empty in toDOM; filled by a NodeView)
  live_view: {
    attrs: { sourceSid: { default: "" }, sourceLabel: { default: "" } },
    content: TRANSCLUDABLE,
    group: "docblock",
    isolating: true, defining: true, selectable: true, draggable: false,
    parseDOM: [{ tag: '[data-sd="live-view"]', getAttrs: (d) => ({
      sourceSid:   d.getAttribute("data-source-sid")   ?? "",
      sourceLabel: d.getAttribute("data-source-label") ?? "",
    })}],
    toDOM: (n) => ["section", {
      "data-sd": "live-view",
      "data-source-sid":   String(n.attrs.sourceSid   ?? ""),
      "data-source-label": String(n.attrs.sourceLabel ?? ""),
    }],   // <- no content hole: children are not editable in place
  },

  // Editable fork of another section, with divergence tracking
  linked_copy: {
    attrs: {
      sourceRef:         { default: "@this-document" },  // "@this-document" | external file ref
      sourceSid:         { default: "" },
      sourceContentHash: { default: "" },
      sourceShapeHash:   { default: "" },
      lastRefreshed:     { default: "" },
      sourceLabel:       { default: "" },
    },
    content: TRANSCLUDABLE,
    group: "docblock",
    isolating: true, defining: true, selectable: true, draggable: false,
    parseDOM: [{ tag: '[data-sd="linked-copy"]', getAttrs: (d) => ({
      sourceRef:         d.getAttribute("data-source-ref")           ?? "@this-document",
      sourceSid:         d.getAttribute("data-source-sid")           ?? "",
      sourceContentHash: d.getAttribute("data-source-content-hash")  ?? "",
      sourceShapeHash:   d.getAttribute("data-source-shape-hash")    ?? "",
      lastRefreshed:     d.getAttribute("data-last-refreshed")       ?? "",
      sourceLabel:       d.getAttribute("data-source-label")         ?? "",
    })}],
    toDOM(n) { /* emits only the non-empty attrs, then a content hole */ 
      return ["section", { "data-sd": "linked-copy", /* …*/ }, 0];
    },
  },

  // Card/analytic heads. NOTE: no `group` — reachable only as the required first child.
  tag: {
    attrs: blockAttrs, content: "inline*", defining: true,
    parseDOM: [{ tag: '[data-sd="tag"]', priority: 60, getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "tag" }), 0],
  },
  analytic: {
    attrs: blockAttrs, content: "inline*", defining: true,
    parseDOM: [{ tag: '[data-sd="analytic"]', priority: 60, getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "analytic" }), 0],
  },

  undertag: {
    attrs: blockAttrs, content: "inline*", group: "cardcontent",
    parseDOM: [{ tag: '[data-sd="undertag"]', priority: 60, getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "undertag" }), 0],
  },
  cite_paragraph: {
    attrs: blockAttrs, content: "inline*", group: "cardcontent",
    parseDOM: [{ tag: '[data-sd="cite"]', priority: 60, getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "cite" }), 0],
  },
  card_body: {
    attrs: blockAttrs, content: "inline*", group: "cardcontent",
    parseDOM: [{ tag: '[data-sd="body"]', priority: 60, getAttrs: blockAttrsFromDOM }],
    toDOM: (n) => ["p", blockDOM(n, { "data-sd": "body" }), 0],
  },

  footnote: {                       // inline atom; note text is carried IN the attrs
    inline: true, group: "inline", atom: true,
    attrs: { kind: { default: "foot" }, text: { default: "" }, id: { default: null } },
    parseDOM: [{ tag: "span[data-sd-footnote]", getAttrs: (d) => ({
      kind: d.getAttribute("data-sd-footnote") === "end" ? "end" : "foot",
      text: d.getAttribute("data-note") ?? "",
      id:   d.getAttribute("data-note-id") || null,
    })}],
    toDOM: (n) => ["span", {
      "data-sd-footnote": n.attrs.kind === "end" ? "end" : "foot",
      "data-note": String(n.attrs.text ?? ""),
      "data-note-id": n.attrs.id ?? "",
      class: "sd-footnote-ref",
    }],
  },

  table: {
    attrs: { rawTblPr: { default: null }, width: { default: null } },
    content: "table_row+", group: "docblock cardcontent",
    tableRole: "table", isolating: true,
    parseDOM: [{ tag: "table" }],
    toDOM: () => ["table", { "data-sd": "table" }, ["tbody", 0]],
  },
  table_row: {
    content: "(table_cell | table_header)+", tableRole: "row",
    parseDOM: [{ tag: "tr" }], toDOM: () => ["tr", 0],
  },
  table_cell: {
    attrs: { colspan: {default:1}, rowspan: {default:1}, rawTcPr: {default:null}, align: {default:null} },
    content: "paragraph+", tableRole: "cell", isolating: true,
    parseDOM: [{ tag: "td" }],
    toDOM(n) { const a={}; if(n.attrs.colspan!==1)a.colspan=String(n.attrs.colspan);
                            if(n.attrs.rowspan!==1)a.rowspan=String(n.attrs.rowspan); return ["td",a,0]; },
  },
  table_header: { /* identical to table_cell, tableRole:"header_cell", tag "th" */ },

  image: {                          // inline image
    inline: true, group: "inline", draggable: true,
    attrs: {
      mediaId:{default:null}, src:{default:null}, alt:{default:""}, contentType:{default:null},
      width:{default:null}, height:{default:null},
      opacity:{default:1}, rotation:{default:0}, dx:{default:0}, dy:{default:0}, layer:{default:0},
      wrap:{default:"inline"},        // "inline" | "float"
      flipH:{default:false}, flipV:{default:false},
    },
    parseDOM: [{ tag: "img[src]", getAttrs: /* src, alt, data-media-id + geometry attrs */ }],
    toDOM: (n) => ["img", { src:n.attrs.src??"", alt:n.attrs.alt??"",
                            "data-media-id": n.attrs.mediaId??"", ...imageGeometryDOM(n.attrs) }],
  },
  image_block: {                    // block-level figure; SAME attrs as `image`
    group: "docblock cardcontent", draggable: true,
    attrs: /* identical to image */,
    parseDOM: [{ tag: 'figure[data-sd="image"]', getAttrs: (d) => geometryFromDOM(d.querySelector("img")) }],
    toDOM: (n) => ["figure", { "data-sd": "image" },
                   ["img", { src:n.attrs.src??"", alt:n.attrs.alt??"",
                             "data-media-id": n.attrs.mediaId??"", ...imageGeometryDOM(n.attrs) }]],
  },
};
```

Image geometry is serialized sparsely — only non-default values are emitted:
`data-opacity`, `data-rotation`, `data-dx`, `data-dy`, `data-layer`, `data-wrap="float"`,
`data-fliph="1"`, `data-flipv="1"`.

**Group membership summary**

| Group | Members |
|---|---|
| `docblock` (doc-level) | `paragraph`, `pocket`, `hat`, `block`, `card`, `analytic_unit`, `live_view`, `linked_copy`, `table`, `image_block` |
| `cardcontent` (inside card/analytic_unit) | `paragraph`, `undertag`, `cite_paragraph`, `card_body`, `table`, `image_block` |
| `inline` | `text`, `footnote`, `image` |
| *(no group)* | `tag`, `analytic` — structurally pinned as the first child of `card` / `analytic_unit` |

### 2.4 Marks (21)

`Ek = "cite_mark underline_mark emphasis_mark"` is the mutual-exclusion group for the three debate character
styles — applying one removes the others.

```js
const markShorthand = (name, excludes) => ({
  parseDOM: [{ tag: `[data-mark="${name}"]` }],
  toDOM: () => ["span", { "data-mark": name }, 0],
  ...(excludes ? { excludes } : {}),
});

const marks = {
  // ---- Debate character styles -------------------------------------------------
  emphasis_mark: {
    attrs: { size: { default: null }, hl: { default: null } },
    excludes: "cite_mark underline_mark emphasis_mark",
    parseDOM: [{ tag: '[data-mark="emphasis"]', getAttrs: () => ({}) }],
    toDOM(m) {
      const { size, hl } = m.attrs, style = [];
      if (size != null) style.push(`font-size:calc(var(--sd-zoom, 1) * ${size}pt)`, `--sd-emph-pt:${size}`);
      const a = { "data-mark": "emphasis" };
      if (hl != null) {
        a["data-color"] = hl;
        const lum = luminanceClass(hl);            // "light" | "dark" | null
        if (lum) a["data-fill-lum"] = lum;
        if (/^#[0-9a-fA-F]{3,8}$/.test(hl)) {
          style.push(`--hl:${hl}`);
          if (lum === "light") style.push(`--sd-hl-dark:${darkenForDarkCanvas(hl)}`);
        }
      }
      if (style.length) a.style = style.join(";");
      return ["span", a, 0];
    },
  },
  underline_mark: markShorthand("debate-underline", "cite_mark underline_mark emphasis_mark"),
  cite_mark:      markShorthand("cite",             "cite_mark underline_mark emphasis_mark"),
  undertag_mark:  markShorthand("undertag"),
  analytic_mark:  markShorthand("analytic"),

  // ---- Direct/presentational formatting ---------------------------------------
  underline_direct: {
    parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
    toDOM: () => ["u", 0],
  },
  font_size: {
    attrs: { size: { default: 11 } },
    parseDOM: [{ style: "font-size", getAttrs(v) {
      const m = /([\d.]+)\s*pt/.exec(String(v));
      const n = parseFloat(m ? m[1] : String(v));
      return { size: Number.isFinite(n) && n > 0 ? n : 11 };
    }}],
    toDOM: (m) => ["span", { style: `font-size:calc(var(--sd-zoom, 1) * ${m.attrs.size}pt)` }, 0],
  },
  bold: {                       // tri-state: can force NORMAL weight, not just bold
    attrs: { w: { default: "b" } },       // "b" | "n"
    parseDOM: [
      { tag: "strong", getAttrs: () => ({ w: "b" }) },
      { tag: "b",      getAttrs: () => ({ w: "b" }) },
      { style: "font-weight", getAttrs(v) {
        const s = String(v).toLowerCase();
        if (["normal","400","300","100"].includes(s)) return { w: "n" };
        if (s === "bold" || s === "bolder" || (parseInt(s,10)||0) >= 600) return { w: "b" };
        return false;
      }},
    ],
    toDOM: (m) => ["span", { style:`font-weight:${m.attrs.w==="n"?"normal":"700"}`, "data-bold":m.attrs.w }, 0],
  },
  italic: {                     // likewise tri-state
    attrs: { i: { default: "on" } },      // "on" | "off"
    parseDOM: [
      { tag: "em", getAttrs: () => ({ i: "on" }) },
      { tag: "i",  getAttrs: () => ({ i: "on" }) },
      { style: "font-style", getAttrs(v) {
        const s = String(v).toLowerCase();
        if (s === "italic" || s === "oblique") return { i: "on" };
        if (s === "normal") return { i: "off" };
        return false;
      }},
    ],
    toDOM: (m) => ["span", { style:`font-style:${m.attrs.i==="off"?"normal":"italic"}`, "data-italic":m.attrs.i }, 0],
  },
  strikethrough: { parseDOM:[{tag:"s"},{tag:"del"},{style:"text-decoration=line-through"}], toDOM:()=>["s",0] },
  superscript:   { excludes:"superscript subscript", parseDOM:[{tag:"sup"}], toDOM:()=>["sup",0] },
  subscript:     { excludes:"superscript subscript", parseDOM:[{tag:"sub"}], toDOM:()=>["sub",0] },

  // ---- Fills -------------------------------------------------------------------
  highlight: {                  // Word-style named highlight
    attrs: { color: { default: "yellow" } },
    parseDOM: [{ tag: "mark", getAttrs: (d) => ({ color: d.getAttribute("data-color") ?? "yellow" }) }],
    toDOM(m) {
      const c = String(m.attrs.color), a = { "data-color": c }, lum = luminanceClass(c);
      if (lum) a["data-fill-lum"] = lum;
      if (/^#[0-9a-fA-F]{3,8}$/.test(c))
        a.style = lum === "light" ? `--hl:${c};--sd-hl-dark:${darkenForDarkCanvas(c)}` : `--hl:${c}`;
      return ["mark", a, 0];
    },
  },
  shading: {                    // Word paragraph/run shading; remembers the highlight it replaced
    attrs: { color: { default: "#ffff00" }, prevHl: { default: null } },
    parseDOM: [{ tag: "span[data-shading]", getAttrs: (d) => ({
      color:  d.getAttribute("data-shading"),
      prevHl: d.getAttribute("data-prev-hl") || null,
    })}],
    toDOM(m) { /* data-shading, --hl / --sd-hl-dark, data-fill-lum, data-prev-hl */ },
  },
  font_color:  { attrs:{color:{default:"#000000"}}, parseDOM:[{style:"color",getAttrs:(v)=>({color:v})}],
                 toDOM:(m)=>["span",{style:`color:${m.attrs.color}`},0] },
  font_family: { attrs:{family:{default:null}},      parseDOM:[{style:"font-family",getAttrs:(v)=>({family:v})}],
                 toDOM:(m)=>["span",{style:`font-family:${m.attrs.family}`},0] },

  link: {
    attrs: { href: { default: "" }, title: { default: null } },
    inclusive: false,
    parseDOM: [{ tag: "a[href]", getAttrs: (d) => ({ href: sanitizeUrl(d.getAttribute("href")),
                                                     title: d.getAttribute("title") }) }],
    toDOM: (m) => ["a", { href: sanitizeUrl(m.attrs.href) || undefined,
                          title: m.attrs.title ?? undefined }, 0],
  },

  // ---- Editor bookkeeping marks -------------------------------------------------
  pilcrow_marker: {             // records where a paragraph break was removed by Condense
    attrs: { kind: { default: "paragraph" } },
    parseDOM: [{ tag: "span[data-pilcrow]" }],
    toDOM: (m) => ["span", { "data-pilcrow": m.attrs.kind }, 0],
  },
  reading_marker: {             // "where I stopped reading"
    inclusive: false,
    parseDOM: [{ tag: "span[data-reading-marker]" }],
    toDOM: () => ["span", { "data-reading-marker": "1" }, 0],
  },
  insert_mark: {                // "Create Reference" — shrunk + grayed reference text
    attrs: { size: { default: null }, color: { default: null } },
    inclusive: false,
    parseDOM: [{ tag: "span[data-insert]", getAttrs(d) {
      const s = d.getAttribute("data-insert-size");
      return { size: s ? parseFloat(s) : null, color: d.getAttribute("data-insert-color") || null };
    }}],
    toDOM(m) { /* data-insert="1" (+ data-insert-size, data-insert-color) */ },
  },
  comment_range: {              // the only mark allowed on doc / card / analytic_unit
    attrs: { ids: { default: [] } },
    inclusive: false,
    parseDOM: [{ tag: "span[data-comment-ids]", getAttrs: (d) => ({
      ids: (d.getAttribute("data-comment-ids") ?? "").split(",").filter(Boolean),
    })}],
    toDOM: (m) => ["span", { "data-comment-ids": m.attrs.ids.join(",") }, 0],
  },
};
```

### 2.5 Schema-adjacent observations

- **`sid` stable ids** — generated by a nanoid alphabet
  `"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"` at length 12, prefixed by kind:
  `` Qe(t="n") => `${t}_${nanoid12()}` ``. Document ids are `doc_<24>`, package ids `pkg_<24>`.
  Only `pocket|hat|block|card|analytic_unit` carry sids (`Vd = new Set([...])`).
- **Dark-canvas fill adaptation** — `luminanceClass()` (`Ck`) classifies a fill as `light`/`dark`; light fills get a
  computed `--sd-hl-dark` companion (`Jy`) that iteratively darkens until contrast against `#e0e0e0` reaches 4.5:1.
  The manual confirms: *"On the dark document canvas, light highlight colors darken automatically… saved files and
  exports keep the original colors."*
- **Content-visibility** — `card`/`analytic_unit` render with `content-visibility:auto` plus a per-node
  `contain-intrinsic-size` hint, which is how multi-megabyte evidence files stay scrollable.

---

## 3. Document hierarchy and the navigation pane

### 3.1 The hierarchy is Verbatim's, verbatim

Halcyon uses exactly the Verbatim skeleton, on the same function keys:

```
doc
└── pocket          (F4, outlineLevel 1, 26pt bold centered, 3pt box)
    └── hat         (F5, outlineLevel 2, 22pt bold centered, double underline)
        └── block   (F6, outlineLevel 3, 16pt bold centered, single underline)
            ├── card          → tag (F7, outlineLevel 4) + cite_paragraph / card_body / undertag / …
            └── analytic_unit → analytic (Ctrl+F7, outlineLevel 4, accent1 color)
```

Manual, §Document Structure: *"Pockets, hats, blocks, tags, cards, and analytics: the debate skeleton, on function
keys."* Tour step: *"The structure keys nest a document like a case: 'Pocket' (F4), then 'Hat' (F5), then 'Block'
(F6), then 'Tag' (F7)."*

Important structural nuance: **the nesting is flat in the schema, not nested in the tree.** `pocket`, `hat`, and
`block` are all siblings in `doc`'s `docblock+` content; hierarchy is *derived* from `data-sd-heading` level at
render/outline time. Only `card` and `analytic_unit` are true containers (`isolating: true`).

### 3.2 Outline panel

- Toggle `Mod-Alt-n`; width persisted as `navWidth` (default 280), drag-resizable, double-click edge to reset.
- **Depth buttons 1 / 2 / 3 / 4** map to `navMaxLevel` (default 4) — manual: *"The 1 / 2 / 3 / 4 buttons collapse
  it to pockets, hats, blocks, or everything."* Matching commands exist as
  `Collapse to Pockets` / `Expand to Hats` / `Expand to Blocks` / `Expand all` / `Collapse all`.
- **Type chips**: `POC`, `HAT`, `BLK`, `CARD`, `TAG`, `AN`, `BODY` (also used as Doc Search filters).
  `formatNavByType: true` colors rows by type.
- **Card numbers** appear inline in the outline when `showCardNumbers` is on (`.sd-nav-card-number`).
- **Hover chips** — `citePreviewOnHover: true` shows a card's cite; `readTimeOnCardHover: true` shows per-reader
  read-time estimates. Block rows show the aggregate time for everything beneath them.
  Read time is *"never on the page itself"* — navigation panel only.
  Text carrying `insert_mark` ("Create Reference") or gray highlighting is excluded from the estimate.
- **Pinned section** (`showPinnedSection`) — snapshots pinned from any document, stored at `halcyon:navPins`,
  drag payload MIME `application/x-hal-navpin`.
- **Row context menu** — `Go to source`, `Send to Speech (at cursor/at end)`, `Send to Flow`, `Share` (card share),
  `Auto-number block`, `Delete`, `Move up/down`.

Other drag MIME types in use: `application/x-hal-doc-move`, `application/x-hal-folder-move`.

### 3.3 Heading navigation

`PageUp` / `PageDown` jump between structural heads (Pocket, Hat, Block, Tag, Analytic), skipping body text;
`Shift-PageUp` / `Shift-PageDown` extend the selection. When there is no heading in that direction they fall back
to normal scrolling.

---

## 4. Editing commands

All 147 registered commands, extracted from the command registry data table. Format: `id` — Label
*(default shortcut)* [aliases]. Shortcuts use ProseMirror `Mod-` notation (`Mod` = Cmd on macOS, Ctrl elsewhere).

### 4.1 Structure (the debate skeleton)

| Command | Label | Shortcut |
|---|---|---|
| `structure.pocket` | Set Pocket | **F4** |
| `structure.hat` | Set Hat | **F5** |
| `structure.block` | Set Block | **F6** |
| `structure.tag` | Set Tag | **F7** |
| `structure.analytic` | Set Analytic | **Mod-F7** |
| `structure.undertag` | Set Undertag | **Mod-F8** |
| `structure.cite` | Set Cite Paragraph | — |
| `structure.createCard` | Create Card | **Mod-Alt-c** |
| `structure.createAnalytic` | Create Analytic Unit | — |
| `structure.clearToNormal` | Clear Formatting | **F12** |
| `structure.moveUp` / `structure.moveDown` | Move Container Up/Down | **Mod-Alt-ArrowUp / ArrowDown** |
| `structure.selectSection` | Select Current Heading/Section | **Alt-a** |
| `structure.deleteSection` | Delete Current Heading/Section | — |
| `structure.extractUndertag` | Extract Undertag | — |
| `structure.analyticsToTags` | Convert Analytics to Tags | — |
| `structure.citedAnalyticsToTags` | Convert Cited Analytics to Tags | — |
| `transclusion.liveView` | Insert Live View… | — |
| `transclusion.linkedCopy` | Insert Linked Copy… | — |
| `transclusion.linkedCopyFile` | Insert Linked Copy from File… | — |

A style command applied while the cursor sits on a heading converts the whole heading; applied to a body line under
a heading it *"splits that line out on its own"*.

### 4.2 Marks — the debate cutting set

| Command | Label | Shortcut |
|---|---|---|
| `marks.cite` | Set Cite | **F8** |
| `marks.underline` | Set Underline | **F9** |
| `marks.emphasis` | Set Emphasis | **F10** |
| `marks.highlight` | Highlight | **F11** |
| `marks.backgroundColor` | Background Color (shading) | **Mod-F11** |
| `marks.backgroundNone` | Clear Background | — |
| `marks.copyPreviousCite` | Copy Previous Cite | **Alt-F8** |
| `marks.emphasizeAcronym` | Emphasize Acronym | **Alt-F10** |
| `marks.highlightAcronym` | Highlight Acronym | **Alt-F11** |
| `marks.underlineAcronym` | Underline Acronym | — |
| `marks.standardizeHighlights` | Standardize Highlighting | — |
| `marks.standardizeHighlightsExcept` | Standardize Highlighting (with Exception) | — |
| `marks.standardizeBackgrounds` | Standardize Backgrounds | — |
| `marks.standardizeBackgroundsExcept` | Standardize Backgrounds (with Exception) | — |
| `marks.convertHighlightToBackground` | Convert Highlighting to Background | — |
| `marks.convertBackgroundToHighlight` | Convert Background to Highlighting | — |
| `marks.lockHighlights` | Lock Highlighting (gray them so later passes skip them) | — |
| `marks.fixGaps` | Fix Formatting Gaps | **Mod-Shift-g** |
| `marks.cleanCutting` | Clean Cutting Style | **Mod-Shift-k** |
| `marks.selectSimilar` | Select Similar Formatting | — |
| `marks.flipQuotes` | Flip Quote Direction | — |

Highlight semantics (manual): reapplying the same color to a uniformly highlighted selection **removes** it; a mixed
selection takes the color on the first press and clears on the second.

### 4.3 Marks — ordinary formatting

`marks.bold` **Mod-Shift-b** (note: `Mod-b` is taken by Doc Search), `marks.italic` **Mod-i**,
`marks.directUnderline` **Mod-Shift-u**, `marks.strikethrough`, `marks.superscript` **Mod-Shift-=**,
`marks.subscript` **Mod-Shift-,**, `marks.fontSizeUp`, `marks.fontSizeDown`,
`list.bullet` **Mod-Shift-8**, `list.ordered` **Mod-Shift-7**, `list.indent` **Mod-]**, `list.outdent` **Mod-[**,
`align.left` / `align.center` / `align.right`,
`marks.addLink` **Mod-k**, `marks.removeLink` **Mod-Shift-l**, `marks.removeAllLinks`.

### 4.4 Condense / shrink (the "make it fit" set)

| Command | Label | Shortcut |
|---|---|---|
| `condense.card` | Condense Card | **F3** |
| `condense.cardPilcrows` | Condense Card (with pilcrows) | **Mod-Alt-F3** |
| `condense.uncondense` | Uncondense Card | **Mod-Alt-Shift-F3** |
| `condense.shrinkText` | Shrink Card Text | **Mod-Alt-,** |
| `condense.growText` | Restore Card Text Size | **Mod-Alt-.** |
| `condense.toggleCase` | Toggle Case | **Shift-F3** |
| `condense.convertToInsert` | Create Reference | **Shift-F9** |
| `condense.universalizeFormat` | Sync Cutting Across Doc | **Mod-Shift-y** |
| `condense.smartShrink` | Smart Shrink | — |
| `condense.repairLines` | Join Broken Lines | — |

`condense.cardPilcrows` is what makes condensing reversible — it leaves `pilcrow_marker` marks at the removed
paragraph breaks, and `condense.uncondense` restores breaks at those marks.
`condense.smartShrink`: body paragraphs with no underline/emphasis drop to a small size; marked paragraphs shrink
only their connective text. Bracketed omission notes (`[Table Omitted]`) and user-configured
`shrinkProtections` strings/regexes stay full size.
`condense.universalizeFormat` copies one card's cutting onto its duplicates elsewhere in the document, after a
preview dialog.

### 4.5 Numbering, tables, notes, editing

`numbering.toggleNumber` **Mod-Alt-1**, `numbering.toggleSub` **Mod-Alt-2**, `numbering.toggleRestart`
**Mod-Alt-3**, `numbering.toggleVisibility` **Mod-Alt-0**.
Numbering is display-only (`numRole`/`numRestart` attrs) and auto-renumbers on insert/delete/move;
right-click a Block → "Auto-number block" rebuilds the run as 1, 2, 3.

`editing.insertTable` **Mod-Alt-t**, plus `table.addRowAbove/Below`, `table.addColumnLeft/Right`,
`table.deleteRow/Column/Table`, `table.mergeCells`, `table.splitCell`.
`insert.footnote`, `insert.endnote` (footnotes number 1,2,3; endnotes i,ii,iii).
`editing.undo` **Mod-z**, `editing.redo` **Mod-y**, `editing.pastePlain` **F2**,
`edit.pasteCondense` (Paste and Destructively Condense), `editor.repairParagraph`.

### 4.6 Speech, view, workspace, search, AI

`speech.sendCursor` **`` ` ``**, `speech.sendEnd` **Alt-`**, `speech.sendCard`, `speech.markActive`.
`view.readMode` **Mod-Shift-r**, `view.judgeMode` **Mod-Shift-j**, `view.readingMarker` **Mod-Shift-m**,
`view.navPane` **Mod-Alt-n**, `view.commentsPane` **Mod-Alt-m**, `view.settings` **Mod-,**,
`view.shortcuts` **Mod-Alt-k**, `view.cycleTheme` **Mod-Alt-d**, `view.zoomIn/Out/Reset` **Mod-= / Mod-- / Mod-0**,
`view.commandSearch`, `view.dashboard`, `view.information`.
`workspace.focusPane1/2/3` **Mod-1/2/3**, `workspace.cycleDocNext/Prev`,
`workspace.switchToFlow` **Mod-Shift-t**, `workspace.convertDocuments`, `workspace.createWiki`,
`workspace.optimizeLibrary`.
`search.find` **Mod-f**, `search.replace` **Mod-h**, `search.docSearch` **Mod-b**, `search.folders`,
`search.cycleTieBreak`.
`comments.add` **Mod-Shift-c**, `annotation.addExtension` **Mod-Shift-e**, `annotation.addNote` **Mod-Shift-n**.
AI: see §10.

### 4.7 Selection behaviour

- **Word snap** (`wordSnapDrag: true`) — dragging past the starting word snaps to whole words, Word-style; hyphens
  and dashes terminate a word (`"re-search"` snaps as two). Double/triple-click drags keep normal behaviour.
- **Caret word marks** (`caretWordMarks: true`) — "Apply Marks to the Word at the Cursor": F9 etc. with a collapsed
  selection act on the whole word.
- **Multi-range selection** (`experimentalMultiRange: false`) — Ctrl+drag additive ranges, rendered with
  `.sd-multi-range`.
- **Protected card heads** — deleting across a card boundary preserves the card's tag.

---

## 5. Complete keyboard shortcut table

Defaults; every one is rebindable via `shortcutOverrides` in Settings → Keybindings (`Mod-Alt-k`).
`Mod` = ⌘ on macOS, Ctrl on Windows/Linux (`keyboardMode` is auto-detected from `halcyonHost.platform`).

### Function keys (the Verbatim muscle memory)

| Key | Command |
|---|---|
| F2 | Paste Plain Text |
| F3 | Condense Card |
| Shift-F3 | Toggle Case |
| Mod-Alt-F3 | Condense Card (with pilcrows) |
| Mod-Alt-Shift-F3 | Uncondense Card |
| F4 / F5 / F6 / F7 | Set Pocket / Hat / Block / Tag |
| Mod-F7 | Set Analytic |
| F8 | Set Cite |
| Alt-F8 | Copy Previous Cite |
| Mod-F8 | Set Undertag |
| F9 | Set Underline |
| Shift-F9 | Create Reference |
| F10 | Set Emphasis |
| Alt-F10 | Emphasize Acronym |
| F11 | Highlight |
| Alt-F11 | Highlight Acronym |
| Mod-F11 | Background Color |
| F12 | Clear Formatting |

### File

| Shortcut | Command |
|---|---|
| Mod-n | New Document |
| Mod-o | Open… |
| Mod-w | Close Active Document |
| Mod-s | Save |
| Mod-Shift-s | Save As… |
| Mod-Alt-s | Save Send Doc |
| Mod-Shift-d | Export .docx… |

### Editing / formatting

| Shortcut | Command |
|---|---|
| Mod-z / Mod-y | Undo / Redo (Mod-Shift-z also redoes) |
| Mod-Shift-b | Bold |
| Mod-i | Italic |
| Mod-Shift-u | Underline (direct) |
| Mod-Shift-= | Superscript |
| Mod-Shift-, | Subscript |
| Mod-Shift-7 / Mod-Shift-8 | Numbered / Bullet list |
| Mod-] / Mod-[ | Indent / Outdent |
| Mod-k | Insert Hyperlink |
| Mod-Shift-l | Remove Hyperlink |
| Mod-Shift-g | Fix Formatting Gaps |
| Mod-Shift-k | Clean Cutting Style |
| Mod-Shift-y | Sync Cutting Across Doc |
| Mod-Alt-, / Mod-Alt-. | Shrink / Restore Card Text |
| Mod-Alt-c | Create Card |
| Mod-Alt-t | Insert Table |
| Mod-Alt-ArrowUp / ArrowDown | Move Container Up / Down |
| Alt-a | Select Current Heading/Section |
| Mod-Alt-1 / 2 / 3 / 0 | Number role / Sub role / Restart / Show-hide numbers |

### Navigation, view, search

| Shortcut | Command |
|---|---|
| Mod-f / Mod-h | Find / Find and Replace |
| Mod-b | Doc Search |
| Mod-Shift-p | Command Search *(per tour text; registry entry has no default)* |
| Mod-Alt-n / Mod-Alt-m | Navigation panel / Comments panel |
| Mod-Shift-r / Mod-Shift-j / Mod-Shift-m | Read Mode / Judge Mode / Reading Marker |
| Mod-, | Open Settings |
| Mod-Alt-k | Keyboard Shortcuts |
| Mod-Alt-d | Cycle Theme |
| Mod-= / Mod-- / Mod-0 | Zoom In / Out / Reset |
| Mod-1 / 2 / 3 | Focus Pane 1 / 2 / 3 |
| Mod-Shift-t | Switch to Halcyon Flow |
| PageUp / PageDown | Previous / next structural heading |
| Shift-PageUp / Shift-PageDown | …extending the selection |

### Speech, comments, AI

| Shortcut | Command |
|---|---|
| `` ` `` | Send to Speech (at cursor) |
| Alt-`` ` `` | Send to Speech (at end) |
| Mod-Shift-c | Add Comment |
| Mod-Shift-e / Mod-Shift-n | Add Extension / Add Note |
| Mod-Shift-x | AI: Create Cite |
| Mod-Shift-a | AI: Format All Cites |
| Mod-Alt-r | AI: Repair Text |
| Mod-Alt-Shift-r | AI: Repair Formatting |

**User macros** — Settings → Keybindings also records text macros (`macros: []`, each `{shortcut, text}`), and
custom styles can each carry their own shortcut.

---

## 6. The styles system

### 6.1 Built-in style registry

Ten built-in styles (`Sm`), each mapped to a command id. `kind` distinguishes paragraph styles (applied to a whole
block, with an `outlineLevel`) from character styles (applied as a mark).

| id | Label | Command | kind | pt | bold | italic | underline | align | boxPt | color | outlineLevel |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `normal` | Normal | `structure.clearToNormal` | paragraph | 11 | – | – | none | left | 0 | auto | – |
| `pocket` | Pocket | `structure.pocket` | paragraph | 26 | ✓ | – | none | center | 3 | auto | 1 |
| `hat` | Hat | `structure.hat` | paragraph | 22 | ✓ | – | **double** | center | 0 | auto | 2 |
| `block` | Block | `structure.block` | paragraph | 16 | ✓ | – | single | center | 0 | auto | 3 |
| `tag` | Tag | `structure.tag` | paragraph | 13 | ✓ | – | none | left | 0 | auto | 4 |
| `analytic` | Analytic | `structure.analytic` | paragraph | 13 | ✓ | – | none | left | 0 | **accent1** | 4 |
| `cite` | Cite | `marks.cite` | character | 13 | ✓ | – | none | left | 0 | auto | – |
| `undertag` | Undertag | `structure.undertag` | paragraph | 12 | – | ✓ | none | left | 0 | **#548235** | – |
| `underline` | Underline | `marks.underline` | character | 11 | – | – | single | left | 0 | auto | – |
| `emphasis` | Emphasis | `marks.emphasis` | character | 11 | ✓ | – | single | left | **1** | auto | – |

Each carries a CSS `selector` used by the live style-registry stylesheet (`sd-style-registry`), e.g.
`pocket → ".ProseMirror p[data-sd-heading='1']"`, `cite → ".ProseMirror [data-mark='cite']"`.

Paragraph spacing (`xL`, points) and line-height multipliers (`aq`):

| id | space before | space after | line-height |
|---|---|---|---|
| normal | 0 | 8 | 1.5 |
| pocket | 8 | 0 | 1.3 |
| hat | 0 | 0 | 0.8 |
| block | 2 | 0 | 1.2 |
| tag / analytic | 2 | 0 | 1.2 |
| cite | 0 | 8 | 1.2 |
| undertag | 0 | 0 | 1.2 |
| underline / emphasis | 0 | 0 | (n/a) |

Fallback spacing `{before: 0, after: 8}`; fallback line-height 1.3.

### 6.2 Word style-id mapping

Paragraph styles (`Er`-adjacent map) and character styles (`CL`) carry the Word `w:styleId` used on export/import:

```
pocket   → Heading1        hat      → Heading2       block → Heading3   tag → Heading4
analytic → SDAnalytic  (outline 3, keepNext, keepLines, next:"SDAnalytic", uiPriority 5)
undertag → SDUndertag      cite_paragraph → SDCite    card_body → SDBody   paragraph → Normal

cite_mark      → Style13ptBold   ("Style 13 pt Bold", alias "Cite",      uiPriority 7)
underline_mark → SDUnderlineChar ("Style Underline",  alias "Underline", underline, uiPriority 8)
emphasis_mark  → Emphasis        (underline, uiPriority 9)
undertag_mark  → SDUndertagChar
analytic_mark  → SDAnalyticChar
```

`xq` is the set of styles Word treats as builtin (no `w:customStyle="1"` attribute):
`Normal, DefaultParagraphFont, Heading1..4, Emphasis, Hyperlink`. Accent-1 resolves to `1F3864`, `muted` to
`595959`, and the default link color constant is `0563C1`.

Import-side heuristics map Word styles back by name (`EL`): `/undertag/ → undertag`, `/analytic/ → analytic`,
`/cite/ → cite_paragraph`, `/pocket|heading\s*1\b/ → pocket`, `/hat|heading\s*2\b/ → hat`,
`/block|heading\s*3\b/ → block`, `/tag|heading\s*4\b/ → tag`, `/body|card/ → card_body`, else `paragraph`.
Character styles map via `/emphasis|emph|emphasize/`, `/undertag/`, … (`N1`).

### 6.3 User customization

- `styleOverrides: {}` — per-style partial overrides merged over the builtin (`vL`, `Un`).
- `customStyles: []` — named presets with size/weight/underline/color and an optional shortcut, rendered
  alongside the builtin style buttons.
- `autoExtendStyles: {}`.
- `enterChain` — per-style "New paragraph on Enter" target. Default:
  `{pocket:"normal", hat:"normal", block:"normal", tag:"normal", analytic:"analytic", undertag:"normal"}`.
  (Analytic chains to itself; everything else drops to body text.)
- `stylePreviewMode: "name"` — style-button rendering: `"name"` / `"compact"` /
  `Plain Name + Shortcut` / `Styled Name + Shortcut` / `Styled Shortcut`.

### 6.4 The styles snapshot protocol

`halcyon:report-styles` / `superflow:hal:getStyles` / `styles-snapshot.json` are one mechanism: Halcyon Docs
publishes its resolved style set so **Halcyon Flow can render pasted cards with identical typography**.

Payload builder (`mq`):

```js
{
  version:        <number>,        // see fingerprint below
  styles: [ { id, label, kind, commandId, sizePt, bold, italic, underline,
              align,               // null for character styles
              boxPt, color, spaceBeforePt, spaceAfterPt,
              lineHeight } ],      // null for character styles
  keymap: [ { key, commandId, styleId? } ],   // resolved shortcuts, overrides applied
  fontFamily,                      // default '"Times New Roman", Times, Georgia, serif'
  basePt,                          // default 11
  appearance,
  tokens,                          // design-token overrides
  overrideClasses: { hl: false, shading: false },
  hlPalette: {},
}
```

`version` is a cheap change-detector, not a semantic version:

```js
const h = (s) => { let e = 0; for (const c of s) e = (e * 31 + c.charCodeAt(0)) | 0; return e >>> 0; };
version = 1 * 1e6 + styles.length * 1e4 + ((h(styleDigest) ^ h(`${font}@${basePt}`) ^ h(appearanceJSON) ^ h(tokensJSON)) >>> 0) % 1e4;
```

The snapshot is persisted by the main process to `styles-snapshot.json` in `halcyon-data` and served to Flow
through `superflow:hal:stylesAtRest`, so Flow can style Halcyon content **even when Halcyon Docs is not running**.

The keymap portion covers all ten style commands plus a fixed extra list (`hq`): `marks.highlight`, `marks.bold`,
`marks.italic`, `marks.strikethrough`, `marks.superscript`, `marks.subscript`, `marks.emphasizeAcronym`,
`list.bullet`, `list.ordered`, `list.indent`, `list.outdent`, `align.left`, `align.center`, `align.right`.

---

## 7. The `.hal` format

### 7.1 Package layout (extends the known schema substantially)

A `.hal` is a DEFLATE-level-9 ZIP. The complete member map (`Ht`):

| Path | Contents | Written when |
|---|---|---|
| `manifest.json` | manifest (below) | always |
| `document.json` | ProseMirror doc JSON | always |
| `metadata.json` | `{title, createdAt, modifiedAt}` | always |
| `comments.json` | `{threads: […]}` | threads non-empty |
| `annotations.json` | `{byCard: {sid → {extensions, notes}}}` | non-empty **after GC** |
| `learn.json` | `{cards: […]}` (spaced-repetition data) | cards non-empty |
| `pinned.json` | `{sids: […]}` | sids non-empty |
| `quick-cards.json` | `{cards: […]}` | cards non-empty |
| `settings-snapshot.json` | per-document settings | non-empty |
| `editor-state.json` | editor/session state | non-empty |
| `history/autosave-info.json` | autosave bookkeeping | present |
| `indexes/search.json` | search index *(declared in `Ht.searchIndex`; **never written by the save path** — reserved)* | — |
| `media/<id>.<ext>` | image bytes, `compression: "STORE"` for png/jpg/gif/webp | per media |
| `icons/app-icon.png` | app icon, `STORE` | when `opts.appIconBytes` |

`annotations.json` is garbage-collected on every save: `QG()` walks the document collecting `card` `sid`s and drops
any `byCard` entry whose card no longer exists.

Media extension mapping: `png → .png`, `jpeg|jpg → .jpg`, `gif → .gif`, `svg → .svg`, `webp → .webp`, else `.bin`.
Already-compressed raster formats are stored uncompressed; SVG is deflated.

### 7.2 Manifest

```jsonc
{
  "formatName": "hal",
  "formatVersion": "1.0.0",
  "appName": "Halcyon Docs",
  "appVersion": "0.1.0",              // NOTE: internal bundle version, not the 1.0.4 product version
  "createdAt": "<ISO>", "modifiedAt": "<ISO>",
  "documentId": "doc_<24 chars>",
  "packageId":  "pkg_<24 chars>",     // regenerated per package
  "minimumCompatibleAppVersion": "…",
  "schemaVersion": 1,
  "featureFlags": {},
  "checksums": { "<zip path>": "<16 hex>" },
  "media": [ { id, contentType, filename, alt, width, height, checksum, path } ],
  "migrationHistory": [ { from, to, at } ],
  "migrationVersion": <optional, deletable>
}
```

### 7.3 Checksums — a doubled 32-bit FNV-1a variant

Not a real 64-bit hash. Two independent 32-bit FNV-1a-style accumulators run over the UTF-8 bytes and their hex is
concatenated:

```js
const FNV_PRIME = 16777619;
function hash16(bytes) {
  let a = 2166136261;     // 0x811C9DC5  (FNV offset basis)
  let b = -624069552;     // 0xDACD7450  (second, arbitrary basis)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    a = Math.imul(a ^ byte,                 FNV_PRIME) >>> 0;
    b = Math.imul(b ^ ((byte + i) & 255),   FNV_PRIME) >>> 0;   // second stream is index-salted
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
const checksum = (text) => hash16(new TextEncoder().encode(text));
```

The index salt `(byte + i) & 255` in the second stream is what makes the pair stronger than a plain doubled FNV
against transposition. It is an **integrity check, not a security primitive** — trivially forgeable.

**Verification policy on open is deliberately asymmetric:**

- `document.json` mismatch → **hard failure**, and the code is explicit that nothing is written:
  *"Invalid .hal: document.json failed its integrity check (checksum mismatch). The file may be corrupt or tampered
  and was NOT modified; recover it from a backup or autosave."*
- Every other member → **warning only**: `` `${path} failed its integrity check; it may have been edited outside Halcyon Docs.` ``
- `media/*` entries are skipped entirely during verification (their checksums are carried in the manifest media
  list but not re-validated on open).

Other open-path guards: empty-file detection with a cloud-storage hint (*"set it to 'Always keep on this device'"*),
a ZIP decompression-bomb limit (`oA`), a `formatName !== "hal"` rejection, and a
`minimumCompatibleAppVersion` forward-compat gate that refuses to open rather than risk data loss.

### 7.4 Migrations

`EJ()` implements a chained migration walker: while `formatVersion < CURRENT`, find a migration with matching
`from`, apply it, push `{from, to, at}` onto `migrationHistory`, and continue.

**The migration table is empty in this build** — `const _J=[];`. So the machinery exists and `migrationHistory` is
always `[]` in practice. Format version is `1.0.0` and has never been bumped.

### 7.5 The halWorker — save only

This corrects a reasonable prior assumption: `halWorker-DmERcIoA.js` is **not** the `.hal` reader and **not** a
search index. Its entire public surface is:

```js
const self_ = self, mediaCache = new Map();
self_.onmessage = (e) => {
  handleSave(e.data, mediaCache).then((r) =>
    self_.postMessage(r, r.kind === "done" ? [r.bytes.buffer] : []));
};
```

It contains a bundled JSZip, pako, the ProseMirror model (to re-serialize the doc), and the same `hash16`
(`ee=16777619`, identical seeds). Its job is to move ZIP compression off the main thread.

Its notable design detail is a **media byte cache with token validation**. The main thread sends `mediaRefs`
(id + token, no bytes) plus `newMedia` (id + token + bytes). The worker caches bytes by id and only reuses them if
the token matches; if any referenced media is missing it fails loudly rather than writing a corrupt package:

```js
if (missing.length) return { kind: "error", jobId, message: "Save worker is missing media bytes.", missingMedia: missing };
```

The main thread then retries with `sendAllMedia: true` (that flag exists on the job object `oJ`). Job dedup is
handled by `DI()`, which reuses an in-flight job only when package, `migrationVersion`, and icon presence all match.

Reading `.hal` (`AJ`), docx parsing, and everything else happen on the **main thread**.

---

## 8. Import / export

### 8.1 What exists

| Format | Import | Export |
|---|---|---|
| `.hal` | ✓ (native) | ✓ (`file.export.hal`, native save) |
| `.docx` | ✓ (full, style-aware) | ✓ (`file.export.docx`, **Mod-Shift-d**) |
| `.cmir` (CardMirror) | ✓ | ✓ (via Save As) |
| Plain text | ✓ (paste: `editing.pastePlain` F2, `edit.pasteCondense`) | clipboard only |
| HTML | ✓ (clipboard `text/html` via `parseDOM`) | clipboard only |
| **PDF** | ✗ | ✗ |

**There is no PDF path.** The only two occurrences of "PDF" in the bundle are prose — the cite prompt mentioning
"the PDF first page" and the manual describing "evidence pasted out of a PDF". No PDF library is bundled.
Likewise there is no HTML *file* export; `text/html` appears only in clipboard serialization.

### 8.2 `.docx` export — deliberately Verbatim-compatible

Written with JSZip. Parts emitted:

```
[Content_Types].xml
_rels/.rels
word/document.xml
word/_rels/document.xml.rels
word/styles.xml
word/settings.xml
word/_rels/settings.xml.rels
word/numbering.xml        (only if numbering used)
word/comments.xml         (only if comments used)
word/footnotes.xml        (only if footnotes exist)
word/endnotes.xml         (only if endnotes exist)
word/media/*
docProps/core.xml
docProps/custom.xml
```

Three pieces of evidence that Verbatim interop is an explicit goal:

1. **The export attaches Verbatim's Word template.** `word/settings.xml` emits `<w:attachedTemplate r:id="rId1"/>`
   and `word/_rels/settings.xml.rels` points that at:
   ```xml
   <Relationship Id="rId1"
     Type="…/attachedTemplate" Target="file:///Debate.dotm" TargetMode="External"/>
   ```
   `Debate.dotm` **is** Verbatim. A debater opening a Halcyon export on a machine with Verbatim installed gets
   Verbatim's ribbon and macros bound to the document.
2. **Style ids match Verbatim's conventions** — `Heading1..4` for Pocket/Hat/Block/Tag, and the `SD*` custom styles
   for the rest (§6.2), so Verbatim's own F-key macros act on the right paragraphs.
3. **Modern-format output, not compat mode.** `<w:compatSetting w:name="compatibilityMode" w:val="15"/>` (Word
   2013+). Manual: *"Exports open as modern Word documents, with no 'Compatibility Mode' banner and no 'Convert'
   prompt, so comments show in the margin and the layout does not reflow when the reader saves."*

Round-trip identity is preserved through `docProps/custom.xml`:

```xml
<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="SuperdocsDocumentId">
  <vt:lpwstr>doc_…</vt:lpwstr>
</property>
```
read back on import by `iQ()` with a `^[A-Za-z0-9_-]{1,128}$` guard.

Fidelity details: run properties emit `w:b/w:bCs`, `w:i/w:iCs`, `w:color`, `w:sz/w:szCs` (half-points), `w:u`, and
for boxed character styles `w:bdr` with `w:sz = boxPt*8` (eighths of a point). Paragraph properties emit
`w:keepNext`, `w:keepLines`, `w:pageBreakBefore`, `w:widowControl`, `w:pBdr` (four sides for boxed paragraph
styles), and `w:spacing` in twentieths of a point (`P1 = pt => Math.round(pt*20)`). Bold is only emitted for
structural styles (`Eq = {pocket, hat, block, tag, analytic, cite}`). Numbering export produces real editable Word
numbering (9 levels, `w:ind` left `720 + i*720`, hanging 360, `Symbol` font for bullets).

**Export document types** (the Export dialog):

| Type | Contents |
|---|---|
| **Regular document** | *"The full document as written, including all evidence, analytics, and undertags."* |
| **Send document** | *"A copy to share: omits analytics and underlining tags by default."* |
| **Read document** | *"A briefed copy: keeps only structure, cites, and highlighted (read-aloud) text."* |

with independent `Include` toggles (Analytics, Undertags, …). Reading-marker "unread" tinting is carried into the
Word export.

### 8.3 `.docx` import

Entry point `xd()`. Reads `word/document.xml` (hard requirement — *"Not a valid .docx: word/document.xml missing."*),
then `styles.xml`, `numbering.xml`, `_rels/document.xml.rels`, `comments.xml`, `footnotes.xml`, `endnotes.xml` and
their rels. Parsing is via `fast-xml-parser`.

Recognized WordprocessingML vocabulary (from the string table) is broad: `w:p`, `w:r`, `w:rPr`, `w:pPr`, `w:pStyle`,
`w:rStyle`, `w:highlight`, `w:shd`, `w:color`, `w:sz`, `w:szCs`, `w:u`, `w:strike`, `w:vertAlign`, `w:bdr`,
`w:pBdr`, `w:ind`, `w:jc`, `w:spacing`, `w:numPr`/`w:ilvl`/`w:numId`, `w:tbl`/`w:tr`/`w:tc`/`w:tcPr`/`w:gridSpan`,
`w:hyperlink`, `w:drawing` + `wp:anchor`/`wp:extent`/`wp:posOffset`/`wp:positionH`/`wp:positionV`,
`a:blip`/`a:xfrm`/`a:alphaModFix`, `w:footnoteReference`/`w:endnoteReference`,
`w:commentRangeStart`/`End`/`w:commentReference`, `w:ins`/`w:del`/`w:moveFrom`/`w:moveTo`,
and OMML math (`m:oMath`, `m:sSub`, `m:sSup`, `m:sSubSup`).

Manual: *"Word import understands debate formatting: bold-over-underline and boxed styles arrive as Emphasis,
highlights and shading come through separately, and equations stay editable. Imported tables with rows of unequal
width are padded to a rectangle."*

Round-trip preservation hooks: `table.rawTblPr` and `table_cell.rawTcPr` keep the original `w:tblPr`/`w:tcPr`
blobs, and `shading.prevHl` remembers a highlight that was converted to shading.

### 8.4 CardMirror `.cmir`

Full read/write. `.cmir` files are treated as first-class library documents (open, Recent list, `Ctrl+S` keeps the
extension, Save As can switch to `.hal`/`.docx`). Error strings confirm structural validation:
`"Not a CardMirror file: expected a document object."`, `"This CardMirror file is missing its document contents."`,
`"This CardMirror file is missing its format version."`.

Export to `.cmir` is lossy in named, user-visible ways — the app emits explicit warnings:

- `"A block image was placed in its own paragraph on export to CardMirror."`
- `"A link title was dropped on export to CardMirror."`
- `"A table width was dropped on export to CardMirror."`
- `"A system comment was exported to CardMirror as a human comment."`
- `"An image without embeddable data was dropped on export to CardMirror."`
- `"Read-mode markers were dropped on export to CardMirror."`
- `"Table column widths from CardMirror were not preserved."` (import direction)
- `"Footnote formatting was flattened to plain text on import."`
- `"Some linked-copy source metadata was simplified on import."`
- CardMirror's read-only linked sections import as ordinary editable content.

### 8.5 Bulk conversion, wiki, library optimize

- **Convert** (`workspace.convertDocuments`) — two modes: *Doc Convert* (pick files) and *Folder Convert*
  (recursive). Destination options: `.hal` beside each original / each in its own folder / one chosen folder;
  folder-structure options `Keep the folder structure` vs `Put every file in one folder`; plus a guarded
  "convert then move originals to the Recycle Bin" mode (failed conversions are always kept).
- **Create Wiki** (`workspace.createWiki`) — compiles selected speech docs into `Wiki---[Tournament] [Round].docx`.
- **Optimize Library** (`workspace.optimizeLibrary`) — re-packs `.hal` files in place to reclaim space.
  Desktop-only (`"Library optimization is only available in the desktop app."`).

### 8.6 Save safety net

`halcyon:write-file-checked` backs a "File Changed on Disk" reconciliation flow (`Keep both` / `Overwrite` /
`Keep existing` / `Reload this document`). Other guarded states: `"Could not save because the file is locked by
another app."`, `"The original file is missing. Choose a new location to save it."`, and
`"Only the host can save this shared room document."`.

---

## 9. Search

Four distinct search surfaces:

### 9.1 Find / Find & Replace (in-document)

`Mod-f` / `Mod-h`. Filters: match case, whole word, and element kind (`POC/HAT/BLK/CARD/TAG/AN/BODY`).
Normalization: curly and straight quotes are equivalent, and en dash / em dash / hyphen match each other.
Replace All is one undo step and reports a count; replacements inherit the formatting of the text they replace.
Decorations: `.sd-find-match` / `.sd-find-current`. Hidden in Read and Judge mode (it is an editing surface).
`rememberLastQuery: true` persists the last query.

### 9.2 Doc Search (cross-document evidence picker)

`Mod-b`. *"lists Halcyon, Word, and CardMirror documents from your search folders so you can copy a block, card, or
section into the current document or your speech document."*

- Roots: `fileSearchRoots: []`; extensions `[".hal", ".docx", ".cmir"]`; toggles `docSearchIncludeDocx`,
  `docSearchIncludeCmir`; `fileSearchFormats: "both"`.
- Targets: `docSearchTarget: "current"`, `docSearchPosition: "cursor"` (`Insert at cursor` / `Insert at end`).
- Result actions: `Insert`, `Pin to top`, `Open At` (*"Open At works with .hal and CardMirror documents"*).
- Pins carry the same type chips; `searchPins` in the store, ids `spin_…`.
- `searchTieBreak: "recency" | "alphabetical"`, cycled by `search.cycleTieBreak`.
- Honest scale limits rather than silent truncation:
  `"This folder holds more files than one search can list."`,
  `"Some folders are nested deeper than this search reaches."`

### 9.3 Folder / File Search

`search.folders` — by name or by content (`By name` / `By content`), scoped with `In: folder`. This is also the
fallback when `Mod-f` is pressed on the dashboard (`openFind()` redirects to `folderSearchOpen`).

### 9.4 Command Search

`view.commandSearch` — palette over the 147-command registry, filtering by label, alias, or category, showing each
row's category and *current* shortcut (rebinds included). Rows needing an open document are dimmed.
Settings have their own parallel registry (130 entries, §17) searched the same way.

### 9.5 Indexing infrastructure

- **`library:list` / `library:status` / `library:updated`** — the main process maintains `library-index.json` in
  `halcyon-data` and pushes updates to the renderer. This is the dashboard's "automatic library scan":
  *"when you pick a Working Folder, every .hal, .docx, and .cmir already inside it (sub-folders included) appears
  on the dashboard; nothing has to be opened first."*
- **`halcyon:external-scan` / `halcyon:external-scan-done:<id>`** — an *inbound* request channel. The main process
  asks the **running renderer** to scan its open document and reply; the renderer registers
  `onExternalScan(cb)` and answers with `respondExternalScan(id, result)`. This is how Halcyon Flow's
  `superflow:hal:scan` reaches live document state that is not on disk. Symmetrically,
  `halcyon:external-insert` / `-done:<id>` lets an external app insert content into the live document.
- **`indexes/search.json`** — reserved in the `.hal` member map but never written by this build.

---

## 10. AI features

Off by default (`aiEnabled: false`). Uses `@anthropic-ai/sdk` directly from the renderer with
`new Anthropic({ apiKey, dangerouslyAllowBrowser: true })` against `https://api.anthropic.com`.

### 10.1 Key supply

The API key is **user-supplied and stored in app settings**: `anthropicApiKey: ""`, edited in
Settings → Editing → "AI (opt-in)" → "Anthropic API Key". Optional `aiModelOverride` ("Claude Model") and a
user-editable `aiCitePrompt`. The bundle also carries the SDK's stock env-var names (`ANTHROPIC_API_KEY`, etc.)
but those are inert library code in a renderer context. There is also a server-side lease concept in the store
(`aiLease`, `aiLeaseBypass`) — **[INFERENCE]** likely an entitlement/quota check tied to the Halcyon subscription.

Every AI command double-gates:
```
"Enable AI features in Settings to use <X>."      // aiEnabled false
"Add your Anthropic API key in Settings to use <X>."  // key missing
```

### 10.2 Commands

| Command | Label | Shortcut |
|---|---|---|
| `ai.createCite` | AI: Create Cite | Mod-Shift-x |
| `ai.createAllCites` | AI: Format All Cites | Mod-Shift-a |
| `ai.repairText` | AI: Repair Text | Mod-Alt-r |
| `ai.repairFormatting` | AI: Repair Formatting | Mod-Alt-Shift-r |
| `ai.altText` | AI: Write Alt Text | — |
| `ai.tableFromImage` | AI: Convert Image to Table | — |
| `ai.askSelection` | Ask AI | — |
| `ai.translateSelection` | Translate Selection | — |

Concurrency is managed by a per-region lock (`Dc()`): *"Another AI request is using this text – wait for it to
finish."* A cancellable progress pill renders over the region (`.sd-cite-progress`, `ai-locked-flash`).

### 10.3 Prompts found in the bundle

**Cite Creator** (`AH`, ~4 KB, the default for the user-overridable `aiCitePrompt`). Uses the
`web_search_20260209` server tool, `max_tokens: 4096`, up to 8 `pause_turn` continuation rounds, and a 180 s
timeout. Excerpt:

> `Today's date is ${…}.`
> `Cite Creator's role is to transform source information into proper citations.`
> `Follow this structure for the citation: Authors + Date + Title (Standalone or Chapter/Section of Book/Publication) + Source (Book Title, Publisher/Source Institution, then Pagination) + URL/doi (if applicable).`
> `Begin each citation with the first author's full name, followed by a two-digit year identifier and a comma (e.g., John Smith 23,)… The last name of the author and the year identifier should be set to the 'Cite' style (i.e. "Smith 23" is set to Cite, not "Smith 23,").`
> `BEFORE writing the citation, you MUST determine the COMPLETE list of the source's authors… Count ONLY authors – do NOT count editors, translators, reviewers, or series editors…`
> `- ONE author: … - EXACTLY TWO authors: … - THREE OR MORE authors: write ONLY the first author … then a bolded "et al." in place of ALL the other authors.`
> `List degrees in the order of B.A./B.S., M.A./M.S., J.D./Ph.D. … "D.Phil" should be called "Ph.D." and "M.Phil" should be called "M.A."`

Batch mode wraps sources with index markers: `` `Format the following ${n} citation source(s)… Each source is prefixed with its index [n]; put that index in the matching [[CITE n]] block.` ``

**Repair Text (OCR):**
> `You repair mechanical text-extraction damage (OCR, PDF copy/paste)… Find ONLY these artifact classes: dropped or mangled ligatures (e.g. "e ect" or "eect" for "effect"…); rn/m confusion (e.g. "modem" that should clearly be "modern"); mid-word hyphenation left over from line breaks ("cli- mate" for "climate"); run-together words missing their space ("thegovernment"); stray spaces or stray punctuation… NEVER reword, paraphrase, fix grammar, fix the author's own spelling, change capitalization, or alter meaning in any way… Respond with a JSON array ONLY… {"before": …, "after": …, "context": …}`

**Repair Formatting:**
> `You are repairing the formatting of ONE debate evidence card… Imported cards often mark their READ portions with ad-hoc presentation formatting (bold, italics, a manual underline, font sizes) instead of the editor's semantic character styles… reply with ONLY a JSON array of mapping rules: [{"pattern":"…","target":"…"}]. "pattern" is one of: "bold", "italic", "bold+underline", "directUnderline", "sizeAtLeast:<n>", "sizeAtMost:<n>". "target" is one of: "underline", "emphasis", "none"… The editor applies your rules mechanically and never changes text, colors, sizes, highlighting, or shading.`

This is a notably safe design: the model returns *rules*, not text, and the editor applies them deterministically.

**Table from Image** (`sge`, `max_tokens: 8192`, user turn `"Transcribe the table in this image."`):
> `You convert a picture of a table into structured data… Reply with ONLY a JSON object: {"rows": [["cell", …], …], "headerRow": true|false}… If the image does not show a table, reply with exactly {"table": false}.`

The parsed result is converted into real `table`/`table_row`/`table_header`/`table_cell` nodes and inserted after
the image (the image is kept).

**Ask AI — two system prompts.** Whole-document:
> `You are a research assistant inside a debate-evidence editor. Answer the user's question using the whole document supplied as context, drawing on any relevant part of it – not just the focus passage… If the document does not address the question, say so. Plain text only – no markdown headings.`

In-comment-thread (`@AI`):
> `You are a research assistant inside a debate-evidence editor, replying inside a comment thread. The first message carries the document context: the passage the thread is anchored to and the card around it. Answer the newest question using that context and the thread so far…`

Answers land as comment threads, *never* as document text — `"Ask AI: answer added to Comments."` AI replies carry
a chip; with AI off, `@AI` is inert text.

### 10.4 Translation (works without a key)

`ai.translateSelection` with `translateBackend: "auto" | "anthropic" | "mymemory"`. `auto` uses Anthropic when AI is
enabled and a key is present, else falls back to the keyless **MyMemory** HTTP service (text chunked to ~450 chars
on sentence boundaries). Source language is auto-detected (`franc-min`). The translation is inserted beneath the
original as one undo step, with an engine label header when `translateMarker: true`
(`"Label Translations with Their Engine"`). ~28 target languages are mapped to ISO codes.

### 10.5 Models

Model list includes `claude-opus-4-*`, `claude-sonnet-4-*`, `claude-3-7-sonnet-*`, `claude-3-5-haiku-*`, plus
Bedrock-style ids. Beta headers present: `web_search_20260209`, `files-api-2025-04-14`,
`structured-outputs-2025-12-15`, `skills-2025-10-02`, `token-counting-2024-11-01`, `oauth-2025-04-20`.
`anthropic-dangerous-direct-browser-access` is set.

---

## 11. Gmail integration — "Email Chain"

Channels: `halcyon:gmail-link`, `-unlink`, `-status`, `-list-threads`, `-send`. Renderer bridge:
`linkGmail()`, `unlinkGmail()`, `gmailStatus()`, `gmailListThreads()`, `gmailSend()`. UI state `emailChainOpen`.

**Purpose.** This is the debate **email chain** — the ritual in which teams email their speech documents to the
opponents and judge during a round, replying to one thread. Supporting evidence: the compose UI has
`Attach Current Document`, `Attach a document first.`, `Attachments are limited to 10 MB total.`,
`Add to send field`, `Tournament`, `Round Number`, `Please reply to the thread above.`, and
`emailTournamentSuggestions: []`.

**OAuth flow.** The credential dance lives entirely in the main process (`docs/electron/gmail.jsc`, which imports
`node:crypto`, `node:http`, `node:https`, `node:url`). The `node:http` server plus the main-process
`auth-callback` / `get-pending-auth-url` channels and the preload `halcyonAuth.onCallback` indicate a **loopback
redirect OAuth 2.0 flow with PKCE** — the standard, and the only correct, pattern for a desktop app.
`node:crypto` is consistent with PKCE verifier/challenge generation. The client id is user-configurable
(`emailGmailClientId: ""`), so users can supply their own Google Cloud OAuth client. Tokens are held by the main
process and persisted through `secure-store-set`/`-get`/`-clear`; the renderer never sees them. The module carries
dry-run fixtures (`dryrun-access`, `dryrun-refresh`, `dryrun-sent`, `dry-thread-1`) for testing without live
credentials.

**[INFERENCE]** — PKCE specifically, and the exact scopes (presumably `gmail.send` + `gmail.readonly` or
`gmail.modify`), are not verifiable from the renderer bundle; they are in main-process bytecode.

Desktop-only: `"Email Chain needs the desktop app."`

---

## 12. Card sharing — end-to-end encrypted

Suite string from main-process bytecode: `x25519-hkdf-sha256-aes256gcm`, with domain separators
`halcyon-card-share-v1` and `halcyon-card-share-salt-v1`, and cipher `aes-256-gcm` (`node:crypto`).
This is **HPKE-shaped**: X25519 ECDH → HKDF-SHA256 (with those labels) → AES-256-GCM.

### 12.1 Key management

Crypto is main-process-only, exposed as `globalThis.halcyonCardShare` with
`ensureKeypair`, `getPublicKey`, `regenerateKeypair`, `fingerprint`, `seal`, `open`.
The renderer never touches private key material:

```js
function requireCardShare() {
  const t = globalThis.halcyonCardShare;
  if (!t) throw new Error("Card Sharing is only available in the desktop app.");
  return t;
}
```

Per-device identity: `halcyon.cardshare.deviceId` in localStorage, upgraded to a hardware-backed id via
`window.halcyonDeviceIdentity.resolve()` (validated `^[A-Za-z0-9_.-]{1,64}$`), else `dev_<random>`.
Public keys are published per device: `POST /cardshare/publish-key {deviceId, pubkey, keyVersion}`.
Because a user may have several devices, sends are **multi-recipient**: the sender fetches *all* of the
recipient's device keys and seals to the whole set.

### 12.2 TOFU pinning

Pins live at `halcyon.cardshare.pins` (per-account namespaced):
`{ [username]: { username, publicKeys[], fingerprints[], pinnedAt } }`.
Comparison is order-insensitive (`[...keys].sort().join("|")`) and yields `"new" | "unchanged" | "changed"`.
On change the UI warns `"This contact's keys changed."` / `"The encryption keys for …"` and requires
`"Trust new keys and send"`. Fingerprints are computed in the main process (`fingerprint(pubkey)`).

### 12.3 Send / receive

```js
// Cards / tags / blocks / analytics, sent inline
const aad  = { recipient: username, v: 1, ts: Date.now() };   // authenticated, replay-relevant
const blob = await cardShare.seal(recipientPubkeys, JSON.stringify(payload), aad);
await api.send(username, blob);
pinKeys(username, recipientPubkeys, fingerprints);
```

Limits: inline payload ≤ **8 MiB** and ≤ **200 items**; attached documents ≤ **25 MiB**; poll interval 60 s.
Attached whole documents reuse the same `seal()` with `blob.kind` set to the document kind.
Receiving is `cardShare.open(blob)` → JSON parse → validate.

Server replay protection is evidenced by `"Message timestamp too new"` / `"Message timestamp too old"` — the `ts`
in the AAD is bounded.

### 12.4 Transport API

All under the auth base `https://app.halcyondebate.org/auth` with `Authorization: Bearer <token>` and automatic
401 → refresh → retry:

| Endpoint | Method | Purpose |
|---|---|---|
| `/cardshare/publish-key` | POST | publish this device's public key |
| `/cardshare/key/{username}` | GET | fetch a recipient's device keys |
| `/cardshare/send` | POST | `{recipientUsername, blob}` |
| `/cardshare/inbox` | GET | sealed messages |
| `/cardshare/inbox/count` | GET | badge count |
| `/cardshare/ack` | POST | `{ids}` — delete after retrieval |
| `/cardshare/contacts` | GET | contact list |
| `/cardshare/contacts/request` | POST | request a contact |
| `/cardshare/contacts/respond` | POST | `{username, accept}` |
| `/cardshare/contacts/{username}` | DELETE | remove |

The server sees only ciphertext blobs and routing metadata.

### 12.5 UX

"Messaging" (`share.inbox`). Send scope: `Use current selection` / `Choose content` / `Entire document` /
`Attach document`. Contacts are mutual — *"Adding sends a request. They become a contact once they accept."*
Receive filters (Settings → Card Sharing): `receiveCards`, `receiveBlocks`, `receiveAnalytics`, `autoPinReceived`.
Inbox actions: `Insert` (card bundles), `Save` / `Open` (documents), `Discard`.

---

## 13. Collaboration (Yjs)

- **Transport**: `y-websocket` bundled inline; default endpoint `wss://app.halcyondebate.org/collab`
  (`VITE_COLLAB_URL`). The y-websocket message types are present: `0` sync, `1` awareness, `2` auth,
  `3` queryAwareness, plus custom room-control codes (end-room, duplicate-session, kick).
  Reconnect uses exponential backoff, resets on `window online`, and heartbeat is 30 s.
- **Binding**: `y-prosemirror` — `ySyncPlugin(doc.getXmlFragment(...))`, `yCursorPlugin(awareness)`,
  `yUndoPlugin`, and a keymap override so undo/redo are collaboration-aware:
  `{"Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo}`.
- **Presence**: awareness-driven remote cursors (`ProseMirror-yjs-cursor`, `ProseMirror-yjs-selection`,
  `sd-remote-cursors-style`). Participants get generated animal-name handles from
  `["Falcon","Otter","Maple","Cobalt","Ember","Quartz","Willow","Cedar","Onyx","Sage"]` + a 3-digit number, and one
  of 8 palette colors. Card-level presence: *"while a collaborator's cursor is inside a card, that card shows their
  name with a pencil… Nothing is locked: everyone's edits merge live."* (`sdCardLock`, `peerCardLock`).
- **Roles**: `owner | editor | viewer`, with `rh = r => r==="owner"||r==="editor"` gating `props.editable` and a
  `filterTransaction` that rejects doc-changing transactions from viewers. `guestRole` sets the default for
  joiners; per-peer overrides via `roleOverrides`.
- **Room ids**: 16 chars from the unambiguous alphabet `abcdefghjkmnpqrstuvwxyz23456789` (no `i/l/o/0/1`), matched
  by `^[A-Za-z0-9_-]{8,128}$`, and parseable out of a join link (trailing segment after `/` or `=`).
- **Host privileges**: `"Only the host can save this shared room document."`,
  `"Only the host can export this shared room document."`, `End session for everyone` vs `Leave session`.
- **Single-session enforcement**: `"This account is already in the room on another window or device."`
- **Status UI**: per-pane footer `Synced` / `Sending` / `Offline` with one presence dot per participant; only the
  shared pane shows collaboration status. A `LIVE` chip marks the document.
- **Certificate pinning**: `VITE_SERVER_CERT_SHA256 = "sha256/RPzXXba1cHpFu4hCmxEBNoVe8XSk7/NWwK4h7I+LGHo="`,
  enforced by the main process (`docs/electron/certPin.jsc`).
- Self-assessed maturity: *"Co-editing is experimental – keep saving your own copies while using a room."*

---

## 14. Halcyon Flow integration

Two apps, one suite. The protocol is bidirectional and has both a live path and an at-rest path.

### 14.1 Docs → Flow (outbound)

| Channel | Bridge method | Purpose |
|---|---|---|
| `halcyon:detect-flow` | `detectFlow()` | → `{running: boolean, port: number \| null}` |
| `halcyon:set-flow-port` | `setFlowPort(n)` | pin the loopback port; `flowConnectionPort: 0` = auto-detect |
| `halcyon:send-to-flow` | `sendToFlow(payload)` | push a card/block/analytic into Flow's selected cell |
| `halcyon:switch-to-flow` | `switchToFlow()` | focus the Flow window (`Mod-Shift-t`) |

Transport is a **localhost HTTP server** — Flow runs `node:http` in `flow-connect-server.jsc` advertising
`halcyon-flow`, and Docs runs one in `connect-server.jsc` advertising `halcyon-docs`. Each app discovers the other
by probing loopback ports, with a manual override in Settings that live-reports
`Connected on port <n>` / `Not detected`.

**Payload shape** (built by `CD`, minified) — a normalized, app-neutral item rather than raw ProseMirror:

```jsonc
// card
{ "kind": "card" | "tag", "text": "<tag text>", "body": "…", "bodyParagraphs": [...],
  "node": <ProseMirror JSON>, "extensions": [...], "notes": [...],
  "numbering": {...}, "sourcePath": "…", "nodeId": "<sid>", /* + cite fields */ }
// analytic
{ "kind": "analytic", "text": "…", "node": …, "numbering": … }
// block (a heading plus everything under it)
{ "kind": "block", "title": "…", "headingNode": …,
  "children": [ {kind:"card"|"tag"|"analytic"|"text"|"image", …}, … ] }
```

Card numbering is rendered into the payload using the sender's display settings (`showCardNumbers`,
`cardNumberFormat`, `cardSubFormat`, `capitalizeCardSubs`). Result reporting distinguishes *placed*, *held until a
round is open*, and *not readable*.

### 14.2 Flow → Docs (inbound)

Flow's preload exposes a `superflow` namespace; the main process (`superflow-ipc.jsc`) targets `halcyon-docs`:

| Flow channel | Reaches Docs as | Purpose |
|---|---|---|
| `superflow:listHalFiles` / `chooseBlockFolder` | — | enumerate the library |
| `superflow:getHalOutline` / `getHalOutlines` | — | read outlines from `.hal` on disk |
| `superflow:indexBlocks` / `searchBlocks` | — | index/search blocks across files |
| `superflow:hal:probe` / `autodetect` | `halcyon:detect-flow` (mirror) | is Docs running, on what port |
| `superflow:hal:listDocuments` | `halcyon:report-open-docs` | which documents Docs currently has open |
| `superflow:hal:scan` | **`halcyon:external-scan`** → `respondExternalScan` | scan the *live* open document |
| `superflow:hal:sendItems` | **`halcyon:external-insert`** → `respondExternalInsert` | insert content into the live document |
| `superflow:hal:openAt` | `halcyon:route-open-document` | open a document and jump to an element |
| `superflow:hal:getStyles` | `halcyon:report-styles` | live style snapshot |
| `superflow:hal:stylesAtRest` | `styles-snapshot.json` | style snapshot when Docs is **not** running |
| `superflow:hal:switchToDocs` | — | focus the Docs window |
| `superflow:readDocxBytes` | — | let Flow read `.docx` bytes |

The `-done:<id>` suffix on `halcyon:external-scan-done:` / `halcyon:external-insert-done:` is a per-request
correlation id, so multiple in-flight requests can be matched to their replies.

### 14.3 Shared state (`halcyon-shared`)

A third channel family, implemented identically in both apps (`halcyon-shared.jsc`), backed by files in a shared
`halcyon-data` directory with change notifications:

| Data | Read / Write / Change |
|---|---|
| Working folder | `halcyon:folder-read` / `-write` / `-changed` |
| Personal info (name, school, code, notes) | `halcyon:personal-read` / `-write` / `-changed` |
| Readers (name + WPM) | `halcyon:readers-read` / `-write` / `-changed` |
| Round timer | `halcyon:timer-read` / `-write` / `-changed` |
| Device identity | `halcyon:device-id-resolve` |

Manual: *"your readers follow you across the Halcyon apps… editing the list in either app updates the other on its
own"*, and the timer is *"shared live with Halcyon Flow."* The timer can also be popped out into its own
always-on-top window (`halcyon:timer-popout-open/-close/-state/-changed`).

Session coupling: *"One account can run Halcyon Docs and Halcyon Flow together on this device, while another device
is blocked until both app sessions here have signed out."*

---

## 15. Writing aids

### 15.1 Spellcheck (`nspell` + `dictionary-en`)

`spellcheck: true`. Rendered as `.sd-misspelled` — wavy underline, `--sd-spell-color` (default `#e03131`),
thickness `--sd-ul-w`, `text-decoration-skip-ink:none`. Right-click gives suggestions (`sd-spell-menu`),
`Add to Dictionary` (persisted at `halcyon:user-dictionary`), and `Ignore`.

The domain-tuning is the interesting part (manual): *"It understands debate writing: cite lines are never flagged,
ALL-CAPS initialisms and tokens with digits (2NC, 7.6%) are skipped, hyphen or slash joined parts are checked
separately, and words from your tags, headings, and acronym phrases are trusted throughout the document."*
Also `Change All`, `ignoreWords`.

### 15.2 Language detection

`franc-min` is a dependency; the detected source language feeds the translation header
(`"an unspecified language"` is the fallback string). ~130 language display names are bundled.

### 15.3 Word count and read time

- Status bar carries a live word count; `liveSelectionWordCount: false` adds a selection count
  (`"words selected"`).
- **Read time**: `readers: [{id:"reader_default", name:"Reader", wpm:300}]`, `readerWpm: 300`. Multiple readers are
  supported and each gets a named estimate. Shown only in the navigation panel (`readTimeOnCardHover: true`);
  card rows show their own time, block rows the aggregate. Text marked with `insert_mark` (Create Reference) or
  gray highlighting is excluded. Readers sync with Halcyon Flow.

### 15.4 Typing aids

| Setting | Default | Behaviour |
|---|---|---|
| `smartQuotes` | `false` | curls straight quotes while typing |
| `customAutocorrect` | `[]` | source→replacement pairs, fired on punctuation/whitespace; duplicate sources refused |
| `autoCapitalizeTagsAnalytics` | `false` | capitalizes sentence starts in Tag/Analytic text, leaving abbreviations, initials and enumerations alone |
| `customDash` + `dashChar` + `dashSpaced` | `false`, `"em"`, `false` | `--`/`---` → en/em dash |

One Backspace immediately after a typing-aid change restores exactly what was typed.
`marks.flipQuotes` flips every curly quote in the selection.

### 15.5 Acronym marking

`acronymPhrases: []` — per-phrase exact letter picks: *"type the phrase, click its letters, and whenever your
selection equals that phrase all three commands mark exactly those letters."* Drives
`marks.emphasizeAcronym` / `highlightAcronym` / `underlineAcronym`.

### 15.6 Other aids

`autoBridgeFormattingGaps: true` + `formattingGapClass: "both"` — automatically bridges whitespace/punctuation
gaps between marked runs so highlighting and underlining read as continuous. `fixOvershrink: true` repairs
undersized text. `sdEmphasisBridge`, `sdHlStream` (the highlight height-matching engine), `sdLineFit`,
`sdWordSnap`, `sdPilcrowCue`, `sdFootnoteNumbers`, `sdListMarkers`, `sdStableId` are the plugin names behind these.

---

## 16. Theming and design tokens

### 16.1 Theme modes

`theme: "light" | "dark" | "system"` (system reads `prefers-color-scheme`), cycled with `Mod-Alt-d`.
`themeAffectsCanvas: true` decides whether the document page follows the app theme or stays white.

### 16.2 UI token palettes (exact)

```js
const light = {
  bg:"#ffffff", surface:"#f5f5f5", surfaceAlt:"#ebebeb", hover:"#f0f0f0",
  active:"#dbeafe", selection:"#bfdbfe", border:"#e0e0e0", borderSubtle:"#eeeeee",
  text:"#111111", textMuted:"#6a6a6a", textDim:"#bbbbbb", input:"#f5f5f5",
  danger:"#b91c1c", success:"#065f46", warning:"#b45309",
  activeDoc:"#ca8a04", live:"#16a34a", caret:"#000000",
};
const dark = {
  bg:"#0a0a0a", surface:"#111111", surfaceAlt:"#1a1a1a", hover:"#161616",
  active:"#1a2a3a", selection:"#1e3a5f", border:"#222222", borderSubtle:"#171717",
  text:"#e0e0e0", textMuted:"#888888", textDim:"#444444", input:"#1a1a1a",
  danger:"#ef4444", success:"#34d399", warning:"#f59e0b",
  activeDoc:"#eab308", live:"#22c55e", caret:"#ffffff",
};
```

Default accent `#5b8cff` ("Reset to Halcyon Blue"). Every token above is user-overridable via
`uiColorOverrides` (Settings → Accessibility → Interface Colors), grouped as:

| Group | Tokens (label) |
|---|---|
| Surfaces | App Background, Panel / Toolbar Surface, Raised Surface, Hover Surface, Active / Selected Surface, Input Field Background |
| Borders | Border, Subtle Border |
| Text | Primary Text, Secondary / Muted Text, Dim / Faint Text, Text Caret |
| Accents & Status | UI Selection, Danger / Error, Success, Live Document Marker, Split Screen Active Document |
| Document Canvas | Page Background, Page Margin / Scroll Area, Document Text, Document Muted Text, Document Border, Analytic / Accent 1, Hyperlink, Spellcheck Underline, Find Match Highlight, Card Number, Live View / Linked Copy Rail, Linked Copy Changed |
| Scrollbar | Scrollbar Color |

### 16.3 UI styles (chrome skins)

`uiStyle: "studio" | "paper" | "console" | "minecraft"` (default `studio`; Minecraft ships a background asset
`minecraft-background-V0u2tbdL.png`). Each defines `radius`, `cardRadius`, `toolbarHeight` (44), `tabHeight` (34),
`statusHeight` (22), `buttonPadding`, `buttonBg`, `buttonBorder`, `buttonShadow`, `toolbarBg`, `fontFamily`.
`iconStyle: "modern" | "classic"`.

### 16.4 Document CSS custom properties (reproduced exactly from `index-DGbCrDfI.css`)

```css
:root{
  --sd-doc-bg: #ffffff;
  --sd-doc-scroll-bg: #eef0f3;
  --sd-doc-text: #111111;
  --sd-emphasis-box: #333333;
  --sd-doc-muted: #6b7178;
  --sd-card-number: #6b7178;
  --sd-doc-border: #d7dade;
  --sd-accent1: #1f3864;
  --sd-transclusion-rail: #5277b8;
  --sd-copy-diverged: #b42318;
  --sd-doc-selection: rgba(53, 122, 232, .32);
  --sd-body-font: "Times New Roman", Times, Georgia, serif;
  --sd-line-height: 1.242;
  --sd-hl-extend: 0px;
  --sd-list-indent: 1.8em;
  --sd-fill-fg-light: #ffffff;
  --sd-fill-fg-dark: #111111;
}
.sd-doc-dark{
  --sd-doc-bg: #15171c;
  --sd-doc-scroll-bg: #0c0d10;
  --sd-doc-text: #e0e0e0;
  --sd-emphasis-box: #888888;
  --sd-doc-muted: #888888;
  --sd-card-number: #888888;
  --sd-doc-border: #2a2e36;
  --sd-accent1: #9db8ff;
  --sd-transclusion-rail: #8aa9df;
  --sd-copy-diverged: #ff8a80;
  --sd-doc-selection: rgba(120, 170, 255, .36);
  --sd-fill-fg-light: #e0e0e0;
}
:root{
  --sd-scrollbar-w: 11px;
  --sd-scrollbar-thumb: rgba(128, 128, 128, .35);
  --sd-scrollbar-thumb-hover: rgba(128, 128, 128, .55);
}
```

Runtime-injected variables (set from JS, not in the stylesheet): `--sd-zoom`, `--sd-ui-font`, `--sd-ui-accent`,
`--sd-doc-fs`, `--sd-max-text-width`, `--sd-text-column-margin-left/-right`, `--sd-ul-w` (underline width),
`--sd-box-w` (emphasis box width), `--sd-marker-fs`, `--sd-hl-override`, `--sd-shading-override`,
`--sd-hl-dark`, `--sd-hl-pad-top/-bottom`, `--sd-hl-stream-pt`, `--sd-emph-pt`, `--sd-spell-color`,
`--sd-find-color`, `--sd-link-color`, `--sd-unread-after-marker-color`, `--sd-hl-cursor`, and viewport helpers
`--sd-ui-vw-92`, `--sd-ui-vh-60/74/76/88/92`, `--sd-ui-vw-minus-24/-32`.

### 16.5 Highlight palette (Word's 16 named colors)

```
yellow  #fff200   green      #00f000   cyan      #00f0f0   magenta     #ff00ff
blue    #2d6bff   red        #ff2d2d   darkYellow #b8a200  darkGreen   #157a15
darkCyan #0a8a8a  darkMagenta #8a008a  darkBlue  #14308a   darkRed     #9e1414
lightGray #d4d4d4 darkGray/gray #9a9a9a black    #1a1a1a   white       #ffffff
```

`blue, red, darkGreen, darkCyan, darkMagenta, darkBlue, darkRed, black` force white text;
`white` gets a 1px inset border so it remains visible.

### 16.6 Root-level state classes

`.sd-doc-dark`, `.sd-read-mode`, `.sd-judge-mode`, `.sd-highlighter` (custom highlighter-pen cursor, inlined as an
SVG data URI), `.sd-hide-emph-borders`, `.sd-steady-caret`, `.sd-anno-shapes`, `.sd-override-highlight`,
`.sd-override-shading`, `.sd-mode-freeze`.

Colorblind support: `cvdPalette` plus `annotationShapes`, which encodes annotation kind as underline *shape*
rather than color — `.sd-comment-hl{text-decoration:underline dotted}`,
`[data-anno-kind=extensions]{underline solid}`, `[data-anno-kind=notes]{underline double}`.

### 16.7 Timer themes and sounds

`timerColorTheme: "style" | "seaGlass" | "lavender" | "meadow" | "slate"`
(labels: Match UI Style / Sea Glass / Lavender Matte / Meadow / Calm Slate).
`timerSound: "none" | "debateBell" | "softChime" | "deskBell" | "seriousBuzz" | "sonar" | "clownHorn" | "victory"`
(Debate Bell / Soft Chime / Desk Bell / Serious Buzz / Sonar Ping / Clown Horn / Victory Run), with a Play preview.
Alerts fire at each remaining-second mark in `timerAlertPoints: "60, 30, 5"` at `timerAlertVolume: 100`.
Presets `college` / `highSchool` fill `constructiveTime "9:00"`, `rebuttalTime "6:00"`, `cxTime "3:00"`,
`prepTime "10:00"`.

---

## 17. Settings

Persisted at localStorage key `halcyon:settings`, namespaced per account (`fn(key) = key + "::" + account`).
Schema `version: 40`, with a migration ladder (`ste`) handling v1→v40 — including `darkMode`→`theme` (v2),
spacing multipliers→points (v19), `fileSearchRoot`→`fileSearchRoots` (v17), single→list standardize exceptions
(v32), and prefix defaults `SEND_`/`READ_`/`MARKED_`→`[F] `/`[R] `/`[M] ` (v28).

Seven tabs: **General**, **Appearance**, **Editing**, **Timer**, **Keybindings**, **Card Sharing**,
**Accessibility**. Complete defaults:

### General
```jsonc
showStartScreen: true,  defaultSaveFormat: "hal",  defaultExportFormat: "docx",
defaultSpeechFormat: "hal",  defaultSpeechFolder: "",
sendDocDestination: "sameFolder",  sendDocFolder: "",  includeSpeechPocket: true,
checkUpdatesOnLaunch: true,  docxDefaultOpener: false,  docxOpenerPromptDone: false,
tutorialCompleted: false,  keepRunningInBackground: true,  workingFolder: "",
fileSearchRoots: [],  fileSearchExtensions: [".hal", ".docx", ".cmir"],  fileSearchFormats: "both",
docSearchIncludeDocx: true,  docSearchIncludeCmir: true,
docSearchTarget: "current",  docSearchPosition: "cursor",
searchTieBreak: "recency",  fileSearchAutoExpand: true,
openFilesWith: "system",            // "system" | Halcyon file browser
openDocumentsIn: "tabs",            // "tabs" | "windows"
recentLimit: 20,  pinnedLimit: 20,  multiDocWorkspace: true,  liveSelectionWordCount: false,
readerWpm: 300,  readers: [{id:"reader_default", name:"Reader", wpm:300}],  readTimeOnCardHover: true,
prefixPresetsOn: true,  prefixSendDoc: "[F] ",  prefixReadDoc: "[R] ",  prefixMarkedCards: "[M] ",
```
Plus actions: `Report a Bug`, `Suggest a Feature` (min. 30-word description, auto-attached app/version,
optional document attachment), `Reset All Settings`.

### Appearance
```jsonc
theme: "light",  themeAffectsCanvas: true,  uiStyle: "studio",  iconStyle: "modern",
accent: "#5b8cff",  analyticColor: "",
uiFont: "Inter, system-ui, sans-serif",  interfaceFont: "",  interfaceScale: 100,   // 50–200
zoom: 1,                                                                            // 50–300 %
bodyFont: 'Calibri, "Segoe UI", system-ui, sans-serif',  defaultFontSizePt: 11,  lineHeight: 1.08,
maximumTextWidth: 0,  textColumnPosition: "centered",  listIndentEm: 1.8,
navWidth: 280,  navMaxLevel: 4,  showPinnedSection: true,  formatNavByType: true,
citePreviewOnHover: true,  commentsWidth: 300,
tabLocation: "top",  tabStripWidth: 168,
showCardNumbers: true,  showCardNumberingButtons: true,
cardNumberFormat: "period",  cardSubFormat: "paren",  capitalizeCardSubs: false,
cardNumberingSubBold: true,  cardNumberIndent: "off",  cardSubIndent: "off",
stylePreviewMode: "name",  showDocNameChip: true,  showCharacterStyles: true,
showDropzoneShelf: false,  citePreviewOnHover: true,  pilcrowSelectionCue: true,
toolbarTooltips: "full",  showButtonShortcuts: true,  scrollbarWidth: "thin",
underlineThicknessPx: 1,  boxThicknessPt: 1,  underlineZoomScale: 1,  boxZoomScale: 1,   // 0–200 %, 25 % steps
annotationExtensionColor: "#c05a00",  annotationNoteColor: "#1f6feb",
annotationExtensionStyle: {},  annotationNoteStyle: {},
styleOverrides: {},  autoExtendStyles: {},  customStyles: [],
```

### Editing
```jsonc
spellcheck: true,  autosave: true,  textDragDrop: true,  rememberLastQuery: true,
readModeDefault: false,  hideEmphasisBordersInReadMode: false,
markUnreadAfterReadingMarker: false,  unreadAfterReadingMarkerColor: "#6b7280",
shrinkCardSizePt: 8,  paragraphIntegrity: true,  pilcrowMarkers: false,
headingHandlingMode: "respect",       // "strict" | "respect" | "demolish"
condenseOnPaste: false,  destructivePaste: false,  fixOvershrink: true,
f9ClearsDirectFormatting: false,  createReferenceGray: true,
autoBridgeFormattingGaps: true,  formattingGapClass: "both",
wordSnapDrag: true,  caretWordMarks: true,  extractUndertagQuotes: false,
smartQuotes: false,  customAutocorrect: [],  autoCapitalizeTagsAnalytics: false,
customDash: false,  dashChar: "em",  dashSpaced: false,
shrinkProtectionsOn: true,  shrinkProtections: [],   // literal strings or /regex/
acronymPhrases: [],
standardizeHighlightExceptions:  [{id:"exc_hl_default", color:"yellow", label:"", enabled:true}],
standardizeBackgroundExceptions: [{id:"exc_bg_default", color:"yellow", label:"", enabled:true}],
lastHighlightColor: "yellow",  lastShadingColor: "#ffe08a",  lastFontColor: "#111111",
highlightOverrideColor: "#fff200",  shadingOverrideColor: "#c0c0c0",
enterChain: {pocket:"normal", hat:"normal", block:"normal", tag:"normal", analytic:"analytic", undertag:"normal"},
commentAuthor: "You",  commentInitials: "YO",  commentsVisible: true,
flowConnectionPort: 0,  emailGmailClientId: "",  emailTournamentSuggestions: [],
quickCardMidTextConfirm: true,
aiEnabled: false,  anthropicApiKey: "",  aiModelOverride: "",  aiCitePrompt: "",
translationTargetLanguage: "English",  translateBackend: "auto",  translateMarker: true,
```

### Timer
```jsonc
timerColorTheme: "style",  timerSound: "debateBell",  timerAlertPoints: "60, 30, 5",
timerAlertVolume: 100,  timerPreset: "college",
constructiveTime: "9:00",  rebuttalTime: "6:00",  cxTime: "3:00",  prepTime: "10:00",
```

### Keybindings
```jsonc
keyboardMode: "mac" | "win",   // auto-detected from halcyonHost.platform
shortcutOverrides: {},
macros: [],                    // [{shortcut, text}]
```

### Card Sharing
```jsonc
receiveCards: true,  receiveBlocks: true,  receiveAnalytics: true,  autoPinReceived: false,
// plus the Contacts manager
```

### Accessibility
```jsonc
reduceMotion: false,  largerHitTargets: false,  steadyCaret: false,
annotationShapes: false,  cvdPalette: false,
uiColorOverrides: {},  experimentalMultiRange: false,
// plus display-only recolors: highlightOverrideColor, shadingOverrideColor,
// cardNumberColor, transclusionRailColor, copyDivergedColor
```

### Not exposed in the settings UI
`learnDailyTarget: 30`, `learnAnchorHighlighting: true`, `learnDueOnDashboard: true` — a spaced-repetition
"Learn" feature backed by `learn.json` in the `.hal` package. It has a persisted data model and settings but no
command, no menu entry, and no manual section in this build. **[INFERENCE]** — unreleased or feature-flagged.

---

## Appendix A — Transclusion (live views and linked copies)

Not part of Verbatim, and one of the more distinctive features. Two node types share a rail-and-glyph UI
(`.sd-transclusion`, `--sd-transclusion-rail: #5277b8`):

- **`live_view`** — a *read-only mirror* of another section. `toDOM` emits no content hole, so children are not
  editable in place; caret is suppressed (`.sd-live-view .sd-transclusion-content{caret-color:transparent}`).
  Error states: `.sd-live-view-missing`, `.sd-live-view-cycle` (both paint the rail red);
  `"Cycle omitted"` guards recursive embeds.
- **`linked_copy`** — an *editable fork* that tracks its source with `sourceContentHash` + `sourceShapeHash`.
  Divergence is surfaced two ways: `.sd-linked-copy-diverged` draws a red dot on the glyph
  (source changed upstream), `.sd-linked-copy-edited` draws an amber square (edited locally).
  Menu: `Go to source`, `Re-pick source`, `Refresh` (*"Refreshing replaces edits made in this copy."*), `Unlink`.
  `sourceRef` is `"@this-document"` for intra-document links, or an external file reference for
  `transclusion.linkedCopyFile`.

Refresh is coordinated through `halcyon:refresh-live-views` / `halcyon:linked-copy-refreshed`.

## Appendix B — Reading modes

| Mode | Key | Behaviour |
|---|---|---|
| **Read Mode** | `Mod-Shift-r` | *"strips the document down to what you would actually read aloud: structure, cites, and the read text, with unread body hidden. Highlighted text inside a card's table reads inline with the card body."* Scroll position carries over both ways. `white-space:normal` instead of `pre-wrap`. |
| **Judge Mode** | `Mod-Shift-j` | Cards-only, for flowing a speech you are hearing. Tags stay hidden behind a placeholder until clicked (`"Click to reveal tag."`, `.sd-judge-mode [data-sd=tag]{cursor:pointer}`), and the document is locked against edits. |
| **Reading Marker** | `Mod-Shift-m` (or a double press of `` ` `` while in Read Mode) | Drops a `reading_marker` at your reading position. `markUnreadAfterReadingMarker` tints the rest of each marked card with `unreadAfterReadingMarkerColor` (`#6b7280`); Word exports carry the same tint. |

## Appendix C — Speech document workflow

The speech doc is a *standing target*, marked with `speech.markActive` or created with `file.newSpeech`.
`includeSpeechPocket: true` seeds a new speech with a Pocket named for that speech.

Send semantics, which are subtler than they look:
- **`` ` `` (send at cursor)** — lands at the position where you last left your cursor *in the speech document*,
  even though that document is in another tab. Repeated sends stack below one another, preserving reading order.
  If you never placed a cursor there, it appends at the end.
- **`Alt-`` ` `` (send at end)** — always appends, regardless of cursor.

Save presets: `file.saveSendDoc` (`Mod-Alt-s`, prefix `[F] `), read doc (`[R] `),
`file.saveMarkedCards` (`[M] `), each honoring `sendDocDestination: "sameFolder"` or a fixed `sendDocFolder`.

## Appendix D — Notable strings worth flagging

- `"halcyon-export.hal"` — default export filename.
- `"application/x-hal-doc-move"`, `"application/x-hal-folder-move"`, `"application/x-hal-navpin"` — internal drag MIME types.
- `"halcyon-timer-pos-v1"`, `"halcyon-timer-state-v1"`, `"halcyon-timer-v1"` — timer persistence keys.
- `"halcyon:journal:"`, `halcyon:journal-write/-list/-clear/-set-user` — a crash-recovery journal (Flow's
  equivalent is `flow-journals`), plus `halcyon:last-exit-clean` / `last-exit.json` for detecting unclean shutdown.
- `"The editor recovered from an internal error. Your document is intact."` — a ProseMirror error boundary.
- `"halcyon:runtime-security"` — a main-process runtime integrity signal; combined with `bytenode` (`.jsc`
  bytecode), `certPin.jsc`, and `HALCYON_BYTECODE_PRELOAD_SMOKE_FILE`, this app has meaningful
  anti-tamper hardening.
- `"Sample Evidence"`, `"Sample Speech"`, `"Halcyon Sample 2024"`, `"A credible second strike deters great-power war"`,
  `"Hooker Jr. 26"`, `"Smith 23"` — bundled sample/tutorial content.
- A large embedded list of US government agencies and ~130 language names — used by the Cite Creator for
  institutional-author normalization and by the translator, respectively.
