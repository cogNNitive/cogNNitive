# Tasks: console `innfo-*` → `nn-` prefix migration

Strict TDD. Units A–E are separate commits; unit C is one commit per file.
**Blocked on open questions Q1–Q4** (`proposal.md`).

## 1. Guard (unit A) — unblocks nothing on its own, but makes the rename testable

- [ ] 1.1 [RED] Test: a console source containing a bare retired identifier (`field-row`) is reported.
- [ ] 1.2 [RED] Test: the same identifier carrying the prefix (`nn-field-row`) is **not** reported.
- [ ] 1.3 [GREEN] `test/console-ku-guard.test.mjs`: match `LEGACY` entries as whole identifiers, not substrings.
- [ ] 1.4 [RED] Test: a retired identifier inside a `.css` file is reported.
- [ ] 1.5 [GREEN] Extend the guard's scan to `consoleDir/**/*.css`.
- [ ] 1.6 [RED] Test: the console sources contain no `innfo` occurrence outside the allowlist decided by Q5–Q7.
- [ ] 1.7 Note: the whole-identifier rule does **not** report the dead `.innfo-ku-badge` block (its `ku-badge` is preceded by `-`); tasks 1.6 and 3.2 are what force it out.
- [ ] 1.8 Confirm the existing suite is green.

## 2. Contract (unit B)

- [ ] 2.1 Land `specs/console-prefix-naming/spec.md` (this change).
- [ ] 2.2 Answer Q1–Q4 and record them in `design.md`'s naming map.

## 3. Sources (unit C) — one file per commit

- [ ] 3.1 `ui-kit.js`: rename classes, `data-innfo-*`, `--innfo-*`, the `InnfoUI` global and id literals.
- [ ] 3.2 `nn-ui.css`: rename everything; delete the dead `.innfo-ku-badge` block.
- [ ] 3.3 `nn-runtime.js`: rename selectors and attribute reads.
- [ ] 3.4 `review.js`: rename `[data-ku-kind="value"][data-field]` / `[data-innfo-component=element-card]` selectors and the `UI.*` calls.
- [ ] 3.5 `render-procedure-stepper.js` and `artifact_shell.html`: rename.
- [ ] 3.6 After each file: `node --test test/console-*.test.mjs` green.
- [ ] 3.7 Per Q5: bump the store namespace to `nn-console:v4:`; keep the "never read the previous namespace" test and add one for the new version.
- [ ] 3.8 Per Q6: rename the custom events to `nn:rendered` / `nn:theme-change` in the dispatcher, both listeners and the tests.
- [ ] 3.9 Per Q7: rename the `viewer` string; record whether it is persisted before landing.
- [ ] 3.10 Rename the identifiers the tests pin (72 test files reference a console name).

## 4. Regenerate (unit D)

- [ ] 4.1 `node scripts/build-console-bundle.mjs`.
- [ ] 4.2 `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`.
- [ ] 4.3 `node scripts/verify.js --only=Console` — "Console Bundle Fresh" and "Console Shells Fresh" green.
- [ ] 4.4 Render the testlab fixture in a browser and confirm the sheet still renders (the rename is name-only, so the pixels must not move).

## 5. Corpus sweep (unit E) — subject to Q4

- [x] 5.1 Rename the console names inside `openspec/specs/*/spec.md` (token substitution only, no requirement semantics). Done: **17 files**, a curated old→new map validated against the shipped console sources (not a blanket `innfo`→`nn`). Excluded on purpose: paths (`docs/innfo/`, `iNNfo/`), the product name `iNNfo`, the `nn-innfo` skill, the retired distribution names (`innfo-core`/`innfo-mcp`/`innfo-editor`), the legacy artifact names (`innfo-console.bundle.js`, `innfo-ui.css`), spec capability ids (`innfo-console-runtime`, `innfo-console-feedback`) and the pre-migration store key (`innfo-console:v3:`). Adjudicated historical/negative lines and left them alone: the `(Previously: …)` notes, the legacy `/app/innfo-doc` endpoints in `document-badge`, and the stale-path scenario in `manifest-governance`.
- [x] 5.2 Rename the same names in `iNNfo/specs/**` and `docs/**` prose. Measured: no renamable console identifier remains there (only paths, `iNNfo`, the `nn-innfo` skill and the retired distribution names); **no edit needed**.
- [x] 5.3 `npm run check:spec-urls` green (the `spec-integrity` CI job).
- [ ] 5.4 **BLOCKED — needs a requirement rewrite, not a token swap.** Three canonical requirements explicitly forbid the identifiers #311/#313 renamed, so substituting tokens leaves them self-contradictory. They are exactly the "Modified Capabilities" that `proposal.md` deferred; the change delta today carries only the ADDED `console-prefix-naming` capability:
  - `openspec/specs/innfo-console-runtime/spec.md` — "Internal console identifiers are unchanged by the rename" (pins the `Innfo*` globals, `--innfo-*` tokens, `innfo-*` ids/classes, the `innfo-*` slots and the `innfo-console:v3:` key, and asserts reviewer drafts survive a rename that bumped the namespace to `nn-console:v4:`).
  - `openspec/specs/console-export-slots-and-standalone-pin/spec.md` — "Embedded slot ids are not part of the rename" (asserts the slots stay `innfo-*` and that no `nn-*` slot exists).
  - `openspec/specs/canonical-vocabulary/spec.md` — the "Rename scope exclusions are never recorded as retired" list names the pre-rename identifiers.

## 6. Verify

- [ ] 6.1 Residual guard: no `innfo` occurrence in the 14 console sources.
- [ ] 6.2 `node scripts/verify.js --fast` green.
- [ ] 6.3 Full `node scripts/verify.js` + CI green on `dev`.
- [ ] 6.4 Confirm `nn-field-row` / `nn-ku-badge` are now usable names (the guard reports neither).
