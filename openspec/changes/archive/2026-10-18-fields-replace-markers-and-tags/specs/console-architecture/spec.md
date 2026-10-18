# Delta for Console Architecture

## MODIFIED Requirements

### Requirement: Level 1 Universal Runtime Primitives

The system MUST provide Level 1 primitives (`ConceptPill`, `ElementPill` with origin icons, Element Card, `StatusBadge`) as `InnfoUI` components, and the Concept Rail and Matrix in `innfo-runtime`. Primitives MUST operate offline via `file://` with zero build, hydrating from JSON slots. Every console renderer MUST compose the `InnfoUI` components and MUST NOT carry its own card or pill builders.
(Previously: the primitive list included `MarkerChip`, and the canonical-console scenario named `workspace/assets/model_console.html`; it now names the single shell.)

#### Scenario: Rendering Level 1 primitives offline
- GIVEN an HTML console with valid JSON slots
- WHEN opened via `file://` without network
- THEN Level 1 pills, rails, and cards render interactively with traceability icons

#### Scenario: Canonical console uses the shared kit
- GIVEN `artifact_shell.html` rendering a single-model scoped console
- WHEN its pills and cards are inspected
- THEN each carries a `data-innfo-component` attribute produced by `InnfoUI`

#### Scenario: No MarkerChip primitive
- GIVEN the Level 1 primitive list
- THEN `MarkerChip` is absent
