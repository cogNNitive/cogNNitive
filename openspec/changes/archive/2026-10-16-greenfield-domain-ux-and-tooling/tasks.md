# Tasks: Greenfield Domain Setup, Tooling Ergonomics & Agent UX Polish

## 1. CLI & Bootstrap: In-Place Support

- [x] 1.1 RED — Add unit test in `skills/nn-sources/test/unit/test-bootstrap-inplace.js` asserting `bootstrapProject(null, targetDir, null, { inPlace: true })` initializes `targetDir` without creating a nested subfolder.
- [x] 1.2 GREEN — Update `skills/nn-sources/scripts/lib/bootstrap.js` to support `{ inPlace: true }` and compute `projectDir` directly from `destParentDir` / `process.cwd()`.
- [x] 1.3 GREEN — Expose `--in-place` flag in `skills/nn-sources/scripts/index.js` CLI handler.
- [x] 1.4 Verify — Run `node skills/nn-sources/test/run.js` and verify all bootstrap tests pass.

## 2. MCP Mutation Engine: Narrative Concepts & Matrix Integrity

- [x] 2.1 RED — Test changeset operation `update_concept_text` on a model whose parent blueprint defines a `primitive: text` concept; verify the section content updates and is cited.
- [x] 2.2 GREEN — Implement `update_concept_text` handler in `innfo-mcp` changeset pipeline.
- [x] 2.3 RED — Test `remove_element` when removing a scaffolded sample element; assert that corresponding rows in `## NN Item Markers` and matrix tables are pruned.
- [x] 2.4 GREEN — Implement cascading row cleanup on `remove_element` in `innfo-mcp`.
- [x] 2.5 RED — Test `update_matrix_cell` with accented/special-character matrix names (e.g. `Mensajes × Públicos`); assert cell updates successfully without requiring pre-slugification.
- [x] 2.6 GREEN — Add accent-folding and flexible slug matching to matrix table lookup in `innfo-mcp`.
- [x] 2.7 GREEN — Implement `prune_changesets` tool in `innfo-mcp` to safely detect and delete unreferenced changesets from `changes/`.
- [x] 2.8 Verify — Run `innfo-mcp` test suite against sample knowledge models.

## 3. Skills & Agent UX Guidelines

- [x] 3.1 GREEN — In `skills/nn-innfo/SKILL.md`, add explicit documentation for the Canonical 2-Hop Traceability Contract (`element -> changeset -> source`).
- [x] 3.2 GREEN — In `skills/nn-innfo/SKILL.md`, add Domain Language Auto-Alignment rules for Phase A (App selection & concept authoring).
- [x] 3.3 GREEN — In `skills/nn/SKILL.md`, add Business User Abstraction Guard and Optimistic Execution recommendations for greenfield domain onboarding.
- [x] 3.4 Verify — Validate skill markdown integrity using `node skills/nn-skills-lifecycle/scripts/index.js --audit`.

## 4. End-to-End Greenfield Verification

- [x] 4.1 E2E Smoke Test — Run a simulated greenfield session from an empty directory:
  1. Initialize with `--in-place`.
  2. Import a primary Markdown source.
  3. Create a blueprint containing both `text` and `weight` concepts.
  4. Apply a changeset updating text and matrix cells with accents.
  5. Remove scaffold element and verify matrix cleanliness.
  6. Regenerate console and verify zero broken citations or dangling changesets.
