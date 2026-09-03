# Proposal: Refactor actioNN Skill Architecture: Preflight Middleware, Front Controller Routing, English Compliance

## Intent

Eliminate gate code duplication across skills (DRY), resolve trigger contention between `nn-router` and `nn-innfo` via the Front Controller pattern, and enforce English-only compliance across all `SKILL.md` files.

## Scope

### In Scope
- **Preflight Middleware**: Establish `nn-preflight` as canonical middleware gate; replace ~25 lines of duplicate gate logic across 6 consumer skills (`nn-router`, `nn-innfo`, `nn-trannsform`, `nn-site-generator`, `nn-skills-lifecycle`, `nn-design-presets`) with concise 2-line delegation.
- **Hierarchical Routing**: Assign generic ecosystem triggers (`NN`, `nn`, `/nn`, `router`, `bootstrap`) exclusively to `nn-router` (Front Controller); `nn-innfo` relinquishes bare `NN`/`nn` while retaining domain triggers (`innfo`, `iNNfo`, `/nn-innfo`, `model`, `template`, `*_NN.md`).
- **English-Only Compliance**: Translate all Spanish UI strings, option labels (e.g., `(Recomendado)` -> `(Recommended)`), and notices in `SKILL.md` files to English.
- **Registry Rebuild**: Rebuild `.cogNNitive/skill-registry.md` via `node scripts/build-registry.js`.

### Out of Scope
- Splitting large `nn-innfo/SKILL.md` body into modular `references/` (deferred to future change).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `skill-activation-gate`: Standardize on centralized middleware delegation to `nn-preflight`.
- `skill-routing`: Implement Front Controller routing separating ecosystem entry points from domain-specific triggers.
- `skill-localization`: Enforce English-only standard across skill definitions and prompt interfaces.

## Approach

1. **nn-preflight Contract**: Formalize `nn-preflight` as canonical middleware gate.
2. **Consumer Gates Refactoring**: Replace repetitive gate scripts and instructions in consumer frontmatters and §1 sections with standard delegation to `nn-preflight`.
3. **Trigger Disambiguation**: Update `nn-router` and `nn-innfo` frontmatters to establish hierarchical Front Controller routing.
4. **Localization Audit & Fix**: Translate remaining Spanish prompt strings, menus, and notices across all affected `SKILL.md` files to English.
5. **Registry Synchronization**: Execute `node scripts/build-registry.js` to update skill documentation and verified triggers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-preflight/SKILL.md` | Modified | Clarify middleware contract and interface. |
| `skills/nn-router/SKILL.md` | Modified | Front Controller triggers, delegated gate, English UI. |
| `skills/nn-innfo/SKILL.md` | Modified | Relinquish generic triggers, delegated gate, English UI. |
| `skills/nn-trannsform/SKILL.md` | Modified | Delegated gate, English labels (`(Recommended)`). |
| `skills/nn-site-generator/SKILL.md` | Modified | Delegated gate, English strings. |
| `skills/nn-skills-lifecycle/SKILL.md` | Modified | Delegated gate, English strings. |
| `skills/nn-design-presets/SKILL.md` | Modified | Delegated gate, English strings. |
| `.cogNNitive/skill-registry.md` | Modified | Regenerated via registry build script. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Trigger dispatch breakage | Low | Preserve all domain-specific triggers on specialized skills. |
| Preflight gate bypass or regression | Low | Run `node scripts/preflight-check.js` before and after refactor. |

## Rollback Plan

Run `git checkout -- skills/ .cogNNitive/skill-registry.md` to restore previous definitions.

## Dependencies

- Node.js runtime for `scripts/build-registry.js` and `scripts/preflight-check.js`.

## Success Criteria

- [ ] All 6 consumer skills delegate activation gating to `nn-preflight` in <= 2 lines.
- [ ] `nn-router` exclusively handles generic `NN`/`nn` tokens; `nn-innfo` triggers only on domain keywords.
- [ ] 100% of user-facing prompt strings, options, and notices in modified `SKILL.md` files are in English.
- [ ] `.cogNNitive/skill-registry.md` rebuilt cleanly matching updated triggers.
- [ ] Preflight validation scripts pass without regression.
