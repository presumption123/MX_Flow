# QA Rubric — Halcyon Clone

Every task is graded by a **Verifier** subagent that did **not** write the code. The verifier
returns a JSON verdict (schema at the bottom). A task is only marked `done` on `PASS`.

The rubric is deliberately harsh. A plausible-looking React component that does not actually
satisfy the spec is the primary failure mode of agent-built software, and gates G3 and G6 exist
specifically to catch it.

---

## Gate G0 — It builds

| # | Check | How |
|---|---|---|
| G0.1 | Typechecks with zero errors | `pnpm -w typecheck` |
| G0.2 | Lints clean | `pnpm -w lint` |
| G0.3 | Production build succeeds | `pnpm -w build` |
| G0.4 | No new dependency added without being listed in the task's `allows-deps` | inspect `git diff` of every `package.json` |
| G0.5 | App actually launches and renders without a console error | `pnpm --filter <app> dev`, then drive it |

`G0` is automated. If it fails the verifier stops and returns `FAIL` without reading further —
do not waste verifier tokens reviewing code that does not compile.

## Gate G1 — Tests

| # | Check |
|---|---|
| G1.1 | Every acceptance criterion in the task has at least one automated test |
| G1.2 | Unit tests pass (`pnpm -w test`) |
| G1.3 | Playwright E2E for the task's user-visible behavior passes (`pnpm -w e2e`) |
| G1.4 | Tests fail when the implementation is reverted — **the verifier must confirm this**, see below |
| G1.5 | Coverage of new source files ≥ 70% lines |

### G1.4 is mandatory and non-negotiable

Agents routinely write tests that pass against a stub. The verifier must prove the tests bite:

```bash
git stash push -- <the-implementation-files-only>   # keep the test files
pnpm -w test <the-new-tests>                        # MUST now fail
git stash pop
```

If the tests still pass with the implementation removed, the verdict is `FAIL` with
reason `vacuous-tests`, regardless of everything else.

## Gate G2 — Spec conformance

The verifier re-reads the relevant section of the spec (`PLAN/spec/*.md`) and the relevant
chapter of the recovered upstream manual (`PLAN/reference/HELP-FLOW-INAPP.md`,
`PLAN/reference/HELP-DOCS-INAPP.md`) and checks each numbered requirement.

| # | Check |
|---|---|
| G2.1 | Every numbered requirement in the task's spec section is implemented |
| G2.2 | No requirement is "implemented" as a `TODO`, a `throw new Error('not implemented')`, a hardcoded return, or a stub |
| G2.3 | Keyboard shortcuts match the shortcut table **exactly**, including modifier and platform differences |
| G2.4 | User-visible strings match the upstream manual's wording where the manual quotes a label |
| G2.5 | Edge cases named in the manual are handled (the manual is unusually specific about these — e.g. "a landing that would cover one slides onward in the same direction to the nearest clear spot") |

The verifier must quote the spec line and the implementing code line for each requirement.
A requirement it cannot locate in the code is `FAIL`.

## Gate G3 — Anti-mock

This gate exists because the single most common way an agent "finishes" a task is by faking it.

| # | Check | Grep for |
|---|---|---|
| G3.1 | No placeholder returns in production paths | `TODO`, `FIXME`, `not implemented`, `NotImplemented`, `stub`, `mock` outside `**/*.test.*` and `**/__mocks__/**` |
| G3.2 | No hardcoded fixture data standing in for real logic | literal arrays/objects returned from functions that should compute |
| G3.3 | No silently swallowed errors | `catch {}`, `catch (e) {}`, `.catch(() => {})` |
| G3.4 | No disabled tests | `.skip`, `.todo`, `xit(`, `xdescribe(` |
| G3.5 | No suppressions added to make it pass | `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `as any`, `as unknown as` |
| G3.6 | Feature is reachable from the UI | trace the code path from a rendered element to the new function |

G3.6 matters: a correct, well-tested module that nothing renders is not a feature.

## Gate G4 — Data integrity

Applies to any task touching `.mxflow`, `.mxhal`, `.docx`, or `.cmir`.

| # | Check |
|---|---|
| G4.1 | Round-trip is lossless: `parse(serialize(doc))` deep-equals `doc` for every fixture in `fixtures/` |
| G4.2 | Real upstream files open: every file in `PLAN/reference/fixtures/upstream/` parses without error |
| G4.3 | Output opens in the real upstream app (**manual**; the verifier flags it for the human) |
| G4.4 | Unknown/future fields survive a round-trip rather than being dropped |
| G4.5 | A corrupt or truncated file produces a readable error, never a crash or silent data loss |
| G4.6 | Writes are atomic — temp file plus rename, never a partial overwrite of the user's file |

G4.6 is a data-loss bug class. Debaters save mid-round; a partial write loses a tournament.

## Gate G5 — Cross-app integration

Applies to any task touching the Flow ↔ Docs bridge.

| # | Check |
|---|---|
| G5.1 | Both apps launch and discover each other |
| G5.2 | Send-to-cell delivers, and the ack returns |
| G5.3 | The receiving side reports the same outcome as the sending side |
| G5.4 | A card sent while no round is open is **held, not lost**, and lands when a round opens |
| G5.5 | The bridge degrades gracefully when the other app is absent — no hang, no crash, clear message |

## Gate G6 — Fidelity to the original

The point of the project is a faithful copy, so this is graded against the real app.

| # | Check |
|---|---|
| G6.1 | Side-by-side screenshot vs. the original at the same window size; layout differences called out |
| G6.2 | Design tokens match `PLAN/reference/upstream-*.css` exactly (colors, spacing, radii, fonts) |
| G6.3 | The same keystroke sequence produces the same result in both apps |
| G6.4 | Empty, loading, and error states exist and match |
| G6.5 | Every string in the upstream manual's chapter for this feature is accounted for |

Where the clone intentionally differs, the difference must be recorded in
`PLAN/DEVIATIONS.md` with a reason. An unrecorded difference is `FAIL`.

## Gate G7 — No regressions

| # | Check |
|---|---|
| G7.1 | Full test suite passes, not just the new tests |
| G7.2 | No file outside the task's declared `touches` list was modified |
| G7.3 | Public APIs of shared packages unchanged, or the change is listed in the task |
| G7.4 | Startup time and bundle size within 10% of the previous commit |

---

## Verdict format

The verifier's **final message** must be exactly one JSON object and nothing else:

```json
{
  "task_id": "P3-04",
  "verdict": "PASS | FAIL | BLOCKED",
  "gates": {
    "G0": "pass", "G1": "fail", "G2": "pass",
    "G3": "pass", "G4": "n/a",  "G5": "n/a",
    "G6": "pass", "G7": "pass"
  },
  "blocking": [
    {
      "gate": "G1.4",
      "severity": "blocker",
      "file": "apps/flow/src/grid/moveCells.ts",
      "line": 84,
      "problem": "Tests still pass with moveCells.ts stashed — they assert on the fixture, not the function.",
      "fix": "Assert on the return value of moveCells() for the collision case in the spec, FLOW-GRID §4.3."
    }
  ],
  "non_blocking": [],
  "evidence": {
    "commands_run": ["pnpm -w test", "pnpm -w e2e --grep move-cells"],
    "screenshots": [".loop/artifacts/P3-04-grid.png"]
  },
  "reverify_hint": "Re-run only G1 and G3."
}
```

Rules:

- `verdict` is `PASS` only when **no** entry in `blocking` exists.
- `BLOCKED` means the verifier could not evaluate (e.g. the build environment is broken).
  It does not count as a failed attempt against the task's retry budget.
- Every `blocking` entry needs a concrete, actionable `fix`. "Improve error handling" is not
  a fix; "return a `ParseError` with the byte offset instead of `null` at line 84" is.
- `severity` is `blocker` or `nit`. Nits go in `non_blocking` and never fail a task.

## Severity guidance

Fail the task for: wrong behavior, missing requirement, vacuous or missing tests, data loss,
a crash, a silently swallowed error, a stub on a production path, an unrecorded deviation.

Do **not** fail the task for: naming preferences, file organization that follows the existing
codebase, missing JSDoc, a possible future performance concern, or anything the task did not ask for.

Scope creep in a verifier is as costly as a bug — it burns loop iterations on rework nobody wanted.
