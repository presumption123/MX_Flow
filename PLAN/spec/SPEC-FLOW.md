# Halcyon Flow v1.0.4 — Renderer Feature Specification (reverse-engineered)

Authorized reverse-engineering of the shipped Electron bundle.

Artifacts analyzed:

| File | Notes |
|---|---|
| `flow/dist/assets/index-CQ8oVwJH.js` | 1.4 MB minified renderer, single line. All `@NNNNNN` citations below are byte offsets into this file. |
| `flow/dist/assets/index-CLyV9Lbm.css` | 2.8 KB, read in full |
| `flow/dist/index.html` | read in full |
| `flow/dist/icons.svg` | read in full |
| `flow/electron/*.jsc` | V8 bytecode; string constant pools extracted with a printable-run scan. Channel name → exposed-method name pairs survive **adjacently** in `preload.jsc`, which is how the whole preload API below was recovered. |

Minifier note: this bundle rewrites *all* string literals to backticks, so quoted evidence uses `` ` `` where the original source would have `'` or `"`.

Where I am inferring rather than reading, the line begins with **(inference)**.

---

## 1. Screen inventory

### 1.1 Windows (main process)

`main.jsc` creates exactly three kinds of `BrowserWindow`:

1. **Main app window** — `preload.cjs`, `contextIsolation`, `nodeIntegration` off, `sandbox`, loads `index.html` (dev: `http://127.0.0.1:5174`, appended `?v=latest`). Multiple are allowed (`flowWindows`, `firstWindowId`, `host:is-first-window`).
2. **Timer pop-out** — `frame`/`alwaysOnTop`/`maximizable`/`fullscreenable` flags, title `Round Timer`, loaded with `?v=latest&timerPopout=1`. Same renderer bundle, branch on the `timerPopout` query param.
3. No third window; the "Collaboration window", "Information" panel, Settings etc. are all in-renderer overlays.

Plus a **Tray** (`Tray`, `trayTemplate.png`, `buildTrayMenu`, `syncTray`) — see §16.

### 1.2 Renderer top-level views

The zustand store has exactly two `view` values:

```
view:`dashboard`   // default, eh() initial state @~359000
view===`flow`
setView(`dashboard`)
```

Everything else is a modal/panel over one of those two, plus a pre-app auth gate.

### 1.3 Startup / auth gate

Manual, `getting-started` section (@597400+):

> **Sign in** – Halcyon Flow opens to a sign-in screen. Enter your Halcyon account, or click "Create account" to open halcyondebate.org in your browser… The app remembers you: the next launch shows a brief "Connecting…" splash and lands on the dashboard. There is no unverified offline mode.

Strings present: `Create account`, `Activate your account`, `Sign Out Other Device & Continue`, `Require a code every time I sign in`.

Startup order (inference from `main.jsc` + auth store): splash/"Connecting…" → sign-in screen (if no valid refresh token) → optional 2FA code screen → dashboard. A `.jflow` double-clicked while signed out is queued (`get-pending-open-path`, `pendingOpenPath`, `open.cold` / `queued`) and opened after login.

### 1.4 Dashboard

- **Folder sidebar** (left, resizable, width persisted as `folderPanelWidth`, default `240`, clamped 180–460): tree of real sub-directories of the Working Folder, `+` button, right-click → `New folder`, drag-to-nest, `All Rounds` root.
- **Header**: `+ New Round`, `Import Round`, `Information`, `Settings`, `Getting Started`, account chip.
- **Body**: `Pinned` → `Recent` → `All Rounds` sections of round cards. Card chips: format chip, tournament chip, last-edited date, `LIVE` chip when shared into a collaboration room, red `Missing` tag when the backing file vanished. Per-card: folder menu, `Save`, star (pin), `✕` (delete → OS trash).
- Large libraries render 200 chips + a `Show all N` button.

### 1.5 Flow view

Row 1 — main toolbar (labels read directly out of the JSX at @1362000–1372000):

`Dashboard` · `Round Info` · `Undo` · `Redo` · `Merge Flow` · **Doc:** selector · **flow switcher** (`My Flow` + peers) · `Collaborate` (prefixed `●` when connected, `○` when idle) · `Timer` · **Export** dropdown (`Export as HTML`, `Export as Excel…`) · `Account` · `Settings`

Row 2 — `sd-toolbar-row`, the sheet tab strip: one tab per sheet with `type!=='cx'`, colored by side, drag-to-reorder, double-click to rename, `✕` to close, plus the `+Aff` / `+Off` add buttons with a count box.

Then the grid, and an `sd-status-row` status bar at the bottom carrying the zoom box and the `Update ready` chip.

### 1.6 Overlays / modals / panels

Recovered from labels, keybinding actions and custom DOM events:

| Overlay | Opened by |
|---|---|
| New Round wizard | `+ New Round` |
| Round Info | `Alt+I` / toolbar `Round Info` |
| Settings (tabs `General`, `Appearance`, `Editing`, `Timer`, `Keybindings`) | `Ctrl+,` |
| Keybindings editor | `Ctrl+K` (`ui.commands`) |
| Command Search palette | `Ctrl+Shift+P` |
| Block picker | `Ctrl+B` → event `halcyon-flow-open-block-picker` |
| Inline "/" block search | typing `/` as first char of a cell |
| Block inline editor | `Ctrl+E` → `halcyon-flow-edit-block` |
| Card editor (ProseMirror) | double-click a card cell / `halcyon-flow-edit-card` |
| Search panel (draggable) | `Ctrl+F` |
| Collaboration window | `Collaborate` |
| Timer panel (floating, draggable, position persisted) | `Timer` |
| Timer pop-out window | `Pop Out` in timer header |
| Information window (`Personal`, `Competitor Book`, `Judge Book`, `Tournament Schedule`, `Manual`) | dashboard `Information` |
| Report a Bug / Suggest a Feature | Settings ▸ General ▸ Feedback |
| Guided tour | first launch; `help.replayTutorial` |
| Shorthands editor | `Ctrl+Shift+K` |
| Custom Formats editor | Settings ▸ Editing ▸ `Custom Formats` |
| Confirm dialogs | `jb()` / `showConfirm` |

### 1.7 `icons.svg`

This sprite is **not** a toolbar inventory — it contains only six social/link glyphs:

```
bluesky-icon  bluesky-clip  discord-icon  documentation-icon  github-icon  social-icon  x-icon
```

**(inference)** these belong to an About/footer link row. Toolbar affordances are text buttons, as the JSX above shows.

### 1.8 `index.html`

```html
<title>Halcyon Flow</title>
<div id="root"></div>
```

Nothing else — the entire UI is React-rendered.

---

## 2. The `.jflow` data model (TypeScript)

This is reconstructed from the normalizers and factories, not guessed. Key evidence sites:

- `Vm()` @357574 — round metadata defaults
- `Hm()` @357786 — `createRound`
- `Im()` @356413 — `createSheet`
- `Wm()` @358000 — round migration/normalizer on load
- `qe()` @211395 — empty cell
- `ot()` @214510 — `normalizeCell`
- `Qe()` @212100 — block normalizer
- `rt()` @213500 — card normalizer
- `Je()` @211500 — numbering normalizer
- `bt()` @217716 — cell **serializer** (what actually lands in the file)

### 2.1 File envelope

```ts
// dr() @243560
interface JflowFile {
  version: 1;
  schemaVersion: 12;              // NOTE: current writer emits 12, not 1
  app: "newsheet-superflow";
  type: "halcyon-flow-round";     // Kn @236830
  exportedAt: string;             // ISO
  round: Round;
}
```

Accepted `type` values on import (`$n` @236883): `halcyon-flow-round`, `breakflow-round`, `jayflow-round`.
Accepted for HTML import (`er`): `halcyon-flow-html-round`, `halcyon-flow-round`, `breakflow-html-round`, `breakflow-round`, `new-sheet-html-round`, `jayflow-round`.
The `breakflow-*` ids are assembled at runtime as `[`break`,`flow`].join(``)` — a deliberately un-greppable former product name.

### 2.2 Round

```ts
interface Round {
  id: string;                 // nanoid-style, j() 21 chars from alphabet "…hjklqvwyzrict"
  name: string;

  // Vm() defaults — all "" unless noted
  tournament: string;
  roundName: string;
  roundNum: string;
  judges: string;             // free text, comma-ish
  affSchool: string;
  affCode: string;
  negSchool: string;
  negCode: string;
  role: "not_specified" | "competing" | "judging";
  competingSide: "" | "aff" | "neg";
  competingJudges: unknown[];
  judgingRfd: string;         // feeds the Judge Book
  tournamentSchedule: unknown[];

  folderId: string | null;
  path: string | null;        // absolute .jflow path once saved
  lastEdited: number;         // epoch ms

  sheets: Sheet[];
  activeSheetId: string | null;

  debateFormat: FormatKey;    // default "policy"
  pfSpeakerOrder: "aff_first" | "neg_first";
  formatMode: string;         // "" for non-PF; for PF mirrors pfSpeakerOrder

  // runtime-only, not persisted
  __tourSample?: boolean;
  _remote?: unknown;
  _peerFlow?: unknown;
}
```

### 2.3 Sheet — *there is no `columns[]` and no `rows[]` array*

This is the single most important structural finding. A sheet is a **column-major dictionary of fixed-length arrays**:

```ts
// Im() @356413
interface Sheet {
  id: string;
  name: string;
  type: "aff" | "offcase" | "cx";
  side: "aff" | "off";                 // derived: type==="offcase" ? "off" : "aff"
  speeches: string[];                  // THE COLUMNS, in order, e.g. ["1AC","1NC","2AC",…]
  grid: Record<string /*speech*/, CellValue[]>;  // column -> 200-slot array, index = row
  columnWidths: Record<string /*speech*/, number>;
  extensionLinks: ExtensionLink[];
  cellHighlights: Record<`${colIndex},${rowIndex}`, string /*css color*/>;
  needsName: boolean;                  // true => the app pops a rename prompt on creation
}
```

- **Columns are the `speeches` string array.** A column has no object of its own; its identity *is* its speech key string, its width lives in `columnWidths[speechKey]`, its side/color is derived from the key (`Ie()` @211000 → `sides[key]`, else last A/N letter in the key via `Pe()`).
- **Rows are array indices.** `Pm()`/`hr()` pad every column to 200 (`GRID_ROWS: ()=>200`, `Uf` export map @337000). There is no row object and no per-row metadata in the file. Row identity only becomes a first-class thing inside the Yjs collaboration document (§11).
- Sheets with `type:"cx"` exist in the model and are **hidden from the tab strip** (`m.sheets.filter(e=>e.type!=='cx')` @1370800) but still get their own speech color (`cx` token).

### 2.4 Cell

A cell slot is `string | Cell`. The serializer `bt()` collapses a plain unstyled text cell back down to a bare `string`, so real `.jflow` grids are a mix of `""`, `"plain text"` and rich objects.

```ts
type CellValue = string | Cell;

// qe() = empty cell; ot() = normalize; bt() = serialize
interface Cell {
  kind: "text" | "block" | "card";
  text: string;

  formatting: {
    bold: boolean;
    highlighted: boolean;
    dropHighlighted: boolean;   // <- the "dropped/conceded" mark
  };

  // character-offset ranges over `text`; Ze() accepts [start,end] or [start,end,color]
  underlineRanges: Array<[number, number]>;
  strikeRanges:    Array<[number, number]>;
  emphasisRanges:  Array<[number, number]>;
  highlightRanges: Array<[number, number, string?]>;   // 3rd slot = color

  numbering: Numbering | null;
  sourceNodes: PMNodeJSON[] | null;   // raw ProseMirror nodes when pasted/inserted from Docs
  updatedAt: string;                  // ISO, omitted when empty

  block: Block | null;                // kind === "block"
  card:  Card  | null;                // kind === "card"
}

// Je() @211500
interface Numbering {
  kind: "number" | "sub";
  text: string;                 // "1", "a"
  label: string;                // default `${text}.` for number, `${text})` for sub
  visible: boolean;             // default true
}
```

Emptiness test (`ap()` @338800) — a cell counts as empty only when kind-appropriate content *and* every mark is absent:

```js
(t.text ?? ``) === `` && !t.formatting.bold && !t.formatting.highlighted
  && !t.formatting.dropHighlighted && !t.underlineRanges.length
  && !t.strikeRanges.length && !t.emphasisRanges.length && !t.highlightRanges.length
```

### 2.5 Block cell (a pocket/hat/block pulled out of an evidence document)

```ts
// Qe() @212100
interface Block {
  id: string;
  title: string;
  path: string;                 // source document path on disk
  searchFolder: string;         // which configured hal search folder it came from
  sourceType: "hal" | "cmir" | "docx";
  nodeId: string | null;        // stable id inside the source doc
  html: string;
  nodes: PMNodeJSON[] | null;
  headingNode: PMNodeJSON | null;
  numbering: Array<{ nodeId: string | null; numbering: Numbering | null }>;
  modified: boolean;            // true once locally edited, so it stops tracking the source
  children: unknown[] | null;   // the child cards/analytics, expanded by Backflow
}
```

### 2.6 Card cell

```ts
// rt() @213500
interface Card {
  tag: string;
  cite: string;
  citeFull: string;
  sourcePath: string;
  html: string;
  body: string;
  nodeId: string | null;

  bodyUnderlineRanges: Array<[number, number]>;
  bodyStrikeRanges:    Array<[number, number]>;
  bodyEmphasisRanges:  Array<[number, number]>;
  bodyHighlightRanges: Array<[number, number, string?]>;

  node: PMNodeJSON | null;
  bodyParagraphs: PMNodeJSON[] | null;

  extensions: CardExtension[];  // $e()/et() @212900
  notes: CardNote[];            // tt()/nt()
  fontSizePt: number | null;
  modified: boolean;
  tagOnly: boolean;             // a bare tag, no cite/body
}

interface CardExtension { id: string; name: string; speech: string; content: string; }
interface CardNote      { id: string; content: string; }
```

The displayed headline (`ft()` @215000) is `tag + " " + cite`, terminated with a period unless it already ends in punctuation — matching the manual: *"It creates binding changes to federal law. Steilen 20."* — and that period is display-only.

### 2.7 Extension links (the arrows between cells)

```ts
// created @1111933, migrated on row delete @1122702, shifted on cell move @1132239
interface ExtensionLink {
  id: string;        // `${Date.now()}-${Math.random().toString(36).slice(2)}`
  fromCol: number;   // column INDEX into sheet.speeches
  fromRow: number;
  toCol: number;
  toRow: number;
  side: "aff" | "neg";   // FB(speechKey) -> picks arrow marker color
}
```

These are pure column/row **indices**, not speech keys — which is why every row-delete and cell-move path in the grid explicitly rewrites them. The HTML export renders them as an SVG overlay with `marker id="arrow-aff"` / `arrow-neg`.

### 2.8 Cell highlights

```ts
cellHighlights: Record<`${colIndex},${rowIndex}`, string>
```

Plain CSS color strings. `#fca5a5` is reserved as the **drop** color (`HF` @1007400) and `KF()` strips every `#fca5a5` entry before recomputing, so drop marks are regenerated rather than accumulated.

### 2.9 Settings, information, keybindings

These live in `localStorage` (zustand `persist` over a debounced `$m` wrapper @358800, 250 ms coalesce, flushed on `blur`/`beforeunload`), **not** in the `.jflow`:

```ts
interface PersistedState {
  view: "dashboard" | "flow";
  rounds: Round[];
  folders: Folder[];
  roundLibraryFiles: string[];
  roundLibraryRoot: string;
  activeRoundId: string | null;
  activeFolderId: string;          // "all"
  pinned: string[];
  gridZoom: number;
  keybindings: Record<ActionId, string>;
  settings: Settings;              // §14
  information: {
    personal: { name: string; school: string; code: string; notes: string };
    competitors: unknown[];
    judges: unknown[];
    schedule: unknown[];
  };
}
```

Overflow is handled gracefully: *"Halcyon Flow could not save its local snapshot: browser storage is full. Your work is still in memory and in the recovery journal."*

---

## 3. Flow templates (built-in debate formats)

All eleven live in one object literal `pe` @201700. Structure:

```ts
interface FormatDef {
  key: string;
  label: string;
  chip: string;                          // short badge
  aff: string[];                         // column layout for an AFF/case sheet
  off: string[];                         // column layout for an OFF-CASE sheet
  sides: Record<string, "aff" | "neg">;  // speech key -> side (drives colors)
  starters: Array<{ name: string; side: "aff"|"off"; columns?: string[] }>;
  affName: string; offName: string;
  affButtonLabel: string; offButtonLabel: string;
  pf?: true; singleFlow?: true; customizable?: false;
  policyEquiv?: Record<string,string>;
  modes?: Array<{key,label,aff,sides}>; modesEnabled?: boolean; defaultModeLabel?: string;
  multiTeam?: boolean; teams?: Team[]; teamOf?: Record<string,string>;
}
```

The **aff/case** layout includes the opening speech; the **off-case** layout is the same list minus the first speech — because an off-case position is introduced in the 1NC (or equivalent), so the 1AC column would always be empty.

| key | label | chip | Aff sheet columns | Off-case sheet columns | Starter sheets | Aff/Off names |
|---|---|---|---|---|---|---|
| `policy` | CX (Policy) | CX | `1AC 1NC 2AC 2NC/1NR 1AR 2NR 2AR` | `1NC 2AC 2NC/1NR 1AR 2NR 2AR` | `Case`(aff), `Off 1`(off) | Aff / Off |
| `pf` | PF (Public Forum) | PF | `AC NC AR NR AS NS AFF NFF` | `NC AR NR AS NS AFF NFF` | `Pro`, `Con` | Pro / Con |
| `ld` | LD (Lincoln-Douglas) | LD | `1AC 1NC 1AR 2NR 2AR` | `1NC 1AR 2NR 2AR` | `Aff`, `Neg` | Aff / Neg |
| `congress` | Congress | Cong | `1A` then `Q/1N Q/1A … Q/12N Q/12A` (25 cols) | same | `Bill`(aff) | Bill / Bill |
| `wsdc` | WSDC | WSDC | `P1 O1 P2 O2 PW OW OR PR` | `O1 P2 O2 PW OW OR PR` | `Prop`, `Opp` | Prop / Opp |
| `bq` | Big Questions | BQ | `AC NC ARb NRb A3 N3 ARt NRt` | `NC ARb NRb A3 N3 ARt NRt` | `Aff`, `Neg` | Aff / Neg |
| `nof_spar` | NOF SPAR | Spar | `PC CC PR CR` | `CC PR CR` | `Pro`, `Con` | Pro / Con |
| `parli` | Parli | Parli | `1PC 1OC 2PC 2OC/OR PR` | `1OC 2PC 2OC/OR PR` | `Prop`, `Opp` | Prop / Opp |
| `classic` | Classic | Clsc | `AC NC/1NR 1AR 2NR 2AR NS AS` | `NC/1NR 1AR 2NR 2AR AS NS` | `Aff`, `Neg` | Aff / Neg |
| `bp` | BP | BP | `PM LO DPM DLO MG MO GW CW` | `LO DPM DLO MG MO GW CW` | `OG`,`OO`,`CG`,`CO` (each with its own `columns`) | OG / OO, buttons `+Gov` / `+Opp` |
| `ippf` | IPPF | IPPF | `A1 N1 A2 N2 AR NR` | `N1 A2 N2 AR NR` | `Aff`, `Neg` | Aff / Neg |

Special cases:

- **Congress** is `singleFlow:!0` — one sheet only, generated by `U()`: `["1A", "Q/1N","Q/1A", … "Q/12N","Q/12A"]`, and `sides` only pins `1A:"aff"`.
- **BP** is the only format whose starter sheets carry per-sheet `columns`: OG gets all 8, OO drops `PM`, CG starts at `MG`, CO starts at `MO`. `fe = se(["PM","DPM","MG","GW"], ["LO","DLO","MO","CW"])`. Sheet auto-naming for BP cycles `OG/CG` and `OO/CO` (`Ge()` @210700).
- **PF** carries `policyEquiv` — `{AC:1AC, NC:1NC, AR:2AC, NR:2NC/1NR, AS:1AR, NS:1NR, AFF:2NR, NFF:2AR}` — used to translate PF speeches into policy equivalents for Docs signposting.
- **PF speaker order** (`ke()` @211200): with `pfSpeakerOrder:"neg_first"` the layouts flip to `NC AC NR AR NS AS NFF AFF` (aff sheet) / `NC AC NR AR NS AS NFF AFF` minus first (off sheet).
- `2NC/1NR` is canonicalized: any column literally named `block`/`blk` is rewritten to `2NC/1NR` (`Ae`/`je()` @211100), and with `showFullBlock:false` (default) it *displays* as just `2NC` (`Me()`).

Format aliases accepted from files/UI (`ge` @204600): `cx`, `policy`, `policy debate`, `cx (policy)`, `pf`, `public forum`, `publicforum`, `ld`, `lincoln-douglas`, `lincoln douglas`, `congress`, `congressional`, `wsdc`, `worlds`, `bq`, `big questions`, `nof_spar`, `nof spar`, `spar`, `nofspar`, `parli`, `parliamentary`, `classic`, `bp`, `british parliamentary`, `ippf`.

**Custom formats** (`Se()` @205400): `settings.customFormats` adds whole new formats; `settings.formatColumnOverrides[key]` overrides `aff`/`off`/`sides`/names/buttons/modes/teams on a built-in, marking it `overridden:true`.

**No prep/speech times are attached to formats.** Times live only in the timer settings and are format-agnostic (§7): `college` = 9:00 / 6:00 / 3:00 / 10:00, `highSchool` = 8:00 / 5:00 / 3:00 / 10:00.

---

## 4. The grid / flowing UX

### 4.1 Rows

Every column is pre-padded to **200** slots; "adding a row" means shifting content down inside those slots, not growing an array. Row insert/delete therefore also has to fix up `cellHighlights` keys and `extensionLinks` indices, which you can watch happen at @1122702:

```js
// on delete row t: shift cells up, reindex highlights, drop/shift links
s[`${r},${i>t?i-1:i}`]=n
Ke.current.filter(e=>e.fromRow!==t&&e.toRow!==t)
          .map(e=>({...e, fromRow:e.fromRow>t?e.fromRow-1:e.fromRow, …}))
```

**Automatic row creation on Enter.** `ti()` @1124332 calls a predicate `gB({action:"move-down", mode, scopeColumn, nextRow})` before inserting. `settings.enterRowCreationMode` ∈ `contextual | off | scope`:

- `contextual` (default) — insert a row when the row below already has content anywhere.
- `off` — Enter never inserts.
- `scope` — only content in `enterRowScopeColumn` (0–31) *or a column to its right* counts.

`settings.rowInsertUndoSelection` ∈ `keep | start` decides whether undoing an auto-inserted row leaves the caret where it is or returns it to `__rowInsertOrigin` (stashed on the undo snapshot by `ei()`).

### 4.2 Moving between columns / rows

`Tab`/`Shift+Tab` = next/prev speech column. Arrows move a cell at a time. `Enter` = down. `Alt+Enter` (`nav.extendArg`) "extends the argument's space".

**Shadow Flow** (`Ctrl+Shift+L`, `settings.shadowFlow`) rebinds Enter to a separate action `shadow.enter`, which zig-zags between an argument and the column that answers it, so you flow claim → response without the mouse.

**Set Order** (`Ctrl+Shift+O`) jumps *every* sheet to the same speech column at once — the "line the whole round up on the next speech" command. State: `orderTargets`.

### 4.3 Linking an answer to what it answers

Two distinct mechanisms:

1. **Extend Argument — `Alt+G` (`arg.extend`)** @1111933. Reads the current cell's text, finds the target column via `mr(col)` (the next column on the same side), opens room in every intervening column (`hr(n,t,t,t+1)`), moves the caret there, and pushes an `ExtensionLink {fromCol, fromRow, toCol, toRow, side}`. `Backspace` on a cell that is the source of links deletes them (`Ke.current.filter(e=>e.fromCol===o&&e.fromRow===s)` @1139300); `Sr(id)` removes one link and re-measures the affected rows.
2. **Card "Extend"** — right-click a card cell → its prepared extensions (authored in Halcyon Docs, stored in `card.extensions[] {name, speech, content}`) drop into a later speech, with a chooser when there is more than one.

### 4.4 Marking drops / concessions

`Ctrl+Shift+H` (`drops.highlight`) runs `GF()` @1007700, which is a strict one-column-lookahead scan:

```js
function GF(sheet, speechKey) {
  const i = sheet.speeches.indexOf(speechKey);
  const next = sheet.speeches[i+1];          // no next column -> no drops
  for (let row = 0; row < rowCount; row++)
    if (nonEmpty(grid[speechKey][row]) && !nonEmpty(grid[next][row]))
      out.push({row, col: i, speech: speechKey});
}
```

Results are written as `cellHighlights["<col>,<row>"] = "#fca5a5"`, after `KF()` clears every prior `#fca5a5`. So Highlight Drops is idempotent and re-runnable ("runs on one click every time").

The per-cell `formatting.dropHighlighted` flag is the *manual* equivalent and is deliberately cleared whenever a cell is retyped (`yt()` @217600 sets `dropHighlighted:!1`).

### 4.5 Other cell marks

- `Ctrl+H` — `cellHighlights` toggle on the active cell (default color `settings.highlightColor` `#fde047`).
- `Ctrl+U` — `underlineRanges`.
- `Alt+X` — `strikeRanges`.
- Bold via `formatting.bold`; `emphasisRanges` and `highlightRanges` come from the card editor.

### 4.6 Selection and movement

- `Shift+Arrow` extends a rectangular selection; while editing text it first extends the text selection and only crosses into grid selection at the edge.
- `Ctrl/Cmd+click` and `Ctrl/Cmd+drag` build a **disconnected** selection; repeat to deselect (`e.cells` on the move payload vs. the `col/row/cols/rows` rectangle @1132239).
- `Ctrl+M` **Move Cells**, `Ctrl+Shift+M` **Move Cell** — pick up, mouse to position, click to drop, `Esc` to cancel. Occupied targets are never overwritten: the landing slides onward in the same direction to the nearest clear slot, and with nothing clear the outline turns the neg color and the click no-ops. Links whose endpoints are inside the moved region are translated by the same `(dCol,dRow)`.
- Right-click a cell → `Clear Cell`, `Delete Row` (whole row across every speech, one undoable collaboration-safe edit), and `Extend` on card cells.
- Cut/copy/paste (`Ctrl+X/C/V`) round-trips full rich cells including block/card chips.

### 4.7 Grouping / indentation

There is **no explicit indent level field**. Grouping is expressed by:

- `numbering` (`kind:"number"` → `1.`, `kind:"sub"` → `a)`) rendered as a prefix (`Ye()` @211900 returns `` `${label} ` ``);
- block cells, which own an ordered list of member cards/analytics and can be expanded in place by Backflow.

`settings.enterSpacing` ("Backflow Row Gap") controls blank rows left between expanded groups.

### 4.8 Colors

Column/tab color resolution (`Gn()` @236830):

```js
side==='aff' ? affColor
: side==='neg' || key==='Block' || key==='2NC/1NR' || key==='NC/1NR' ? negColor
: ['1AC','2AC','1AR','2AR','AC'].includes(key) || key.startsWith('Pro ') ? affColor
: ['1NC','2NR','NC','NR'].includes(key) || key.startsWith('Con ') ? negColor
: key.includes('CX') ? theme.cx
: theme.text
```

`settings.coloredColumnBackgrounds` tints whole columns; `settings.colorblindMode` adds text side-labels to tabs so color is never the only signal.

### 4.9 Column widths and zoom

Drag only the right edge of a *header* to resize; right-click a header for `Resize Column…` (exact px) / `Reset width`. Stored per speech in `sheet.columnWidths`. Zoom: status-bar percent box, `Ctrl+=` / `Ctrl+-` / `Alt+0`, `Ctrl`+wheel; `gridZoom` persists across sheets and restarts.

### 4.10 Read-time hover pill

Hovering a card/tag/block cell floats a pill outside the cell with read-aloud time per reader (`settings.readers[] {id,name,wpm}`, default one `Reader` at 300 wpm; toggle `readTimeOnCellHover`). A card's pill leads with its cite (`Johnson 23, 0:21`). Gray-highlighted / reference-converted text is excluded from the count. The reader list is shared cross-app via `halcyon:readers-*`.

---

## 5. Complete keyboard shortcut table

The full registry is object `M` @194600–200700, keyed by action id, each `{label, group, default, aliases?}`. `N = Object.fromEntries(...)` is the defaults map; user overrides live in `state.keybindings`.

Binding grammar (`re()` @200100): modifiers are emitted in the fixed order `Ctrl+Alt+Shift+KEY`, where `Ctrl` means `metaKey` on macOS (`ne()`) and is *displayed* as `Cmd` (`ie()`). A binding string may hold **several comma-separated alternatives** (`B()` splits on `,`). Mouse buttons are first-class binding tokens: `LeftClick`, `MiddleClick`, `RightClick` (`ee()` maps `button` 0/1/2).

**65 rebindable actions:**

### Navigation
| Action id | Label | Default |
|---|---|---|
| `nav.down` | Move Down | `ArrowDown` |
| `nav.up` | Move Up | `ArrowUp` |
| `nav.right` | Move Right | `ArrowRight` |
| `nav.left` | Move Left | `ArrowLeft` |
| `nav.enterDown` | Enter: move to cell below | `Enter` |
| `cell.lineBreak` | Shift+Enter: line break in cell | `Shift+Enter` |
| `cell.addRow` | Cmd+Enter: add a new row | `Ctrl+Enter` |
| `shadow.enter` | Shadow Flow Enter | `Enter` |
| `nav.nextCol` | Next Speech Column | `Tab` |
| `nav.prevCol` | Prev Speech Column | `Shift+Tab` |
| `nav.extendArg` | Extend Argument Space | `Alt+Enter` |
| `arg.extend` | Extend Argument | `Alt+G` |
| `sheet.nextTab` | Next Sheet Tab | `Ctrl+ArrowRight` |
| `sheet.prevTab` | Prev Sheet Tab | `Ctrl+ArrowLeft` |

### Sheets
| Action id | Label | Default |
|---|---|---|
| `sheet.newOff` | New Off-Case Sheet | `Alt+N` |
| `sheet.newAff` | New Aff Sheet | `Alt+A` |
| `sheet.select1` … `sheet.select8` | Select Sheet 1–8 | `Ctrl+1` … `Ctrl+8` |
| `sheet.select9` | Select **Last** Sheet | `Ctrl+9` |
| `sheet.rename` | Rename Sheet | `F2` |
| `sheet.reorderLeft` | Move Sheet Left | `Ctrl+Shift+ArrowLeft` |
| `sheet.reorderRight` | Move Sheet Right | `Ctrl+Shift+ArrowRight` |

### Cells
| Action id | Label | Default |
|---|---|---|
| `cell.insert` | Insert Row Below | `Alt+Shift+Enter` |
| `cell.delete` | Delete Active Cell | `Delete` |
| `row.delete` | Delete Active Row | `Ctrl+Delete` |
| `cell.move` | Move Cells | `Ctrl+M` |
| `cell.moveCell` | Move Cell | `Ctrl+Shift+M` |
| `cell.highlight` | Highlight Active Cell | `Ctrl+H` |

### Round
| Action id | Label | Default |
|---|---|---|
| `round.info` | Edit Round Info | `Alt+I` |
| `sheet.close` | Close Active Flow | `Ctrl+W` |

### Document Editing
| Action id | Label | Default |
|---|---|---|
| `shadow.toggle` | Toggle Shadow Flow | `Ctrl+Shift+L` |
| `drops.highlight` | Highlight Drops | `Ctrl+Shift+H` |
| `doc.setOrder` | Set Order | `Ctrl+Shift+O` |
| `cell.block` | Insert Block / Card Cell | `Ctrl+B` |
| `insert.slashBlockSearch` | Insert Block from File… | *(unbound)* aliases `slash`, `block search` |
| `cell.editBlock` | Edit Block | `Ctrl+E` |
| `cell.createBlock` | Create Block | `Ctrl+Shift+B` |
| `cell.emptyCard` | Create Empty Card | `Ctrl+Shift+C` |
| `doc.send` | Send to Doc | `Ctrl+Shift+D` |
| `doc.construct` | Construct Speech | `Ctrl+Shift+S` |
| `doc.backflow` | Backflow | `Ctrl+Shift+F` |
| `ui.shorthands` | Shorthands | `Ctrl+Shift+K` |
| `format.underline` | Underline | `Ctrl+U` |
| `format.strike` | Strikethrough | `Alt+X` |
| `cell.search` | Search Cells | `Ctrl+F` |

### Export
| Action id | Label | Default |
|---|---|---|
| `export.sheet` | Export Sheet CSV | `Alt+E` |
| `export.round` | Export Round CSV | `Alt+Shift+E` |
| `export.roundXlsx` | Export Round as Excel… | *(unbound)* aliases `excel`, `xlsx`, `spreadsheet`, `workbook` |

### UI / Zoom / Help
| Action id | Label | Default |
|---|---|---|
| `ui.commands` | Keybindings | `Ctrl+K` |
| `ui.commandSearch` | Command Search… | `Ctrl+Shift+P` |
| `ui.settings` | Settings | `Ctrl+,` |
| `ui.dashboard` | Back to Dashboard | `Alt+H` |
| `view.toggleDarkMode` | Toggle Dark Mode | `Ctrl+Alt+Shift+D` |
| `app.switchToDocs` | Switch to Halcyon Docs | `Ctrl+Shift+T` |
| `zoom.in` | Zoom In | `Ctrl+=` |
| `zoom.out` | Zoom Out | `Ctrl+-` |
| `zoom.reset` | Reset Zoom | `Alt+0` |
| `help.replayTutorial` | Replay Tutorial | *(unbound)* |
| `help.pitch` | Getting Started | *(unbound)* |

### Hard-coded, not in the registry

| Keys | Effect | Evidence |
|---|---|---|
| `Backspace` on a link source cell | deletes that cell's extension links | @1139300 |
| `Delete` / `Backspace` with a multi-cell selection | clears every selected cell as one undo step | @1139400 |
| `Ctrl+Z` / `Ctrl+Y` | undo / redo (grid edits, sheet deletion, a whole Backflow, a whole cell move each = 1 step) | manual |
| `Ctrl+X` / `Ctrl+C` / `Ctrl+V` | cut / copy / paste rich cells | manual + Edit menu |
| `Esc` | cancel Move Cell; back out of "/" search one level; close editors | manual |
| `/` as first char of a cell | arm inline block search | manual |
| `Shift+Arrow` | extend grid/text selection | manual |
| `Ctrl`+wheel | zoom | manual |
| `Home` / `End` | first/last item in an open dropdown or search list | manual |
| Double-click a sheet tab | rename | @1370900 |

### Card editor (ProseMirror) — separate keymap

`F7` Tag · `F8` Cite · `F9` Underline · `F10` Emphasis · `F11` Highlight · `Ctrl+F7` Analytic · `F12` clear to Normal · `Ctrl+K` Insert hyperlink. Toolbar-only ids referenced by the manual as `{{button:…}}`: `marks.bold`, `marks.italic`, `marks.strikethrough`, `marks.superscript`, `marks.subscript`, `marks.emphasizeAcronym`, `marks.addLink`, `list.bullet`, `list.ordered`, `list.outdent`, `list.indent`, `align.left`, `align.center`, `align.right`.

With `settings.caretWordMarks` on (default), a mark key with the caret anywhere inside a word applies to the whole word and toggles off on a second press; in whitespace it arms the style for the next typing.

### Block inline editor
`Shift+ArrowUp/Down` select member cells · `Delete` remove the run · `Ctrl+M` reorder members within the block · `Ctrl+C`/`Ctrl+X` copy/cut members as full cards · `Ctrl+E` or `Esc` close.

### Application menu accelerators (main process)

`main.jsc` builds a native menu whose accelerators mirror the renderer bindings via `host:set-menu-bindings` + `bindingToAccelerator` (`CmdOrCtrl`, `Super`, arrow/`Return`/`Space`/`Escape` token mapping) and dispatches back over `menu:command`. Menu items: `New Aff Sheet`, `New Off-Case Sheet`, `Close Active Flow`, open file, export round, `Send to Doc`, `Construct Speech`, `Backflow`, `Back to Dashboard`, undo/redo/paste/`pasteAndMatchStyle`/`selectAll`, `Insert Block / Card`, `Search Cells`, `Shorthands`, reload/forceReload/toggleDevTools/togglefullscreen, settings, keybindings, commandSearch, plus `appMenu`/`windowMenu`.

---

## 6. Rich text inside cells

**Grid cells are edited as plain text** — the active cell is a `<textarea>`-like `.flow-cell-input` (`W.current.value`, `selectionStart/End`, manual `\n` splice for Shift+Enter @1124400). Styling is stored *out of band* as character-offset range arrays on the `Cell` (`underlineRanges`, `strikeRanges`, `emphasisRanges`, `highlightRanges`), which is why `Ze()` has to clamp and sort them and why `pS()`/`hS()` @690110 exist to convert ranges ⇄ ProseMirror marks.

**Card and block editors are real ProseMirror.** One schema, `cT = new Schema({nodes: iT, marks: {...}})` @757802 / @763000:

Nodes (`iT`):

| node | content | notes |
|---|---|---|
| `doc` | `card` | |
| `card` | `tag cardcontent*` | `defining`, `isolating`, `<section data-sd="card" class="sd-card">` |
| `tag` | `inline*` | `<p data-sd="tag">` |
| `cite_paragraph` | `inline*`, group `cardcontent` | `<p data-sd="cite">` |
| `undertag` | `inline*`, group `cardcontent` | `<p data-sd="undertag">` |
| `card_body` | `inline*`, group `cardcontent` | `<p data-sd="body">`, also catches bare `<p>` |
| `paragraph` | `inline*` | `<p data-sd="p">` |
| `text` | — | group `inline` |
| `image` | inline, draggable | attrs `mediaId, src, alt, contentType, width, height, opacity, rotation, dx, dy, layer, wrap, flipH, flipV` |
| `image_block` | group `cardcontent`, draggable | same attrs, `<figure data-sd="image">` |
| `table` / `table_row` / `table_cell` / `table_header` | | `rawTblPr`, `rawTcPr`, `colspan`, `rowspan`, `align` — DOCX passthrough |

All block nodes share attrs `tT` with `indent` and `align` and `listType`, rendered as `padding-left:${indent*1.8}em`, `text-align`, `data-list` / `data-indent` (`rT()` @757802).

Marks:

| mark | attrs | notes |
|---|---|---|
| `emphasis_mark` | `size`, `hl` | the debate "emphasis box"; `--sd-emph-pt`, `data-fill-lum` |
| `underline_mark` | — | `data-mark="debate-underline"` |
| `underline_direct` | — | plain `<u>` |
| `font_size` | `size` (default 11) | `font-size:calc(var(--sd-zoom,1) * Npt)` |
| `cite_mark` | — | `data-mark="cite"` — matches the `.hal` format |
| `highlight` | `color` (default `yellow`) | `<mark data-color>` |
| `font_color` | `color` | |
| `strikethrough` | — | |
| `bold` | `w: "b"|"n"` | |
| `italic` | `i: "on"|"off"` | |
| `undertag_mark`, `analytic_mark` | — | |
| `superscript` / `subscript` | mutually exclusive | |
| `link` | `href`, `title`, `inclusive:false` | href sanitized by `Qw()` |

This is a superset of the `.hal` `document.json` schema described in the brief (`doc/block/card/tag/cite_paragraph/card_body/text` + `cite_mark`), which is exactly what you would need to *read* `.hal` and also carry DOCX/CMIR imports.

Zoom is a CSS variable, `--sd-zoom`, so every pt-sized mark scales together.

---

## 7. Timer system

### 7.1 State

`halcyon-timer-state-v1` (storage key) / `halcyon-timer-v1` (channel key), @1190005:

```ts
interface TimerState {
  mode: "speech" | "affPrep" | "negPrep";
  running: boolean;
  runningSince: number | null;
  speechBaseRemainingMs: number;
  affPrepBaseRemainingMs: number;   // default 600_000
  negPrepBaseRemainingMs: number;   // default 600_000
  prepTotalMs: number;              // default 600_000
  updatedAt: number;
  alarmedForRunSince: number | null;
  alertedPointKeys: string[];       // /^(speech|affPrep|negPrep):([1-9]\d{0,4})$/, ≤128, ≤86400s
}
```

Separate aff and neg prep banks, one shared speech clock. Elapsed time is derived from `runningSince`, so the clock stays correct across processes without ticking messages.

### 7.2 Settings

```js
timerEnabled: false,
timerAlertPoints: "60, 30, 5",     // validated: all ints 1..86400, else reset
timerAlertVolume: 100,             // 0..100
timer: { colorTheme:"style", sound:"debateBell", preset:"college",
         constructiveTime:"9:00", rebuttalTime:"6:00", cxTime:"3:00",
         prepTime:"10:00", position:null }
```

Color themes (`iH` @1203237): `style` (Match UI style), `seaGlass`, `lavender`, `meadow`, `slate`.
Sounds (`aH`): `none`, `debateBell`, `softChime`, `deskBell`, `seriousBuzz`, `sonar` (Sonar ping), `clownHorn`, `victory` (Victory run).
Presets (`oH`/`sH`): `college` = 9:00/6:00/3:00/10:00, `highSchool` = 8:00/5:00/3:00/10:00.

Time entry parses `MM:SS` or bare digits keypad-style: 1–2 digits = minutes (`9` → 9:00), 3–4 digits = last two are seconds (`800` → 8:00, `1230` → 12:30).

`timer.position` persists the floating panel's drag position.

### 7.3 Channels

| Channel | Preload method |
|---|---|
| `halcyon:timer-read` | `timerRead` |
| `halcyon:timer-write` | `timerWrite` |
| `halcyon:timer-changed` | `onTimerChanged` |
| `halcyon:timer-popout-open` | `openTimerPopout` |
| `halcyon:timer-popout-close` | `closeTimerPopout` |
| `halcyon:timer-popout-state` | `timerPopoutOpen` |
| `halcyon:timer-popout-changed` | `onTimerPopoutChanged` |

`installTimerSync` in `halcyon-shared.jsc` backs the timer with **`~/…/halcyon-shared/timer.json`** (`app.getPath('appData')/halcyon-shared`), `fs.watch`es it, and `fanOut`s `halcyon:timer-changed` to every window of *both* apps. That is the "start prep in one app and it ticks in the other" mechanism — a shared file plus a watcher, not a socket.

The pop-out is a small `alwaysOnTop` frameless window titled `Round Timer`; `broadcastTimerPopout` keeps the in-app panel in sync, and the pop-out is never restored on launch.

---

## 8. File / library management

### 8.1 Working Folder

`flow:set-working-folder` / `flow:choose-working-folder` (`showOpenDialog` with `openDirectory, createDirectory`). Every subsequent path operation is validated against it — the refusal strings are in `main.jsc` verbatim:

```
Refused: folder path is outside the Working Folder.
Refused: not a .jflow file.
Refused: source is not a .jflow file.
Refused: destination is outside the Working Folder.
Refused: folder move outside the Working Folder.
A round with that name already exists in the folder.
```

### 8.2 File channels (all `flow:*`, preload method in parens)

| Channel | Method | Behavior |
|---|---|---|
| `flow:mkdir` | `mkdir` | recursive, working-folder-guarded |
| `flow:list-subdirs` | `listSubdirs` | bounded walk, `MAX_DIRS` / `MAX_DEPTH`, returns `createdAt` |
| `flow:list-rounds` | `listRounds` | bounded, `MAX_FILES`, returns `{…, modifiedAt: mtimeMs}` |
| `flow:path-exists` | `pathExists` | `fs.access` |
| `flow:read-file` | `readFile` | |
| `flow:write-file` | `writeFile` | **atomic**: write `.tmp-…` then `rename`, with `EPERM`/`EBUSY`/`EACCES` retry and `unlink` cleanup |
| `flow:move-file` | `moveFile` | `rename`, falls back to `copyFile` on `EXDEV`; refuses collisions |
| `flow:move-dir` | `moveDir` | `lstat` + `cp {errorOnExist}` + `moveOnto`, handles `EEXIST`/`ENOTEMPTY` conflicts |
| `flow:trash-file` | `trashFile` | `shell.trashItem` → OS Recycle Bin |
| `flow:show-save` | `showSave` | filter `{name:"Halcyon Flow Round", extensions:["jflow"]}` |
| `flow:open-file` | `onOpenFile` | main→renderer, from double-click/`open-file`/`second-instance` |
| `get-pending-open-path` | `getPendingOpenFile` | drains the cold-start queue |
| `flow:renderer-ready` | `signalReady` | gates `deliverFlowOpen` |
| `flow:log-error` | `logError` | |

`registerJflowFileType` writes `HKCU\Software\Classes\.jflow` → `HalcyonFlow.Document` ("Halcyon Flow Document") with `\DefaultIcon` from `halcyon-flow.ico`, then `ie4uinit.exe -show`. An `open-log.txt` records `open.cold` / `open.warm` / `open.drop` with reasons like `(not a .jflow document)` and `empty after retry (online-only?)`.

### 8.3 Library index

`library-index.jsc` is a separate, cached, incremental scanner:

- Channels `library:list` (`libraryList`), `library:status` (`libraryStatus`), push `library:updated` (`onLibraryUpdated`).
- Cache file `library-index.json` under `userData`, versioned (`CACHE_VERSION`), written atomically (`writeFile` → `rename`, `unlink` on failure), serialized through a `writeChain`.
- `allowedExts` from main is **`.docx`, `.cmir`** — i.e. this index serves the *evidence* library, not the round library.
- Bounded by `DEFAULT_MAX_ENTRIES`, `DEFAULT_MAX_DEPTH`, `DEFAULT_STAT_BATCH`, and reports `truncation {truncated, shown, depth, reason}` so the UI can say *"Showing N documents. Some folders are nested deeper than this search reaches."* / *"…This folder holds more files than one search can list."* (@234667).
- Serves cached entries instantly (`getCached`), revalidates in the background (`revalidate`, `whenIdle`), emits `library:updated`.

This matches the manual's *"shows the last known folders instantly while the fresh scan finishes in the background."*

### 8.4 Recovery journals

`flow-recovery.jsc`:

| Channel | Method |
|---|---|
| `flow:recovery-set-user` | `setUser` |
| `flow:recovery-write` | `write` |
| `flow:recovery-list` | `list` |
| `flow:recovery-read` | `read` |
| `flow:recovery-clear` | `clear` |
| `flow:recovery-clear-all-clean` | `clearAllCleanSync` (sync, `returnValue`) |

- Root: `app.getPath('userData')/halcyon-data/flow-journals`.
- Per-user subdir, user id sanitized by `[^A-Za-z0-9_.@-]` and validated `^[A-Za-z0-9_-]{1,128}$` — this is why *"your rounds… belong to whoever is signed in"*.
- Each journal is `<id>.json` written by `writeJsonAtomicSync`, payload `{version, roundJson, writtenAt, wasCollab}`.
- `wasCollab` is what powers *"the next launch offers to rejoin it, naming the host"*, and why a recovered collab round comes back **offline**.
- `runCleanRecoveryClear` on a clean `before-quit` wipes the journals, so an intentional quit produces no recovery offer.

Renderer side (`Jr()` @~1225000, accessed through `window.halcyonFlowRecovery`): each dirty round is debounced **3000 ms** (`Wr=3e3`) with a hard **15 000 ms** max-defer, then written as

```js
t.write(roundId, { roundJson: JSON.stringify(round), writtenAt: Date.now(),
                   wasCollab: !!(round._remote || round._peerFlow || round._shared) })
```

On restore (`qr()`), the round is deliberately stripped of `id`, `path`, `folderId`, `_remote`, `_peerFlow`, `_shared`, `collabRoom`, `roomId`, `ownerId` and tagged `_recovered/_recoveredAt` — which is exactly why a recovered collaboration round comes back as a fresh, offline, unsaved local round and cannot write stale state into its old room.

### 8.5 Autosave

`localStorage` snapshot is debounced 250 ms and force-flushed on window `blur` and `beforeunload` (`$m` @358800). The `.jflow` on disk is only rewritten on explicit Save / folder assignment; the journal is the continuous copy.

---

## 9. The Superflow / Docs bridge

Two independent transports:

- **Flow → Docs**: a plain HTTP client to Halcyon Docs' loopback API (`hal-connect.jsc`), scanning ports around `settings.halIpcPort` (default **53124**; `DEFAULT_PORT`, `PORT_RANGE`).
- **Docs → Flow**: Flow's own loopback HTTP server (`flow-connect-server.jsc`).

### 9.1 `superflow:*` channels (registered in `superflow-ipc.jsc`)

| Channel | Preload method | Payload → result | What it does |
|---|---|---|---|
| `superflow:chooseBlockFolder` | `chooseBlockFolder` | → `{canceled, folder}` | `dialog.showOpenDialog({properties:['openDirectory']})` — pick a `.hal`/evidence search folder |
| `superflow:indexBlocks` | `indexBlocks` | `{folders, force}` → index | walks the folders (`readdir {withFileTypes}`), reads `.hal` files, builds a token index (`buildHalIndex`, `indexFingerprint`, `ensureIndex`); `force` bypasses the fingerprint |
| `superflow:searchBlocks` | `searchBlocks` | `{query, folders}` → `{results}` | `searchIndex` over the token index (tokenizer `[^a-z0-9]+`), matches tag/`cite` |
| `superflow:listHalFiles` | `listHalFiles` | `{folders}` → `{files:[{path, relpath, filename, modifiedAt}]}` | `\.hal$` scan with `mtimeMs`, `seenFiles` dedupe |
| `superflow:getHalOutline` | `getHalOutline` | `{path}` → outline | unzip a `.hal` (JSZip), read `manifest.json` + `document.json`, produce the block/card/tag/analytic outline (`outlineFromDocument`, `objectsFromDocument`). Errors `not_found`, `not_hal`. LRU-cached (`OUTLINE_CACHE_MAX`, `outlineCacheGet/Put`) |
| `superflow:getHalOutlines` | `getHalOutlines` | `{paths}` → outlines[] | batch form |
| `superflow:readDocxBytes` | `readDocxBytes` | `{path}` → `{bytes}` | raw bytes so the **renderer** converts DOCX/CMIR in memory (error string `Empty or invalid docx bytes`) — the source file is never opened or modified |
| `superflow:hal:probe` | `halProbe` | → `{state}` | `GET 127.0.0.1:<port>/api/v1/ping`, then `/api/v1/documents`. States: `NOT_RUNNING`, `NO_DOCUMENTS`, `HAS_DOCUMENTS`, `ERROR` |
| `superflow:hal:listDocuments` | `halListDocuments` | → `{documents:[{documentId, …}]}` | `GET /api/v1/documents` — feeds the toolbar **`Doc:`** selector |
| `superflow:hal:autodetect` | `halAutodetect` | → port/state | sweeps `PORT_RANGE` and verifies the peer identifies as `halcyon-docs` (`pingIsHalcyonDocs`); returns `no_documents` / `has_documents` |
| `superflow:hal:sendItems` | `halSendItems` | `{documentId, items}` → `{inserted}` | `POST /api/v1/documents/<id>/insert`. Errors `insert_failed`, `HTTP <code>` |
| `superflow:hal:scan` | `halScanDocument` | `{documentId}` → `{cards, texts}` | `POST /api/v1/documents/<id>/scan` — used by **Construct Speech** to skip content the document already has. Errors `scan_failed`, `bad_response` |
| `superflow:hal:getStyles` | `halGetStyles` | → `{version, styles, keymap, fontFamily, basePt, appearance, tokens, overrideClasses, hlPalette}` | `GET /api/v1/styles` — the live "Docs styling match" |
| `superflow:hal:stylesAtRest` | `halGetStylesAtRest` | → `{styles}` | handled in `main.jsc` via `hal-at-rest.jsc`: reads `styles-snapshot.json` from the **Halcyon Docs data dir** (`%APPDATA%/Halcyon Docs/halcyon-data`, `~/Library/Application Support/…`, `$XDG_CONFIG_HOME/…`). Warns `[hal-at-rest] could not read Halcyon Docs style snapshot:` / `malformed…`. This is the "from its last-known styling when Docs is closed" path |
| `superflow:hal:switchToDocs` | `switchToDocs` | → ok / `not_running` | `POST /api/v1/focus` on the Docs server (`Ctrl+Shift+T`) |
| `superflow:hal:openAt` | `openDocsAt` | `{path, nodeId}` | `POST /api/v1/open-at`. Errors `no_path`, `not_supported` (DOCX has no stable anchor), `open_failed` |

### 9.2 `flow:send-to-cell` / `flow:send-to-cell-ack` (Docs → Flow)

`flow-connect-server.jsc` starts a loopback `http.createServer` on a `PORTS` list:

- Origin guard `originAllowed`: hostname must be `127.0.0.1`, `localhost` or `[::1]`; otherwise `403 forbidden_origin`. `Access-Control-Allow-Origin: http://127.0.0.1`. `MAX_BODY` cap → `bad_request` / `bad_payload`.
- `GET /api/v1/ping` → `{version, ports, …, "halcyon-flow"}` — the identity the Docs side checks.
- `POST /api/v1/focus` → `requestFocus` → `raiseWindow` (`setAlwaysOnTop` steal + `moveTop`).
- `POST /api/v1/send-to-cell` → `receiveSendToCell`. `no_window` if nothing is open; `tryNext`/`onError` walk the port list at startup.

Main forwards to the renderer over **`flow:send-to-cell`** (`onSendToCell`) and awaits **`flow:send-to-cell-ack`** (`ackSendToCell`). `send-ack.jsc` is a dedicated `createSendAckCoordinator` with `nextId`/`ackId`, a `DEFAULT_TIMEOUT_MS` and an `UNCONFIRMED` outcome, so **Docs is told, truthfully, whether the card actually landed** — that's the manual's *"Halcyon Docs reports the same result on its side, so both apps agree on what happened."* If nothing can accept it (dashboard, sheet changed mid-flight), it is held and delivered when a round opens.

### 9.3 Peer discovery

`halcyon-shared.jsc` writes `connect.json` in `halcyon-shared` and `announceConnect`s the `peerConnectPort` on an interval, cleaned up on `will-quit`. `superflow-ipc` reads `peerConnectPort` from the same place. So the two apps find each other through a shared file, then talk over loopback HTTP.

### 9.4 Sending

- **`Send to Doc` (`Ctrl+Shift+D`)** — sends the active speech column (or just the selected range) to the document chosen in the `Doc:` selector. Empty cells between content become blank lines.
- **`Construct Speech` (`Ctrl+Shift+S`)** — builds the selected speech across **all** sheets into the document in one pass, using `hal:scan` to skip what's already there.
- **Signposting** — `signpostOnSend`, template `signpostTemplate` (default `` `'{left}'` ``), `numberSignposting`, `signpostSpeeches` per-speech overrides. Default behavior is **side-based**: only your competing side's sheets get signposts (all sheets when you are not competing); `overrideSideSignposting` forces all.
- **Send style** — `selectedSendStyle` default `Analytic`.
- **Backflow (`Ctrl+Shift+F`)** is the inverse *within* Flow: expands block chips in a speech column back into their constituent cards and analytics across every sheet, as one undo step.

---

## 10. Blocks / evidence search panel

### 10.1 Block picker (`Ctrl+B`)

Opens over `settings.halSearchFolders` (Settings ▸ Editing ▸ `Doc Folders`). Flow:
document list → pick a document → outline with search + kind filters → `Insert` (or double-click).

- Source formats: Halcyon `.hal`, Word `.docx` (chip `DOCX`), CardMirror `.cmir` (chip `CMIR`). `docSearchIncludeDocx` / `docSearchIncludeCmir` toggle the latter two. DOCX/CMIR are converted **in memory** from `readDocxBytes` — the source file is never opened or written.
- Recognized structure: **Pocket, Hat, Block, Tag, Cite, Analytic** (`hal-index.jsc` strings: `pocket`, `block`, `analytic_unit`, `analytic`, `cite_paragraph`, `cite_mark`, `roots`, `label`, `(untitled)`). A Pocket or Hat inserts as a plain text cell.
- Insert produces the corresponding cell kind: `block` cell (with `children`), `card` cell, or plain `text`.
- `Open At` → `superflow:hal:openAt`; available for `.hal` and `.cmir` when Docs is running, never for `.docx`.
- Navigation: `↑`/`↓` over **all** results (not just rendered ones), `Home`/`End` jump to ends, `End` keeps following the tail while a `By content` search is still streaming. `Enter` opens the highlighted row.
- `Pin` (bottom-right, beside `Insert`) → the `Pinned` list at the top, persisted as `state.searchPins` (`spin_${Date.now()}_${n}`) with `addSearchPin`/`removeSearchPin`. Pinned rows carry the same `BLK` / `CARD` / `TAG` chip and have their own `Add` button.
- `autoExpandSearchResults` (default on) and `halSearchCacheSize` (default 24 documents) tune it. `advanceAfterInsert` (default on) moves to the next cell after insertion.
- Images in inserted cards/analytics/headings are copied into the round and survive Backflow, editing, save/reopen, and collaboration — hence `mediaId` on the PM image nodes.

### 10.2 Inline "/" search

Typing `/` as the first character of a cell opens a search directly under the cell: filter documents by name → `Enter` to dive in → filter that document's blocks and standalone tags → `Enter` to insert. The armed text renders in the accent color. `Esc` steps back one level, `Esc` again abandons the search and keeps the literal `/` text. `insert.slashBlockSearch` (Command Search: `Insert Block from File…`) arms the same thing on the active cell.

Truncation is surfaced honestly rather than silently (see §8.3).

### 10.3 Block inline editor and card editor

`Ctrl+E` / double-click opens a block's inline editor **in the grid** for editing its child cards and analytics. `Ctrl+Shift+B` converts the current cell into a block; `Ctrl+Shift+C` creates an empty card (`it()` @214300 makes `{kind:"card", card:{tag:"",cite:"",modified:true}}`) and immediately opens the card editor via `halcyon-flow-edit-card`.

The grid ↔ editor boundary is entirely `CustomEvent`-based: `halcyon-flow-open-block-picker`, `halcyon-flow-edit-block`, `halcyon-flow-create-block`, `halcyon-flow-set-rich-cell`, `halcyon-flow-edit-card`, `halcyon-flow-construct-speech`, `halcyon-flow-block-edit-focus-first`, `halcyon-flow-reload-grid`, `halcyon-flow-remote-cell-edit`, `halcyon-flow-export-round-html`, `halcyon-flow-export-round-xlsx`.

---

## 11. Collaboration

### 11.1 Transport

```js
Ch = env("VITE_AUTH_URL",        "https://app.halcyondebate.org/auth")
wh = env("VITE_COLLAB_URL_FLOW", "wss://app.halcyondebate.org/flow")
env("VITE_SERVER_CERT_SHA256", "sha256/RPzXXba1cHpFu4hCmxEBNoVe8XSk7/NWwK4h7I+LGHo=")   // cert pinning
```

Provider construction @550645:

```js
new WebsocketProvider(wh, roomId, ydoc, { connect:false, params:{ token }, maxBackoffTime:15000 })
```

Connection is deliberately deferred until a fresh access token is available (`G()` refreshes, sets `B.params={token}`, then connects). Close codes: **4401** = token rejected → refresh once, else `status:"expired"`; **4409** = *"This account is already in the room on another window or device."* A watchdog (`Yy = 18000` ms) retries twice then reports *"Could not connect to the room - the server may be unreachable."* (host) or *"Could not sync with the room - the host flow may be too large for the server…"* (guest).

**There is no `y-indexeddb` and no `y-prosemirror` in the shipped renderer** — `grep` counts for `indexeddb`, `IndexeddbPersistence`, `ySyncPlugin`, `y-prosemirror` are all **0**. They are package.json dependencies that this bundle does not use. Offline durability is provided by localStorage + the recovery journal instead.

### 11.2 Yjs document layout

Namespaced per "flow slot" (`Yf()` @337800). The host owns the un-prefixed names; every guest flow is prefixed `flow:<ownerId>:`:

```js
HOST_SLOT = "__host__"
prefix(ownerId) = ownerId === "__host__" ? "" : `flow:${ownerId}:`

keys = {
  metaKey:   `${p}ymeta`,        // Y.Map
  sheetsKey: `${p}ysheets`,      // Y.Array<sheetId>  (sheet order)
  cellsKey:  `${p}ycells`,       // Y.Map<cellId, Y.Map>
  sheetKey:  id => `${p}ysheet:${id}`,   // Y.Map per sheet
}
cellId = (sheetId, speechKey, rowId) => `${sheetId}:${speechKey}:${rowId}`
"yflows"  // Y.Map<ownerId, {editable:boolean}> — the registry of shared flows
```

`ymeta` fields: `round_id`, `name`, `format`, `formatMode`, `pfSpeakerOrder`, `active_sheet_id`, `owner_name`.

`ysheet:<id>` fields: `name`, `side`, `type`, `order`, `needsName`, `speech_columns` (Y.Array), **`row_order` (Y.Array)**.

`ycells` entry (Y.Map): `sheet_id`, `speech_key`, `column_index`, `row_id`, `row_index`, **`text` (Y.Text)**, and `cell` (the serialized rich `Cell` JSON) when the cell is more than plain text. Empty cells are *deleted* rather than stored.

**This is where rows acquire identity.** `row_order` holds stable 8-char ids from alphabet `abcdefghijklmnopqrstuvwxyz0123456789` (`Qf()`), seeded lazily so index *n* starts out as the literal string `"n"` and only becomes a random id on collision (`ep()`). Concurrent row insert/delete is therefore an ordered-list edit rather than an index race — and the `.jflow` file, which is index-based, is reconstructed from `row_order` on read (`Dp()` @344900).

Cell text uses a minimal common-prefix/suffix diff (`cp()` @339300) so two people typing in the same cell merge character-wise instead of clobbering.

Row operations preserve undo semantics across the network: `insertRowsIn` returns `{rowIds, index, rowCount, insertedRows, droppedRows, restoredDroppedRowIds}` (rows pushed off the fixed 200-slot bottom are *captured*, not lost), and `undoInsertedRowsIn` / `redoInsertedRowsIn` restore them.

### 11.3 Roles, sharing, presence

- Host awareness `role:"owner"`, guests `role:"editor"`; presence field `presence.username` (default `Guest`), avatars drawn from awareness states.
- `publishFlow(round, ownerId, editable)` seeds a guest's own flow into `flow:<id>:*` and registers it in `yflows`. `setFlowEditable` flips `{editable:false}` → read-only for everyone but the owner ("Allow edits" checkbox).
- Guests get a **flow switcher** next to `Collaborate` listing `My Flow` plus every shared peer flow.
- Per-cell editing presence: a collaborator with a block/card open shows a pencil + name; nothing is locked.
- Status strings: `● Collaborate` / `○ Collaborate`, `Connected – N collaborators`, `Collaboration connection failed`, `Cannot join `.
- `LIVE` chips on dashboard cards for every flow in a live room.
- Remote edits fan out into the grid via `halcyon-flow-remote-cell-edit` and `halcyon-flow-reload-grid` CustomEvents; the grid diffs old vs. new column arrays and re-measures only changed rows.
- A collaborator deleting a block you have open produces *"This block was deleted by a collaborator – editor closed."*

### 11.4 `flow-connect-server`

Note this local HTTP server is the **Docs bridge** (§9.2), not the collaboration transport. Collaboration is entirely `wss://app.halcyondebate.org/flow`.

---

## 12. Export / print

| Format | Trigger | Implementation |
|---|---|---|
| **`.jflow` JSON** | round card `Save`, `flow:show-save` | `dr()` @243560, `JSON.stringify(…, null, 2)` |
| **Sheet CSV** | `Alt+E` | `cr()` @243100 — header row of speech names, one line per row, trailing all-empty rows trimmed, `"` doubled |
| **Round CSV** | `Alt+Shift+E` | `ur()` @243173 — round title + `"Judge(s): …"` header, then `=== Sheet Name ===` blocks separated by blank lines |
| **HTML** | Export menu → `Export as HTML` | @240639. Self-contained page: CSS grid per sheet, uppercase header cells, and an **SVG arrow overlay** for `extensionLinks` with `<marker id="arrow-aff">` / `arrow-neg`. Embeds the full round JSON in a `<script id="halcyon-flow-round-data">` so it **re-imports losslessly** |
| **XLSX** | Export menu → `Export as Excel…` | Hand-rolled OOXML through JSZip (`xl/worksheets`, `cellXfs`, `cellStyles`, `headerXf`/`bodyXf`). One worksheet per sheet; columns carry aff/neg/CX color with bold centered headers; cells wrap and vertically center. Text is **raw** — tags and blocks flatten to plain text, cards to their text content, no bold/underline/highlight |

**Import**: `Import Round` accepts `.jflow` and exported HTML (`gr()` @243723 — looks for `#halcyon-flow-round-data`, `#breakflow-round-data`, `#new-sheet-round-data`, else reconstructs from `<h1>`/`<title>`/`.meta`/`<section>` DOM). **`Merge Flow`** (toolbar) imports another round file and merges its sheets into the open round.

**There is no PDF or print path** — `print(` appears twice in the whole bundle and neither is a print action. HTML export is the print story.

---

## 13. Theming and design tokens

### 13.1 Base palettes (`Mn` @234667) — reproduced exactly

```js
dark: { bg:`#0a0a0a`, bgSecondary:`#111111`, bgTertiary:`#1a1a1a`, bgHover:`#161616`,
        bgActive:`#1a2a3a`, selection:`#1e3a5f`, border:`#222222`, borderSubtle:`#171717`,
        text:`#e0e0e0`, textMuted:`#888888`, textDim:`#444444`, success:`#34d399`,
        danger:`#ef4444`, warning:`#f59e0b`, input:`#1a1a1a`, aff:`#3b82f6`, neg:`#ef4444`,
        block:`#ef4444`, cx:`#34d399`, caret:`#ffffff` }

light:{ bg:`#ffffff`, bgSecondary:`#f5f5f5`, bgTertiary:`#ebebeb`, bgHover:`#f0f0f0`,
        bgActive:`#dbeafe`, selection:`#bfdbfe`, border:`#e0e0e0`, borderSubtle:`#eeeeee`,
        text:`#111111`, textMuted:`#6a6a6a`, textDim:`#bbbbbb`, success:`#065f46`,
        danger:`#b91c1c`, warning:`#b45309`, input:`#f5f5f5`, aff:`#1d4ed8`, neg:`#b91c1c`,
        block:`#b91c1c`, cx:`#065f46`, caret:`#000000` }
```

`settings.theme` ∈ `light | dark | system` (`system` reads `matchMedia('(prefers-color-scheme: dark)')`).

Accent (`Bn`/`Hn` @236500): default `#6EB5C0` light, `#3b82f6` dark. `settings.mainColor` overrides, but only if it isn't one of the legacy defaults `{#6eb5c0, #3b82f6, #1d4ed8, #5b8cff}`.

### 13.2 UI styles (`Cb` @565029) — 11 total

```js
[[`modern`,`Modern`],[`classicWin`,`Classic Windows`],[`courtroom`,`Courtroom`],
 [`crtRiot`,`CRT Riot`],[`hazmatPop`,`Hazmat Pop`],[`holoLedger`,`Holo Ledger`],
 [`paperKnife`,`Paper Knife`],[`fortnite`,`Fortnite`],[`minecraft`,`Minecraft`],
 [`overwatch`,`Overwatch`],[`csgo`,`CS:GO`]]
```

Six retired ids fall back to `modern`: `wb = new Set([compact, softGray, terminal, cyberInk, blueprint, monoPro])`.

Each style is a token bundle (`Tb()` @565414): `fontFamily, appBg, appBackgroundImage, appBackgroundSize, appBackgroundPosition, panelBackgroundImage, toolbarBg, toolbarShadow, panelBg, cardBg, inputBg, border, borderSubtle, radius, cardRadius, toolbarHeight, tabHeight, statusHeight, buttonPadding, buttonBg, buttonColor, buttonBorder, buttonShadow, cardShadow, modalShadow, tabActiveBg, tabInactiveBg, tabActiveShadow, headerWeight, uppercaseLabels`.

Style-specific aff/neg overrides (`In` @235023):

```js
courtroom:{aff:`#244c7a`,neg:`#8f1d2c`}  crtRiot:{aff:`#00d1b2`,neg:`#ff2c55`}
hazmatPop:{aff:`#167a2f`,neg:`#ff4d00`}  holoLedger:{aff:`#0891b2`,neg:`#d946ef`}
paperKnife:{aff:`#31572c`,neg:`#d5003e`} fortnite:{aff:`#0a8fea`,neg:`#d69b00`}
minecraft:{aff:`#2f7d32`,neg:`#9a5a2d`}  overwatch:{aff:`#2f80ed`,neg:`#d98200`}
csgo:{aff:`#d8d2c5`,neg:`#d49a2a`}
```

### 13.3 `minecraft-background.png`

Answered definitively — it is the wallpaper for the **Minecraft UI style**, not an easter egg:

```js
var Sb = ""+new URL(`minecraft-background-V0u2tbdL.png`, import.meta.url).href;   // @565029
…
r===`minecraft` ? { id:r, fontFamily:`Verdana, "Trebuchet MS", Arial, sans-serif`,
  appBg: i?`#1f1f1f`:`#5f7da8`,
  appBackgroundImage:`linear-gradient(rgba(0,0,0,${i?.46:.16}), rgba(0,0,0,${i?.46:.16})), url(${Sb})`,
  appBackgroundSize:`cover`, appBackgroundPosition:`center`,
  radius:0, cardRadius:0, toolbarHeight:42, tabHeight:34, … }   // @578555
```

A darkening scrim (46% dark / 16% light) over a cover-positioned photo, with square corners and chunky Verdana chrome. `crtRiot` (scanlines), `hazmatPop` (hazard stripes) and `holoLedger` (holographic sweep) use pure-CSS `appBackgroundImage` gradients instead of a raster asset.

### 13.4 CSS custom properties (`index-CLyV9Lbm.css`, complete)

| Property | Default | Purpose |
|---|---|---|
| `--sd-emphasis-box` | `#000`, `#888` under `prefers-color-scheme: dark` | emphasis box color when Docs styling is unavailable |
| `--sd-hl-extend` | `0px` | extra highlight vertical padding, used to equalize highlight height across mixed font sizes |
| `--sd-box-w` | `calc(var(--sd-zoom,1) * 1pt)` | emphasis box thickness |
| `--sd-ul-w` | `calc(var(--sd-zoom,1) * 1px)` | debate underline thickness |
| `--sd-zoom` | `1` | master zoom multiplier for every pt/px mark |
| `--hl` | — | current highlight fill, set per mark |
| `--sd-hl-pad-top` / `--sd-hl-pad-bottom` | derived | asymmetric highlight padding |
| `--sd-card-selection` | `#5a8cf552` | selection tint inside `.sd-card-pm` |
| `--sd-max-text-width` | `none` | `settings.maximumTextWidth` |
| `--sd-text-column-margin-left` / `-right` | `0` | `settings.textColumnPosition` |
| `--sd-scrollbar-w` | `11px` | `settings.scrollbarWidth` |
| `--sd-scrollbar-thumb` | `#80808059` | `settings.scrollbarColor` |
| `--sd-scrollbar-thumb-hover` | `#8080808c` | |

Notable rules: `box-decoration-break: clone` on `mark` so wrapped highlights keep full padding on every line; `font-variant-ligatures: none` on all marked text so character offsets in `underlineRanges` stay aligned with rendered glyphs; `text-decoration-skip-ink: none` so underlines don't break on descenders; `.sd-toolbar-row` / `.sd-status-row` get a 7/11-scale horizontal scrollbar.

---

## 14. Settings

Complete default object `Km` @360417, plus the searchable-row registry @1312780 (69 rows, `s <query>` in Command Search jumps to them).

### General (`display`)

| Key | Default | Label |
|---|---|---|
| `debateFormat` | `policy` | Default Format |
| `checkForUpdatesOnLaunch` | `true` | Check for Updates on Launch |
| `keepRunningInBackground` | `true` | Keep running in the background when closed |
| `textWrap` | `true` | Text Wrap |
| `showFullBlock` | `false` | Show Full Block Label (`2NC/1NR` vs `2NC`) |
| `coloredColumnBackgrounds` | `false` | Colored Column Backgrounds |
| `colorblindMode` | `false` | Colorblind Mode (tab side chips) |
| `enterSpacing` | `0` | Backflow Row Gap |
| `colWidth` | `220` | Column Width (px) |
| `rowHeight` | `22` | Row Height (px) |
| `fontSize` | `12` | Font Size (pt) |
| `enterRowCreationMode` | `contextual` | Enter row creation (`contextual`\|`off`\|`scope`) |
| `enterRowScopeColumn` | `0` | Auto-row scope starts at (0–31) |
| `rowInsertUndoSelection` | `keep` | After undoing a row addition (`keep`\|`start`) |
| `readers` | `[{id:"reader_default",name:"Reader",wpm:300}]` | Read Time |
| `readTimeOnCellHover` | `true` | Show read time on cell hover |
| `tutorialCompleted` | `false` | — |
| `keyboardMode` | `sm()` (platform) | `mac` \| `windows` |
| — | — | `Report a Bug`, `Suggest a Feature`, `Reset All Settings` |

### Appearance

| Key | Default |
|---|---|
| `theme` | `light` |
| `uiStyle` | `modern` |
| `uiFont` | `Inter, system-ui, sans-serif` |
| `folderPanelWidth` | `240` |
| `fontFamily` (Flow Font) | `Arial, sans-serif` |
| `activeCellStyle` | `outlineBlack` (also `outlineBlue`, `custom`; legacy `filledBlue` migrates to `outlineBlack`) |
| `activeCellBorderColor` | `#6EB5C0` |
| `activeCellFillColor` | `#dbeafe` |
| `mainColor` | `""` |
| `affColor` | `#1d4ed8` |
| `negColor` | `#b91c1c` |
| `highlightColor` | `#fde047` |
| `chipColor` | `#6b7280` |
| `blockChipColor` / `blockTextColor` | `#6c5ce7` / `#ffffff` |
| `cardChipColor` / `cardTextColor` | `#1e8e6b` / `#ffffff` |
| `tagChipColor` / `tagTextColor` | `#b45309` / `#ffffff` |
| `dashboardFormatChipColor` | `#7c3aed` |
| `dashboardTournamentChipColor` | `#0d9488` |
| `maximumTextWidth` | `0` (0 = full width) |
| `textColumnPosition` | `Centered` \| `Left` \| `Right` |
| `scrollbarWidth` | `thin` (or `standard`) |
| `scrollbarColor` | `""` (Auto) |
| `ulThickness` | `1` px |
| `boxThickness` | `1` pt |
| `ulZoomScale` / `boxZoomScale` | `100` % (0–200 in 25% steps) |
| `sheetTabPosition` | `top` |

### Editing (`logistics`)

| Key | Default |
|---|---|
| `documentTarget` | `hal` |
| `selectedSendStyle` | `Analytic` |
| `halIpcPort` | `53124` |
| `halSearchFolders` | `[]` (legacy `halSearchFolder`, `blockSearchFolder`) |
| `workingFolder` | `""` |
| `selectedDocumentId` | `""` |
| `halSearchCacheSize` | `24` |
| `docSearchIncludeDocx` | `true` |
| `docSearchIncludeCmir` | `true` |
| `caretWordMarks` | `true` |
| `autoExpandSearchResults` | `true` |
| `advanceAfterInsert` | `true` |
| `signpostOnSend` | `false` |
| `signpostTemplate` | `` `'{left}'` `` |
| `numberSignposting` | `false` |
| `overrideSideSignposting` | `false` |
| `signpostSpeeches` | `{}` |
| `shorthandsEnabled` | `true` |
| `shorthandImmediate` | `true` |
| `shorthandCaseAgnostic` | `false` |
| `shorthandPluralize` | `true` |
| `curlyQuotes` | `false` |
| `customFormats` | `{}` |
| `formatColumnOverrides` | `{}` |
| `shadowFlow` | `false` |

Shorthands expand as you type in grid cells (e.g. trigger `T` → `Topicality`), with immediate/case-sensitivity/pluralize options; editor at `Ctrl+Shift+K`. Curly-quote conversion is `Ub()` (`replace(/[‘’‚‛“”„‟––…]/g, …)`).

### Timer
See §7.2.

### Keybindings
Full rebind list, conflicts flagged; `Ctrl+K`.

---

## 15. Accounts / auth

### 15.1 Auth service

Base `https://app.halcyondebate.org/auth`, every request carrying `x-halcyon-app: flow` and `x-halcyon-client-version: <semver>` (`Ah()` @400600). Endpoints (`Fh` @401644):

```
/update-policy      /login              /2fa/verify         /2fa/resend
/2fa/email/request  /2fa/email/confirm  /2fa/email/clear    /refresh
/session (GET)      /logout             /request-reset      /confirm-reset
/change-password    /change-username    /avatar
/request-password-change  /confirm-password-change
/verify-email       /resend-verification
/request-email-change     /confirm-email-change
/request-secure-change    /referral/validate/:code (GET)   /referral/code (GET)
/stripe/portal (GET)      /legal (GET)    /legal/sign
/bug-report         /feature-request
```

`login` body: `{usernameOrEmail, password, app:"flow", deviceId?, deviceName?, takeover?:true}` — `takeover` is the *"Sign Out Other Device & Continue"* path, gated behind an emailed one-time code. `twoFactorRequired` on the response drives the 2FA screen. `/update-policy` returns `{minimumVersion, mandatory}` and can force an update via `globalThis.halcyonMandatoryUpdate.require()`.

Single-session enforcement is server-side; one account may run Flow **and** Docs on the same device, but a second device is blocked.

Session expiry is *not* time-based; a 7-day (`Rh = 10080*60*1000`) verification watchdog flips `status:"expired"` with `error:"verification_required"` only when re-verification never succeeds. Manual: *"If Halcyon cannot re-verify an open session for 15 minutes, the sign-in screen returns over your saved work, and it lifts by itself once the connection is back."*

Entitlements: `Yh()` maps `{authorized, accessUntil}` → `{authorized, paid, accessUntil, plan}`; `Zh()` gates on `features.flow !== false`. Stripe is present only as `/stripe/portal`.

### 15.2 Token storage — `secure-store-*`

`main.jsc` implements three channels backed by Electron `safeStorage`:

```
secure-store-get / secure-store-set / secure-store-clear
→ readSecureFile / writeSecureFile → halcyon.secure.json  (atomicFile.cjs)
→ safeStorage.isEncryptionAvailable / encryptString / decryptString, base64
```

Exposed to the renderer as `globalThis.halcyonSecure`. Only the **refresh token** (key `halcyon.refresh`, `Ih`) goes through it; the access token stays in memory. `Uh` is an in-memory fallback for when `halcyonSecure` is absent (web/dev). Device id is `halcyon.cardshare.deviceId` in localStorage, reconciled against a machine-level identity through `halcyon:device-id-resolve` → `halcyon-shared/device.json` (`{deviceId, authority, updatedAt, appId}`), with `host:device-name` supplying a friendly name (`Windows`/`macOS`/`Linux` + hostname).

Certificate pinning is live (`certPin.cjs`, `VITE_SERVER_CERT_SHA256`), and `main.jsc` injects permissive CORS headers only for `https://app.halcyondebate.org/*`.

### 15.3 Tray account channels

- **`flow:set-tray-account`** (`setTrayAccount`) — renderer → main after sign-in/out, so `buildTrayMenu` can render `Signed in as <name>` or `Signed out`.
- **`flow:tray-sign-out`** (`onTraySignOut`) — main → renderer when the user picks `Sign out` from the tray. `pendingTraySignOut` queues it if no window is listening yet.

---

## 16. Tray / background residence

`main.jsc`: `ensureTray`, `syncTray`, `buildTrayMenu`, `trayWanted`, `quitFromTray`, `realQuit`, `showAllWindows`.

Menu (verbatim):

```
Open Halcyon Flow
─────────────────
Signed in as <username>      (disabled label; "Signed out" otherwise)
Sign out
─────────────────
Quit Halcyon Flow
```

Tooltip `Halcyon Flow`; `double-click` opens the window. Icons: `assets/trayTemplate.png` + `@2x` with `nativeImage.setTemplateImage(true)` on macOS (monochrome, follows menu-bar appearance), `build/icon.ico` / `icon.png` elsewhere. `app.setAppUserModelId('com.halcyon.flow')`.

**`flow:set-background-residence`** (`setBackgroundResidence`) mirrors `settings.keepRunningInBackground` (default `true`) into the main process, which then decides `window-all-closed` behavior:

- Windows/Linux, residence **on** — closing the last window keeps the process alive so the session stays signed in and collaboration stays connected; the tray icon remains.
- Windows/Linux, residence **off** — the close button exits.
- macOS — the window close always leaves the app in the Dock; `Cmd+Q` quits, per platform convention. The setting only shows/hides the status item.

Single-instance is enforced (`requestSingleInstanceLock`, `HALCYON_INSTANCE`, `second-instance` → focus + deliver the dropped path). `before-quit` sets `cleanShutdownRan` and runs `runCleanRecoveryClear`, which is exactly why a deliberate quit produces no crash-recovery offer.

---

## Appendix A — complete preload surface

Recovered from `preload.jsc`'s constant pool, where each IPC channel string sits immediately before the method name it is exposed as.

Exposed globals: `halcyonRuntimeSecurity`, `halcyonMandatoryUpdate`, `halcyonDeviceIdentity`, `halcyonFlowRecovery`, `halcyonFlowCrash`, `halcyonFlowDesktop` (with nested `platform`, `superflow`, `flowFiles`), `halcyonSecure`.

| Channel | Method | Group |
|---|---|---|
| `halcyon:runtime-security` (sendSync) | — | security |
| `host:require-update` | — | update policy |
| `halcyon:device-id-resolve` | — | identity |
| `flow:recovery-set-user` | `setUser` | recovery |
| `flow:recovery-write` / `-list` / `-read` / `-clear` | `write` (confirmed at the renderer call site); `list`/`read`/`clear` **(inference)** — too short to survive the bytecode string scan | recovery |
| `flow:recovery-clear-all-clean` | `clearAllCleanSync` | recovery |
| `flow:log-error` | `logError` | crash |
| `flow:set-background-residence` | `setBackgroundResidence` | tray |
| `flow:set-tray-account` | `setTrayAccount` | tray |
| `flow:tray-sign-out` | `onTraySignOut` | tray |
| `host:device-name` | `deviceName` | identity |
| `open-external` | `openExternal` | shell |
| `menu:command` | `onMenuCommand` | menu |
| `host:set-menu-bindings` | `setMenuBindings` | menu |
| `host:is-first-window` | `isFirstWindow` | window |
| `host:trigger-auto-update-check` | `triggerAutoUpdateCheck` | update |
| `superflow:hal:switchToDocs` | `switchToDocs` | docs bridge |
| `superflow:hal:openAt` | `openDocsAt` | docs bridge |
| `flow:update-status` | `onUpdateStatus` | update |
| `host:get-update-state` | `getUpdateState` | update |
| `host:get-update-pause` | `getUpdatePauseState` | update |
| `host:pause-updates` | `pauseUpdatesForWeek` | update |
| `host:resume-updates` | `resumeUpdates` | update |
| `host:update-quit-and-install` | `updateQuitAndInstall` | update |
| `host:update-download-mac` | `updateDownloadMac` | update |
| `flow:open-file` | `onOpenFile` | files |
| `get-pending-open-path` | `getPendingOpenFile` | files |
| `flow:renderer-ready` | `signalReady` | lifecycle |
| `halcyon-clipboard-write-sync` | `writeClipboard` | clipboard |
| `flow:send-to-cell` | `onSendToCell` | docs bridge |
| `flow:send-to-cell-ack` | `ackSendToCell` | docs bridge |
| `superflow:chooseBlockFolder` | `chooseBlockFolder` | superflow |
| `superflow:indexBlocks` | `indexBlocks` | superflow |
| `superflow:searchBlocks` | `searchBlocks` | superflow |
| `superflow:listHalFiles` | `listHalFiles` | superflow |
| `library:list` | `libraryList` | library |
| `library:status` | `libraryStatus` | library |
| `library:updated` | `onLibraryUpdated` | library |
| `superflow:getHalOutline` / `getHalOutlines` | `getHalOutline` / `getHalOutlines` | superflow |
| `superflow:readDocxBytes` | `readDocxBytes` | superflow |
| `superflow:hal:probe` | `halProbe` | docs bridge |
| `superflow:hal:listDocuments` | `halListDocuments` | docs bridge |
| `superflow:hal:autodetect` | `halAutodetect` | docs bridge |
| `superflow:hal:sendItems` | `halSendItems` | docs bridge |
| `superflow:hal:scan` | `halScanDocument` | docs bridge |
| `superflow:hal:getStyles` | `halGetStyles` | docs bridge |
| `superflow:hal:stylesAtRest` | `halGetStylesAtRest` | docs bridge |
| `flow:set-working-folder` | `setWorkingFolder` | files |
| `flow:choose-working-folder` | `chooseWorkingFolder` | files |
| `flow:mkdir` | `mkdir` | files |
| `flow:list-subdirs` | `listSubdirs` | files |
| `flow:list-rounds` | `listRounds` | files |
| `flow:path-exists` | `pathExists` | files |
| `flow:read-file` | `readFile` | files |
| `flow:write-file` | `writeFile` | files |
| `flow:move-file` | `moveFile` | files |
| `flow:move-dir` | `moveDir` | files |
| `flow:trash-file` | `trashFile` | files |
| `flow:show-save` | `showSave` | files |
| `halcyon:timer-read` / `-write` / `-changed` | `timerRead` / `timerWrite` / `onTimerChanged` | timer |
| `halcyon:timer-popout-open` / `-close` / `-state` / `-changed` | `openTimerPopout` / `closeTimerPopout` / `timerPopoutOpen` / `onTimerPopoutChanged` | timer |
| `halcyon:folder-read` / `-write` / `-changed` | `folderRead` / `folderWrite` / `onFolderChanged` | shared prefs |
| `halcyon:personal-read` / `-write` / `-changed` | `personalRead` / `personalWrite` / `onPersonalChanged` | shared prefs |
| `halcyon:readers-read` / `-write` / `-changed` | `readersRead` / `readersWrite` / `onReadersChanged` | shared prefs |
| `secure-store-get` / `-set` / `-clear` | (on `halcyonSecure`) | auth |

The `halcyon:folder-*`, `halcyon:personal-*` and `halcyon:readers-*` triples are the cross-app shared-preference bus, each backed by a watched JSON file in `appData/halcyon-shared` (`searchfolder.json`, `personal.json`, `readers.json`, `timer.json`, plus `connect.json` and `device.json`).

## Appendix B — auto-update

Downloads happen silently. `flow:update-status` drives an `Update ready` chip in the status bar (hover for the version, click to install). On Windows/Linux, quitting normally also applies a downloaded update. On macOS an unsigned build runs a bespoke swap (`mac-zip-swap.cjs`: verify architecture-specific artifact, close, replace a writable installed app, re-verify bytecode, relaunch); a translocated/read-only/failed-verification app instead gets the matching `.dmg` opened for manual replacement. Signed+notarized builds use the native updater. `Pause update checks for 1 week` / `Resume now`; `Help ▸ Check for Updates…` still works while paused.

## Appendix C — things I could not determine

- The `.hal` `annotations.byCard[sid]` sub-schema is read (`extensions`, `notes`) but its writer lives in Halcyon Docs.
- `formatColumnOverrides[*].modes` / `teams` / `teamOf` / `multiTeam` are fully parsed by `Se()` but no built-in format ships with `modes` populated except PF's implicit `aff_first`/`neg_first`, so the multi-team UI is **(inference)** reachable only through custom formats.
- The exact wire shape of `superflow:hal:sendItems`' `items[]` — the field names live on the Docs side of `/api/v1/documents/:id/insert`.
- `settings.documentTarget` has only the value `hal` in this build; **(inference)** it is a seam for other document backends.
