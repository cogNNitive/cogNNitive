# Tasks: Console Export Status, Staleness Inspection, and Skill Menu Alignment

## Phase 1: Test Harness & Argument Parsing (TDD Red)

- [x] 1.1 Create test suite harness in [`scripts/export-console.test.mjs`](scripts/export-console.test.mjs) with temporary workspace fixtures and execution helper <!-- id: 1.1 -->
- [x] 1.2 Author failing unit tests for CLI argument parsing (`--status`, `--tree`, `--list`, `--all`, `--stale`, `--filter <pattern>`, positional substrings, and invalid argument handling) <!-- id: 1.2 -->

## Phase 2: SHA-256 Hashing, Metadata Injection & Status Engine (TDD Green)

- [x] 2.1 Implement source model content hashing (`computeSha256`) and slot injection of `meta.sha256` in [`scripts/export-console.mjs`](scripts/export-console.mjs) <!-- id: 2.1 -->
- [x] 2.2 Implement status inspection algorithm (`inspectModelStatus` / `extractModelMetaFromHtml`) detecting `fresh`, `stale`, `uncompiled`, and `version_mismatch` states <!-- id: 2.2 -->
- [x] 2.3 Implement `--status` command handling to output per-model compilation status tags in read-only mode without mutating files <!-- id: 2.3 -->
- [x] 2.4 Verify all status inspection and metadata hashing tests pass in [`scripts/export-console.test.mjs`](scripts/export-console.test.mjs) <!-- id: 2.4 -->

## Phase 3: Tree Hierarchy Visualization & Selective Export (TDD Green)

- [x] 3.1 Implement `--tree` hierarchical visualization rendering models grouped by directory with status and target HTML paths <!-- id: 3.1 -->
- [x] 3.2 Implement selective export compilation flags (`--stale`, `--filter <pattern>`, `--all`) skipping unchanged/fresh models <!-- id: 3.2 -->
- [x] 3.3 Author unit tests for tree hierarchy output and selective compilation filtering, and verify all tests pass <!-- id: 3.3 -->

## Phase 4: Skill Entry Menu Alignment (`skills/nn-innfo/SKILL.md`)

- [x] 4.1 Update Section 0 / 0a entry menu in [`skills/nn-innfo/SKILL.md`](skills/nn-innfo/SKILL.md) to the canonical 7-option structure (`[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, `[y]`) <!-- id: 4.1 -->
- [x] 4.2 Update Active Model Context Gate (§0a-bis) to enforce active model validation for `[b]`, `[c]`, `[d]`, and `[x]` with informative grace and disambiguation rules <!-- id: 4.2 -->
- [x] 4.3 Update action routing and section references (consolidating MCP validation and Architecture Assistant under `[c]`, dedicated console exports under `[d]`, and documentation browsing under `[w]`) <!-- id: 4.3 -->
- [x] 4.4 Align Core Rules and Activation Contract in [`skills/nn-innfo/SKILL.md`](skills/nn-innfo/SKILL.md) to match remapped options <!-- id: 4.4 -->

## Phase 5: Manifest Governance & Documentation Cleanup

- [x] 5.1 Remove `pdf-to-innfo-dashboard` workflow references from [`docs/use/manifest.md`](docs/use/manifest.md) and [`docs/use/manifest-next.md`](docs/use/manifest-next.md) <!-- id: 5.1 -->
- [x] 5.2 Execute `npm run sync:versions` and `npm run check:versions` to synchronize and validate manifest channel parity <!-- id: 5.2 -->

## Phase 6: Comprehensive Verification & Integrity Gate

- [x] 6.1 Execute full test suite `node scripts/export-console.test.mjs` and verify clean pass <!-- id: 6.1 -->
- [x] 6.2 Execute repository integrity checks (`npm run check:versions`, `npm run check:integrity`, `npm run lint`) <!-- id: 6.2 -->
- [x] 6.3 Perform dry-run CLI validation (`--status`, `--tree`, `--list`) against real workspace models <!-- id: 6.3 -->
