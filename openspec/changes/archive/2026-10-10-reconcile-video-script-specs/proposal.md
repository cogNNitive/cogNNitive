# Proposal: Reconcile video-script specs with the shipped engine

## Intent

The `video-script` native model retired the VUS parser and the old `video`
bluepriNNt, but several published OpenSpec specs and the shipped skill still
describe the pre-migration state. This change reconciles the drift:

1. `cognnitive-video-engine` still declares **concept callouts** as an overlay the
   compiler emits. The native `video-script` blueprint defines no `concept-callout`
   `type::`, and the compiler emits none — `ConceptCallout.tsx` and its registry
   wiring are dead render code left over from VUS.
2. Four published specs still name the retired `video` bluepriNNt instead of
   `video-script`.

This is a spec↔code reconciliation: no behavior is added, only stale claims are
removed and stale names corrected.

## Scope

### In Scope

- Remove the concept-callout requirement from `cognnitive-video-engine` (spec).
- Delete the dead `ConceptCallout.tsx` renderer and its `Scene.tsx` / registry /
  `SKILL.md` wiring.
- Correct `video` → `video-script` in `video-template`,
  `template-package-structure`, `template-procedures-manifest-and-discovery`, and
  `workspace-directory-conventions`.
- Fix the compiler's misleading comment that claims a caller can pass the
  blueprint's `conditional_fields` map (no caller does); state the real contract.

### Out of Scope

- Re-introducing concept callouts (a future capability change if ever needed).
- Wiring the blueprint's `validation.conditional_fields` into the compiler at
  compile time (the compiler's default map is currently identical to the
  blueprint; making the blueprint the single source of truth is a separate change).

## Capabilities

### Modified Capabilities

- `cognnitive-video-engine`: drop the concept-callout overlay requirement.
- `video-template`: the embedding bluepriNNt is `video-script`, not `video`.
- `template-package-structure`: embedded-skill scenarios reference `video-script`.
- `template-procedures-manifest-and-discovery`: discovery/projection scenarios
  reference `video-script`.
- `workspace-directory-conventions`: the series layout prose references
  `video-script`.

## Approach

Pure reconciliation: edit the published specs (via delta specs) and delete the
dead render path. No runtime logic changes; the `conditional_fields` comment is
corrected in place.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/cognnitive-video-engine/spec.md` | Modified | remove concept-callout |
| `openspec/specs/{video-template,template-package-structure,template-procedures-manifest-and-discovery,workspace-directory-conventions}/spec.md` | Modified | `video` → `video-script` |
| `.../nn-video-script/scripts/scene/overlays/ConceptCallout.tsx` | Removed | dead renderer |
| `.../nn-video-script/scripts/scene/Scene.tsx` | Modified | drop import/type/branch |
| `.../nn-video-script/scripts/scene/overlay-registry.mjs` | Modified | drop `conceptCallout` |
| `.../nn-video-script/SKILL.md` | Modified | drop the claim |
| `.../nn-video-script/scripts/remotion-scene-compiler.mjs` | Modified | fix `conditional_fields` comment |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A consumer still references `conceptCallout` | Low | Grep the repo: no test or non-dead source references it. |
| `video` vs `video-script` over-correction | Low | Only the bluepriNNt-package references change; the `video-template` workflow capability name is untouched. |

## Rollback Plan

Each slice is a spec or a dead-code deletion. Revert the commit; nothing depends
on the deleted renderer because nothing emits `conceptCallout`.

## Success Criteria

- [ ] `cognnitive-video-engine` no longer mentions concept callouts.
- [ ] No `ConceptCallout` reference remains outside `openspec/changes/archive/`.
- [ ] The four published specs name `video-script`, not `video`, for the blueprint package.
- [ ] Video-script skill tests and `scripts/verify.js` stay green.
