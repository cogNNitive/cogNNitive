# Delta for matrix-storage-hygiene

`check_domain` reports layout problems, version skew and placement mismatches, but nothing tells a maintainer that a matrix persisted cells nobody evaluated. D3 of the matrix grill accepted that a Markdown matrix costs `rows × columns`, and accepted lazy pruning instead of a migration command. This delta adds the only observability that decision gets: without it, a dense matrix stays dense silently and looks like a healthy domain.

## ADDED Requirements

### Requirement: A `-` in a matrix table is the hole marker, not a cell

The parser MUST NOT create a cell for a matrix table entry that is `-` or empty: that entry is the hole marker for a row/column pair with no cell.
The serializer MUST write `-` only for a pair of the table that has no cell, because a Markdown table is rectangular.
Parsing a serialized matrix MUST yield the same set of cells that was serialized, whether the cells form a rectangle or not.
An untouched matrix MUST serialize back with the same rows, columns and order it was read with, including a row or a column that holds only `-`.
A mutation that touches a matrix MUST drop the rows and columns that hold no evaluated cell (the lazy prune), and serializing the pruned matrix again MUST yield the same bytes.

#### Scenario: A non-rectangular sparse matrix round-trips
- GIVEN a matrix whose only cells are `Admin`/`read` and `User`/`write`
- WHEN it is serialized and parsed again
- THEN the table shows two `-`, one for `Admin`/`write` and one for `User`/`read`
- AND the parsed matrix holds exactly the two original cells
- AND a further touch of the matrix serializes to the same bytes

#### Scenario: A rectangular matrix round-trips byte for byte
- GIVEN a matrix table in which every pair holds a value
- WHEN it is parsed and serialized
- THEN the output is byte-identical to the input

### Requirement: check_domain reports persisted matrix cells that carry no value

`check_domain` MUST report, per model and per matrix, when the persisted table holds a row or a column in which no cell has a value, naming the model, the matrix and the number of table cells in those rows and columns.
The `-` that the serializer writes for an absent pair inside a row and a column that both hold a value MUST NOT be reported.
The finding MUST be a warning: it MUST NOT change the command's exit code and MUST NOT block validation.

#### Scenario: A dense matrix is reported
- GIVEN a domain whose model `targets_NN.md` carries a 2×2 matrix table whose four entries are all `-`
- WHEN `check_domain` runs
- THEN the report names that model and that matrix
- AND it states that the matrix persists four cells in rows or columns with no value
- AND the domain still validates, because the finding is a warning

#### Scenario: A sparse matrix stays silent
- GIVEN a domain whose matrices persist only rows and columns that hold an evaluated cell
- WHEN `check_domain` runs
- THEN no matrix finding is reported

#### Scenario: The engine's own filler stays silent
- GIVEN a matrix with the cells `Admin`/`read` and `User`/`write`, written by the serializer with two `-`
- WHEN `check_domain` runs
- THEN no matrix finding is reported

## Context: why a diagnostic instead of a migration

- A dense matrix is valid iNNfo. No validator requires completeness, and `-` is exempt from the `values::` check (`iNNfo/packages/nn-core/src/validator/knowledge-checks.ts:474`), so nothing is broken and nothing should fail.
- The pruning happens on its own the next time a change touches the matrix: the parser reads `-` as an absent pair, and a touched matrix drops the rows and columns that hold no evaluated cell, so a matrix edited after D1 lands converges to the smallest table that shows its evaluated cells.
- What a Markdown table cannot prune is the `-` inside a live row and column: the table is rectangular, so that filler is the format's floor, not waste, and the diagnostic ignores it.
- Touching one cell rewrites the whole matrix table while the changeset records that one cell. The rows and columns the prune drops held no evaluated cell, so the rewrite loses no data; it is the lazy prune taking effect.
- A migration command was rejected in the grill. It is a new command, its own tests and its own consent surface, for a problem with zero measured cases: `coNNtent_NN` holds 0 matrices across 272 documents.
- The diagnostic reuses the channel `check_domain` already uses for `PLACEMENT_MISMATCH`, so a maintainer sees it where they already look.

## Boundary with issue #941

`#941` prunes `changes/` from the domain model index in nn-core and nn-mcp. This delta reads matrices from the models the index already resolves, so it neither depends on nor duplicates that work. `scripts/export-console.mjs` builds its own model list and is out of scope here: any console-side matrix reporting belongs to the console, not to `check_domain`.

## What this delta does not do

- It does not measure or cap the render of a matrix. D2 keeps the console drawing the full derived grid; the render ceiling is a separate decision taken against a real matrix.
- It does not report a matrix for being large. The accepted floor is `rows × columns`, so "large" is legitimate until an axis is large; the finding is about wasted persisted cells, not about size.
- It does not touch the archive-lifecycle question (whether an archived element keeps its row). That is parked in `archive-lifecycle`, not here.
