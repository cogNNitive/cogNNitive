# Console Architecture Specification

## Purpose

Defines the 3-tier console architecture and authorship pathways across runtime primitives, domain templates, and model consoles.

## Requirements

### Requirement: Level 1 Universal Runtime Primitives

The system MUST provide Level 1 primitives (`ConceptPill`, `ElementPill` with origin icons, Element Card, `MarkerChip`, `StatusBadge`) as `InnfoUI` components, and the Concept Rail and Matrix in `innfo-runtime`. Primitives MUST operate offline via `file://` with zero build, hydrating from JSON slots. Every console renderer MUST compose the `InnfoUI` components and MUST NOT carry its own card or pill builders.
(Previously: primitives lived in `innfo-runtime`, and renderers could carry their own builders.)

#### Scenario: Rendering Level 1 primitives offline
- GIVEN an HTML console with valid JSON slots
- WHEN opened via `file://` without network
- THEN Level 1 pills, rails, and cards render interactively with traceability icons

#### Scenario: Canonical console uses the shared kit
- GIVEN `workspace/assets/model_console.html` rendering a model
- WHEN its pills and cards are inspected
- THEN each carries a `data-innfo-component` attribute produced by `InnfoUI`

### Requirement: Level 2 Template Domain Consoles

Template consoles MUST compose Level 1 primitives into domain-specific views (e.g., Timeline in `metrics`, Funnel in `innovation`, Org Chart in `organization`, Roadmap in `projects`) conforming to standard layout slots and events. Shells own layout only: they MUST take every color from the `--innfo-*` tokens and MUST NOT define their own color tokens. The prohibition on color values in shell `:root` blocks is enforced by `console-shell-guard`, not restated here.
(Previously: no token requirement.)

#### Scenario: Template view composition
- GIVEN a domain template declaring custom views
- WHEN the template console mounts
- THEN it renders domain layouts using shared Level 1 pills and cards

#### Scenario: Specialized layout uses tokens
- GIVEN `timeline.html` or `procedure_console.html` with `data-theme="dark"`
- WHEN rendered
- THEN its surfaces and text resolve from `--innfo-*` dark values

#### Scenario: Shells carry layout only
- GIVEN `artifact_shell.html`, `model_console.html`, `timeline.html`, `procedure_console.html`
- WHEN their style blocks are inspected
- THEN none declares a color custom property or a hex/`rgb(`/`hsl(` value in `:root`
- AND `console-shell-guard` fails if one does

### Requirement: Level 3 Model Custom Consoles

Dedicated model consoles MUST register in the Workspace Hub to view compiled models, preserving navigation and filtering internal schema nodes.

#### Scenario: Model console registration in Hub
- GIVEN a compiled model artifact in the workspace
- WHEN viewed in Workspace Hub
- THEN it is accessible via a dedicated model tab

### Requirement: Three-Pathway Authorship and Review

The system MUST support three interaction pathways:
1. **Pathway 1 (Conversational AI)**: Agentic assistant dialog for architects.
2. **Pathway 2 (Direct App GUI)**: Visual modeling in the desktop/web app.
3. **Pathway 3 (Asynchronous Console Review)**: Zero-install standalone browser review for stakeholders.

#### Scenario: Stakeholder review via Pathway 3
- GIVEN a standalone HTML console artifact
- WHEN opened in a browser by a reviewer
- THEN the reviewer can inspect elements and record annotations without authoring tools
