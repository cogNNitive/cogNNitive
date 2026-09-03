# Tasks: actioNN Skill Architecture Refactor (`2026-09-03-actionn-architecture-refactor`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-300 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (atomic phased commits) |
| Delivery strategy | ask-on-risk |
| Chain strategy | single-pr |
| Decision needed before apply | No |

- **Decision needed before apply**: No
- **Chained PRs recommended**: No
- **Chain strategy**: single-pr
- **400-line budget risk**: Low

---

## Phase 1: Canonical Preflight Middleware

- [x] 1.1 Update `skills/nn-preflight/SKILL.md` to define the canonical activation gate protocol:
  - Add session greeting banner specification (`🔧 You're using skill: <skill-name> (<emoji>)`) displayed once per session.
  - Document deterministic script runner invocation (`node scripts/preflight-check.js` and fallback path `~/.agents/skills/nn-preflight/scripts/preflight-check.js`).
  - Specify exit code handling contracts in English:
    - Exit `0`: Proceed immediately without interaction.
    - Exit `1`: Halt, display component report, prompt user with `[a] (Recommended) Update components now` and `[b] Continue with current version` (consent required before mutations).
    - Exit `2`: Block and abort immediately (Node.js >= 18 required).

## Phase 2: Front Controller & Trigger Hierarchy

- [x] 2.1 Refactor `skills/nn-router/SKILL.md`:
  - Set as ecosystem Front Controller in description and triggers: claim `NN`, `nn`, `/nn`, `/nn-router`, `router`, `bootstrap`, `setup`, `preflight`.
  - Replace verbose gate check in §0 with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Translate Spanish UI dialogue, dispatch descriptions, and prompt strings to English.
- [x] 2.2 Refactor `skills/nn-innfo/SKILL.md`:
  - Relinquish bare `NN` and `nn` from frontmatter triggers, description, and activation contract (§0), scoping triggers to domain tokens (`innfo`, `iNNfo`, `/nn-innfo`, `model`, `template`, `*_NN.md`, `procedures_V_0-1-0_NN.md`).
  - Replace verbose gate check in §0 with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Translate Spanish wizard dialogues, choices, and prompt notices to English.

## Phase 3: Consumer Skills Gate Delegation & English Localization

- [x] 3.1 Refactor `skills/nn-trannsform/SKILL.md`:
  - Replace verbose §0 gate check with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Replace `(Recomendado)` with `(Recommended)` and translate pipeline prompts/options to English.
- [x] 3.2 Refactor `skills/nn-site-generator/SKILL.md`:
  - Replace verbose §0 gate check with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Translate Spanish UI prompts, confirmation banners, and option strings to English.
- [x] 3.3 Refactor `skills/nn-skills-lifecycle/SKILL.md`:
  - Replace verbose §0 gate check with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Translate Spanish prompt dialogues, action options, and recommendation labels to English.
- [x] 3.4 Refactor `skills/nn-design-presets/SKILL.md`:
  - Replace verbose §0 gate check with the canonical 2-line delegation snippet referencing `nn-preflight`.
  - Replace `(Recomendado)` / `(Recomendada)` with `(Recommended)`.
  - Standardize multi-selection notice to English: `"You can select one option or a combination (e.g. A and B)"`.

## Phase 4: Registry Rebuild, Verification & Testing

- [x] 4.1 Execute `node scripts/build-registry.js` to rebuild `.cogNNitive/skill-registry.md` from updated skill frontmatters and verify valid generation.
- [x] 4.2 Execute preflight integrity check (`node scripts/preflight-check.js`) to verify clean environment exit code `0` handling and report generation.
- [x] 4.3 Perform codebase scan across `skills/` for Spanish string residuals (`Recomendado`, `Podés`, `Se detectaron`, `actualizar`) to verify 100% English compliance.
