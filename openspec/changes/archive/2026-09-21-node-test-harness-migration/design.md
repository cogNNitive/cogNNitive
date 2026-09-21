# Technical Design: Node Test Harness Migration

## Technical Approach & Architecture Decisions

### 1. Shape-Based Discovery vs Static Allowlist vs Native `node --test` Runner
- **Choice**: Implement recursive shape-based discovery (`collectTestSuites`) in `scripts/verify.js` matching `*.test.js` and `*.test.mjs`, while invoking each suite via child process `node <file>`.
- **Alternatives Considered**:
  - *Static allowlist*: Re-enumerating suites in `verify.js`. Rejected due to proven discovery rot (`skills-tests-not-in-ci` and multiple un-gated suites).
  - *Full `node --test` runner migration*: Replacing child process execution with `node --test`. Rejected for this change because: (a) `node --test` globbing walks into `node_modules` under `skills/nn-trannsform` and `iNNfo/**`, running vendored tests unless complex exclusions are configured; (b) it alters fail-fast step-by-step halt semantics; (c) it requires rewriting 19+ suites, exceeding the 400-line review budget.
- **Rationale**: Recursive discovery with explicit `node_modules` pruning eliminates discovery rot immediately with zero test rewrites and zero runtime disruption.

### 2. Wiring the Orphaned `scripts/lib/test-shared-libs.js` Suite
- **Choice**: Rename `scripts/lib/test-shared-libs.js` to `scripts/lib/shared-libs.test.js`.
- **Alternatives Considered**:
  - *Explicit execution entry in `verify.js`*: Rejected as it bypasses shape discovery and perpetuates special cases.
  - *Leave excluded*: Rejected because it leaves 465 lines of unit tests for core libraries (`github-client`, `yaml-parser`, `atomic-fs`) unexecuted.
- **Rationale**: Renaming aligns the suite with the `*.test.js` pattern so `collectTestSuites` discovers and executes it automatically.

### 3. Preservation of Drift Guards & Non-Conforming Runners
- **Choice**: Keep the 11 deterministic `--check` drift guards and 2 non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`) explicitly wired in `verify.js`.
- **Alternatives Considered**:
  - *Force rename on non-conforming suites*: `nn-trannsform` is a standalone npm package with its own runner contract; `test-vocabulary.js` is an iNNfo spec utility. Renaming them creates breaking friction across sub-packages.
  - *Merge `--check` guards into test suites*: Rejected because `--check` guards verify committed artifact fresh state (e.g. catalog, manifest doc, bundles) and have strict ordering dependencies (e.g., preflight primitives before live manifest validation).
- **Rationale**: Retains necessary execution order, isolation, and fail-fast guarantees.

### 4. Boundary Definition for `.claude/hooks/block-dangerous-git.test.mjs`
- **Choice**: Explicitly exclude `.claude/hooks/` from `scripts/verify.js` discovery.
- **Alternatives Considered**:
  - *Include in root discovery*: Rejected because hook falsification tests operate on agent-specific Claude hook infrastructure rather than workspace deliverables.
- **Rationale**: Root `verify.js` gates repository deliverables and tooling; agent hook integrity is managed in hook-specific testing workflows.

## File Changes

| File | Change Type | Description |
| :--- | :--- | :--- |
| `scripts/verify.js` | Modify | Adds `collectTestSuites` walker (pruning `node_modules`), discovers and executes all conforming suites, retains explicit non-conforming runners and 11 `--check` guards. |
| `scripts/lib/test-shared-libs.js` -> `scripts/lib/shared-libs.test.js` | Rename | Aligns orphaned shared library test suite with discovery pattern `*.test.js`. |
| `openspec/specs/quality-gates/spec.md` | Delta / Modify | Relaxes literal command string requirements into dynamic discovery and execution semantics. |

## Data Flow & Execution Order

1. **Phase 0: Version Square** (`checkVersionSquare`): 6-way version alignment.
2. **Phase 0b: Conforming Unit Suites** (`collectTestSuites`):
   - Recursively walks `scripts/` and `skills/` (pruning `node_modules`).
   - Discovers 20 suites (`*.test.js`, `*.test.mjs`).
   - Executes sequentially via `node <file>`, halting immediately on any non-zero exit.
3. **Phase 0c: Non-Conforming Unit Suites**:
   - Executes `skills/nn-trannsform/test/run.js` and `iNNfo/specs/scripts/test-vocabulary.js`.
4. **Phases 1-13: Deterministic Drift Guards & Immutability**:
   - Executes 11 `--check` drift guards and immutability checks in numbered order.

## Testing & Verification Strategy

- Run `node scripts/verify.js` locally.
- Validate that:
  1. Discovery reports `Discovered 20 script/skill test suites.`
  2. `scripts/lib/shared-libs.test.js` executes and passes.
  3. Non-conforming runners (`nn-trannsform`, `test-vocabulary`) execute and pass.
  4. All 11 `--check` drift guards execute in exact sequence.
  5. The verify command exits with status code 0.
