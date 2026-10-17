# Delta for markers-removed-diagnostic (new capability)

Purpose: Marker Definitions and the `item-markers matrix` no longer exist. Documents still using them fail loudly with an actionable diagnostic, and an agent skill recipe turns that diagnostic into a reviewable changeset. No compatibility parsing exists. The diagnostic covers both Level-2 Marker Definitions and Level-3 `item-markers` matrices (one ERROR per document), is version-agnostic (no per-L1-version rule logic), and `nn-preflight` gets no new check (its `validate_*` tooling already detects it).

## ADDED Requirements

### Requirement: MARKERS_REMOVED Error

Validation MUST report an ERROR with code `MARKERS_REMOVED` for each document that contains a `Marker Definition` concept or an `item-markers matrix`, detected by heading, in Level-2 and Level-3 documents alike and regardless of the document's `spec_version`. Exactly one diagnostic MUST be emitted per document, listing all names found, with `meta: {markers: string[], matrixColumns: string[]}` and `promptHint: "nn-innfo recipe MARKERS_REMOVED"`. The parser MUST NOT interpret either construct as markers, and the validator MUST NOT ignore it silently. The generic unknown-concept and unknown-matrix checks MUST be suppressed for these constructs so no duplicate diagnostic appears. The code MUST be emitted identically by `validate_knowledge`, `validate_blueprint` and the innfo-core validator (`checkRemovedMarkerConstructs`). Validation fails while the diagnostic is present.

#### Scenario: Legacy bluepriNNt
- GIVEN a Level-2 bluepriNNt containing `# NN Marker Definition` with an `importance` entry
- WHEN it is validated
- THEN the result is invalid with one `MARKERS_REMOVED` at ERROR severity and `meta.markers` contains `importance`

#### Scenario: Legacy kNNowledge document
- GIVEN a Level-3 document containing `# NN matrices: item-markers matrix` with columns `priority` and `weight`
- WHEN it is validated
- THEN the result is invalid with `MARKERS_REMOVED` and `meta.matrixColumns` contains `priority` and `weight`

#### Scenario: Both constructs, one diagnostic
- GIVEN one document with a Marker Definition and an `item-markers matrix`
- WHEN it is validated
- THEN exactly one `MARKERS_REMOVED` is reported listing both

#### Scenario: Version-agnostic
- GIVEN documents declaring `spec_version` `V_0-4-0` and `V_0-5-0` that both contain a Marker Definition
- WHEN each is validated
- THEN both report `MARKERS_REMOVED`

#### Scenario: No duplicate generic diagnostics
- GIVEN a document with an `item-markers matrix`
- WHEN it is validated
- THEN no unknown-matrix or unknown-concept diagnostic is reported for that construct

#### Scenario: A free matrix is unaffected
- GIVEN a Level-3 document with an ordinary free matrix whose columns are not an `item-markers matrix`
- WHEN it is validated
- THEN no `MARKERS_REMOVED` is reported

#### Scenario: No silent acceptance
- GIVEN a document with an `item-markers matrix` and otherwise valid content
- WHEN it is parsed and validated
- THEN no marker data is exposed and validation does not pass

#### Scenario: MCP parity
- GIVEN the same document validated through `validate_knowledge` and `validate_blueprint`
- WHEN the diagnostics are compared with the core validator's
- THEN code, message, `meta` and `promptHint` are identical

### Requirement: Actionable Remediation Message

The `MARKERS_REMOVED` message MUST read: `<file> uses Marker Definitions (<names>) / an item-markers matrix (<columns>), removed in iNNfo V_0-5-0. A flag marker becomes a value of the tags Field (tags:: [name]). A valued marker becomes a declared Field (concept:: * or a list, with type/widget) whose cells become field:: value lines; concept rows become concept-level values; scores with no declared Field are dropped. Then delete the Marker Definition section or the item-markers matrix. Agents: submit the fix as a changeset.` It MUST name the offending document and list the marker names or matrix columns found. It MUST NOT merely say that markers are unsupported.

#### Scenario: Message content
- GIVEN a document declaring markers `priority` (flag) and `complexity` (valued)
- WHEN `MARKERS_REMOVED` is reported
- THEN the message names the document and both markers
- AND it states "A flag marker becomes a value of the tags Field" and "A valued marker becomes a declared Field"

#### Scenario: Message reaches MCP callers
- GIVEN the same document validated through the MCP tool
- WHEN the response is read
- THEN the code, the full remediation text and `promptHint` are present

### Requirement: Schema Operation `set_marker` Removed

The `set_marker` operation MUST be removed from `apply_change` and the MCP operation enum. Calling it MUST fail with `UNKNOWN_OPERATION` and write nothing.

#### Scenario: Removed op is rejected
- GIVEN any model
- WHEN `apply_change` receives `set_marker`
- THEN it fails with `UNKNOWN_OPERATION` and no file changes

### Requirement: Remediation Changeset Operations

The changeset engine MUST provide the operations an agent needs to apply the recipe without rewriting files: `update_field` (own `tags` arrays and valued fields), the new `update_concept_field {conceptName, fieldName, value}` (concept-level values) and the new `remove_matrix {matrixName}` (deleting the `item-markers matrix`). Their contracts are specified in `changeset-apply-engine`.

#### Scenario: A full remediation is expressible as one changeset
- GIVEN a model with an `item-markers matrix` carrying flags, a valued column and a concept row
- WHEN the recipe's changeset is built
- THEN it uses only `update_field`, `update_concept_field` and `remove_matrix`

### Requirement: Agent Migration Recipe

The `nn-innfo` skill MUST ship a section "Recipe: MARKERS_REMOVED", linked from `nn-upgrade`, with these steps: (1) run validation and read `meta`; (2) classify each marker: symbol-only or `X` cells become a tag named per the confirmed mapping, with the name confirmed with the user, and valued markers become a Field; (3) build one changeset (`update_field` per element, `update_concept_field` for concept rows, `remove_matrix`); (4) for a shipped bluepriNNt upgrade via Flow B, and for a custom Level-2 propose the edit for consent; (5) run `propose_changeset` for console review. The agent MUST NOT rewrite the offending file directly, and MUST state which numeric scores were dropped. The recipe MUST state that scores with no declared Field are dropped.

#### Scenario: Recipe produces a reviewable changeset
- GIVEN a domain whose model carries an `item-markers matrix` with flags and one valued column
- WHEN the agent follows the recipe
- THEN it proposes a changeset that sets `tags` values on the flagged elements and Field values for the valued column, and removes the matrix
- AND no model file is edited directly

#### Scenario: Recipe is discoverable from the diagnostic
- GIVEN the `MARKERS_REMOVED` message and its `promptHint`
- WHEN an agent reads them
- THEN they point to the `nn-innfo` recipe `MARKERS_REMOVED`

#### Scenario: nn-upgrade links to the recipe
- GIVEN a marker-bearing model found by the `nn-upgrade` impact analysis
- WHEN the report is shown
- THEN it links to the `nn-innfo` recipe instead of asking mapping questions

### Requirement: Legacy Fixture Is an Expected Case

The `simulacro-refactorizacion` fixture corpus MUST be frozen as legacy input, and `simulacro-user-workspace.test.ts` MUST assert that it produces `MARKERS_REMOVED` (with the marker names in `meta`). The frozen fixture doubles as the recipe's acceptance input.

#### Scenario: Frozen fixture
- GIVEN the fixture is kept as legacy input
- WHEN its suite runs
- THEN the expected result is `MARKERS_REMOVED`, asserted explicitly with marker names in `meta`

#### Scenario: Live corpus has no markers
- GIVEN live specs, samples and testlab fixtures
- WHEN searched for `Marker Definition` and `item-markers`
- THEN hits exist only in frozen published files, the frozen simulacro fixture and the diagnostic/recipe
