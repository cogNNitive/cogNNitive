# Field Citation Provenance Specification

## Purpose

Delta specification modifying `document-citations` (and informing `console-field-citations`). Establishes per-field provenance rewriting upon changeset application per architectural decision D20. Touched fields have their citations updated to point to the applied changeset change, while untouched fields preserve their existing citations. Historical provenance walks backward through archived snapshots and the changeset chain.

## Requirements

### Requirement: Bidirectional Auditability and Lineage Walk

Lineage resolution tools (`resolve_sources`, graph indexer, console compiler) MUST recognize `changes/<changeset>_changes_NN.md@## NN Change: <id>` as a valid citation target. The citation resolver MUST resolve the target change block, exposing the change's author, timestamp, rationale (`notes`), operation (`op`), and previous value (`from`). Historical provenance MUST be traceable by resolving the change's `from` value back to the archived model snapshot recorded in the changeset frontmatter `models` map.

#### Scenario: Lineage resolves through changeset to author and notes
- GIVEN an element field citing `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- WHEN lineage is evaluated for that field
- THEN the resolver extracts `author`, `notes`, and timestamp from the changeset change block
- AND identifies the operation as `update_field`

#### Scenario: Historical lineage traverses to archived snapshot
- GIVEN a field whose current citation points to changeset `C2`
- AND changeset `C2` records `base_version: "V_0-1-0"` for the model
- WHEN historical provenance is inspected
- THEN the lineage engine locates the archived snapshot `kNNowledge/archive/<model>_V_0-1-0_<stamp>_<C1>_NN.md`
- AND retrieves the field's prior citation from the snapshot

---

### Requirement: Retirement of Agent Modification Block from Citation Contracts

All specifications, schemas, and runtime contracts MUST remove references to the `## NN Agent Modification` block and the verbatim-paste provenance convention. Provenance is exclusively established via changeset citations and archived snapshots.

#### Scenario: No agent modification block generated or required
- GIVEN any model mutation executed via the mutation engine
- WHEN the mutation completes
- THEN no `## NN Agent Modification` markdown block is produced
- AND validation passes without requiring an agent modification block in the model

### Requirement: Field Citation Provenance Rewriting on Mutation (D20)

When a changeset is applied by the apply engine, the `sources::` citation of every field touched by the changeset MUST be rewritten to cite the specific applied change in the changeset document:
`changes/<changeset_file>@## NN Change: <change_id>`

Untouched fields on the same element MUST retain their previous citations unaltered. If a field was previously cited to an external source or earlier changeset, the active model will reflect its current value origin (the newly applied change), while its historical origin is preserved in the archived model snapshot (`kNNowledge/archive/`) and the changeset history.

(Previously: Models required either manual pasting of `## NN Agent Modification` blocks, transcript promotion as provenance, or direct element-level `sources::` copying that did not distinguish which changeset modified which specific field.)

#### Scenario: Touched field rewritten to cite applied changeset
- GIVEN an element `Vision` with fields `statement` (cited to `sources/interview.md@## Vision`) and `target_year` (cited to `sources/report.pdf_sidecar_NN.md@## Timeline`)
- WHEN a changeset `ws_agent_20261007T120000Z_changes_NN.md` containing change `## NN Change: c-01` mutates `statement`
- THEN `statement` citation is rewritten to `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01`
- AND `target_year` citation remains `sources/report.pdf_sidecar_NN.md@## Timeline`

#### Scenario: Element added by changeset cites the add_element change
- GIVEN a changeset `changes/ws_agent_20261007T120000Z_changes_NN.md` with an `add_element` change `## NN Change: c-02`
- WHEN the element is created in the model
- THEN its `sources::` field is initialized to `[changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-02]`

---
