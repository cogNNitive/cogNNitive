# Delta for Model Scaffold Robustness

## ADDED Requirements

### Requirement: Scaffold Emits No Marker Constructs

`init_knowledge` and the scaffold generator MUST NOT seed an `item-markers matrix`, a `Markers` concept or any marker row, whatever the bluepriNNt declares. A scaffolded document MUST validate against its own resolved bluepriNNt on the first attempt with no `MARKERS_REMOVED`. For a bluepriNNt that declares a `tags` Field, the scaffold MUST NOT emit a placeholder `tags` value; concept-level values are emitted only when the author supplied them.

#### Scenario: No item-markers matrix is seeded
- GIVEN a bluepriNNt that declares a multi-valued `tags` Field and a valued `complexity` Field
- WHEN `init_knowledge` scaffolds a new document
- THEN the content has no `item-markers matrix` and no marker row
- AND it validates with no `MARKERS_REMOVED`

#### Scenario: No placeholder tags
- GIVEN the same bluepriNNt
- WHEN the document is scaffolded
- THEN no element carries a placeholder `tags::` line
