# Tasks: console `innfo-*` → `nn-` prefix migration

Strict TDD. Units A–E are separate commits; unit C is one commit per file.
**Blocked on open questions Q1–Q4** (`proposal.md`).

## 1. Guard (unit A) — unblocks nothing on its own, but makes the rename testable

- [ ] 1.1 [RED] Test: a console source containing a bare retired identifier (`field-row`) is reported.
- [ ] 1.2 [RED] Test: the same identifier carrying the prefix (`nn-field-row`) is **not** reported.
- [ ] 1.3 [GREEN] `test/console-ku-guard.test.mjs`: match `LEGACY` entries as whole identifiers, not substrings.
- [ ] 1.4 [RED] Test: a retired identifier inside a `.css` file is reported.
- [ ] 1.5 [GREEN] Extend the guard's scan to `consoleDir/**/*.css`.
- [ ] 1.6 Confirm the existing suite is green and the previously dead `.innfo-ku-badge` block is now reported (it must be fixed in unit C).

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

## 4. Regenerate (unit D)

- [ ] 4.1 `node scripts/build-console-bundle.mjs`.
- [ ] 4.2 `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`.
- [ ] 4.3 `node scripts/verify.js --only=Console` — "Console Bundle Fresh" and "Console Shells Fresh" green.
- [ ] 4.4 Render the testlab fixture in a browser and confirm the sheet still renders (the rename is name-only, so the pixels must not move).

## 5. Corpus sweep (unit E) — subject to Q4

- [ ] 5.1 Rename the console names inside the 99 `openspec/specs/*/spec.md` files (token substitution only, no requirement semantics).
- [ ] 5.2 Rename the same names in `iNNfo/specs/**` and `docs/**` prose.
- [ ] 5.3 `npm run check:spec-urls` green (the `spec-integrity` CI job).

## 6. Verify

- [ ] 6.1 Residual guard: no `innfo` occurrence in the 14 console sources.
- [ ] 6.2 `node scripts/verify.js --fast` green.
- [ ] 6.3 Full `node scripts/verify.js` + CI green on `dev`.
- [ ] 6.4 Confirm `nn-field-row` / `nn-ku-badge` are now usable names (the guard reports neither).
