# Field Citation Provenance Specification

## Purpose

Delta specification modifying `document-citations` (and informing `console-field-citations`). Establishes per-field provenance rewriting upon changeset application per architectural decision D20. Touched fields have their citations updated to point to the applied changeset change, while untouched fields preserve their existing citations. Historical provenance walks backward through archived snapshots and the changeset chain.
## Requirements
### Requirement: Bidirectional Auditability and Lineage Walk

Lineage resolution tools (`resolve_sources`, graph indexer, console compiler) MUST recognize `changes/<changeset>_changes_NN.md@## NN Change: <id>` as a valid citation target. The citation resolver MUST resolve the target change block, exposing the change's author, timestamp, rationale (`notes`), operation (`op`), previous value (`from`), its evidence citation (`sources`) and the citation it replaced (`replaced_sources`). Historical lineage MUST be traceable through the changeset chain alone: from a change, the walk MUST continue through `replaced_sources` (the field's previous origin, a Source or an earlier change) and `sources` (the change's evidence) until it reaches a Source or a change carrying neither. No model snapshot is consulted. (Previously: historical lineage was traced to an archived model snapshot under `kNNowledge/archive/`.)

#### Scenario: Lineage resolves through changeset to author and notes
- GIVEN an element field citing `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- WHEN lineage is evaluated for that field
- THEN the resolver extracts `author`, `notes`, and timestamp from the changeset change block
- AND identifies the operation as `update_field`

#### Scenario: Historical lineage walks the changeset chain
- GIVEN a field whose current citation points to change `c-01` of changeset `C2`
- AND `c-01` carries `replaced_sources:: changes/C1@## NN Change: c-03`
- AND `C1`'s `c-03` carries `replaced_sources:: sources/interview.md@## Vision`
- WHEN historical lineage is inspected
- THEN the walk visits `C2#c-01`, `C1#c-03` and ends at `sources/interview.md@## Vision`
- AND no file under `kNNowledge/archive/` is read

### Requirement: Retirement of Agent Modification Block from Citation Contracts

All specifications, schemas, and runtime contracts MUST remove references to the `## NN Agent Modification` block and the verbatim-paste convention. Lineage is established exclusively through citations: model field `sources::` citing changeset changes, and each change's `sources::` and `replaced_sources::`. (Previously: lineage was also said to come from archived model snapshots.)

#### Scenario: No agent modification block generated or required
- GIVEN any model mutation executed via the mutation engine
- WHEN the mutation completes
- THEN no `## NN Agent Modification` markdown block is produced
- AND validation passes without requiring an agent modification block in the model

### Requirement: Field Citation Provenance Rewriting on Mutation (D20)

When a changeset is applied by the apply engine, the `sources::` citation of every field touched by the changeset MUST be rewritten to cite the specific applied change in the changeset document:
`changes/<changeset_file>@## NN Change: <change_id>`

Untouched fields on the same element MUST retain their previous citations unaltered. When the touched field already carried a citation, the engine MUST record that exact previous value in the applying change's `replaced_sources::` execution annotation, so the field's earlier origin stays reachable from the change. A field without a previous citation leaves no annotation. (Previously: the earlier origin was said to be preserved in the archived model snapshot under `kNNowledge/archive/`.)

#### Scenario: Touched field rewritten to cite applied changeset
- GIVEN an element `Vision` with fields `statement` (cited to `sources/interview.md@## Vision`) and `target_year` (cited to `sources/report.pdf_sidecar_NN.md@## Timeline`)
- WHEN a changeset `ws_agent_20261007T120000Z_changes_NN.md` containing change `## NN Change: c-01` mutates `statement`
- THEN `statement` citation is rewritten to `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- AND `c-01` carries `replaced_sources:: sources/interview.md@## Vision`
- AND `target_year` citation remains `sources/report.pdf_sidecar_NN.md@## Timeline`

#### Scenario: Element added by changeset cites the add_element change
- GIVEN a changeset `changes/ws_agent_20261007T120000Z_changes_NN.md` with an `add_element` change `## NN Change: c-02`
- WHEN the element is created in the model
- THEN its `sources::` field is initialized to `[changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-02]`
- AND `c-02` carries no `replaced_sources::`

