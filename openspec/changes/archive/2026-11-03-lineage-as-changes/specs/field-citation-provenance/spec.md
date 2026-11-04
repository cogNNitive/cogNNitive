# Field Citation Provenance Specification (delta)

## MODIFIED Requirements

### Requirement: Bidirectional Auditability and Lineage Walk

Lineage resolution tools (`resolve_sources`, graph indexer, console compiler) MUST recognize `changes/<changeset>_changes_NN.md@## NN Change: <id>` as a valid citation target. The citation resolver (`resolveCitation`) MUST resolve the target change block and return `origin` (`agent`, `human` or `document`), `author` (the change block's `author::`, `unknown` when absent), the block `excerpt` (which carries the change's operation, previous value, rationale and evidence lines as text) and the path, anchor, existence and error state. A change block whose `author::` is a known agent id (the generic `agent` default, `ClaudeCode`, `OpenCode`, `Antigravity`) is classified `agent`; any other author is `human`; every non-change anchor is `document`.

Historical lineage of a value MUST be derived from the applied changes of that value (`deriveValueHistory`, ordered by the shared comparator of `change-provenance`): from the current origin (the evidence of the last applied change) the walk follows the earlier applied changes of the same unit, and, for an evidence entry that is itself a kNNowledge unit, continues with that unit's origin until it reaches a Source or a change with `decision`/`unknown` evidence. No model snapshot, no `replaced_sources` annotation and no field-level citation is consulted. (Previously: the walk followed `replaced_sources` and the model field's citation.)

#### Scenario: Lineage resolves through changeset to author and notes
- GIVEN a unit whose origin is `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- WHEN lineage is evaluated for that unit
- THEN the resolver extracts the author and the change excerpt (operation, rationale, evidence)
- AND identifies the operation as `update_field`

#### Scenario: Historical lineage walks the applied changes
- GIVEN a field set by change `c-03` of changeset `C1` (evidence `sources/interview.md@## Vision`) and then by `c-01` of changeset `C2` (evidence `kNNowledge/x_NN.md@## NN Goal: A`)
- WHEN historical lineage is inspected
- THEN the history lists `C1#c-03` then `C2#c-01` in comparator order
- AND the walk continues from `C2#c-01` evidence into the origin of that kNNowledge element
- AND no file under `kNNowledge/archive/` is read and no `replaced_sources` is read

### Requirement: Retirement of Agent Modification Block from Citation Contracts

All specifications, schemas, and runtime contracts MUST remove references to the `## NN Agent Modification` block and the verbatim-paste convention. Provenance is established exclusively through the `evidence` of changeset changes, never through field-level citations in models.

#### Scenario: No agent modification block generated or required
- GIVEN any model mutation executed via the mutation engine
- WHEN the mutation completes
- THEN no `## NN Agent Modification` markdown block is produced
- AND validation passes without requiring an agent modification block in the model

## REMOVED Requirements

### Requirement: Field Citation Provenance Rewriting on Mutation (D20)
(Reason: model fields no longer carry citations, so the engine has nothing to rewrite. The origin of a value is the evidence of the last applied change that set it, derived on read; the previous origin is the previous change in the history, so the `replaced_sources` annotation is redundant.)
(Migration: none — legacy out of scope. Existing `<field>_source` companions, element `sources::` lines and `replaced_sources::` annotations are not read.)
