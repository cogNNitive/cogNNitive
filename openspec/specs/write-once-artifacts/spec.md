# write-once-artifacts Specification

## Purpose

A citation must point at bytes that cannot change. Producers never overwrite; each output is a new member of a family, named with a UTC suffix. "Latest" is a query over names. Retention is proposed by a planner and executed only with user consent.
## Requirements
### Requirement: `writeOnce` is the only producer write path

innfo-core MUST export `writeOnce(root, target, bytes, options)` (target is `{dir, key, ext}`; options carry `inputs` and a clock) that writes bytes to a new, unique, suffixed path (per `nn-naming-contract`) and never opens an existing file for writing: it opens with exclusive-create semantics and, when the name already exists, retries with the next tie-break number. It reports `written` or `deduplicated`, and throws `PATH_TOO_LONG` or `HASH_MISMATCH` before writing. The write step order is: path budget, input hash guard, dedup against the latest member, exclusive-create write. Producers named in "Producers adopt write-once" MUST write through it.

#### Scenario: New member, old bytes untouched
- GIVEN `artifacts/report_20261002T101500Z.md` exists
- WHEN `writeOnce` stores different bytes for family `report`
- THEN a new file with a later suffix exists
- AND the SHA-256 of `report_20261002T101500Z.md` is unchanged

#### Scenario: Same-second collision
- GIVEN two `writeOnce` calls for the same family within one second with different bytes
- WHEN both complete
- THEN the second file is named with the `-2` tie-break and both exist

#### Scenario: Slow clock still writes the latest member
- GIVEN the latest member carries a stamp later than the writer's current clock
- WHEN `writeOnce` stores different bytes
- THEN the new member's stamp is not earlier than the latest member's stamp (a tie-break is bumped on equality), so the new write is the latest by name

### Requirement: Hash guard on inputs

`writeOnce` MUST accept the files the new artifact derives from. For every input that has a sidecar, the sidecar `sha256` MUST equal the hash of the input's current raw bytes. On a mismatch `writeOnce` MUST fail with the error `HASH_MISMATCH` naming the input and MUST NOT write. Hashing MUST use raw bytes only (no line-ending normalization).

#### Scenario: Stale input blocks the write
- GIVEN `sources/import/prices.csv` edited after its sidecar was written
- WHEN `writeOnce` is called with that input
- THEN it fails naming `sources/import/prices.csv` and nothing is written

#### Scenario: CRLF fixture passes
- GIVEN a CRLF CSV cognitivized as-is
- WHEN `writeOnce` runs with it as input
- THEN the guard passes

#### Scenario: Input without a sidecar
- GIVEN an input with no sidecar
- WHEN `writeOnce` runs
- THEN the guard does not apply to that input

### Requirement: Dedup against the latest member

`writeOnce` MUST compare the new bytes with the latest member of the family, using the member's sidecar `sha256` when it has one and a hash of its raw bytes otherwise. When equal it MUST NOT write and MUST report `deduplicated` with the existing path. Only the latest member is compared, so content that returns to an earlier value after a change is written as a new member.

#### Scenario: Identical bytes
- GIVEN the latest member holds bytes A
- WHEN `writeOnce` receives bytes A
- THEN no file is written and the result is `deduplicated`

#### Scenario: A, B, A
- GIVEN members holding A then B
- WHEN `writeOnce` receives A
- THEN a third member holding A is written

### Requirement: Latest-of-family is a name query

`latestOfFamily(members)`, a pure function over the members of one family `(dir, key, ext)`, MUST resolve the latest member by name pattern per `nn-naming-contract`. The system MUST NOT create or maintain a moving `_latest` alias, copy, or link.

#### Scenario: Latest resolves from names
- GIVEN `x.csv`, `x_20261002T101500Z.csv`, `x_20261003T080000Z.csv`
- WHEN `latestOfFamily` runs
- THEN it returns `x_20261003T080000Z.csv`

#### Scenario: No alias exists
- GIVEN any workspace after producers ran
- WHEN searched for files or links named `*_latest*`
- THEN none exist

### Requirement: Garbage collection proposes and deletes only with consent

The GC planner (`planGc`) MUST be a pure function over the families and the set of cited paths, returning the family members that are not the latest of their family and are cited by no `sources` citation in the workspace (lineage-driven; a citation of a member's sidecar counts as a citation of that member). It MUST NOT delete. The CLI exposes it as `--gc` (dry run) and `--gc --apply --yes --paths <list>`. Deleting (`applyGc`) MUST require an explicit user-confirmed list, MUST recompute the plan and delete only the intersection of the confirmed list and that fresh plan, and MUST also delete each deleted member's sidecar. Non-interactive runs (CI, `verify`) MUST NOT pass `--apply` and MUST NOT delete.

#### Scenario: Cited old member is retained
- GIVEN a family of three members where the first is cited by a kNNowledge file
- WHEN the planner runs
- THEN the first member is not in the proposal
- AND the latest member is not in the proposal

#### Scenario: Uncited old member is proposed, not deleted
- GIVEN an uncited non-latest member
- WHEN the planner runs
- THEN it appears in the proposal and remains on disk

#### Scenario: Consent required
- GIVEN a proposal
- WHEN the apply step runs without a user-confirmed list
- THEN nothing is deleted

#### Scenario: Stale confirmation is ignored
- GIVEN a confirmed member that became cited after the proposal was produced
- WHEN the apply step runs
- THEN that member is not in the fresh plan and is not deleted

#### Scenario: Sidecar leaves with its member
- GIVEN a confirmed member with a sidecar
- WHEN the apply step runs
- THEN both the member and its sidecar are removed

### Requirement: The lineage record is exempt

`*_cogNNitive_NN.md` MUST be a living document updated in place; `writeOnce` and the family rules MUST NOT apply to it, and GC never proposes it. The managed-section regeneration and journal append continue as defined by `lineage-record-sync`.

A file is an *artifact* for the lineage record only if it is a timestamped family member or declares upstream `sources`. A hand-written markdown file with neither is not an artifact node and is not projected into the lineage record.

#### Scenario: Record refresh keeps one file
- GIVEN a workspace with `Acme_cogNNitive_NN.md`
- WHEN `--lineage` runs after a change
- THEN the same file is updated and no suffixed copy is created

### Requirement: Producers adopt write-once

The following MUST write through `writeOnce`: the impact report (`impact-checker.js`), transformer output (`transformer.js`), curated CSV (`curate-csv.js`), raw imports, conversation promotion, the compile and video procedures' outputs, the `--view` console export, and `workspace-index.js` and `scanner.js` outputs that previously used fixed names. Model and domain consoles are NOT write-once: they are overwritten at a stable path by the shared console writer (`console-regeneration`). Running any write-once producer twice on unchanged input MUST write no new file; changed input MUST write a new suffixed file and leave earlier bytes identical. A curated CSV MUST be a write-once artifact distinct from its raw file. (Previously: the console export (`export-console.mjs`) was listed as a write-once producer.)

#### Scenario: Second run is a no-op
- GIVEN a producer that has run once
- WHEN it runs again on unchanged input
- THEN the file listing and all hashes are unchanged

#### Scenario: Changed input adds a member
- GIVEN the input changed
- WHEN the producer runs
- THEN a new suffixed file exists and all earlier files are byte-identical

#### Scenario: Curated CSV does not replace the raw
- GIVEN `sources/import/sales.csv`
- WHEN curation runs
- THEN the curated CSV is a separate suffixed file in `artifacts/` and `sales.csv` is unchanged

#### Scenario: Consoles are exempt
- GIVEN a single-model scoped console exported twice with a model change in between
- WHEN the console folder is listed
- THEN it holds one `<stem>_console.html`, not a suffixed family

### Requirement: Order never comes from the clock

Ordering, tie-breaks, and "latest" MUST derive only from the names. mtime and cross-machine clock skew MUST NOT affect them.

#### Scenario: Skewed clock
- GIVEN a member written from a machine whose clock is behind, producing a lower suffix than an existing member
- WHEN the latest is resolved
- THEN the member with the higher name order is latest

