# Task Board

Source of truth for scope. The Orchestrator reads this every tick; `.loop/state.json` holds
status. Edit this file to change scope — never let an agent widen a task in place.

**Field meanings**

- `deps` — task ids that must be `done` first.
- `touches` — the **only** paths a Builder may modify. Two tasks run in parallel only if their
  `touches` are disjoint.
- `deps+` — new npm dependencies this task may add. Anything else fails gate G0.4.
- `spec` — the normative sections a Builder and Verifier must read.
- `gates` — which QA gates apply. The rest are `n/a`.
- `size` — S ≤ 1 builder-hour, M ≤ 4, L > 4. Tasks larger than L must be split.

---

## Phase P0 — Foundations

### P0-01 · Monorepo skeleton
`deps:` — · `size:` M · `gates:` G0, G7
`touches:` `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `.github/`, `vitest.config.ts`, `playwright.config.ts`
`deps+:` pnpm, typescript@5.7, vite@6, vitest, playwright, electron@42, eslint, prettier
`spec:` `00-MASTER-PLAN.md` §3

pnpm workspace with `apps/docs`, `apps/flow`, `packages/formats`, `packages/bridge`, `packages/ui`.
Root scripts `typecheck`, `lint`, `build`, `test`, `e2e` that fan out to every workspace. CI runs
all five on push.

**Accept:** all five root scripts exit 0 on an empty tree. CI green. TypeScript strict everywhere.

### P0-02 · Vendor CardMirror
`deps:` P0-01 · `size:` M · `gates:` G0, G7
`touches:` `apps/docs/**`, `LICENSE.md`, `THIRD-PARTY-NOTICES.md`, `NOTICE.md`
`deps+:` CardMirror's full dependency set, versions pinned exactly as upstream
`spec:` `spec/SPEC-CARDMIRROR-BASELINE.md`, `DECISIONS.md` §D1

Import CardMirror `0.1.0-beta.30` into `apps/docs`. Preserve the exact `loro-crdt` pin **and its
local patch**. Ship PolyForm Noncommercial 1.0.0 unmodified, reproduce the `Required Notice:`
block verbatim, carry `THIRD-PARTY-NOTICES.md` forward.

**Accept:** `apps/docs` builds and launches. Its own test suite passes unmodified. License files
present and correct.

### P0-03 · Replace the icon set
`deps:` P0-02 · `size:` M · `gates:` G0, G6
`touches:` `apps/docs/src/editor/icons.css`, `packages/ui/icons/**`, `THIRD-PARTY-NOTICES.md`
`deps+:` an icon set under a redistributable license (Lucide or Feather preferred)
`spec:` `DECISIONS.md` §D1

CardMirror's committed `icons.css` embeds Untitled UI icons, which **may not be redistributed even
modified**. Replace every one. This is a distribution blocker, which is why it is in P0 rather
than at packaging.

**Accept:** zero Untitled UI assets remain anywhere in the tree. Every icon renders. New license
recorded in `THIRD-PARTY-NOTICES.md`.

### P0-04 · Flow app shell
`deps:` P0-01 · `size:` M · `gates:` G0
`touches:` `apps/flow/**`
`deps+:` — (inherit root)
`spec:` `spec/SPEC-FLOW.md` §1

Electron + Vite + vanilla TS shell for Flow. Window, menu, dev/prod builds. **No React, no
zustand** — see `DECISIONS.md`.

**Accept:** `pnpm --filter flow dev` opens a window rendering a placeholder. Production build
launches.

### P0-05 · Design tokens
`deps:` P0-01 · `size:` S · `gates:` G0, G6
`touches:` `packages/ui/tokens/**`
`spec:` `reference/upstream-flow.css`, `reference/upstream-docs.css`

Transcribe every CSS custom property and every theme from the shipped upstream stylesheets. Exact
values — do not round, rename, or "improve" them.

**Accept:** a token diff against both upstream CSS files reports zero differences in value.

---

## Phase P1 — File formats

Do these before any UI. Everything downstream depends on the model, and format bugs found in P5
are expensive.

### P1-01 · `.mxflow` round model + codec
`deps:` P0-01 · `size:` L · `gates:` G0, G1, G3, G4
`touches:` `packages/formats/src/mxflow/**`, `packages/formats/tests/mxflow/**`
`spec:` `spec/SPEC-FLOW.md` §2, `00-MASTER-PLAN.md` §5

TypeScript types and a reader/writer for the round format. **Column-major**: a `Sheet` has
`speeches: string[]` and `grid: Record<speechKey, CellValue[]>` with fixed 200-slot arrays. No
`columns[]`, no `rows[]`. `CellValue = string | Cell`, and the writer must collapse unstyled cells
back to bare strings. Rich formatting lives in character-offset range arrays, not inline markup.
Emit `schemaVersion: 12`; read 1 through 12.

**Accept:** round-trips `reference/fixtures/upstream/new-template.jflow` losslessly. Unstyled
cells serialize as bare strings. Unknown fields survive. Truncated input gives a readable error,
never a crash.

### P1-02 · `.hal` ZIP container
`deps:` P0-01 · `size:` M · `gates:` G0, G1, G3, G4
`touches:` `packages/formats/src/hal/**`, `packages/formats/tests/hal/**`
`deps+:` fflate
`spec:` `spec/SPEC-DOCS.md` §7

ZIP with `manifest.json` + `metadata.json` + `document.json` + media. Checksums are **two
concatenated 32-bit FNV-1a streams, the second index-salted** — not a 64-bit hash. A
`document.json` checksum mismatch is a hard open failure; every other member mismatch is a warning.

**Accept:** opens `new-template.hal` and `sample.hal` from the fixtures. Round-trips losslessly.
Checksums match byte-for-byte what upstream writes. Corrupt member behavior matches the hard/warn
split exactly.

### P1-03 · `.cmir` gzip codec
`deps:` P0-01 · `size:` S · `gates:` G0, G1, G3, G4
`touches:` `packages/formats/src/cmir/**`, `packages/formats/tests/cmir/**`
`spec:` `DECISIONS.md` "Corrections", `spec/SPEC-DOCS.md` §8

Envelope `{format:"cardmirror-doc", formatVersion:1, createdBy, createdAt, doc, threads?, docId?}`.
Sniff the gzip magic bytes; gunzip if present, otherwise parse raw JSON. **This is not ZIP**, no
matter what Halcyon's `Info.plist` says.

**Accept:** reads gzipped and plain envelopes. Rejects a ZIP with a clear message. Round-trips.

### P1-04 · Atomic writes + recovery journal
`deps:` P1-01 · `size:` M · `gates:` G0, G1, G3, G4
`touches:` `packages/formats/src/io/**`, `packages/formats/tests/io/**`
`spec:` `spec/SPEC-FLOW.md` §8

Temp-file-plus-rename for every user file. Journal writes so an unclean exit is recoverable.

**Accept:** a write interrupted mid-stream leaves the original intact. A simulated crash recovers
from the journal. Concurrent writers do not corrupt.

---

## Phase P2 — Flow core

### P2-01 · Grid rendering
`deps:` P1-01, P0-04, P0-05 · `size:` L · `gates:` G0, G1, G2, G3, G6
`touches:` `apps/flow/src/grid/**`
`spec:` `spec/SPEC-FLOW.md` §4, `reference/HELP-FLOW-INAPP.md` "Flowing Basics"

Virtualized column-major grid. Plain-text textarea cells. Column widths persist per speech. Zoom
via control, `Ctrl+wheel`, and commands; persists across sheet switches and restarts.

**Accept:** renders a 200-row × 8-column sheet at 60fps. Widths and zoom persist. Matches upstream
layout per G6.

### P2-02 · Row and cell operations
`deps:` P2-01 · `size:` L · `gates:` G0, G1, G2, G3
`touches:` `apps/flow/src/grid/rows.ts`, `apps/flow/src/grid/cells.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §4

Insert, delete, and clear against **fixed 200-slot arrays**. Every row mutation must reindex
`cellHighlights` (keyed `"col,row"`) and `extensionLinks` (numeric indices). This is the single
most bug-prone area in the project — test it exhaustively now, because P3 builds directly on it.

**Accept:** insert/delete at every boundary keeps both side tables consistent. Property-based test
over random operation sequences holds the invariant. Delete Row removes across every speech as one
undoable step.

### P2-03 · Sheets and tabs
`deps:` P2-01 · `size:` M · `gates:` G0, G1, G2, G6
`touches:` `apps/flow/src/sheets/**`
`spec:` `spec/SPEC-FLOW.md` §3, `reference/HELP-FLOW-INAPP.md` "Sheets"

Add (`Alt+A` aff, `Alt+N` off-case) with a count box, rename (`F2` or double-click), close with
undo restoring name/contents/position/focus, drag to reorder, side colors, colorblind labels.

**Accept:** every behavior in the "Sheets" chapter. Undo of a close restores all four properties.

### P2-04 · Debate format templates
`deps:` P2-03 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/formats/**`
`spec:` `spec/SPEC-FLOW.md` §3

All eleven: Policy/CX, PF, LD, Congress, WSDC, Big Questions, NOF SPAR, Parli, Classic, BP, IPPF.
Off-case lists are the aff list minus the opening speech. Congress is single-flow with 25 generated
columns. BP's four starter sheets each carry a different column subset. PF needs its `policyEquiv`
map and `pfSpeakerOrder` flip. Speech times are **not** part of formats — they live in timer
settings.

**Accept:** each format produces exactly the specified columns. BP starter sheets differ correctly.
PF flips. User overrides and custom formats persist.

### P2-05 · Round lifecycle and autosave
`deps:` P2-02, P1-04 · `size:` M · `gates:` G0, G1, G3, G4
`touches:` `apps/flow/src/round/**`
`spec:` `spec/SPEC-FLOW.md` §8

New/open/save/save-as, debounced autosave, working folder, recovery on unclean exit.

**Accept:** no user edit is lost across a simulated crash. Autosave does not block typing.

---

## Phase P3 — Flow input

### P3-01 · Keybinding registry
`deps:` P2-02 · `size:` L · `gates:` G0, G1, G2, G6
`touches:` `apps/flow/src/keys/**`
`spec:` `spec/SPEC-FLOW.md` §5, `reference/HELP-FLOW-INAPP.md` "Settings and Keybindings"

All 65 rebindable actions. Comma-separated alternatives. Mouse buttons as first-class tokens
(`LeftClick`, `MiddleClick`, `RightClick`). Per-platform defaults.

**Accept:** every one of the 65 defaults matches the spec table exactly. Rebinding persists.
Conflicts are detected and surfaced.

### P3-02 · Enter behavior and row auto-insert
`deps:` P3-01 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/keys/enter.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §5, `reference/HELP-FLOW-INAPP.md` "Flowing Basics"

Three modes: `contextual`, `off`, `scope` (only content at or right of a chosen column counts).
Plus "after undoing a row addition" cursor policy.

**Accept:** all three modes behave per the manual, including the scoped rule that text left of the
chosen column never triggers a row.

### P3-03 · Selection model
`deps:` P3-01 · `size:` L · `gates:` G0, G1, G2
`touches:` `apps/flow/src/grid/selection.ts`, tests alongside
`spec:` `reference/HELP-FLOW-INAPP.md` "Flowing Basics"

Rectangular (`Shift+Arrow`) and disconnected multi-select (`Ctrl`/`Cmd`+click and drag). Repeating
a modified click removes a cell. While editing text, `Shift+Arrow` extends text selection until
the caret hits the edge, then extends the grid selection. Dragging into the top or bottom edge
scrolls continuously.

**Accept:** every sentence of that chapter's selection bullet, including the edge-transition and
autoscroll behaviors.

### P3-04 · Move cells
`deps:` P3-03 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/grid/move.ts`, tests alongside
`spec:` `reference/HELP-FLOW-INAPP.md` "Flowing Basics"

`Ctrl+M` / `Ctrl+Shift+M`. Selections keep their shape, interior gaps included. **Occupied
landings are never overwritten** — the cell slides onward in the same direction to the nearest
clear slot; with nowhere clear the outline turns the negative color and the click no-ops. The grid
never gains rows or columns. One `Ctrl+Z` restores every moved cell.

**Accept:** the collision-slide rule holds in all four directions. Past-edge drops land flush.
Single undo reverts the whole move.

### P3-05 · Marks, drops, and Shadow Flow
`deps:` P3-01 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/grid/marks.ts`, `apps/flow/src/grid/shadow.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §4

`Ctrl+H` highlight, `Ctrl+U` underline, `Alt+X` strikethrough. `Ctrl+Shift+H` Highlight Drops runs
a **strict one-column-lookahead** scan flagging every non-empty cell whose same-row neighbor in the
next column is empty, writing `cellHighlights` with a reserved color that is stripped before each
recompute so the command is idempotent. `formatting.dropHighlighted` is the separate manual mark
and clears when the cell is retyped. Shadow Flow (`Ctrl+Shift+L`) rebinds Enter to zig-zag between
an argument and its answering column.

**Accept:** Highlight Drops is idempotent across repeated runs. Manual and computed drop marks stay
independent. Shadow Flow zig-zags correctly.

### P3-06 · Extension links
`deps:` P3-04 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/grid/links.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §4

`Alt+G` finds the next column on the same side, opens space, moves the caret, and records an
`ExtensionLink` drawn as an SVG arrow. Backspace on the source deletes its links. Links survive
row operations via P2-02's reindexing.

**Accept:** arrows track their cells through row insert/delete and moves. Backspace clears.

### P3-07 · Set Order, zoom, undo
`deps:` P3-01 · `size:` S · `gates:` G0, G1, G2
`touches:` `apps/flow/src/commands/**`, tests alongside
`spec:` `reference/HELP-FLOW-INAPP.md` "Flowing Basics"

`Ctrl+Shift+O` snaps every sheet to the same speech column. Zoom commands. Undo grouping so a grid
edit, a sheet deletion, and a whole Backflow expansion each undo as one step.

**Accept:** Set Order aligns all sheets. Undo granularity matches the manual.

---

## Phase P4 — Docs extensions

Small on purpose. CardMirror already does almost everything.

### P4-01 · `reading_marker`
`deps:` P0-02 · `size:` S · `gates:` G0, G1, G2, G3
`touches:` `apps/docs/src/schema/marks.ts`, `apps/docs/src/features/reading/**`, tests alongside
`spec:` `spec/SPEC-DOCS.md` §2, §6, `reference/SCHEMA-DELTA.md`

Mark tracking where the reader stopped. Stripped on export.

**Accept:** persists in `.hal`, absent from `.docx` and `.cmir` output.

### P4-02 · `live_view`
`deps:` P0-02 · `size:` M · `gates:` G0, G1, G2, G3
`touches:` `apps/docs/src/schema/nodes.ts`, `apps/docs/src/features/liveview/**`, tests alongside
`spec:` `spec/SPEC-DOCS.md` §2

Read-only mirror of another region. Its `toDOM` deliberately emits **no content hole** — that is
load-bearing, not an oversight.

**Accept:** mirrors edits to the source. Not directly editable. Survives round-trip.

### P4-03 · `linked_copy`
`deps:` P4-02 · `size:` M · `gates:` G0, G1, G2, G3
`touches:` `apps/docs/src/schema/nodes.ts`, `apps/docs/src/features/linkedcopy/**`, tests alongside
`spec:` `spec/SPEC-DOCS.md` §2

Editable fork carrying `sourceContentHash` + `sourceShapeHash`. Red dot when the source changed
upstream; amber square when edited locally.

**Accept:** both indicators fire on the right transitions. Hashes survive round-trip.

### P4-04 · Wire `.hal` into Docs
`deps:` P0-02, P1-02 · `size:` M · `gates:` G0, G1, G3, G4
`touches:` `apps/docs/src/io/**`, tests alongside
`spec:` `spec/SPEC-DOCS.md` §7, §8

`.hal` as a peer of `.cmir` and `.docx`. Save keeps the opened format; Save As can switch. Move ZIP
compression to a save worker, as upstream does — note `halWorker` is **only** a save worker, not a
reader and not a search index.

**Accept:** all three formats open and save. Format is preserved on save. Compression is off the
main thread.

### P4-05 · Halcyon reskin
`deps:` P0-03, P0-05 · `size:` L · `gates:` G0, G2, G6
`touches:` `apps/docs/src/ui/**`, `apps/docs/src/styles/**`
`spec:` `spec/SPEC-DOCS.md` §1, §16, `reference/upstream-docs.css`

Reshape CardMirror's shell to Halcyon's screens, panels, and design tokens.

**Accept:** side-by-side screenshots match at the same window size. Tokens match upstream CSS
exactly. Any intentional difference recorded in `DEVIATIONS.md`.

---

## Phase P5 — The bridge

### P5-01 · Bridge transport
`deps:` P0-02, P0-04 · `size:` L · `gates:` G0, G1, G3, G5
`touches:` `packages/bridge/**`
`spec:` `spec/SPEC-CARDMIRROR-BASELINE.md` (bridge section), `spec/SPEC-FLOW.md` §9

Adopt `cardmirror-bridge`: loopback HTTP, identity/session files, token auth, pid liveness,
per-app consent, discovery via a shared `connect.json`. Origin guard restricted to
`127.0.0.1`/`localhost`/`[::1]`. Extend upstream where Halcyon has a capability the bridge lacks;
do not add a side channel. **Do not confuse this with CardMirror's `flow-port.ts`, which is a
Windows-only Excel COM integration.**

**Accept:** both apps discover each other. Unauthorized origins rejected. A dead peer is detected
rather than hung on.

### P5-02 · Send-to-cell with acks
`deps:` P5-01, P2-05 · `size:` M · `gates:` G0, G1, G3, G5
`touches:` `packages/bridge/src/sendToCell.ts`, `apps/flow/src/bridge/**`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §9

Per-message ids, timeout, and an explicit `UNCONFIRMED` outcome so Docs is told truthfully whether
a card landed. **A card sent with nowhere to go is held, not lost**, and delivered when a round
opens.

**Accept:** ack returns on success. Timeout yields `UNCONFIRMED`, never a false success. Held
delivery works after switching sheets mid-flight or sending from the dashboard.

### P5-03 · Evidence indexing and block search
`deps:` P5-01, P1-02 · `size:` L · `gates:` G0, G1, G3, G5
`touches:` `apps/flow/src/search/**`, `packages/bridge/src/index/**`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §9, §10

`indexBlocks`, `searchBlocks`, `listHalFiles`, `getHalOutline(s)` with an LRU outline cache.
`readDocxBytes` returns **raw bytes** so the renderer converts in memory and never touches the
source file. `Ctrl+B` picker and `/` inline search, with BLK/CARD/TAG chips and pinning.

**Accept:** search finds blocks, cards, and tags across `.hal`, `.docx`, and `.cmir`. Insert drops
a full rich card into a cell. Very large folders are listed in full or the status line says
otherwise.

### P5-04 · Style matching
`deps:` P5-01 · `size:` S · `gates:` G0, G1, G5
`touches:` `packages/bridge/src/styles.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §9

Two paths: live `hal:getStyles` when Docs is running, and `hal:stylesAtRest` reading Docs'
`styles-snapshot.json` off disk when it is not.

**Accept:** styles resolve in both states. Neither path hangs when Docs is absent.

---

## Phase P6 — Round support

Independent of P5; can run in parallel.

### P6-01 · Timer with pop-out
`deps:` P0-04 · `size:` M · `gates:` G0, G1, G2, G6
`touches:` `apps/flow/src/timer/**`
`spec:` `spec/SPEC-FLOW.md` §7, `reference/HELP-FLOW-INAPP.md` "Round Timer"

Speech and prep timers. Two presets (college 9/6/3/10, high school 8/5/3/10). Pop-out window that
closes with the app and is never restored on launch.

**Accept:** both presets. Pop-out state syncs. Pop-out does not persist across restarts.

### P6-02 · Dashboard and working folder
`deps:` P2-05 · `size:` L · `gates:` G0, G1, G2, G6
`touches:` `apps/flow/src/dashboard/**`
`spec:` `spec/SPEC-FLOW.md` §8, `reference/HELP-FLOW-INAPP.md` "Dashboard and Folders"

Round list, folder tree, subdirectory browsing, move with the "Keep both / Cancel" conflict prompt.
Shows last-known folders instantly while a fresh scan runs behind it.

**Accept:** rounds at every folder depth appear. The conflict prompt matches. Stale-then-fresh
render works.

### P6-03 · Round search
`deps:` P6-02 · `size:` M · `gates:` G0, G1, G2
`touches:` `apps/flow/src/search/rounds.ts`, tests alongside
`spec:` `reference/HELP-FLOW-INAPP.md` "Search and Extend"

Dashboard: search every round by round name, sheet name, argument text, or folder. In-round: find
cells, with an Edit/Response mode switch choosing whether a hit jumps to the cell or to the
answering column.

**Accept:** all four dashboard fields searchable. Both in-round modes jump correctly.

### P6-04 · Settings
`deps:` P3-01, P6-01 · `size:` M · `gates:` G0, G1, G2, G6
`touches:` `apps/flow/src/settings/**`
`spec:` `spec/SPEC-FLOW.md` §14, `reference/HELP-FLOW-INAPP.md` "Settings and Keybindings"

Every preference in the spec's settings registry, with the upstream grouping and labels.

**Accept:** every listed preference present, persistent, and effective. Labels match the manual.

### P6-05 · Export
`deps:` P2-05 · `size:` M · `gates:` G0, G1, G2, G4
`touches:` `apps/flow/src/export/**`
`spec:` `spec/SPEC-FLOW.md` §12

Excel export mirroring the flow: per-speech column colors (aff/neg/CX), bold centered headers,
wrapped and vertically centered cells. **Text is raw** — tags and blocks export as plain text,
cards as text content, with no bold, underline, or highlight.

**Accept:** colors, headers, and centering match. No rich formatting leaks into the output.

---

## Phase P7 — Collaboration

Last on purpose. Single-player must be solid first.

### P7-01 · Loro document binding for Flow
`deps:` P2-05 · `size:` L · `gates:` G0, G1, G3, G7
`touches:` `apps/flow/src/collab/**`
`spec:` `DECISIONS.md` §D2, `spec/SPEC-FLOW.md` §11

Bind the round model to Loro. Preserve CardMirror's exact `loro-crdt` pin and patch.

**Accept:** two clients converge under concurrent edits. Row insert/delete converges without
corrupting `cellHighlights` or `extensionLinks`.

### P7-02 · Rooms, presence, partner sharing
`deps:` P7-01, P5-01 · `size:` L · `gates:` G0, G1, G3, G5
`touches:` `apps/flow/src/collab/room.ts`, `apps/flow/src/collab/presence.ts`, tests alongside
`spec:` `spec/SPEC-FLOW.md` §11

Room lifecycle, presence, and the local connect server. Handle the host leaving.

**Accept:** partners see each other's edits and cursors. Host departure is handled per spec. A
room too large to sync reports the error from the manual rather than failing silently.

---

## Phase P8 — Ship

### P8-01 · Packaging and file associations
`deps:` P4-05, P6-04 · `size:` M · `gates:` G0, G6
`touches:` `apps/*/electron-builder.yml`, `apps/*/build/**`
`spec:` `spec/SPEC-DOCS.md` §1, `00-MASTER-PLAN.md` §4

macOS and Windows builds. Register `.mxflow`, `.hal`, `.cmir`, `.docx`. Declare `.cmir` correctly —
it is gzip, **not** `public.zip-archive`, which is the mistake in Halcyon's own `Info.plist`.

**Accept:** both apps install and launch on both platforms. Double-clicking each type opens the
right app.

### P8-02 · Updater
`deps:` P8-01 · `size:` M · `gates:` G0, G1
`touches:` `apps/*/src/update/**`
`spec:` `spec/SPEC-FLOW.md` §16

Update check, download, and install with pause/resume.

**Accept:** an update is detected, downloaded, and applied. Pause and resume work. A failed
verification falls back to a manual install path.

---

## Board summary

| Phase | Tasks | S | M | L |
|---|---|---|---|---|
| P0 Foundations | 5 | 1 | 3 | 1 |
| P1 Formats | 4 | 1 | 2 | 1 |
| P2 Flow core | 5 | 0 | 2 | 3 |
| P3 Flow input | 7 | 1 | 3 | 3 |
| P4 Docs extensions | 5 | 1 | 3 | 1 |
| P5 Bridge | 4 | 1 | 1 | 2 |
| P6 Round support | 5 | 0 | 4 | 1 |
| P7 Collaboration | 2 | 0 | 0 | 2 |
| P8 Ship | 2 | 0 | 2 | 0 |
| **Total** | **39** | **5** | **20** | **14** |

**Critical path:** P0-01 → P0-02 → P1-01 → P2-01 → P2-02 → P3-01 → P3-03 → P3-04 → P5-02 → P8-01.

**Best parallelism:** P1-01/P1-02/P1-03 are independent; so are P4-01/P4-02 and most of P6. P3
serializes heavily on P2-02 because everything touches the grid model — do not try to force it.
