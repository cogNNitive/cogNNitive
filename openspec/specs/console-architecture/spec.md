# Console Architecture Specification

## Purpose

Defines the console architecture and authorship pathways across runtime primitives, domain templates and the single, optionally-scoped domain console.
## Requirements
### Requirement: Level 1 Universal Runtime Primitives

The system MUST provide Level 1 primitives (`ConceptPill`, `ElementPill` with origin icons, Element Card, `MarkerChip`, `StatusBadge`) as `InnfoUI` components, and the Concept Rail and Matrix in `innfo-runtime`. Primitives MUST operate offline via `file://` with zero build, hydrating from JSON slots. Every console renderer MUST compose the `InnfoUI` components and MUST NOT carry its own card or pill builders.
(Previously: the canonical-console scenario named `workspace/assets/model_console.html`; it now names the single shell.)

#### Scenario: Rendering Level 1 primitives offline
- GIVEN an HTML console with valid JSON slots
- WHEN opened via `file://` without network
- THEN Level 1 pills, rails, and cards render interactively with traceability icons

#### Scenario: Canonical console uses the shared kit
- GIVEN `artifact_shell.html` rendering a single-model scoped console
- WHEN its pills and cards are inspected
- THEN each carries a `data-innfo-component` attribute produced by `InnfoUI`

### Requirement: Level 2 Template Domain Consoles

Template consoles MUST contribute domain-specific views (e.g., Timeline in `metrics`, Funnel in `innovation`, Org Chart in `organization`, Roadmap in `projects`) by registering them in the domaiNN console runtime (see `console-view-registry`), composed from Level 1 primitives. The shell owns layout only: it MUST take every color from the `--innfo-*` tokens and MUST NOT define its own color tokens. The prohibition on color values in shell `:root` blocks is enforced by `console-shell-guard`, not restated here.
(Previously: "Shells own layout only", and the layout scenario listed `model_console.html` and every remaining console shell.)

#### Scenario: Template view composition
- GIVEN a bluepriNNt declaring a domain view
- WHEN the domaiNN console mounts
- THEN the view is registered, appears as a tab, and renders with shared Level 1 pills and cards

#### Scenario: Specialized layout uses tokens
- GIVEN the `timeline` or `procedure` view with `data-theme="dark"`
- WHEN rendered
- THEN its surfaces and text resolve from `--innfo-*` dark values

#### Scenario: Shell carries layout only
- GIVEN `artifact_shell.html`
- WHEN its style blocks are inspected
- THEN none declares a color custom property or a hex/`rgb(`/`hsl(` value in `:root`
- AND `console-shell-guard` fails if one does

### Requirement: Three-Pathway Authorship and Review

The system MUST support three interaction pathways:
1. **Pathway 1 (Conversational AI)**: Agentic assistant dialog for architects.
2. **Pathway 2 (Direct App GUI)**: Visual modeling in the desktop/web app.
3. **Pathway 3 (Asynchronous Console Review)**: Zero-install standalone browser review for stakeholders.

#### Scenario: Stakeholder review via Pathway 3
- GIVEN a standalone HTML console artifact
- WHEN opened in a browser by a reviewer
- THEN the reviewer can inspect elements and record annotations without authoring tools

### Requirement: One Console Shell, Scoped Domain Consoles

The system MUST ship exactly one console shell, `iNNfo/specs/bluepriNNts/console/artifact_shell.html`, driven by the `InnfoConsole` runtime. There MUST be no console "types": no model console, no procedures console and no custom console shell. Every console MUST be the domain console, optionally narrowed by a scope (the whole domaiNN, one model, a subset of models, or one view; see `console-scope`). A reviewer-facing filtered console MUST be a scoped domain console, not a separate artifact kind. A domaiNN MUST still have exactly one self-contained `domaiNN_console.html` for the whole domaiNN, with one snapshot hash, one draft store, one shared edit modal and one changeset per export (D14). Specialized consoles MUST be views registered in the console runtime, not separate shells or iframes (editable views). The Workspace Hub MUST NOT exist.

#### Scenario: One shell in the repository
- GIVEN the bluepriNNt sources after this change
- WHEN the console shells are enumerated
- THEN `artifact_shell.html` is the only live shell
- AND no `model_console.html`, `render-model-viewer.js` or procedures console artifact exists

#### Scenario: A single-model console is a scoped domain console
- GIVEN a domaiNN with several models
- WHEN a console is exported for one model
- THEN the artifact is built from `artifact_shell.html` with `meta.consoleScope.models` naming that model
- AND no second shell is involved

#### Scenario: One whole-domaiNN console
- GIVEN a domaiNN with several views
- WHEN exported without a scope
- THEN exactly one `domaiNN_console.html` is produced containing all of them as tabs

#### Scenario: No hub reference
- GIVEN the repository after this change
- WHEN searched for `workspace_hub`
- THEN there are zero hits outside the reference guard's allowlist (`test/no-workspace-hub-references.test.mjs`)

#### Scenario: No orphan domaiNN shell asset
- GIVEN the domaiNN bluepriNNt assets
- WHEN listed
- THEN no static `domaiNN_console.html` asset exists

### Requirement: Console covers the editor's used feature set

Before the Vue `innfo-editor` is retired, a parity audit MUST be committed as `audit.md` in this change, classifying every editor route, view and component as *in console*, *port* or *drop*, each with the evidence of a real use (no evidence means *drop*). The audit MUST record an explicit decision for: the workspace lineage graph, the file preview modal, tag authoring and tag search, the dual-mode sidebar and breadcrumb ancestry, model and submodel creation, workspace presets and deep links, and validation and template-freshness warnings. Only *port* rows MAY be ported; a port MUST compose the existing `InnfoUI` primitives, the single shared modal for editable components, and `registerView` for read-only views. No second UI stack MAY be introduced. Model creation MUST NOT be ported: models are created by agent changesets (`add_model`, `add_element`) and the console offers only a "New element" draft.

#### Scenario: A used editor feature is reachable in the console
- GIVEN an audit row classified *port*
- WHEN S3 is complete
- THEN the feature (or its equivalent) is reachable in `domaiNN_console.html`
- AND it is composed of `InnfoUI` primitives, not a ported Vue component

#### Scenario: An unused feature is not ported
- GIVEN an audit row classified *drop*
- WHEN the port work is done
- THEN no `InnfoUI` component or view exists for it
- AND it is deleted with the editor

#### Scenario: The lineage graph decision is explicit
- GIVEN the committed `audit.md`
- WHEN it is read
- THEN it states whether the workspace lineage graph is ported as a view or dropped

#### Scenario: One shared modal
- GIVEN two editable components in the console
- WHEN each is edited
- THEN the same modal instance opens for both

