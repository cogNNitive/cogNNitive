# Proposal: Node Test Harness Migration (Discovery Loop & Harness Cleanup)

## Intent

Address test discovery rot and modernize verification orchestration. Replace bespoke hardcoded suite enumerations with shape-based discovery (`collectTestSuites`), wire orphaned test suites into verification, and align `quality-gates` specifications with the automated discovery model while deferring invasive test framework rewrites.

## Scope

- **Land Discovery Loop in `scripts/verify.js`**:
  - Discover `*.test.js` / `*.test.mjs` under `scripts/` and `skills/` (excluding `node_modules`).
  - Preserve explicit wiring for non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`).
  - Retain 11 deterministic `--check` drift guards in documented order.
- **Wire Orphaned Suite**:
  - Rename/wire `scripts/lib/test-shared-libs.js` -> `scripts/lib/shared-libs.test.js` so discovery executes it.
- **Document Scope Boundary**:
  - Explicitly document `.claude/hooks/block-dangerous-git.test.mjs` as out-of-scope for root `verify.js` (agent hook falsification suite).
- **Update Quality Gates Specification**:
  - Write delta for `openspec/specs/quality-gates/spec.md` relaxing literal child-process execution strings into normative discovery & execution requirements.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `quality-gates`: Update manifest suite verification requirement from exact literal command strings (`node scripts/manifest/*.test.js`) to shape-based automated test discovery and execution semantics under `scripts/verify.js`.

## Non-Goals

- Full conversion of the 19 test suites to `node:test` API (`describe`/`it`/`test`) (deferred to future change).
- Unifying non-conforming runners (`nn-trannsform`, `test-vocabulary`) into root runner.
- Removing or reordering deterministic `--check` drift guards in `verify.js`.

## Approach & Slices

| Slice | Focus | Details |
| :--- | :--- | :--- |
| **S1** | Harness & Discovery | Commit `collectTestSuites` in `scripts/verify.js`; wire `shared-libs.test.js`. |
| **S2** | Spec Delta | Update `openspec/specs/quality-gates/spec.md` to reflect discovery model. |

## Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Discovery walks nested `node_modules` | Explicit directory pruning in walker (`node_modules` skipped). |
| Latency regression in CI | Discovery loop fails fast on first failing unit test before running slow drift guards. |

## Success Criteria

- [ ] `node scripts/verify.js` dynamically discovers and executes all 20 conforming `*.test.{js,mjs}` suites including `shared-libs.test.js`.
- [ ] Explicit runners (`nn-trannsform`, `test-vocabulary`) and 11 `--check` guards continue executing in sequence.
- [ ] `openspec/specs/quality-gates/spec.md` matches the automated discovery contract.
- [ ] CI `verify` passes cleanly without runtime regressions.
