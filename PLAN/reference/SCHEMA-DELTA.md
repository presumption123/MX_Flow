# Halcyon Docs is a CardMirror fork

This is the single most consequential finding of the investigation, and it should shape how the
Docs side of the project is scoped.

## Evidence

The ProseMirror schemas were compared name by name: CardMirror's `src/schema/nodes.ts` and
`src/schema/marks.ts` against the schema constructed at offset ~251,189 in Halcyon Docs'
renderer bundle.

**Every single CardMirror node and mark type is present in Halcyon Docs.** All 43 of them, including
idiosyncratic ones that no independent implementation would arrive at by coincidence:
`undertag_mark`, `transclusion_ref`, `self_ref`, `bold_off`, `underline_direct` versus
`underline_mark`, `analytic_unit`, `pilcrow_marker`, `cite_paragraph`, `card_body`.

Halcyon Docs adds exactly **three** types, none of which appear anywhere in CardMirror's `src/`
or `electron/` (verified: zero hits):

| Added type | Kind | Purpose |
|---|---|---|
| `live_view` | node | Read-only mirror of another region. Its `toDOM` deliberately emits no content hole. |
| `linked_copy` | node | Editable fork carrying `sourceContentHash` + `sourceShapeHash`; drives a red dot when the source changed upstream and an amber square when edited locally. |
| `reading_marker` | mark | Tracks where the reader stopped. Editor bookkeeping, stripped on export. |

Corroborating signals: Halcyon Docs registers `.cmir` as a first-class document type in its
`Info.plist` and ships a complete CardMirror importer/exporter; both apps hang the outline off a
flat Pocket/Hat/Block heading model with `card` as the only true container; both put the debate
character styles in a mutual-exclusion group.

Note that `id`, `indent`, and `spacing` are **shared attribute definitions** in CardMirror's
`nodes.ts` (lines 56, 32, 47), not node types. A naive regex over that file counts them as nodes
and produces an inflated total. CardMirror at `0.1.0-beta.30` has 17 nodes and 20 marks; Halcyon
Docs has 18 and 21.

## What this means for the plan

**Do not reimplement the editor.** The Docs half of this project is not "build a Verbatim
replacement". It is:

1. Take CardMirror as-is.
2. Add three schema types plus the features they back — live views, linked copies, and the
   reading marker.
3. Add the `.hal` ZIP container alongside the existing `.cmir` gzip container.
4. Reskin the shell to match Halcyon's layout and design tokens.
5. Add whatever Halcyon-only surface the renderer analysis turns up (AI tools, Gmail, card
   sharing, judge mode, speech documents) as features layered on the same schema.

The `.docx` import/export, the outline, the highlighting and condense families, the cite/tag/
underline/emphasis marks, comments, tables, footnotes, spellcheck, and collaboration all already
exist upstream and should be inherited rather than rewritten.

**Sizing.** Estimating the Docs work from Halcyon's 1.97 MB renderer bundle is wrong by roughly an
order of magnitude, because the overwhelming majority of it is CardMirror that we get for free.
Any task estimate derived that way should be redone.

**Upstream tracking.** Because we are a same-license derivative under D1, changes should be written
so they can be rebased onto new CardMirror releases. Prefer additive files over edits to
`src/editor/index.ts` (9,910 lines) and `src/main.ts` (~130 KB); those two files are where merge
pain will concentrate.

## Caveats

- The comparison is by type *name*. Identical names strongly imply shared lineage but do not
  prove every `attrs`, `content` expression, or `toDOM` matches. Halcyon has had time to diverge
  internally — for instance its `emphasis_mark` carries `size` and `hl` attrs and derives a
  `--sd-hl-dark` companion color by darkening until it reaches 4.5:1 contrast, which needs
  checking against upstream.
- Verify per-type details before assuming a CardMirror implementation is drop-in. Treat the
  schema comparison as a map of where to look, not as a guarantee.
- CardMirror was captured from a codeload tarball at `0.1.0-beta.30` with no git history, so the
  direction and date of the fork are not established here. The dependency lists differ (Halcyon is
  React + zustand + Yjs; CardMirror is vanilla TypeScript + Loro), so the shell was clearly rebuilt
  even though the document core was not.
