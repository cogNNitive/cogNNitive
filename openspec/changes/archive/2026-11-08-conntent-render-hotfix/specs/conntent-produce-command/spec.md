# conntent-produce-command Delta Spec

## MODIFIED Requirements

### Requirement: One Command Sequences The Whole Pipeline

The engine CLI MUST provide `produce <episode>` that performs, in this order and without further instruction: intake of the proposed changeset, validation (registry keys, kinds, catalog, chrome), review or skip, kind and chrome expansion, cascade resolution, estimate, budget gate, TTS, image synthesis, avatar synthesis, compile, asset linking, render, post-emit overlay QA, format derivation, chapter block, and lifecycle writes. TTS and image synthesis MUST both complete before avatar synthesis begins, so that the TTS cache entries read by avatar synthesis exist on a cold cache. The agent MUST NOT need to invoke any of these steps individually, and a first run MUST NOT require a prior `compile`. The CLI MUST NOT accept model-id or output-size flags, because the cascade has no `cli` level.
(Previously: the order did not include the post-emit overlay QA, and avatar synthesis could run before the TTS cache was populated.)

#### Scenario: Skip-review episode goes to produced in one run

- GIVEN an episode with an applied proposal, `script_review:: skip` and an estimate within budget
- WHEN `produce <episode>` runs
- THEN it ends with exit 0, the master and every declared format written, the state `produced`, and a summary of real cost and stage timings

#### Scenario: Order is fixed

- GIVEN a successful run
- WHEN the timing log of that run is read
- THEN the stages appear in the fixed order `plan`, `tts`, `image`, `avatar`, `compile`, `render`, `qa`, `formats`, `apply` and no provider spend precedes the estimate

#### Scenario: Cold cache with narrated avatars succeeds

- GIVEN an episode with a narrated `avatar` Layer and an empty TTS cache, and no prior `compile`
- WHEN `produce <episode>` runs
- THEN the `tts` stage records its cache entry before the `avatar` stage starts
- AND the `avatar` stage does not fail with "run compile first"

#### Scenario: TTS and images precede avatars

- GIVEN a run with TTS, image and avatar work
- WHEN the stage start times are read
- THEN both `tts` and `image` ended before `avatar` started

#### Scenario: Model flag refused

- GIVEN the engine CLI
- WHEN `produce` is run with `--avatar-model X`
- THEN it exits non-zero with a usage that does not list the flag

## ADDED Requirements

### Requirement: Post-Emit Overlay QA Gates Produced

After render emits the HyperFrames project and before any lifecycle write, `produce` MUST compare the set of overlays declared in the manifest (`tracks.overlays`, including those lowered from scene text layers and Chrome) with the overlays present in the emitted `index.html`. The comparison MUST consider only overlays the manifest declares; a scene that declares no overlay MUST NOT fail the check. If any declared overlay is absent from `index.html`, `produce` MUST exit non-zero with a named error listing each missing overlay, MUST NOT write `status:: produced` or the `master` field, and MUST keep the rendered master file for inspection. The check verifies DOM presence only; it MUST NOT inspect pixels.

#### Scenario: All declared overlays present

- GIVEN a manifest declaring a title, a lower-third, a caption, a watermark and a CTA, all present in the emitted `index.html`
- WHEN `produce` reaches the QA stage
- THEN the check passes and the run proceeds to format derivation and the `produced` write

#### Scenario: A missing overlay fails the run

- GIVEN a manifest declaring a lower-third and an `index.html` from which that overlay was removed
- WHEN `produce` reaches the QA stage
- THEN it exits non-zero with an error naming the missing lower-third and its scene
- AND no `status:: produced` and no `master` write occur

#### Scenario: Failed QA keeps the master

- GIVEN a run whose QA check fails after render wrote the master
- WHEN the run ends
- THEN the rendered master file still exists on disk
- AND the episode state remains `approved`

#### Scenario: Scene without overlays is not penalised

- GIVEN a scene that declares no overlay
- WHEN the QA check runs
- THEN that scene contributes nothing to the comparison and does not fail the check

#### Scenario: Extra emitted elements are ignored

- GIVEN an `index.html` holding an element that is not in the manifest overlays
- WHEN the QA check runs
- THEN the check does not fail because of the extra element

### Requirement: Produce Passes The Cascaded Language To TTS

`produce` MUST pass each scene's resolved cascade `language` to the TTS stage. The TTS request MUST NOT use a hard-coded language default.

#### Scenario: English episode sends English

- GIVEN an episode resolving `language:: English`
- WHEN the `tts` stage builds its request
- THEN the request carries `language: English`

#### Scenario: No hard-coded fallback

- GIVEN a TTS request built without a resolved language
- WHEN the request is built
- THEN it fails with a named error naming `language` and does not default to `Spanish`

## REMOVED Requirements

None.
