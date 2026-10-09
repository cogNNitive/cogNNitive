# Delta for innfo-skill-menu

## MODIFIED Requirements

### Requirement: Canonical Entry Menu Structure

When invoked without an explicit, actionable intent, `nn-innfo` MUST present a
7-option entry menu:
- `[a] (Recommended)` Create a new model (Conversational Wizard)
- `[b]` Edit / extend an existing model (Conversational Wizard)
- `[c]` Audit & validate model (MCP Syntax + Architecture Coherence)
- `[d]` Export / update console artifacts (Workspace Consoles & Hub)
- `[x]` Execute a model procedure — delegate selection and execution to the canonical procedure-execution protocol, discovering procedures from model `## NN Procedure:` sections, blueprint frontmatter, and `workspace/procedures/`
- `[w]` View & consult documentation — browse iNNfo specs, primitives, and guides
- `[y]` Cancel / help

Option `[c]` MUST combine syntactic MCP schema validation with architectural
consistency checks. Option `[d]` MUST trigger console compilation flows. Option
`[x]` MUST link to the procedure-execution owner protocol and MUST NOT restate its
steps. Option `[w]` MUST offer read-only documentation browsing.
(Previously: `[x]` listed model procedures without a single owner protocol.)

#### Scenario: Presenting entry menu on undecided invocation
- **GIVEN** a user activates `nn-innfo` with a general greeting or bare `/nn-innfo`
- **WHEN** the skill prompts the user for action selection
- **THEN** it renders the 7-option menu with `[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, and `[y]`

#### Scenario: Procedure option delegates to the owner
- **GIVEN** a user selects `[x]`
- **WHEN** `nn-innfo` processes the request
- **THEN** it lists procedures discovered from model sections, blueprint frontmatter, and `workspace/procedures/`
- **AND** it delegates execution to the procedure-execution owner protocol without restating steps
