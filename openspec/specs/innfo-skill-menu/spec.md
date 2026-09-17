# iNNfo Skill Menu

## Purpose
Align the `nn-innfo` skill entry menu and context selection gates with consolidated audit workflows, dedicated console export actions, and direct documentation consultation.

## Requirements

### Requirement: Canonical Entry Menu Structure
When invoked without an explicit, actionable intent, `nn-innfo` MUST present a 7-option entry menu:
- `[a] (Recommended)` Create a new model (Conversational Wizard)
- `[b]` Edit / extend an existing model (Conversational Wizard)
- `[c]` Audit & validate model (MCP Syntax + Architecture Coherence)
- `[d]` Export / update console artifacts (Workspace Consoles & Hub)
- `[x]` Execute a model procedure — list procedures declared in the model and execute the chosen one
- `[w]` View & consult documentation — browse iNNfo specs, primitives, and guides
- `[y]` Cancel / help

Option `[c]` MUST combine syntactic MCP schema validation with architectural consistency checks. Option `[d]` MUST trigger console compilation flows. Option `[w]` MUST offer read-only documentation browsing.

#### Scenario: Presenting entry menu on undecided invocation
- **GIVEN** a user activates `nn-innfo` with a general greeting or bare `/nn-innfo`
- **WHEN** the skill prompts the user for action selection
- **THEN** it renders the 7-option menu with `[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, and `[y]`

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
Selecting option `[w]` MUST provide direct access to iNNfo specifications, primitives, matrices, markers, and authoring guidelines without modifying workspace files.

#### Scenario: Consulting documentation
- **GIVEN** a user selects option `[w]`
- **WHEN** `nn-innfo` processes the request
- **THEN** it presents available documentation categories (Level 1/2 specs, primitives, matrices, markers, and guidelines)
- **AND** performs zero filesystem mutations in the workspace
