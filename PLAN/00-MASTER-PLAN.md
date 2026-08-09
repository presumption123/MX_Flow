# Master Plan — Reimplementing Halcyon Flow + Halcyon Docs

**Status:** ready to build. **Authorization:** the owner of the original applications granted
permission. See `DECISIONS.md` §D1 for the separate CardMirror licensing position.

---

## 1. What we are building

Two desktop applications that reproduce the observable behavior of Halcyon Flow 1.0.4 and
Halcyon Docs 1.0.4.

- **Flow** — a policy-debate *flowing* app. A grid where each column is a speech and each row
  tracks an argument as it is answered across the round. Keyboard-driven, used live under time
  pressure.
- **Docs** — a debate *evidence editor*. Cut, tag, cite, highlight, and organize cards. A modern
  replacement for Verbatim, the Word template the activity has used for two decades.

The two are one workflow: you flow the round in Flow, then pull cards out of your evidence library
into cells on the flow, and the result becomes your speech document.

## 2. The three findings that determine the plan

Read `reference/SCHEMA-DELTA.md` and `DECISIONS.md` before the task board. The investigation
changed the shape of the work substantially.

**Docs is a CardMirror fork.** All 43 of CardMirror's ProseMirror node and mark types are present
in Halcyon Docs, including ones no independent implementation would invent
(`undertag_mark`, `transclusion_ref`, `self_ref`, `bold_off`, `underline_direct`). Halcyon adds
exactly three: `live_view`, `linked_copy`, `reading_marker`. **So we do not build an editor.** We
extend CardMirror. The `.docx` round-trip, outline, highlighting, condense family, comments,
tables, footnotes, spellcheck, and collaboration are all inherited.

**Flow is the real work.** It shares no code with CardMirror. **Base it on the existing MX Flow
repository** (the product tree already at repo root: `static/`, `server/`, `schema/`, `tests/`,
`e2e/`, `Joseph_draft.html`, etc.) and evolve that code toward Halcyon Flow fidelity — do not
start Flow as an empty greenfield app. The remaining gap is large: eleven debate-format templates,
65 rebindable actions, the round file format, the timer, and the bridge client, on top of what
MX Flow already has.

**Both bridges are already loopback HTTP.** Halcyon's Flow↔Docs link is not exotic IPC — it is
HTTP on 127.0.0.1 around port 53124 with `connect.json` discovery, and CardMirror ships an
equivalent (`cardmirror-bridge`) with token auth and per-app consent. Per `DECISIONS.md` §D3 we
adopt CardMirror's, extending it where Halcyon has a capability it lacks.

**Consequence:** effort is roughly 70% Flow, 20% Docs extensions and reskin, 10% shared
infrastructure. Any estimate derived from Halcyon Docs' 1.97 MB renderer bundle is wrong by about
an order of magnitude, because most of that bundle is CardMirror.

## 3. Architecture

```
mxflow/
├─ apps/
│  ├─ docs/          CardMirror fork. Vanilla TS + ProseMirror + Vite + Electron.
│  └─ flow/          New. Same stack, deliberately no React.
├─ packages/
│  ├─ formats/       .mxflow (JSON), .hal (ZIP), .cmir (gzip JSON), .docx
│  ├─ bridge/        cardmirror-bridge client + server, shared by both apps
│  └─ ui/            Design tokens, themes, shared primitives
└─ PLAN/             This directory. Specs, board, rubric, loop.
```

**Stack**, inherited from CardMirror rather than from Halcyon: TypeScript 5.7 strict ESM,
ProseMirror, Vite 6, Electron 42, Vitest, Playwright. Loro for CRDT collaboration.
`fast-xml-parser` + `fflate` for OOXML — CardMirror's `.docx` handling is hand-written and there
is no docx library to adopt.

**No React, no zustand, no UI framework.** Halcyon uses React 18/19 and zustand; CardMirror uses
none, and CardMirror is the codebase we are extending. Introducing React to match Halcyon's
internals would fork us off upstream for no user-visible gain. This trips people up, so it is
stated in `DECISIONS.md` and enforced by gate G0.4.

## 4. File formats

| Format | Container | Owner | Notes |
|---|---|---|---|
| `.mxflow` | plain JSON | Flow | Mirrors Halcyon `.jflow`. Real writer emits `schemaVersion: 12`, not the `1` in the shipped template. |
| `.hal` | **ZIP** (deflate) | Docs | `manifest.json` + `metadata.json` + `document.json` + media. Checksums are two concatenated 32-bit FNV-1a streams, the second index-salted. A `document.json` mismatch is a hard failure; every other member is a warning. |
| `.cmir` | **gzip JSON** | Docs | Envelope `{format:"cardmirror-doc", formatVersion:1, doc, threads?, docId?}`. Sniff the gzip magic; accept raw JSON too. **Not ZIP**, despite what Halcyon's `Info.plist` claims. |
| `.docx` | OOXML | Docs | Export attaches Verbatim's `Debate.dotm` via `<w:attachedTemplate>` so exports open with Verbatim's ribbon live. |

`.hal` and `.cmir` are unrelated containers and need separate code paths. Getting this wrong is
the most likely early mistake.

## 5. The Flow data model, stated up front

The single least guessable part of the system, and the thing to get right before anything else is
built on top of it.

**A sheet has no `columns[]` and no `rows[]`.** It is column-major:

```ts
interface Sheet {
  id: string;
  name: string;
  type: "aff" | "offcase" | "cx";
  side: "aff" | "neg";
  speeches: string[];                    // the columns ARE these strings
  grid: Record<string, CellValue[]>;     // speech key -> fixed 200-slot array
  columnWidths: Record<string, number>;
  extensionLinks: ExtensionLink[];       // numeric col/row indices, not speech keys
  cellHighlights: Record<string, string>;// "col,row" -> color
  needsName: boolean;
}

type CellValue = string | Cell;          // unstyled text collapses back to a bare string
```

Rows are bare indices into fixed 200-slot arrays. "Insert a row" shifts content within those
slots, which is why every row operation must reindex `cellHighlights` and `extensionLinks` by
hand. A cell's rich formatting lives in **character-offset range arrays**
(`underlineRanges`, `strikeRanges`, `emphasisRanges`, `highlightRanges`) held out-of-band rather
than as inline markup. Grid cells are edited as plain text in a textarea; only the card and block
editors are real ProseMirror.

Full definitions in `spec/SPEC-FLOW.md` §2.

## 6. Phases

Each phase is a milestone with a demoable outcome. Tasks are in `TASK-BOARD.md`.

| Phase | Outcome | Why here |
|---|---|---|
| **P0 Foundations** | Monorepo builds, both Electron shells launch, CI green, CardMirror vendored, icons replaced | The icon replacement is a distribution blocker (D1), so it is done first, not at packaging |
| **P1 Formats** | `.mxflow`, `.hal`, `.cmir` read and write losslessly against real upstream fixtures | Everything else depends on the data model; format bugs found late are expensive |
| **P2 Flow core** | Grid, sheets, 11 format templates, rounds, autosave, recovery | The largest single body of new code |
| **P3 Flow input** | All 65 rebindable actions, selection, move-cell, linking, Shadow Flow, drop detection | Split from P2 so the model is stable before the keymap lands on it |
| **P4 Docs extensions** | `live_view`, `linked_copy`, `reading_marker`; `.hal` alongside `.cmir`; Halcyon reskin | Small, because CardMirror already does the rest |
| **P5 Bridge** | Both apps discover each other; send-to-cell with acks and held delivery; block search | Needs P1–P4 on both sides |
| **P6 Round support** | Timer with pop-out, library/working folder, dashboard, search | Independent of the bridge; can run parallel to P5 |
| **P7 Collaboration** | Loro rooms, presence, partner sharing | Deliberately last; single-player must be solid first |
| **P8 Ship** | Packaging, updater, file associations, signing | — |

## 7. Principal risks

**Fidelity drift is the default outcome.** An agent given "build a flowing grid" produces a
plausible grid that is not this grid. Mitigation: the recovered manuals
(`reference/HELP-*-INAPP.md`, 105 KB of the originals' own help text) outrank agent judgment, and
gate G6 grades against them.

**Vacuous tests.** The dominant way agent-built features are "finished" without existing.
Mitigation: gate G1.4 mechanically stashes the implementation and requires the new tests to fail.

**The 200-slot fixed array leaks everywhere.** Row insert/delete must reindex two side tables.
Expect off-by-one bugs in exactly this area, and test it hard in P2 before P3 builds on it.

**Upstream merge pain.** CardMirror's `src/editor/index.ts` is 9,910 lines and `src/main.ts`
~130 KB. Prefer additive files over edits to those two.

**Verbatim compatibility is unverifiable in CI.** Whether an export really opens correctly in Word
with `Debate.dotm` bound needs a human on a Windows machine with Verbatim. Gate G4.3 flags it for
manual check rather than pretending to automate it.

## 8. Running the build

1. Read `DECISIONS.md`. Those four decisions are settled and must not be relitigated by agents.
2. Skim `reference/SOURCES.md` for what is authoritative and why.
3. Follow `LOOP-PROMPT.md` §1 to create `.loop/state.json`.
4. Arm the loop with `LOOP-PROMPT.md` §2.
5. Watch for `escalated` tasks. Three failures means the spec is wrong, not the agent — read the
   escalation report and amend the spec or the board yourself.

The loop runs Builder and Verifier as separate subagents. That separation is the only part of the
design that is load-bearing; everything else is bookkeeping.

## 9. Document index

| File | What it is |
|---|---|
| `DECISIONS.md` | Four settled decisions + what "copy exactly" means |
| `TASK-BOARD.md` | The task graph. Source of truth for scope |
| `QA-RUBRIC.md` | Eight gates and the verdict schema |
| `LOOP-PROMPT.md` | Orchestrator prompt + Builder/Verifier templates |
| `DEVIATIONS.md` | Every intentional difference from the original |
| `spec/SPEC-FLOW.md` | Flow renderer, reverse-engineered. 79 KB |
| `spec/SPEC-DOCS.md` | Docs renderer, reverse-engineered. 101 KB |
| `spec/SPEC-CARDMIRROR-BASELINE.md` | What CardMirror gives us. 71 KB |
| `reference/HELP-FLOW-INAPP.md` | Flow's own manual, 12 chapters, extracted from the bundle |
| `reference/HELP-DOCS-INAPP.md` | Docs' own manual, 14 chapters |
| `reference/SCHEMA-DELTA.md` | Proof that Docs is a CardMirror fork, and the 3-type delta |
| `reference/SOURCES.md` | Provenance and source ranking |
| `reference/IPC-CHANNELS.txt` | ~200 channel names — a capability inventory, not a transport spec |
| `reference/fixtures/upstream/` | Real `.jflow` and `.hal` files from the installed apps |
| `reference/upstream-*.css` | Shipped stylesheets — the design tokens, verbatim |
