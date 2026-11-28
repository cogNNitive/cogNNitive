# Delta for matrix-storage-hygiene

`check_domain` reports layout problems, version skew and placement mismatches, but nothing tells a maintainer that a matrix persisted cells nobody evaluated. D3 of the matrix grill accepted that a Markdown matrix costs `rows × columns`, and accepted lazy pruning instead of a migration command. This delta adds the only observability that decision gets: without it, a dense matrix stays dense silently and looks like a healthy domain.

## ADDED Requirements

### Requirement: check_domain reports persisted matrix cells that carry no value

`check_domain` MUST report, per model and per matrix, when the persisted cells include pairs whose value is empty or `-`, naming the model, the matrix and the number of such cells.
The finding MUST be a warning: it MUST NOT change the command's exit code and MUST NOT block validation.

#### Scenario: A dense matrix is reported
- GIVEN a domain whose model `targets_NN.md` carries a matrix with four persisted cells and no evaluated value
- WHEN `check_domain` runs
- THEN the report names that model and that matrix
- AND it states that the matrix persists four cells with no value
- AND the domain still validates, because the finding is a warning

#### Scenario: A sparse matrix stays silent
- GIVEN a domain whose matrices persist only evaluated cells
- WHEN `check_domain` runs
- THEN no matrix finding is reported

## Context: why a diagnostic instead of a migration

- A dense matrix is valid iNNfo. No validator requires completeness, and `-` is exempt from the `values::` check (`iNNfo/packages/nn-core/src/validator/knowledge-checks.ts:474`), so nothing is broken and nothing should fail.
- The pruning happens on its own the next time a change touches the matrix: the serializer only writes cells that exist, so a matrix edited after D1 lands converges to its evaluated cells.
- A migration command was rejected in the grill. It is a new command, its own tests and its own consent surface, for a problem with zero measured cases: `coNNtent_NN` holds 0 matrices across 272 documents.
- The diagnostic reuses the channel `check_domain` already uses for `PLACEMENT_MISMATCH`, so a maintainer sees it where they already look.

## Boundary with issue #941

`#941` prunes `changes/` from the domain model index in nn-core and nn-mcp. This delta reads matrices from the models the index already resolves, so it neither depends on nor duplicates that work. `scripts/export-console.mjs` builds its own model list and is out of scope here: any console-side matrix reporting belongs to the console, not to `check_domain`.

## What this delta does not do

- It does not measure or cap the render of a matrix. D2 keeps the console drawing the full derived grid; the render ceiling is a separate decision taken against a real matrix.
- It does not report a matrix for being large. The accepted floor is `rows × columns`, so "large" is legitimate until an axis is large; the finding is about wasted persisted cells, not about size.
- It does not touch the archive-lifecycle question (whether an archived element keeps its row). That is parked in `archive-lifecycle`, not here.
