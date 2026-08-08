# Architectural decisions

Decided up front, by the project owner. Builder and Verifier agents must treat these as settled
and must not relitigate them. If a task appears to require violating one, halt and escalate
rather than working around it.

---

## D1 — Licensing: noncommercial, PolyForm 1.0.0

**Decision.** This project is noncommercial — personal and debate-program use. It inherits
[CardMirror](https://github.com/ant981228/cardmirror)'s **PolyForm Noncommercial License 1.0.0**
and ships under the same terms.

**Why it was a question.** PolyForm Noncommercial is source-available, not open source. It permits
derivative works but only for noncommercial purposes, and forbids relicensing. Permission from the
Halcyon owner does not extend to CardMirror, which is a different author's work.

**Binding obligations.**

1. Ship `LICENSE.md` containing PolyForm Noncommercial 1.0.0, unmodified.
2. Reproduce CardMirror's `Required Notice:` block verbatim, crediting Anthony Trufanov and ProseMirror.
3. Carry `THIRD-PARTY-NOTICES.md` forward and extend it with anything we add.
4. **Replace the icon set.** CardMirror's committed `src/editor/icons.css` embeds Untitled UI
   icons, which may not be redistributed even in modified form. This is a hard blocker on any
   distribution, so it is scheduled early rather than at packaging time.
5. Do not accept money for the product, hosted access to it, or support of it. If that ever
   changes, stop and obtain a separate grant from the author first.

**Consequence for the plan.** No isolation layer is needed around CardMirror code — we are a
derivative under the same license, so we may edit it in place and keep our own code in the same
tree.

## D2 — CRDT: Loro, not Yjs

**Decision.** Collaboration uses **Loro** (`loro-crdt` / `loro-prosemirror`), as CardMirror
already does. We do **not** port to Yjs.

**Why it was a question.** The original Halcyon apps use Yjs (`yjs`, `y-prosemirror`,
`y-protocols`, `y-websocket`, `y-indexeddb`). Matching them exactly would mean discarding
CardMirror's ~200 KB of schema-aware merge-repair logic and its ~30 associated test files, then
re-deriving the mark-merge invariants from scratch — a large, subtle, and entirely internal
rewrite that no user can observe.

**Consequence for the plan.** Halcyon's Yjs specifics are **reference-only**. Do not copy its
transport, its awareness protocol, or its room model. The Flow app, which is new code, also uses
Loro so that both apps share one CRDT stack.

Note that `loro-crdt` is pinned to an exact version in CardMirror and carries a local patch.
Preserve both. Do not upgrade Loro as an incidental part of another task.

## D3 — App integration: the existing `cardmirror-bridge`

**Decision.** The Flow app talks to the editor over CardMirror's existing **`cardmirror-bridge`**
protocol — loopback HTTP with identity/session files, token auth, pid liveness checks, and
per-app user consent. We do **not** reimplement Halcyon's `superflow:*` IPC surface.

**Why it was a question.** Halcyon's bridge is ~20 `superflow:*` Electron IPC channels. But
CardMirror's bridge is already built, documented, frozen, and security-reviewed, and the CardMirror
author has first-party flow integration on their own roadmap — so building against the bridge keeps
us interoperable with upstream instead of colliding with it.

**Consequence for the plan.** `PLAN/reference/IPC-CHANNELS.txt` remains valuable as a **feature
inventory** — it tells us *what capabilities* the bridge must expose (send a card to a cell, scan
a folder, read a document outline, probe for the other app, hand off focus). It is **not** a
transport specification. Map each Halcyon channel to a bridge operation; where the bridge lacks a
capability, extend it in a way that could be contributed upstream, rather than adding a side channel.

Do not confuse `flow-port.ts` in CardMirror with any of this. It is a Windows-only Excel COM
integration and is unrelated to app-to-app communication.

---

## What "copy it exactly" means, given the above

Fidelity is measured on **observable behavior**, not internal construction. Concretely:

**Must match the original**

- Every screen, panel, and modal, and the navigation between them
- Every keyboard shortcut, including modifiers and platform differences
- Every user-visible string where the recovered manuals quote a label
- Layout, spacing, color, and typography, per `PLAN/reference/upstream-*.css`
- Feature behavior including the edge cases the manuals specify
- The `.mxflow` round model, mirroring `.jflow` field for field
- Reading and writing `.hal`, `.docx`, and `.cmir` compatibly

**Deliberately differs**

- CRDT engine (Loro, not Yjs) — D2
- App-to-app transport (`cardmirror-bridge`, not `superflow:*` IPC) — D3
- Icon set (must be replaced) — D1
- Renderer internals generally: CardMirror is dependency-light vanilla TypeScript, whereas
  Halcyon is React plus zustand. **Follow CardMirror's conventions**, not Halcyon's. Do not
  introduce React to satisfy a fidelity check.

Every difference beyond this list must be recorded in `PLAN/DEVIATIONS.md` with a reason.
An unrecorded difference fails gate G6.

---

## Corrections to earlier assumptions

Recorded so no one re-derives them wrongly.

**`.cmir` is gzipped JSON, not ZIP.** Halcyon's `Info.plist` declares
`org.halcyondebate.cmir` as conforming to `public.zip-archive`. That is incorrect. Halcyon's own
reader sniffs the gzip magic bytes, gunzips if present, and otherwise `JSON.parse`s the raw bytes.
The envelope is:

```json
{ "format": "cardmirror-doc", "formatVersion": 1,
  "createdBy": "...", "createdAt": "...",
  "doc": { }, "threads": [], "docId": "" }
```

Write a gzip/JSON reader for `.cmir`. Do not write a ZIP reader for it.

**`.hal` genuinely is ZIP** — `manifest.json` + `metadata.json` + `document.json`, deflate
compressed. The two formats are unrelated containers and need separate code paths.

**CardMirror headings are flat, not nested.** `pocket`, `hat`, `block`, and `analytic` are
paragraph-level nodes, not tree containers, because that is how Word stores them in OOXML. The
outline hierarchy is *derived* at view time. `card` is the exception and is genuinely
tree-structured, with a required `tag` child. Do not "fix" this into a nested schema; it is a
deliberate decision documented in CardMirror's `nodes.ts`, and it is what makes the `.docx`
round-trip work.
