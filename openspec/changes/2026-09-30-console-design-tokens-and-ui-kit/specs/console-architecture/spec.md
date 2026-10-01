# Delta for console-architecture

## MODIFIED Requirements

### Requirement: Level 1 Universal Runtime Primitives

The system MUST provide Level 1 primitives (`ConceptPill`, `ElementPill` with origin icons, Element Card, `MarkerChip`, `StatusBadge`) as `InnfoUI` components, and the Concept Rail and Matrix in `innfo-runtime`. Primitives MUST operate offline via `file://` with zero build, hydrating from JSON slots. Every console renderer MUST compose the `InnfoUI` components and MUST NOT carry its own card or pill builders.
(Previously: primitives lived in `innfo-runtime`, and the canonical model console used separate builders.)

#### Scenario: Rendering Level 1 primitives offline
- GIVEN an HTML console with valid JSON slots
- WHEN opened via `file://` without network
- THEN Level 1 pills, rails, and cards render interactively with traceability icons

#### Scenario: Canonical console uses the shared kit
- GIVEN `workspace/assets/model_console.html` rendering a model
- WHEN its pills and cards are inspected
- THEN each carries a `data-innfo-component` attribute produced by `InnfoUI`

### Requirement: Level 2 Template Domain Consoles

Template consoles MUST compose Level 1 primitives into domain-specific views (e.g., Timeline in `metrics`, Funnel in `innovation`, Org Chart in `organization`, Roadmap in `projects`) conforming to standard layout slots and events. They MUST take colors from the `--innfo-*` tokens and MUST NOT define their own color tokens.
(Previously: no token requirement.)

#### Scenario: Template view composition
- GIVEN a domain template declaring custom views
- WHEN the template console mounts
- THEN it renders domain layouts using shared Level 1 pills and cards

#### Scenario: Specialized layout uses tokens
- GIVEN `timeline.html` or `procedure_console.html` with `data-theme="dark"`
- WHEN rendered
- THEN its surfaces and text resolve from `--innfo-*` dark values
