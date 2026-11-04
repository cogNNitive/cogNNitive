# Field Citation Provenance Specification

## Purpose

Delta specification modifying `document-citations` (and informing `console-field-citations`). Establishes per-field provenance rewriting upon changeset application per architectural decision D20. Touched fields have their citations updated to point to the applied changeset change, while untouched fields preserve their existing citations. Historical provenance is reachable through the changeset chain alone (no model snapshot exists).
## Requirements
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
