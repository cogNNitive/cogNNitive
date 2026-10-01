# Proposal: Job-Based `/nn` Entry Menu, Unified Procedures, and Wizard Consolidation

## Intent

Typing `/nn` in a domaiNN is supposed to answer "what can I do here?". Today it answers "which skill do you want?":

- `nn-start` §4 routes by skill. `nn-innfo` §0a then shows a model-centric menu where `[a] Create` is always `(Recommended)`, and `[b][c][d][x]` hit the model gate (§0a-bis) only after the user has picked one.
- Work that belongs to the domaiNN (importing sources, the workspace hub, reviewing feedback) is either hidden inside `nn-trannsform` or gated behind an active model (`nn-innfo` §8f step 1).
- Procedures live in 3 places (model `## NN Procedure:`, bluepriNNt via `list_blueprint_procedures`, domain `procedures/` + `procedures_NN.md`). Two executors run them (`nn-innfo` `[x]`, `nn-trannsform` §6 FSM), and the entry point shows none of them.
- `[x]` means "execute procedure" in §0a but "Cancel" in A1, A3 and B1.
- The wizard asks for the bluepriNNt (called "App (Level 2)") before the model, asks the base decision twice (§0b, A1), and has two near-identical plan gates (A3, B1). Menus are in English while notices and the footer are in Spanish.
- `/nn` is a repo-local stub (`.agents/skills/nn/SKILL.md`) that `manifest/source.yaml` does not distribute. Generic words like "modelo" can activate `nn-innfo` directly, so the entry path is not deterministic.

Goal: one entry question organized by job, following the loop Sources → Model → Artifacts → Review → Sources, with the recommendation taken from workspace state.

## Scope

### In Scope
1. **Job menu** in `nn` / `nn-start`: `[s]` Import/update sources · `[m]` Work on a model · `[r]` Produce/review artifacts (consoles, hub, reconcile feedback) · `[p]` Run a procedure · `[h]` Docs/help · `[x]` Cancel. Each line shows the probe counts from C.
2. **State-driven `(Recommended)`**: the tag goes on the first dirty stage of the loop, and that line is rendered first. Letters stay stable.
3. **Global letter semantics**: `[x]` always means cancel/exit, and `[p<n>]` always names a procedure. §0a's `[x]` → `[p]` and `[w]`/`[y]` → `[h]`/`[x]`.
4. **Watch digest as a counter**: session start shows one count line. Per-item `[a]/[b]/[c]` prompts appear only inside `[s]`. `.cognnitive/watch-digest.json` dedup stays.
5. **Just-in-time model selection**: only jobs that need a model ask for one (1 model → auto-bind). The domain-level hub is exported without a model.
6. **Unified procedure list**: one list, deduplicated, with each entry tagged `domain` / `blueprint` / `model`.
7. **Single executor contract**: resolve the entry to a procedure document (`procedure_model::` or inline `Work` elements), then run the `nn-trannsform` §6 FSM (`next::`, autocompletion check, capture deviations). `nn-innfo` delegates to it.
8. **Wizard consolidation**: infer the bluepriNNt from the user's words and mark it `(Recommended)`; ask the base question once; merge A3 and B1 into one plan gate. The model name is asked inside that gate.
9. **Vocabulary and language policy**: user-facing text uses domaiNN / bluepriNNt / kNNowledge. It never says "Level 2/3", `parent_spec`, "app" or "template" (the `traNNsformations/` sense stays exempt). One language per session: the first user message sets it, an explicit request changes it. Menus, Informative Grace notices and the footer all follow it.
10. **`/nn` distribution and activation routing**: ship `nn` through the manifest and narrow the `nn-innfo` triggers. Any skill that activates without the session marker from C hands off to the gate owner.

### Out of Scope
- Tool-name, dup §15, catalog and discard-policy repair (A). Layout `models/` → `kNNowledge/` (B). The probe, gate owner and marker (C).
- New MCP tools. Changes to the procedure FSM semantics. Console/feedback UX (the `2026-09-30-console-*` changes).
- Migrating `_samples_nn` procedure file names (A).

## Proposed split (decide at design time)

| Sub-change | Content | Depends on | Why separate |
|---|---|---|---|
| D1 `entry-job-menu-routing` | Items 1–5, 10 | C (hence A, B) | Needs the probe. Touches `nn-start`, `nn`, manifest, triggers |
| D2 `unified-procedure-catalog` | Items 6–7, plus the procedure slot of `[p]` | A (tool names); D1 menu slot | Own capability. Reconciles two skills and touches samples |
| D3 `wizard-and-language-policy` | Items 8–9 | A | Mostly `nn-innfo` §0b–0c text. Can run in parallel with D1 |

Rationale: each slice has its own spec, review surface and rollback. Keeping them in one change would push a single `nn-innfo` diff well past the review budget.

## Capabilities

### New Capabilities
- `nn-entry-job-menu`: job menu, state-driven Recommended, digest counter, just-in-time model selection, `/nn` activation routing.
- `unified-procedure-catalog`: scope-tagged discovery, dedup/precedence, single executor contract.
- `session-language-policy`: one language per session covering every user-facing string.

### Modified Capabilities
- `innfo-skill-menu`: drop the 7-option menu. The model gate runs just-in-time and `[x]` means cancel.
- `router-governance`: `(Recommended)` goes on the state-chosen option instead of the `[a]`/`[1]` position. Adds `/nn` as the canonical entry.
- `canonical-vocabulary`: the living spec still names `app` as canonical. Change it to bluepriNNt.
- `template-procedures-manifest-and-discovery`: add the scope tag to discovery output.

## Affected Areas

| Area | Impact |
|---|---|
| `skills/nn-start/SKILL.md`, `.agents/skills/nn/SKILL.md` (or a new `skills/nn/`) | Modified/New |
| `skills/nn-innfo/SKILL.md` §0a–0d, §8f, §13, §15 | Modified |
| `skills/nn-trannsform/SKILL.md` §2a-3b, §6 | Modified |
| `skills/nn-preflight/SKILL.md` (report footer language) | Modified |
| `manifest/source.yaml` (`skills:` and `workflows:`) | Modified plus `skills-v*` re-pin |
| `_samples_nn/procedures*` | Scope metadata, if needed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Reordering by state breaks the "Recommended = `[a]`" rule and muscle memory | Med | Stable letters. Modify `router-governance` explicitly |
| Folding `nn-start` into `nn` breaks the `Session Start: Load nn-start` line in every bootstrapped workspace's `AGENTS.md` | Med | Design picks rename+migrate (via `nn-upgrade`) or keep `nn-start` as the owner |
| Procedure dedup collisions across scopes | Med | Deterministic precedence model > blueprint > domain, shown with a scope tag |
| Language detection guesses wrong | Low | Explicit switch phrase; the preflight footer already offers one |
| Skill-only change ships without re-pin | Med | Same batch `skills-v*` tag + manifest re-pin (§4e) |

## Rollback Plan

Each sub-change is text in skill files plus a manifest re-pin. To roll back, revert that sub-change's commits on `dev` and re-pin `channels.stable` to the previous `skills-v*` tag. There is no data migration unless design chooses to rename `nn-start`. In that case, deliberately keep the `AGENTS.md` scaffold change as a separate, revertible commit.

## Dependencies

- **A** `2026-10-01-nn-entry-contract-repair`: real MCP tool names (`list_blueprint_procedures`, `list_knowledge`), one §15, procedure file naming.
- **B** `2026-10-01-nn-workspace-layout-canonical`: `kNNowledge/` layout for model counts.
- **C** `2026-10-01-nn-domain-state-probe`: probe payload, gate owner and marker. D1 cannot start without it.

## Success Criteria

"Blocking questions" = agent turns that wait for the user after `/nn`, not counting the job pick. Measured on the Ghostbusters sample workspace.

- [ ] **Import** (pending watch items): ≤1 question before the scanner runs. Today: per-item digest prompts before any menu.
- [ ] **Create model**: ≤2 questions (goal, one plan gate) before the file is written. Today: about 6–7 (§0b ×2–3, A1, A3, B1, B2, B3).
- [ ] **Edit model** (1 model): 0 questions, auto-bound.
- [ ] **Export hub/console**: reachable with no active model, and ≤1 question (design preset, `nn-start` Rule 4).
- [ ] **Review feedback**: `reconcile_artifact_feedback` reachable from `[r]` or `[p]` in ≤2 selections. Today: no entry point.
- [ ] `[p]` lists procedures from all 3 scopes with tags. One executor contract is referenced by both skills.
- [ ] The preflight runs once per session. No mixed-language turns. A guard finds no "Level 2/3", "app" or "template" (schema sense) in the user-facing strings of the entry skills.
- [ ] A fresh install through the manifest provides `/nn`.

## Proposal question round

Not asked (executor cannot prompt). Assumptions for the user to confirm:

1. Should `nn` replace `nn-start` as the single front controller, with the alias deleted? Assumed yes, pending the `AGENTS.md` migration cost.
2. Is "first dirty stage of the loop" the right rule for `(Recommended)`, or should an in-progress procedure run win?
3. Precedence when the same procedure id exists in several scopes: model > blueprint > domain?
4. Should the session language follow the first user message, or be pinned per domaiNN in `domaiNN_NN.md`?
5. Is Review a first-class job (`[r]`), or only a procedure under `[p]`?
