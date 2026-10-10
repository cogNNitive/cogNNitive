# Tasks: Reconcile video-script specs with the shipped engine

## 1. Remove the concept-callout overlay

- [x] 1.1 Delete `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/scene/overlays/ConceptCallout.tsx`.
- [x] 1.2 `Scene.tsx`: remove the `ConceptCallout` import, the `'conceptCallout'` union member, and the `case 'ConceptCallout'` branch.
- [x] 1.3 `overlay-registry.mjs`: remove the `conceptCallout: 'ConceptCallout'` entry.
- [x] 1.4 `SKILL.md`: remove the "concept callouts (`conceptCallout`)" claim.
- [x] 1.5 Delta spec `cognnitive-video-engine`: MODIFY "Programmatic Remotion Scene Compilation" to drop concept callouts.

## 2. Correct `video` → `video-script` in published specs

- [x] 2.1 `video-template`: MODIFY "Video bluepriNNt Owns Its Script Skill".
- [x] 2.2 `template-package-structure`: MODIFY the three scenarios naming the `video` package.
- [x] 2.3 `template-procedures-manifest-and-discovery`: MODIFY R-TPD-04 and R-TPD-05 scenarios.
- [x] 2.4 `workspace-directory-conventions`: MODIFY "Series and Video Folder Layout".

## 3. Correct the `conditional_fields` comment

- [x] 3.1 `remotion-scene-compiler.mjs`: replace the "a caller may pass" claim with a statement that `DEFAULT_CONDITIONAL_FIELDS` is the effective contract and must stay in sync with the blueprint's `validation.conditional_fields`.

## 4. Verify

- [x] 4.1 Run the video-script skill tests (`scene-compiler`, `knowledge-model-compile`, `no-vus-artifacts`).
- [x] 4.2 `node scripts/verify.js` (or the affected sub-checks) stays green.
