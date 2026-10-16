# Field Citation Provenance Specification

## Purpose

Delta specification modifying `document-citations` (and informing `console-field-citations`). Establishes per-field provenance rewriting upon changeset application per architectural decision D20. Touched fields have their citations updated to point to the applied changeset change, while untouched fields preserve their existing citations. Historical provenance is reachable through the changeset chain alone (no model snapshot exists).
## Requirements
### Requirement: Bidirectional Auditability and Lineage Walk

Lineage resolution tools (`resolve_sources`, graph indexer, console compiler) MUST recognize `changes/<changeset>_changes_NN.md@## NN Change: <id>` as a valid citation target. The citation resolver (`resolveCitation`) MUST resolve the target change block and return `origin` (`agent`, `human` or `document`), `author` (the change block's `author::`, `unknown` when absent), the block `excerpt` (which carries the change's operation, previous value, rationale and evidence lines as text) and the path, anchor, existence and error state. It does not return structured `op`, `from`, `notes`, timestamp or `replaced_sources` fields. A change block whose `author::` is a known agent id (the generic `agent` default, `ClaudeCode`, `OpenCode`, `Antigravity`) is classified `agent`; any other author is `human`; every non-change anchor is `document`.

Historical lineage MUST be traceable through the changeset chain alone: from a change, the walk continues through `replaced_sources` (the field's previous origin, a Source or an earlier change) and `sources` (the change's evidence) until it reaches a Source or a change carrying neither. The `replaced_sources` walk is implemented in the console element history (`console/element-history`), not in the citation resolver. No model snapshot is consulted.

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

All specifications, schemas, and runtime contracts MUST remove references to the `## NN Agent Modification` block and the verbatim-paste convention. Lineage is established exclusively through citations: model field `sources::` citing changeset changes, and each change's `sources::` and `replaced_sources::`.

#### Scenario: No agent modification block generated or required
- GIVEN any model mutation executed via the mutation engine
- WHEN the mutation completes
- THEN no `## NN Agent Modification` markdown block is produced
- AND validation passes without requiring an agent modification block in the model

### Requirement: Field Citation Provenance Rewriting on Mutation (D20)

Only two operations rewrite citations: `update_field` and `add_element`. When a changeset applies an `update_field`, the engine MUST write the companion citation field of the touched field (`<field>_source`, or the existing `<field>_sources`) so it cites the applied change, and list that citation in the element's `sources::` (replacing the previous citation of that field, otherwise appending):
`changes/<changeset_file>@## NN Change: <change_id>`

Other operations (`remove_element`, `rename_element`, `rename_concept`, `update_matrix_cell`, `update_concept_text`, `comment`, `freeze_slugs`, `bump_version`, `add_model`) leave citations untouched. Untouched fields on the same element retain their previous citations unaltered. When the touched field already carried a citation, the engine MUST record that exact previous value in the applying change's `replaced_sources::` execution annotation, so the field's earlier origin stays reachable from the change. A field without a previous citation leaves no annotation.

#### Scenario: Touched field rewritten to cite applied changeset
- GIVEN an element `Vision` with fields `statement` (cited to `sources/interview.md@## Vision`) and `target_year` (cited to `sources/report.pdf_sidecar_NN.md@## Timeline`)
- WHEN a changeset `ws_agent_20261007T120000Z_changes_NN.md` containing change `## NN Change: c-01` mutates `statement`
- THEN the `statement_source` citation is rewritten to `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- AND `c-01` carries `replaced_sources:: sources/interview.md@## Vision`
- AND `target_year` citation remains `sources/report.pdf_sidecar_NN.md@## Timeline`

#### Scenario: Element added by changeset cites the add_element change
- GIVEN a changeset `changes/ws_agent_20261007T120000Z_changes_NN.md` with an `add_element` change `## NN Change: c-02`
- WHEN the element is created in the model
- THEN its `sources::` field is initialized to `[changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-02]`
- AND `c-02` carries no `replaced_sources::`
- AND the change's own `sources::` (the evidence) is not copied onto the element: the chain is element, then change, then the change's source

