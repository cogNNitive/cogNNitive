# Proposal: Model Selection Cascade

## Intent

Unify how the models used by a video are chosen. Today the choice is smeared across four
mechanisms that do not talk to each other: the workspace `video-guard.json` (allow/budget), the
Series L3 Template document (tool/voice/model), the CLI flags (`--image-model/--tts-model/
--avatar-model`) and the scene Layer `model::`. There is no **video** level at all, and the guard
doubles as a selector instead of a policy. This change fixes one precedence,
adds a video-level `template::`, and makes the guard gate-only.

Precedence (most specific wins):

```
layer model:: (avatar)  >  scene template::  >  video template::  >  series Template  >  workspace guard  >  blueprint default
```

This is decision 9 of the 2026-10-26 grill, plus the unified source-of-truth decision 11.

## Why Now

The last-3-days iNNteresante work drifted: `series_rules.md` declared `pruna` on all scenes and a
lower-third "Lucas Cervera" while the actually rendered episode used `infinitetalk-fast` on the
non-hook scenes and "Lucas Cervera · iNNteresante". Nothing detected the drift because the model
ids lived in two places — the editorial rules and the Template L3 — with no single voice.

## Scope

| Slice | Content | Owner |
|---|---|---|
| 1 | Video-level `template::` on the `Video` element | this change |
| 2 | One resolver `resolveModel(scope, kind)` with the documented precedence + tests | this change |
| 3 | Guard becomes gate-only (allow/budget), not a selector | this change |
| 4 | CLI flags become an auditable override that feeds `plan_hash` | this change |
| 5 | Series editorial/rules lose model ids (docs) | change `video-draft-tools` |

### Non-goals

- Changing which providers/models are allowed (guard policy content).
- Removing the Template Concept.
- A UI for choosing models.

## Approach (binding maintainer decisions)

| # | Decision | Rejected alternative and why |
|---|---|---|
| D-MC1 | One resolver; video level is a `template::` on the `Video` element (reuses the existing Template Concept) | Explicit model fields on `Video`: more schema surface for no gain |
| D-MC2 | The guard GATES (allow/budget) and MUST NOT select | Guard-as-selector hides the choice and drifts from the Template |
| D-MC3 | CLI flags are an explicit override that participates in `plan_hash` | Silent flags: the approval would not cover the actual models |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities

- `video-script-model`: adds the video-level `template::`; states the Model Selection Cascade.
- `video-blueprint`: the `Video` element gains an optional `template::` reference field.
- `cognnitive-video-engine`: the cost estimator/guard resolve through the cascade; the guard is
  gate-only.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A model id is still resolvable from two levels with different values | Med | The resolver is the ONLY read path; a test asserts precedence |
| Existing scripts break | Low | The video-level `template::` is optional; the scene level still wins |
| `plan_hash` changes | Low (intended) | The resolver output is the estimator input; re-approval on change is existing behaviour |

## Rollback Plan

Revert per slice. Slices 2-4 are additive; reverting restores the pre-cascade (implicit) order.

## Success Criteria

- [ ] A test asserts the full precedence for every kind (tts/image/avatar).
- [ ] No code path selects a model outside the resolver.
- [ ] `node scripts/verify.js` is green and `npm run check:versions` passes.
