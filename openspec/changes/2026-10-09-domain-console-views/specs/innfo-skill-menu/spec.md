# Delta for innfo-skill-menu

## MODIFIED Requirements

### Requirement: Canonical Entry Menu Structure
When invoked without an explicit, actionable intent, `nn-innfo` MUST present a 7-option entry menu:
- `[a] (Recommended)` Create a new model (Conversational Wizard)
- `[b]` Edit / extend an existing model (Conversational Wizard)
- `[c]` Audit & validate model (MCP Syntax + Architecture Coherence)
- `[d]` Export / update console artifacts (domaiNN console)
- `[x]` Execute a model procedure — list procedures declared in the model and execute the chosen one
- `[w]` View & consult documentation — browse iNNfo specs, primitives, and guides
- `[y]` Cancel / help

Option `[c]` MUST combine syntactic MCP schema validation with architectural consistency checks. Option `[d]` MUST trigger console export through `scripts/export-console.mjs`, producing the single `domaiNN_console.html`; it MUST NOT mention or compile a Workspace Hub. Option `[w]` MUST offer read-only documentation browsing.
(Previously: option `[d]` read "Export / update console artifacts (Workspace Consoles & Hub)" and "MUST trigger console compilation flows".)

#### Scenario: Presenting entry menu on undecided invocation
- **GIVEN** a user activates `nn-innfo` with a general greeting or bare `/nn-innfo`
- **WHEN** the skill prompts the user for action selection
- **THEN** it renders the 7-option menu with `[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, and `[y]`
- **AND** the `[d]` label contains no "Hub" text
