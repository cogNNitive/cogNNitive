# Skill Architecture Specification

## Purpose

Define the architecture conventions for the cogNNitive skill ecosystem: canonical preflight middleware gate protocol in `nn-preflight`, Front Controller hierarchical routing with `nn-router`, and standardized English-only UI strings and prompt conventions across all skills.

## Requirements

### Requirement: Canonical Preflight Middleware

The activation gate protocol MUST be centrally defined in `nn-preflight` as the single source of truth for all cogNNitive skills.

1. **Protocol Definition in `nn-preflight`**:
   - `nn-preflight` MUST define the standard greeting banner protocol (`🔧 You're using skill: <skill-name> (<emoji>)`), emitted once per session prior to answering or running tools.
   - `nn-preflight` MUST define the deterministic execution of the integrity runner (`node scripts/preflight-check.js` or `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js`).
   - `nn-preflight` MUST define the deterministic handling of exit codes:
     - Exit code `0` (Success): Continue execution of the target skill immediately without user interaction.
     - Exit code `1` (Warnings / Outdated Components): Halt execution, present the component report, and prompt the user for confirmation using standard English options:
       - `[a] (Recommended) Update components now`
       - `[b] Continue with current version`
       No file mutation or updates SHALL occur without explicit user consent. If the user selects `[b]`, proceed with the current version.
     - Exit code `2` (Runtime Blocker): Halt execution immediately and inform the user that Node.js >= 18 is required.

2. **Consumer Skill Delegation**:
   - All consumer skills (`nn-router`, `nn-innfo`, `nn-trannsform`, `nn-site-generator`, `nn-skills-lifecycle`, `nn-design-presets`) MUST delegate their activation gate to `nn-preflight` in at most 2 lines in their activation section.
   - Consumer skills MUST NOT duplicate script execution commands, file paths to `preflight-check.js`, or exit code conditional branching logic (`0`, `1`, `2`) within their own `SKILL.md` documents.

#### Scenario: Consumer skill activation gate delegation
- GIVEN any consumer skill among `nn-router`, `nn-innfo`, `nn-trannsform`, `nn-site-generator`, `nn-skills-lifecycle`, or `nn-design-presets`
- WHEN inspecting its activation gate section (§0)
- THEN it MUST contain a delegation reference to `nn-preflight` spanning no more than 2 lines
- AND it MUST NOT contain duplicate script runner commands or exit code branching logic

#### Scenario: Preflight check returns exit code 0
- GIVEN an agent activates a consumer skill and invokes the preflight check protocol
- WHEN `preflight-check.js` exits with code `0`
- THEN the skill MUST proceed directly with its intended workflow or menu
- AND it MUST NOT prompt the user for component updates

#### Scenario: Preflight check returns exit code 1
- GIVEN an agent activates a consumer skill and invokes the preflight check protocol
- WHEN `preflight-check.js` exits with code `1`
- THEN the skill MUST halt execution before mutating any files or proceeding
- AND it MUST present the standardized English update prompt with options `[a] (Recommended) Update components now` and `[b] Continue with current version`
- AND it MUST proceed with the workflow only if the user chooses to continue

#### Scenario: Preflight check returns exit code 2
- GIVEN an agent activates a consumer skill and invokes the preflight check protocol
- WHEN the environment fails runtime requirements (Node.js < 18) resulting in exit code `2`
- THEN the skill MUST abort execution immediately
- AND it MUST display a runtime blocker notification requiring Node.js >= 18

---

### Requirement: Front Controller Hierarchical Routing

The cogNNitive skill ecosystem MUST implement hierarchical routing with `nn-router` serving as the Front Controller.

1. **Front Controller Responsibilities**:
   - `nn-router` MUST serve as the primary Front Controller and ecosystem entry point.
   - `nn-router` MUST uniquely declare and claim the generic ecosystem triggers: `NN`, `nn`, `/nn`, `router`, and `bootstrap` in its frontmatter and description.
   - `nn-router` MUST be responsible for greeting users who invoke the ecosystem via generic triggers, performing governance checks, and dispatching to specialized skills.

2. **Specialized Domain Boundary for `nn-innfo`**:
   - `nn-innfo` MUST NOT declare generic `NN` or `nn` tokens in its frontmatter triggers, description, or activation contract.
   - `nn-innfo` MUST activate exclusively on domain-specific keywords and patterns: `innfo`, `iNNfo`, `/nn-innfo`, `model`, `template`, `*_NN.md`, and `procedures_V_0-1-0_NN.md`.
   - `nn-innfo` SHALL NOT compete with `nn-router` for root-level ecosystem invocations.

#### Scenario: Generic ecosystem invocation routes to Front Controller
- GIVEN a user message consisting of or triggering `NN`, `nn`, `/nn`, `router`, or `bootstrap`
- WHEN the agent matches the input against skill triggers
- THEN `nn-router` MUST be activated as the Front Controller
- AND `nn-innfo` MUST NOT be triggered by these generic tokens

#### Scenario: Domain-specific model invocation triggers `nn-innfo`
- GIVEN a user message containing domain keywords such as `/nn-innfo`, `innfo`, `iNNfo`, `model`, `template`, or referencing `*_NN.md`
- WHEN the agent matches the input against skill triggers
- THEN `nn-innfo` MUST be activated
- AND `nn-router` SHALL NOT intercept the request unless explicitly targeted

#### Scenario: Elimination of trigger collision between router and innfo
- GIVEN the frontmatter metadata of `nn-router` and `nn-innfo`
- WHEN checking the trigger declarations of both skills
- THEN `NN` and `nn` MUST appear only in `nn-router`
- AND `nn-innfo` MUST NOT list bare `NN` or `nn` in its triggers or activation contract

#### Scenario: Hierarchical dispatch to specialized skills
- GIVEN a user interacts with `nn-router` and requests a specific task (such as creating a model or running a document pipeline)
- WHEN `nn-router` resolves the target capability
- THEN `nn-router` MUST route the user to the corresponding domain skill (`nn-innfo` for models, `nn-trannsform` for pipelines) as registered in `.cogNNitive/skill-registry.md`

---

### Requirement: English-Only UI Strings and Options

All interactive UI strings, decision prompts, options, and notices across all `SKILL.md` files in the cogNNitive ecosystem MUST be written exclusively in English.

1. **Standard Recommendation Labeling**:
   - In all decision menus, option lists, and wizard steps, recommended choices MUST be designated using `[a] (Recommended)` or `[1] (Recommended)`.
   - Spanish designation strings including `(Recomendado)` and `(Recomendada)` MUST NOT be used anywhere.

2. **Standard Multi-Selection Notice**:
   - Whenever multiple non-exclusive options can be selected simultaneously, the prompt MUST include the standardized English notice:
     `"You can select one option or a combination (e.g. A and B)"`.
   - Spanish notices such as `"Podés seleccionar una opción o una combinación (ej. A y B)"` MUST be completely replaced.

3. **Prompt and Dialogue Localization**:
   - All interactive choices, error messages, and confirmation dialogues in `SKILL.md` files (including update notices, wizard branch descriptions, and fallback recommendations) MUST be authored in English.

#### Scenario: Recommended option formatting in decision prompts
- GIVEN a skill presents a list of choices containing a recommended default
- WHEN the option list is rendered to the user
- THEN the recommended option MUST include `(Recommended)` in its label (e.g., `[a] (Recommended)` or `[1] (Recommended)`)
- AND the label MUST NOT contain `(Recomendado)` or `(Recomendada)`

#### Scenario: Multi-selection instruction display
- GIVEN a skill presents choices that allow multi-selection or combination
- WHEN presenting the selection prompt
- THEN the prompt MUST state `"You can select one option or a combination (e.g. A and B)"`
- AND it MUST NOT contain Spanish phrases

#### Scenario: Component update prompt language
- GIVEN any skill displays the outdated/missing component confirmation dialogue (Preflight exit code 1)
- WHEN rendering the prompt to the user
- THEN the banner MUST read `"⚠️ Updates or missing components were detected in the cogNNitive ecosystem:"`
- AND the options MUST read `[a] (Recommended) Update components now` and `[b] Continue with current version`

#### Scenario: Skill registry synchronization with English triggers and metadata
- GIVEN updated `SKILL.md` definitions conforming to English-only triggers and descriptions
- WHEN `node scripts/build-registry.js` is executed
- THEN `.cogNNitive/skill-registry.md` MUST be regenerated without errors
- AND all registered triggers and skill summaries MUST reflect the localized English definitions
