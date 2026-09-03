# Implementation Tasks: Scripts Modular Refactor

Decomposes monolithic scripts into modular libraries in `scripts/lib/` and domain helpers, reducing top-level CLI scripts to orchestrators under 200 lines while preserving zero runtime dependencies.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
Delivery strategy: ask-on-risk

- **Total Estimated Lines**: ~950–1,150 lines (new modules + refactored orchestrators + tests).
- **Recommended PR Work Units**:
  - **Unit 1**: Shared Core Libraries (`scripts/lib/yaml-parser.js`, `github-client.js`, `atomic-fs.js`) and unit tests (~350 lines).
  - **Unit 2**: Manifest Tooling (`validate-manifest.js` orchestrator + `scripts/manifest/lib/manifest-rules.js`) (~250 lines).
  - **Unit 3**: Skills Manager (`actioNN/scripts/skills-manager.js` orchestrator + `skills-commands.js`) (~280 lines).
  - **Unit 4**: Scanner, Provenance & Line-Count Verification (`nn-trannsform/scripts/lib/*` and `verify.js`) (~270 lines).

---

## Phase 1: Shared Core Libraries in `scripts/lib/`

Extract duplicate cross-cutting logic into zero-dependency Node.js standard-library modules.

- [x] 1.1 Implement `scripts/lib/yaml-parser.js` exporting `parseScalar`, `parseFocusedYaml`, `parseFrontmatter`, and `parseManifest`.
- [x] 1.2 Implement `scripts/lib/github-client.js` exporting `apiRequest`, `fetchJson`, `downloadFile`, `resolveRef`, and rate-limiting helpers.
- [x] 1.3 Implement `scripts/lib/atomic-fs.js` exporting safe write/copy operations: `saveJsonAtomic`, `copyDirAtomic`, `replaceDirAtomic`, and `extractTarball`.
- [x] 1.4 Add unit tests in `scripts/lib/test-shared-libs.js` verifying YAML parsing edge cases, atomic filesystem rollbacks, and GitHub HTTP error handling.

---

## Phase 2: Refactor Manifest Tooling

Decompose manifest validation into domain rule checks and a lightweight CLI entry.

- [x] 2.1 Extract structural validation, release checks, and commit policies into `scripts/manifest/lib/manifest-rules.js`.
- [x] 2.2 Refactor `scripts/manifest/validate-manifest.js` into an orchestrator (< 200 lines) delegating to `yaml-parser.js`, `github-client.js`, and `manifest-rules.js`.
- [x] 2.3 Ensure `validate-manifest.js` re-exports public validator functions for backward compatibility.
- [x] 2.4 Verify existing regression tests pass: `node scripts/manifest/validate-manifest.test.js`.

---

## Phase 3: Refactor Skills Manager

Decompose `skills-manager.js` into a lean CLI and command execution library.

- [x] 3.1 Extract command handlers (`status`, `install`, `update`, `sync`) and consent gates into `actioNN/scripts/lib/skills-commands.js`.
- [x] 3.2 Refactor `actioNN/scripts/skills-manager.js` into a lean CLI orchestrator (< 200 lines) handling argument parsing, usage help, and dispatching.
- [x] 3.3 Ensure all CLI flags, exit codes (0/1/2), and module exports remain backward-compatible.
- [x] 3.4 Verify existing tests pass: `node actioNN/scripts/skills-manager.test.js`.

---

## Phase 4: Refactor Scanner & Provenance

Decompose `nn-trannsform` transformation scripts into modular domain helpers.

- [x] 4.1 Extract file discovery and hashing to `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` and converters to `scanner-converters.js`.
- [x] 4.2 Refactor `actioNN/skills/nn-trannsform/scripts/scanner.js` into an orchestrator under 200 lines with re-exports.
- [x] 4.3 Extract model synthesis and indexing to `provenance-model.js` and `workspace-index.js`.
- [x] 4.4 Refactor `actioNN/skills/nn-trannsform/scripts/provenance.js` into an orchestrator under 200 lines with re-exports.
- [x] 4.5 Verify unit tests: `node actioNN/skills/nn-trannsform/test/unit/test-scanner.js` and `test-provenance.js`.

---

## Phase 5: Automated Line-Count & Regression Verification

- [x] 5.1 Add an automated line-count check in `scripts/verify.js` enforcing the < 200 line limit on refactored orchestrators.
- [x] 5.2 Execute full ecosystem verification suite to ensure 100% test pass rate and zero external runtime dependencies.
