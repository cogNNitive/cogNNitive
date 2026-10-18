# iNNfo Skill Menu

## Purpose
Align the `nn-innfo` skill entry menu and context selection gates with consolidated audit workflows, dedicated console export actions, and direct documentation consultation.
## Requirements
### Requirement: Canonical Entry Menu Structure

When invoked without an explicit, actionable intent, `nn-innfo` MUST present a
7-option entry menu:
- `[a] (Recommended)` Create a new model (Conversational Wizard)
- `[b]` Edit / extend an existing model (Conversational Wizard)
- `[c]` Audit & validate model (MCP Syntax + Architecture Coherence)
- `[d]` Export / update console artifacts (domaiNN console)
- `[x]` Execute a model procedure — delegate selection and execution to the canonical procedure-execution protocol, discovering procedures from model `## NN Procedure:` sections, blueprint frontmatter, and `workspace/procedures/`
- `[w]` View & consult documentation — browse iNNfo specs, primitives, and guides
- `[y]` Cancel / help

Option `[c]` MUST combine syntactic MCP schema validation with architectural
consistency checks. Option `[d]` MUST trigger console export through
`scripts/export-console.mjs`, producing the single `domaiNN_console.html`; it
MUST NOT mention or compile a Workspace Hub. Option `[x]` MUST link to the
procedure-execution owner protocol and MUST NOT restate its steps. Option `[w]`
MUST offer read-only documentation browsing.
(Previously: option `[d]` read "Export / update console artifacts (Workspace
Consoles & Hub)" and "MUST trigger console compilation flows"; `[x]` listed
model procedures without a single owner protocol.)

#### Scenario: Presenting entry menu on undecided invocation
- **GIVEN** a user activates `nn-innfo` with a general greeting or bare `/nn-innfo`
- **WHEN** the skill prompts the user for action selection
- **THEN** it renders the 7-option menu with `[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, and `[y]`
- **AND** the `[d]` label contains no "Hub" text

#### Scenario: Procedure option delegates to the owner
- **GIVEN** a user selects `[x]`
- **WHEN** `nn-innfo` processes the request
- **THEN** it lists procedures discovered from model sections, blueprint frontmatter, and `workspace/procedures/`
- **AND** it delegates execution to the procedure-execution owner protocol without restating steps

---

### Requirement: Active Model Context Selection Gate
Before executing options `[b]`, `[c]`, `[d]`, or `[x]`, the skill MUST ensure an active model is bound to `active_model_path`.
- If exactly 1 Level 3 model is detected in the workspace, the skill MUST auto-bind it with informative grace and proceed immediately.
- If multiple Level 3 models are detected and no model is active, the skill MUST prompt the user to select one before executing the chosen option.
- If 0 models are detected, the skill MUST suggest creating one via option `[a]`.

#### Scenario: Auto-binding single model for console export or audit
- **GIVEN** a workspace containing exactly one Level 3 model file
- **WHEN** the user selects option `[c]` or `[d]` without specifying a target model
- **THEN** the skill automatically binds the single model to `active_model_path` with an informational notice
- **AND** proceeds to execute the requested action without an extra confirmation turn

---

### Requirement: Documentation Consultation Routing
Selecting option `[w]` MUST provide direct access to iNNfo specifications, primitives (Concept, Field, Matrix), matrices, fields (including tags and widgets), and authoring guidelines without modifying workspace files. It MUST NOT present markers as a topic other than the `MARKERS_REMOVED` migration recipe.
(Previously: the categories included markers.)

#### Scenario: Consulting documentation
- **GIVEN** a user selects option `[w]`
- **WHEN** `nn-innfo` processes the request
- **THEN** it presents available documentation categories (Level 1/2 specs, primitives, matrices, fields and tags, and guidelines)
- **AND** performs zero filesystem mutations in the workspace

#### Scenario: No marker authoring offered
- **GIVEN** the model-creation wizard
- **WHEN** it asks which values elements carry
- **THEN** it offers Fields and tags and never asks about Marker Definitions

