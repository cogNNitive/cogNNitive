# Markers Removed Diagnostic — Lineage Vocabulary Delta

## MODIFIED Requirements

### Requirement: Agent Migration Recipe

The `nn-innfo` skill MUST ship a section "Recipe: MARKERS_REMOVED", linked from `nn-update`, with these steps: (1) run validation and read `meta`; (2) classify each marker: symbol-only or `X` cells become a tag named per the confirmed mapping, with the name confirmed with the user, and valued markers become a Field; (3) build one changeset (`update_field` per element, `update_concept_field` for concept rows, `remove_matrix`); (4) for a shipped bluepriNNt, update via Blueprint Lineage Reconciliation; for a custom Level-2, propose a direct edit for consent, because changesets target Level-3 documents only and no operation removes a Marker Definition section (the Level-3 documents that depend on it stay invalid until that edit lands); (5) run `propose_changeset` for console review. The agent MUST NOT rewrite the offending file directly, and MUST state which numeric scores were dropped. The recipe MUST state that scores with no declared Field are dropped. (Previously: the recipe pointed at `nn-upgrade` and named the flow "Flow B"; both are retired vocabulary, kept only as deprecated aliases.)

#### Scenario: Recipe produces a reviewable changeset
- GIVEN a domain whose model carries an `item-markers matrix` with flags and one valued column
- WHEN the agent follows the recipe
- THEN it proposes a changeset that sets `tags` values on the flagged elements and Field values for the valued column, and removes the matrix
- AND no model file is edited directly

#### Scenario: Recipe is discoverable from the diagnostic
- GIVEN the `MARKERS_REMOVED` message and its `promptHint`
- WHEN an agent reads them
- THEN both name the `nn-update` skill as the entry point
- AND neither mentions `Flow B`
