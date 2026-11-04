# write-once-artifacts Specification (delta)

## MODIFIED Requirements

### Requirement: Garbage collection proposes and deletes only with consent

The GC planner (`planGc`) MUST be a pure function over the families and the set of cited paths, returning the family members that are not the latest of their family and are cited by no evidence of any applied change in the workspace (`citedPaths` = all-time evidence, see `computed-lineage-view`; a citation of a member's sidecar counts as a citation of that member). It MUST NOT delete. It MUST NEVER propose a changeset under `changes/`. The CLI exposes it as `--gc` (dry run) and `--gc --apply --yes --paths <list>`. Deleting (`applyGc`) MUST require an explicit user-confirmed list, MUST recompute the plan and delete only the intersection of the confirmed list and that fresh plan, and MUST also delete each deleted member's sidecar. Non-interactive runs (CI, `verify`) MUST NOT pass `--apply` and MUST NOT delete.
(Previously: cited meant cited by a `sources` citation in the workspace, lineage-driven.)

#### Scenario: Cited old member is retained
- GIVEN a family of three members where the first is the evidence of an applied change
- WHEN the planner runs
- THEN the first member is not in the proposal
- AND the latest member is not in the proposal

#### Scenario: Superseded evidence still protects
- GIVEN a member cited only by a change whose value was later overwritten
- WHEN the planner runs
- THEN the member is not in the proposal

#### Scenario: Uncited old member is proposed, not deleted
- GIVEN an uncited non-latest member
- WHEN the planner runs
- THEN it appears in the proposal and remains on disk

#### Scenario: Changesets are never proposed
- GIVEN any changeset under `changes/`
- WHEN the planner runs
- THEN no changeset is in the proposal

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

### Requirement: Producers adopt write-once

The following MUST write through `writeOnce`: the impact report (`impact-checker.js`), transformer output (`transformer.js`), curated CSV (`curate-csv.js`), raw imports, conversation promotion, the compile and video procedures' outputs, the `--view` console export, and `scanner.js` outputs that previously used fixed names. Model and domain consoles are NOT write-once: they are overwritten at a stable path by the shared console writer (`console-regeneration`). Running any write-once producer twice on unchanged input MUST write no new file; changed input MUST write a new suffixed file and leave earlier bytes identical. A curated CSV MUST be a write-once artifact distinct from its raw file. Every producer of a non-regenerable artifact (transformer output, curated CSV, compile and video outputs) MUST also emit a ready `produce_artifact` payload (see `artifact-production-change`); the impact report and consoles are regenerable views and are exempt. (Previously: the console export (`export-console.mjs`) was listed as a write-once producer; producers had no record obligation.)

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

#### Scenario: Curated CSV emits its record payload
- GIVEN a curation run that wrote a new member
- WHEN it completes
- THEN a `produce_artifact` payload naming the member as target and the raw as evidence is emitted

#### Scenario: Consoles are exempt
- GIVEN a single-model scoped console exported twice with a model change in between
- WHEN the console folder is listed
- THEN it holds one `<stem>_console.html`, not a suffixed family
- AND no `produce_artifact` payload is emitted for it

## REMOVED Requirements

### Requirement: The lineage record is exempt
(Reason: the persisted lineage record `*_cogNNitive_NN.md` no longer exists, so there is no living document to exempt. The artifact definition it carried (a timestamped family member or a file declaring upstream) is replaced by "timestamped family member or target of `produce_artifact`" in `computed-lineage-view`.)
(Migration: none — legacy out of scope. A stray `*_cogNNitive_NN.md` is an ordinary document with role `knowledge`.)
