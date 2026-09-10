# Proposal: Robustness Coda

## Intent

Close the 5 leftover test/coverage gaps flagged in the `validator-robustness` and `llm-efficiency` verify reports. All behavior already exists; only pins, codes, and one template key are missing.

## Scope

### In Scope

- Declare explicit empty `procedures` block in the relevant template(s) + test for `Empty block declared`.
- Dedicated test pinning the `toIntegrityDiagnostics` info→warning demotion (F2 adapter).
- Stable codes + fix-examples for R-MM-02 / L3-schema misuse-class diagnostics, following the `SUBMODEL_*`/`BOM_WARNING`/`MULTIVALUE_SYNTAX` convention.
- Export `validator/baseline.ts` from the innfo-core barrel; replace the verbatim mirror in innfo-mcp `validate.ts`; fingerprints stay byte-identical (tests prove it).
- Automated test for the review-queue confirm path (in-memory only).

### Out of Scope

- Cross-session queue persistence (caller-owned).
- New capabilities, packages, or behavior changes.
- Canonical-write/accent skill-text automation (demoted scope stays demoted).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `model-scaffold-robustness`: Explicit Procedures Block requirement gains the implemented empty-block declaration + test.
- `submodel-conformance-validation`: misuse-class diagnostics gain stable codes + fix-examples; info→warning adapter pinned by test.
- `validation-baseline-differential`: baseline module exported via barrel; fingerprint stability pinned byte-identical.
- `source-normalization-pipeline`: Doubtful-Pair Review Queue confirm path gains an automated test.

## Approach

Tiny edits + focused tests only: add the template key, attach codes per convention, rewire one import to the barrel, write 4–5 red-green tests. Full core + mcp suites stay green.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/{organization,procedures}/` | Modified | Explicit empty `procedures` block |
| `iNNfo/packages/innfo-core/src/validator/` + barrel | Modified | Baseline export; misuse-class codes |
| `iNNfo/packages/innfo-mcp/src/validate.ts`, `check-workspace` | Modified | Barrel import; demotion test |
| Review-queue matcher tests | Modified | Confirm-path automated test |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fingerprint drift after barrel rewire | Med | Byte-identical fingerprint assertion before/after |
| Template key breaks dynamic discovery | Low | Discovery already yields `[]`; test both paths |
| Scope creep beyond the 5 gaps | Med | Reject extras; coda, not a program |

## Rollback Plan

Revert the change commits on `dev`. No migration, no data: removing the template key restores dynamic `[]` discovery; the barrel rewire is import-only.

## Dependencies

None.

## Success Criteria

- [ ] All 5 gaps covered by automated tests; core + mcp suites green
- [ ] Baseline fingerprints byte-identical before/after the barrel rewire
- [ ] No new capabilities, packages, or files beyond tests + tiny edits
- [ ] Queue persistence remains caller-owned (no store added)
