# Delta for changeset-apply-engine

`add_matrix` writes a Level-3 `# NN matrices:` table and seeds it with the full cartesian product of the two axis concepts, one cell per pair, every value empty (`iNNfo/packages/nn-core/src/mutate.ts:1758-1766`). The serializer then emits that rectangle and fills holes with `-` (`iNNfo/packages/nn-core/src/parser/serializer.ts:414-440`), so a matrix costs `rows × columns` bytes from the moment it is created and never only what was evaluated. This delta removes the seeding and gives the two other write paths an explicit sparse semantics. The table format itself does not change.

## MODIFIED Requirements

### Requirement: add_matrix declares the matrix without materialising the axis grid

`add_matrix` MUST create the matrix declaration with an empty cell list and MUST NOT create a cell for any pair of axis elements.
The axis universe of a matrix MUST be derived from the elements of `source` and `targetConcept` at read and render time, and MUST NOT be persisted as empty cells.

#### Scenario: Two axis concepts with elements create no cells
- GIVEN a level-3 model whose `Dianas` concept holds two elements and whose `Resultados` concept holds two elements
- WHEN `add_matrix` runs with `source: "Dianas"` and `targetConcept: "Resultados"`
- THEN the matrix exists with an empty cell list
- AND the serialized document contains no cell whose value is `-`

#### Scenario: The declaration survives the round trip
- GIVEN a matrix declared with an empty cell list
- WHEN the document is serialized and parsed again
- THEN the matrix declaration is still present
- AND its cell list is still empty

## ADDED Requirements

### Requirement: add_matrix refuses column and row seeds

`add_matrix` MUST reject the retired `columns` and `rows` arguments with an error that names them, because the axis universe has one source of truth: the two concepts' elements.

#### Scenario: A caller that still seeds is told the argument is gone
- GIVEN a caller that passes `columns` or `rows` to `add_matrix`
- WHEN the operation runs
- THEN it fails with an error naming the retired argument
- AND no matrix is written to the model

### Requirement: update_matrix_cell with an empty value deletes the cell

An `update_matrix_cell` whose value is the empty string MUST remove the row/column pair from the matrix, matching the rule that already governs `update_field`, and MUST NOT persist an empty cell.

#### Scenario: Clearing an evaluated cell removes the pair
- GIVEN a matrix with one evaluated cell at row `Admin`, column `Read`
- WHEN `update_matrix_cell` runs for that pair with an empty value
- THEN the matrix holds no cell for that pair
- AND the serialized table carries no `-` for it

## Context: where the cost comes from

Two write paths make the cost, and they multiply:

- **Creation seeds everything.** `add_matrix` defaults `cols` to the target concept's element names and `rows` to the source concept's element names, then pushes one `{row, col, value: ''}` per pair. With 500 and 200 elements that is 100,000 empty cells in memory and in the file. Nobody chose it; it is the seed's default.
- **The serializer rebuilds the rectangle.** It derives its columns and rows from the cells that exist and then emits the full product, writing `-` for every hole. So even without seeding, a matrix whose rows and columns have each been touched once is `rows × columns` again. A Markdown table is rectangular by construction: this floor is the format's, not the seed's.

The parser makes the round trip symmetric: it keeps a cell when its value is truthy, so a `-` comes back as a cell with value `-`. The rectangle therefore also lands in memory on every read.

## Decisions locked (maintainer grill, 2026-11-27, issue #945)

- **D1 — Poda.** `add_matrix` stops seeding the cartesian product; only cells with a value persist. The Markdown format is unchanged.
- **D2 — Scope is persistence, not render.** The console keeps drawing the full derived grid. The render ceiling is measured against a real matrix before any UI change; no threshold is invented.
- **D3 — Existing dense matrices get lazy pruning plus a diagnostic.** No migration command. The diagnostic is specified in the `matrix-storage-hygiene` delta.
- **D4 — Emptying a cell deletes it.** Same rule `update_field` already uses for an empty string. No sentinel value.
- **D5 — `columns` and `rows` leave the contract.** An explicit error, so the axis universe has one source of truth.

The rectangular floor is **accepted, not removed**: real declared matrices are at most about 30×30 (`iNNfo/specs/business-model_V_0-3-0_NN.md` declares 8, e.g. `Problems × Value propositions`), so the floor does not matter in practice. Replacing the grid with a long table (`row | col | value`) would make cost equal evaluated cells but lose the grid reading, which is the reason a matrix exists. That alternative is rejected until a real large-axis matrix exists.

## Evidence verified in the code (2026-11-27)

- `iNNfo/packages/nn-core/src/mutate.ts:1758-1766` — the seed: `const cols = ... elementNamesOf(targetConcept)`, `const rows = ... elementNamesOf(source)`, then a double loop pushing `value: ''`.
- `iNNfo/packages/nn-core/src/parser/serializer.ts:414-440` — columns and rows derived from the cells present, then every pair emitted with `cellMap.get(...) || '-'`.
- `iNNfo/packages/nn-core/src/parser/sections.ts:301` — `if (row[colNames[i]]) { cells.push(...) }`, so `-` returns as a cell with value `-`.
- `iNNfo/packages/nn-core/src/validator/knowledge-checks.ts:474` — `-` and `X` are exempt from the `values::` check, so no validator rejects a sparse or a holey matrix, and none requires completeness.
- `test/fixtures/testlab/kNNowledge/TestLab_coverage_TestLab_NN.md` — a real document with two rows and two columns whose `Element 2B` column is entirely empty and is persisted as `-` anyway.
- `iNNfo/packages/nn-core/tests/changeset/concept-fields-and-matrix-removal.test.ts:316` — an existing test **pins the current dense behaviour** ("seeding rows/columns from the axis concepts", asserting both seeded columns). Implementing D1 requires rewriting this test, not adding a new one next to it.
- Measured on 2026-11-27: `coNNtent_NN` holds 0 matrices across 272 documents, so this is preventive, not an active fire.
- Boundary with issue #941: it prunes `changes/` from the domain model index (`collectModels`, `findKnowledgeFile`, `sync_domain_manifest`). It does not touch matrices, and `scripts/export-console.mjs` builds its own list, so no part of this change waits on it.

## RED test (fails on the code this change is written against)

File: `iNNfo/packages/nn-core/tests/matrix-sparse-storage.test.ts` (not committed: a failing test would red CI before the change lands; this section is its evidence).

Command, from the session worktree:

```
node node_modules/vitest/vitest.mjs run iNNfo/packages/nn-core/tests/matrix-sparse-storage.test.ts
```

Observed output, 2026-11-27, on `session/matrix-sparse-storage` at `e53427a63`:

```text
     × D1: add_matrix declares the matrix without seeding a cell for any pair 24ms
     × D5: add_matrix refuses columns and rows as seeds 3ms
     × D4: emptying a matrix cell deletes the pair instead of persisting a dash 4ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  iNNfo/packages/nn-core/tests/matrix-sparse-storage.test.ts > matrix-sparse-storage (RED) > D1: add_matrix declares the matrix without seeding a cell for any pair
AssertionError: expected [ { row: 'Grow revenue', …(2) }, …(3) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   { "col": "ARR up", "row": "Grow revenue", "value": "" },
+   { "col": "Logo retention", "row": "Grow revenue", "value": "" },
+   { "col": "ARR up", "row": "Cut churn", "value": "" },
+   { "col": "Logo retention", "row": "Cut churn", "value": "" },
+ ]

 FAIL  iNNfo/packages/nn-core/tests/matrix-sparse-storage.test.ts > matrix-sparse-storage (RED) > D5: add_matrix refuses columns and rows as seeds
AssertionError: expected true to be false // Object.is equality

 FAIL  iNNfo/packages/nn-core/tests/matrix-sparse-storage.test.ts > matrix-sparse-storage (RED) > D4: emptying a matrix cell deletes the pair instead of persisting a dash
AssertionError: expected [ { row: 'Admin', col: 'Read', …(1) } ] to deeply equal []
+ [ { "col": "Read", "row": "Admin", "value": "" } ]

 Test Files  1 failed (1)
      Tests  3 failed (3)
```

The three failures are the three write paths: the seed writes four cells for a 2×2 axis, `columns`/`rows` are still accepted, and an emptied cell stays as `value: ""` (which the serializer renders as `-`).
