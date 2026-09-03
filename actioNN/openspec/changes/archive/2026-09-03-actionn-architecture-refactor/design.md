# Design: Refactor actioNN Skill Architecture

## Technical Approach

1. **Canonical Activation Gate (`nn-preflight`)**:
   - Centralize activation protocol in `skills/nn-preflight/SKILL.md`:
     - **Greeting Banner**: `🔧 You're using skill: <skill-name> (<emoji>)` (once per session).
     - **Deterministic Runner**: `node scripts/preflight-check.js` (fallback `~/.agents/skills/nn-preflight/scripts/preflight-check.js`).
     - **Exit Codes**: `0` = proceed immediately; `1` = halt, display report, prompt `[a] (Recommended) Update components now` / `[b] Continue with current version` (consent required); `2` = abort (Node.js >= 18 required).
2. **Consumer Skill Delegation**:
   - Replace ~25 lines of duplicate gate scripts in 6 consumer skills with the 2-line delegation snippet:
     ```markdown
     ## 0. Activation Gate
     Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).
     ```
3. **Front Controller Routing**:
   - `nn-router` exclusively claims generic root triggers: `NN`, `nn`, `/nn`, `router`, `bootstrap`, `setup`.
   - `nn-innfo` strips bare `NN`/`nn`, activating exclusively on domain keywords: `innfo`, `iNNfo`, `/nn-innfo`, `model`, `template`, `*_NN.md`.
4. **English Localization Audit**:
   - Standardize all Spanish UI strings across `nn-design-presets`, `nn-innfo`, `nn-router`, `nn-site-generator`, `nn-skills-lifecycle`, and `nn-trannsform`:
     - `(Recomendado)` / `(Recomendada)` -> `(Recommended)`.
     - Multi-select notices -> `"You can select one option or a combination (e.g. A and B)"`.
     - Gate alerts -> `"⚠️ Updates or missing components were detected in the cogNNitive ecosystem:"`.

## Architecture Decisions

### Decision 1: Canonical Preflight Middleware vs Inline Duplicate Gates
- **Choice**: Centralize activation gate in `nn-preflight`; delegate via a 2-line snippet in consumer skills.
- **Alternatives Considered**:
  1. *Inline duplicate gates*: High maintenance overhead and prompt drift.
  2. *Shell wrapper script*: Bypasses agent-native skill activation protocol.
- **Rationale**: DRY compliance ensures uniform preflight enforcement and minimizes token consumption.

### Decision 2: Front Controller Architecture vs Competitive Trigger Matching
- **Choice**: Designate `nn-router` as Front Controller for generic ecosystem triggers (`NN`, `nn`), routing downstream to specialized skills.
- **Alternatives Considered**:
  1. *Competitive trigger matching*: Non-deterministic routing between `nn-router` and `nn-innfo`.
  2. *Monolithic merge*: Merging router and domain modeling bloats context.
- **Rationale**: Eliminates trigger collisions and guarantees deterministic entry.

### Decision 3: Single-Language Rule Enforcement (English Only)
- **Choice**: Standardize all skill frontmatters, prompts, option menus, and alerts to English.
- **Alternatives Considered**:
  1. *Bilingual prompts*: Degrades LLM parsing consistency.
  2. *Spanish user prompts with English docs*: Inconsistent ecosystem standard.
- **Rationale**: Maximizes instruction fidelity across agent runtimes and enables automated string validation.

## Data Flow

```text
User Input ("NN" or generic) ----> [ nn-router (Front Controller) ]
User Input (Domain/Model)    ----> [ nn-innfo / Specialized Skill ]
                                            |
                                            v
                                [ 0. Activation Gate ]
                                            |
                                            v delegates
                                [ nn-preflight Protocol ]
                                            |
                                 +----------+----------+
                                 |          |          |
                              exit 0     exit 1     exit 2
                                 |          |          |
                              Proceed    Prompt     Block & Abort
                                         Update?
                                            |
                                      +-----+-----+
                                      |           |
                                   Accept      Decline
                                      |           |
                                    Update     Proceed
```

## File Changes

| File | Change Summary |
|------|----------------|
| `skills/nn-preflight/SKILL.md` | Formalize canonical activation gate contract and exit code handling. |
| `skills/nn-router/SKILL.md` | Add Front Controller triggers, adopt 2-line gate, translate Spanish UI. |
| `skills/nn-innfo/SKILL.md` | Relinquish bare `NN`/`nn`, adopt 2-line gate, translate Spanish wizard strings. |
| `skills/nn-trannsform/SKILL.md` | Adopt 2-line gate, replace `(Recomendado)` and Spanish prompts. |
| `skills/nn-site-generator/SKILL.md` | Adopt 2-line gate, replace Spanish strings with English. |
| `skills/nn-skills-lifecycle/SKILL.md` | Adopt 2-line gate, translate Spanish prompts and option labels. |
| `skills/nn-design-presets/SKILL.md` | Adopt 2-line gate, replace `(Recomendado)` and Spanish selection text. |
| `.cogNNitive/skill-registry.md` | Rebuild registry reflecting updated English triggers and descriptions. |

## Interfaces / Contracts

### 1. Consumer Skill Gate Interface
```markdown
## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).
```

### 2. Frontmatter Trigger Interface
- `nn-router`: `triggers: NN, nn, /nn, /nn-router, router, bootstrap, setup, preflight`
- `nn-innfo`: `triggers: innfo, iNNfo, /nn-innfo, model, template, *_NN.md, procedures_V_0-1-0_NN.md`

### 3. Preflight Response Contract
- Exit `0`: Continue silently.
- Exit `1`: Prompt `[a] (Recommended) Update components now` / `[b] Continue with current version`.
- Exit `2`: Abort with Node.js >= 18 blocker notice.

## Testing Strategy

1. **Deterministic Runner**: Execute `node scripts/preflight-check.js` (must exit `0` on clean environment).
2. **Registry Build**: Execute `node scripts/build-registry.js` to verify frontmatter parsing and registry generation.
3. **Spanish Residue Audit**: Run `git grep -i` for residual Spanish tokens (`Recomendado`, `Podés`, `Se detectaron`, `actualizar`) across `skills/`.

## Migration / Rollout

Apply edits atomically across skill files, run registry rebuild script, and commit. Rollback via `git checkout -- skills/ .cogNNitive/skill-registry.md`.

## Open Questions

None. Scope and interfaces are fully specified.
