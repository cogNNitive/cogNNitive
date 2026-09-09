# Tasks: Robustness Coda

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80–150 |
| 800-line budget risk (repo) | Low |
| Chained PRs recommended | No |
| Suggested split | Single commit-sized unit on `dev` (no PRs) |
| Delivery strategy | ask-on-risk (maintainer pre-authorized full run to archive) |
| Chain strategy | pending — single commit-sized unit lands directly on `dev`, no PR chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Robustness coda pins (flat)

- [x] 1.1 RED: failing test for `Empty block declared` + `Discovery agrees with the declared block`; GREEN: declare explicit empty `procedures` block in relevant template(s) (`iNNfo/specs/templates/organization/spec_NN.md`, procedures template if applicable).
- [x] 1.2 RED: failing tests for `Both misuse classes distinguished` + `Codes stay stable across runs`; GREEN: attach stable codes + per-class fix-examples to R-MM-02/L3-schema misuse diagnostics in `iNNfo/packages/innfo-core/src/validator/` per `SUBMODEL_*`/`BOM_WARNING`/`MULTIVALUE_SYNTAX` convention.
- [x] 1.3 RED: failing byte-identical fingerprint assertion; GREEN: export `validator/baseline.ts` from the `iNNfo/packages/innfo-core/src/index.ts` barrel and replace the mirror in `iNNfo/packages/innfo-mcp/src/tools/validate.ts` (`Consumers share one implementation`, `Fingerprints byte-identical after consolidation`).
- [ ] 1.4 RED: failing tests for `Info demoted to warning` + `Warnings and errors pass through untouched`; GREEN: pin the `toIntegrityDiagnostics` info→warning demotion in `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts` with code, message, and fix hint intact.
- [ ] 1.5 RED: failing in-memory test for `Reviewer confirms a doubtful pair` (plus reject/undecided paths); GREEN: pin the confirm path in `actioNN/skills/nn-trannsform/scripts/lib/score-matcher.js`, asserted in `actioNN/skills/nn-trannsform/test/unit/test-score-matcher.js` (`Undecided pairs stay queued` holds, no store added).
- [ ] 1.6 Verify: `npm --prefix iNNfo run test`, `lint`, and `typecheck` green; `format:check` is informational only — zero NEW drift required, NOT a gate.
