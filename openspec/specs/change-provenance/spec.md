# Change Provenance Specification

## Purpose

The change is the only write-point of provenance. The value of a knowledge unit at time T is the replay of the applied changes up to T, and its provenance is the `evidence` of the change that set it. History, origin and drift are derived, never stored. This capability defines the derivation rules: one ordering, an applied-only filter, an epoch cut on slug reuse, frozen-slug identity, evidence anchoring, matrix cells as units, and drift as "replay does not reproduce the file".

## Requirements
### Requirement: One shared deterministic comparator

All provenance consumers (value history, field origin, matrix cell origin, drift, the console payload and the console review) MUST order changes with one shared comparator exported from `innfo-core`. The comparator key MUST be, in order: (1) `applied_at` of the changeset, (2) the UTC stamp parsed from the changeset filename (`<prefix>_<author>_<stamp>_changes_NN.md`), (3) the changeset filename as a string, (4) the zero-based document index of the change inside the changeset. No consumer MAY sort by `applied_at` alone, by filename alone, or by array order. The comparator MUST be a total order: two distinct changes never compare equal. The filename stamp is parsed with `/_(\d{8}T\d{6}Z)_changes_NN\.md$/`. Apply MUST also clamp the stamped `applied_at` to `max(now, latest applied_at + 1 ms)` under the workspace lock, so that a later apply never sorts before an earlier one.

#### Scenario: Changes of one changeset are ordered by document index
- GIVEN a changeset with changes `c-01` and `c-02` that both update `m@goal-1&owner` and share one `applied_at`
- WHEN the history of `m@goal-1&owner` is derived
- THEN `c-01` precedes `c-02`
- AND the origin of the field is the evidence of `c-02`

#### Scenario: Equal applied_at across changesets uses the filename stamp
- GIVEN two changesets with the same `applied_at`, filenames carrying UTC stamps `20261010T120000Z` and `20261010T130000Z`, listed in reverse alphabetical author order
- WHEN their changes are ordered
- THEN the change from the earlier stamp precedes the change from the later stamp

#### Scenario: Filename stamp equal falls back to filename then index
- GIVEN two changesets with equal `applied_at` and equal filename stamps but different filenames
- WHEN their changes are ordered
- THEN the order follows the filename string comparison, and within one file the document index

#### Scenario: Every consumer uses the same comparator
- GIVEN the repository after this change
- WHEN searched for sorts over changes outside the shared comparator
- THEN none exists in history, origin, drift or console payload code

### Requirement: Provenance reads applied changes only

History, origin and drift MUST include a change only when its own `status` is `applied`. Changes with status `proposed`, `conflict` or `rejected` MUST NOT contribute to any derived value, even though they may carry `applied_at` or a batch annotation. A change annotated `applied` inside a `partially_applied` changeset MUST be included; a conflicted sibling in the same changeset MUST NOT. The console review MAY still list every status.

#### Scenario: A conflicted change is not history
- GIVEN a changeset with `c-01` `status:: applied` and `c-02` `status:: conflict`, both targeting `m@goal-1&owner`
- WHEN the history of `m@goal-1&owner` is derived
- THEN it contains `c-01` only
- AND the origin of the field is the evidence of `c-01`

#### Scenario: A rejected changeset contributes nothing
- GIVEN a changeset recorded `rejected`
- WHEN any history, origin or drift is derived
- THEN none of its changes appears

#### Scenario: The review UI still lists every status
- GIVEN the same changesets
- WHEN the console review lists changes
- THEN `conflict` and `rejected` changes are listed with their status
- AND they are absent from the Lineage tab history of the value

### Requirement: Epoch cut after `remove_element`

The history of a unit MUST start strictly after the latest applied `remove_element` (or `remove_matrix`, for cells) that removed it. A removal of an element MUST cut the history of the element, of all its field values, of its prose body and of every matrix cell whose row or column is that element. A `remove_matrix` MUST cut the history of every cell of that matrix. The removal change MUST remain in the changeset chain as a tombstone, visible in a deleted-units view, and MUST NOT be part of the history of a unit that reuses the slug afterwards. A new element created with the same slug after the removal MUST NOT inherit any value, evidence or origin from the removed element.

#### Scenario: Slug reuse starts a fresh history
- GIVEN element `risk-1` with applied changes `c-01` (add), `c-02` (owner=Ana), then an applied `remove_element` `c-03`, then an applied `add_element` `c-04` reusing slug `risk-1`
- WHEN the history of `m@risk-1&owner` is derived
- THEN it contains no change at or before `c-03`
- AND the origin of any field of the new `risk-1` is never the evidence of `c-02`

#### Scenario: The removal remains a tombstone
- GIVEN the same chain
- WHEN the deleted-units view is derived
- THEN it lists `m@risk-1` as deleted by `c-03`, with the evidence and author of `c-03`

#### Scenario: Removal cascades to cells
- GIVEN a matrix `swot` with a cell `m@swot&risk-1&q1` set by `c-05`, and an applied `remove_element` of `risk-1`
- WHEN a new element reuses slug `risk-1` and the cell `m@swot&risk-1&q1` is set again by `c-09`
- THEN the history of the cell contains `c-09` only

#### Scenario: Removed matrix cuts its cells
- GIVEN an applied `remove_matrix` for `swot` followed by an `add_matrix` of the same name
- WHEN the history of any cell of the new `swot` is derived
- THEN no change before the removal appears

### Requirement: Frozen-slug target identity (`resolved_target`)

At apply time the engine MUST stamp every applied change with the execution fact `resolved_target`: the canonical unit address built from the model id (the canonical id with no version token) and the frozen slugs of the addressed unit: `model@frozen-slug&field` for a field value, `model@frozen-slug&#body` for an element prose body, `model@matrix-slug&row-slug&col-slug` for a matrix cell (an axis slug is the frozen slug of the element named by the label, else `slugify(label)`; the matrix slug is `slugify(name)` at apply), `model@concept:<Name>[&<field>]` for a concept-level value, and the POSIX workspace path for an artifact. History and origin lookup MUST match by exact string equality on `resolved_target`. Matching MUST be model-scoped: the model part is part of the key. A normalizing comparison that strips punctuation (`normalizeAddressKey`) MUST NOT be used. A change without `resolved_target` (not applied) MUST NOT appear in any history.

#### Scenario: History survives a rename
- GIVEN element `alpha` (name `Alpha`), a change `c-01` setting `owner`, an applied `rename_element` to name `Beta`, and a later `update_field` `c-03` that addresses the element by its new name `Beta`
- WHEN the history of `m@alpha&owner` is derived
- THEN it contains `c-01` and `c-03`
- AND both carry `resolved_target:: m@alpha&owner`

#### Scenario: Punctuation does not collide
- GIVEN elements with frozen slugs `a-b` and `ab` in one model, each with an applied `update_field` on `owner`
- WHEN the histories of `m@a-b&owner` and `m@ab&owner` are derived
- THEN each contains only its own change

#### Scenario: Same slug in two models does not collide
- GIVEN models `m1` and `m2`, each with an element `goal-1` and an applied `update_field` on `owner`
- WHEN the history of `m1@goal-1&owner` is derived
- THEN it contains only the change that targets `m1`

#### Scenario: Cell target is stamped with slugs
- GIVEN an `update_matrix_cell` addressed by display names `Risk One`, `Q1` in matrix `SWOT`
- WHEN it is applied
- THEN `resolved_target` is `m@swot&risk-one&q1`

### Requirement: Evidence anchors are pinned by `evidence_sha256`

At apply time the engine MUST stamp every applied change whose evidence is a list of file citations with the execution fact `evidence_sha256`, the lowercase hex sha256 of the cited file bytes, one entry per evidence entry in the same order. `decision` and `unknown` evidence carry no sha. The fact lies outside the seal. When validating a stored change, a citation MUST be enforced (anchor resolution, `KU_*` diagnostics) only when the current sha256 of the cited file equals the stamped sha. When it differs, the validator MUST report the warning `EVIDENCE_SOURCE_CHANGED` naming the change and the citation, and MUST NOT report the anchor failure as an error.

#### Scenario: Matching sha enforces the anchor
- GIVEN an applied change citing `sources/import/a.md@## Needs` with a stamped sha equal to the current sha of the file, and the heading `## Needs` no longer present
- WHEN the domain is validated
- THEN a `KU_*` anchor diagnostic is reported as an error

#### Scenario: Changed source downgrades to a warning
- GIVEN the same change, and the raw file edited and re-cognitivized so the current sha differs from the stamped sha
- WHEN the domain is validated
- THEN `EVIDENCE_SOURCE_CHANGED` is reported as a warning naming the change and the citation
- AND no anchor error is reported for it

#### Scenario: List evidence stores one sha per entry
- GIVEN an applied change with `evidence: [sources/import/a.md@## One, sources/import/b.md@## Two]`
- WHEN the changeset is read back
- THEN `evidence_sha256` holds two shas in evidence order

#### Scenario: Sha is outside the seal
- GIVEN a sealed changeset
- WHEN apply stamps `resolved_target` and `evidence_sha256`
- THEN `verifyProposalSha` still returns `true`

### Requirement: Origin and history of a value

The history of a value unit MUST be the ordered list (shared comparator) of applied changes whose `resolved_target` equals the unit address, after the epoch cut. The origin of a value MUST be the `evidence` and `author` of the last change in that history. A later confirmation of an unchanged value MUST be a separate change (`update_field` with `from` equal to `to`), applied as a value no-op that still enters the history and becomes the origin. A value whose unit has no applied change MUST have no origin and counts as unrecorded.

#### Scenario: Origin is the last evidence
- GIVEN `update_field` `c-01` (evidence `[A]`) and `c-02` (evidence `[B, C]`) on `m@goal-1&owner`
- WHEN the origin is derived
- THEN the origin evidence is `[B, C]` and the author is that of `c-02`
- AND the history lists `c-01` then `c-02`

#### Scenario: A confirmation is its own change
- GIVEN `owner = Ana` set by `c-01` with evidence `A`
- WHEN a later `update_field` with `from:: Ana`, `to:: Ana` and evidence `B` is applied
- THEN the value is unchanged
- AND the history has two entries and the origin evidence is `B`

#### Scenario: A value with no change has no origin
- GIVEN a field line present in the file with no applied change targeting it
- WHEN the origin is derived
- THEN the result is "no origin" and the unit is reported as unrecorded

### Requirement: Matrix cells are knowledge units

A matrix cell MUST be a knowledge unit identified by (matrix slug, row slug, column slug), resolved at apply and stamped in `resolved_target`. A non-empty cell MUST have history, origin and drift like any value. An empty or absent cell MUST need no change. A cell deleted by the cascade of `remove_element` or `remove_matrix` MUST need no per-cell change and its history is cut under the epoch rule. A seeded matrix (`add_matrix` with `seed`) creates empty cells and therefore records no cell units.

#### Scenario: Cell history and origin
- GIVEN `update_matrix_cell` `c-01` (evidence `A`) then `c-02` (evidence `B`) on `m@swot&r1&c1`
- WHEN history and origin are derived
- THEN the history has `c-01`, `c-02` and the origin evidence is `B`

#### Scenario: Empty cell needs no change
- GIVEN a matrix seeded with rows and columns and no `update_matrix_cell`
- WHEN drift is computed
- THEN no cell is reported as unrecorded

#### Scenario: Hand-written cell is drift
- GIVEN a cell value present in the file with no applied change targeting it
- WHEN drift is computed
- THEN the cell is reported as `UNIT_WITHOUT_RECORD` naming `m@swot&r1&c1`

### Requirement: Drift means the replay does not reproduce the file

`validate_knowledge` and `check_domain` MUST compute drift when changeset context is available (a workspace root). The default mode MUST be a unit-level fold: one pass over the applied changes in comparator order, building a map of unit key to unit state in O(changes + units), after the epoch cut. For each knowledge unit (element existence, field value, concept-level value, matrix cell, prose body) the folded value is compared with the value in the file. A mismatch, or an expected value missing from the file, MUST be reported as `EDITED_WITHOUT_RECORD` naming the unit address, the expected and the actual value. A unit present in the file with no live log entry, or an element without a frozen slug, MUST be reported as `UNIT_WITHOUT_RECORD`. Both diagnostics are warnings by default and errors in strict mode. The check MUST run only for documents inside a domaiNN; with no changeset context available, drift diagnostics MUST be omitted without error. A current evidence sha that differs from the stamped `evidence_sha256` is `EVIDENCE_SOURCE_CHANGED`, and an applied change with `unknown` evidence is `EVIDENCE_UNKNOWN`. The fold MUST apply these side-effect rules: (a) `rename_element` records a relink event that is applied lazily to each expected value (`updateWikiLinks` for fields and bodies, `updateReferenceString` for schema reference fields); cell keys are slugs, so label rewrites are no-ops, cell values are not relinked, and `rename_concept` rekeys `concept:<Old>` units and relinks `concept`/`source`/`target` definition fields; (b) `update_field` with an empty `to` removes the field, and the removed unit is expected absent; (c) values are compared in serialized form, `formatPropertyValue(parsePropertyValue(x))` on both sides, never by `String()` equality; (d) `remove_element` tombstones the element, its fields, prose body and every cell whose row or column slug matches, and `remove_matrix` tombstones every cell of that matrix; (e) the `slug::` lines added by slug freezing and the `knowledge_version` frontmatter are not units.

A strict mode (`check_domain {strict: true}` in nn-mcp, used in CI) MUST replay every applied change through `replayMutations(model, ops, schema)`, which clones the model once and runs every op on one draft starting from the `add_model` skeleton, and MUST compare the serialized model body (frontmatter excluded, since `knowledge_version` is bump-driven) with the file. A difference MUST be reported as `EDITED_WITHOUT_RECORD`. A differential test MUST guard that the fold and the strict replay agree on op sequences with no drift and that both flag a mutated file.

#### Scenario: Hand edit of a field fires drift
- GIVEN a model whose `owner` was set to `Ana` by an applied change, and the file edited by hand to `Bea`
- WHEN `validate_knowledge` runs with the workspace root
- THEN it reports `EDITED_WITHOUT_RECORD` for `m@goal-1&owner` with expected `Ana` and actual `Bea`
- AND `check_domain` reports the same under its `provenance` field

#### Scenario: A unit with no change is drift
- GIVEN an element field present in the file and no applied change for it
- WHEN `validate_knowledge` runs
- THEN it reports `UNIT_WITHOUT_RECORD` naming the unit

#### Scenario: Rename relinks without false positives
- GIVEN an applied `rename_element` whose mutation rewrote a wikilink in another element
- WHEN drift is computed
- THEN no `EDITED_WITHOUT_RECORD` is reported for the relinked unit

#### Scenario: Clearing a field is expected absent
- GIVEN an applied `update_field` with empty `to` on `owner`
- WHEN drift is computed
- THEN the absent field is not drift
- AND a re-added `owner` line by hand is `EDITED_WITHOUT_RECORD`

#### Scenario: Type coercion is compared in canonical form
- GIVEN `price:: 5` updated by `to:: 7` and serialized as `price:: 7`
- WHEN drift is computed
- THEN no drift is reported (the number `7` equals the folded value)

#### Scenario: No changeset context omits drift
- GIVEN `validate_knowledge` invoked on a document without a workspace root
- WHEN it runs
- THEN no drift diagnostic is produced and no error is raised

#### Scenario: Strict mode replays byte-for-byte
- GIVEN a model created by `add_model` and modified only through applied changes
- WHEN `check_domain` runs with `strict: true`
- THEN the replayed body equals the serialized body of the file and no drift is reported (as an error)
- AND after a hand edit of one byte of a field, strict mode reports `EDITED_WITHOUT_RECORD` as an error

#### Scenario: Unit fold and strict replay disagree by design
- GIVEN a hand edit that changes only whitespace between two fields
- WHEN the default fold runs and strict mode runs
- THEN the default fold reports no drift
- AND strict mode reports `EDITED_WITHOUT_RECORD`

#### Scenario: Severity follows the mode
- GIVEN a hand edit of a field
- WHEN the default fold runs and then strict mode runs
- THEN the diagnostic is a warning in the default mode and an error in strict mode

### Requirement: Prose body is a unit edited by its own op

The prose body of an element (`ElementNode.description`) MUST be a knowledge unit with history, origin and drift. It MUST be written only by the op `update_element_text` (target `<model_slug>@<element_slug>`, resolved as `<model>@<slug>&#body`; target `<model_slug>@<element_slug>`, `from` the current prose, `to` the new prose). `notes` MUST carry rationale only and MUST NOT populate the prose body. `update_field` on the field name `description` MUST be rejected with `USE_UPDATE_ELEMENT_TEXT` and MUST NOT write a `description::` line.

#### Scenario: Prose edit is recorded
- GIVEN an element with prose `Draft text`
- WHEN `update_element_text` with `from:: Draft text`, `to:: Final text` and evidence `A` is applied
- THEN the prose is `Final text`
- AND the history of `m@goal-1` prose has that change and its origin evidence is `A`

#### Scenario: Notes do not become content
- GIVEN an `add_element` change with `notes:: why this exists`
- WHEN it is applied
- THEN the element prose body is empty and the rationale stays in the change

#### Scenario: Hand-edited prose is drift
- GIVEN prose edited by hand after an applied `update_element_text`
- WHEN drift is computed
- THEN `EDITED_WITHOUT_RECORD` is reported for the prose unit

### Requirement: Evidence index over applied changes

`innfo-core` MUST expose an evidence index built from the applied changes of a workspace. For each cited path (and anchor) it MUST list the changes citing it, in two views: live evidence (the evidence of the last applied change of each unit, after the epoch cut) and all-time evidence (the evidence of every applied change). Edges of the lineage graph MUST use live evidence. History, garbage-collection protection and the uncited-source audit MUST use all-time evidence.

#### Scenario: Superseded evidence is not a live edge
- GIVEN `m@goal-1&owner` set by `c-01` (evidence `A`) then `c-02` (evidence `B`)
- WHEN the index is built
- THEN live evidence contains `B` and not `A` for that unit
- AND all-time evidence contains both

#### Scenario: Removed unit leaves no live edge
- GIVEN a unit whose latest change before an applied `remove_element` cited `A`
- WHEN the index is built
- THEN `A` is not live evidence for any unit, and remains all-time evidence

### Requirement: `unknown` evidence is a warning

A change whose evidence is `unknown`, or that has no evidence (including direct operations synthesized by `apply_change`), MUST be applied, not rejected. The validator MUST report the warning `EVIDENCE_UNKNOWN` naming the change, the author and the target, in `validate_knowledge` and under the `provenance` field of `check_domain`. A domain whose changes carry `unknown` evidence while its units cite sidecars by other means MUST therefore show visible diagnostics.

#### Scenario: Unknown evidence applies with a warning
- GIVEN a change with `evidence:: unknown`
- WHEN `apply_change` runs
- THEN it applies
- AND `check_domain` reports `EVIDENCE_UNKNOWN` for it

#### Scenario: Synthesized direct operation warns
- GIVEN a direct `apply_change` `update_field` call with no evidence argument
- WHEN the synthesized one-change changeset is applied
- THEN the change carries `evidence:: unknown`
- AND `EVIDENCE_UNKNOWN` is reported for it

#### Scenario: A domain with 130 unknown changes is visible
- GIVEN a domain with 130 applied changes all with `unknown` evidence
- WHEN `check_domain` runs
- THEN `provenance` lists 130 `EVIDENCE_UNKNOWN` warnings

### Requirement: `check_domain` reports provenance

`check_domain` MUST expose a `provenance` field replacing the former `lineage` field. It MUST carry: a `ProvenanceReport` (`{ok, mode: 'fold' | 'strict', diagnostics}`) with the drift list (`EDITED_WITHOUT_RECORD`), the unrecorded units (`UNIT_WITHOUT_RECORD`), evidence resolution diagnostics (`KU_*`, `EVIDENCE_SOURCE_CHANGED`, `EVIDENCE_UNKNOWN`) and the `ARTIFACT_WITHOUT_RECORD` list defined by `artifact-production-change`. The `lineage` field and the `LINEAGE_DRIFT` code MUST NOT exist.

#### Scenario: Provenance field is present
- GIVEN a domain with one hand edit
- WHEN `check_domain` runs
- THEN the result has a `provenance` field listing the drift
- AND has no `lineage` field

### Requirement: Changesets are never archived or pruned

The `changes/` directory MUST NOT be archived, rotated, compacted or pruned by any tool. Garbage collection (`planGc`, `applyGc`) MUST NOT propose or delete a changeset. History is derived from the complete chain, so a missing changeset is a loss of provenance.

#### Scenario: GC never proposes a changeset
- GIVEN an old changeset cited by no one
- WHEN `planGc` runs
- THEN the changeset is not in the proposal

#### Scenario: No archive of changes
- GIVEN the repository after this change
- WHEN searched for code that moves or deletes files under `changes/`
- THEN none exists outside the apply engine's own write-back
