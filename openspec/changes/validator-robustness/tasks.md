# Tasks: Validator robustness

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–700 (15 edits + 2 new + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Commit 1 → Commit 2 → Commit 3 → Commit 4 (all on `dev`) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

Chain strategy is `pending` because this repo lands day-to-day work as commits on `dev` (`main` absorbs batched merges) — PR-chaining doesn't apply here.

### Suggested Work Units

| Unit | Goal | Base | Notes |
|------|------|------|-------|
| 1 | Diagnostic envelope + baseline module | dev | `types.ts`, `diagnostics.ts`, `validator/baseline.ts`; unit-tested |
| 2 | Codes/hints + BOM + multivalue | dev | `references.ts`, `model*.ts`, `document.ts`, `markdown.ts`; depends on Unit 1 |
| 3 | Scaffold + cache + MCP contracts | dev | `init-model.ts`, `resolver-node.ts`, `spec.ts`, `validate.ts`, `server.ts`; depends on Unit 2 |
| 4 | Skill + baseline + gate | dev | `nn-innfo/SKILL.md`, `validation-baseline.json`, gate green; depends on Unit 3 |

## Phase 1: Diagnostic envelope (innfo-core)

- [x] 1.1 RED: extend `diagnostics.spec.ts` for `info` ("Info keeps validity") + code/hint passthrough
- [x] 1.2 GREEN: add `'info'` in `src/types.ts`, `info()` + preserve code/hint in `src/diagnostics.ts`; run lint/typecheck/test
- [x] 1.3 GREEN: pass `info` through in `validator/document.ts`, `model.ts`, `model-checks.ts` ("Both misuse classes distinguished")

## Phase 2: Baseline module (innfo-core)

- [x] 2.1 RED: new `baseline.spec.ts` for "New error surfaces", "Known error suppressed", "Stale entry reported", "Missing baseline"
- [x] 2.2 GREEN: create `src/validator/baseline.ts` (`loadBaseline`/`fingerprint`/`diffNewOnly`, slash-normalized); run lint/typecheck/test

## Phase 3: Codes, BOM, multivalue (innfo-core)

- [x] 3.1 RED: coded-warning tests ("Missing submodel warns", "Mismatch warns with code and hint", "Match by name/URL passes")
- [x] 3.2 GREEN: attach stable codes+hints in `validator/references.ts`, `model.ts`, `model-checks.ts`, `document.ts`; run lint/typecheck/test
- [x] 3.3 RED: BOM + multivalue tests ("BOM warns", "No BOM, no warning", "Canonical multivalue accepted", "Non-canonical fails with hint")
- [x] 3.4 GREEN: BOM detection in `parser/markdown.ts`, `BOM_WARNING` in `document.ts`; canonical split + `MULTIVALUE_SYNTAX` in `workspaceReferences.ts`; run lint/typecheck/test

## Phase 4: Scaffold + resolver + MCP contracts (innfo-mcp)

- [x] 4.1 RED: `init-model.spec.ts` for "Version inferred", "Override wins", "Mismatch refused" (`VERSION_MISMATCH`)
- [x] 4.2 GREEN: infer `spec_version` from resolved parent in `tools/init-model.ts` (override wins, mismatch refuses); run lint/typecheck/test
- [x] 4.3 RED: `resolver-node.spec.ts` + `validate.spec.ts` for "Tree clean", "Temp entry reused", "Concurrent isolated", "Explicit flag", "Regression blocked"
- [x] 4.4 GREEN: temp-dir default + `inPlace` flag in `tools/resolver-node.ts`/`spec.ts`; `baselinePath` + suppressed-count in `tools/validate.ts`; `baseline_path`/`in_place` contracts in `server.ts`; run lint/typecheck/test

## Phase 5: Skill text + seeded baseline + gate

- [x] 5.1 Canonical write command + wizard line in `actioNN/skills/nn-innfo/SKILL.md` ("Clean validation", "Accents preserved", "Wizard announces it")
- [x] 5.2 Seed `iNNfo/validation-baseline.json` (`version/backlog/entries`) from current tree, maintainer-approved on `dev`
- [ ] 5.3 Verify: `npm --prefix iNNfo run test`, `lint`, `typecheck` green; confirm zero NEW prettier drift (format:check is NOT a gate)
