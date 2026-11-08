# cognnitive-conntent-engine Delta Spec

## MODIFIED Requirements

### Requirement: Stable TTS cache key

The TTS cache key MUST depend only on the narration text and the resolved `voice`, `voice_model`, `voice_speed` (when declared), `voice_emotion` (when declared), `language` and model override, and MUST be unchanged by the public renames for an equal input. The internal TTS option keys MUST remain `model`, `voice`, `speed`, `emotion` and `modelOverride` (D5), plus `language`. Changing a presenter Layer's `avatar_model::` MUST NOT change the TTS cache key. Adding `language` to the key invalidates entries cached before this change; one re-synthesis per scene is accepted.
(Previously: the key did not include `language`, so two languages with equal text and voice shared one entry.)

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the presenter's `avatar_model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

#### Scenario: Same effective inputs keep the same cache key under the new names

- GIVEN a Scene whose narration resolves voice `v`, model `m`, speed `1.1`, emotion `calm` and language `Spanish`, expressed once with the retired names and once with `voice_model`, `voice_speed` and `voice_emotion`
- WHEN the TTS options and the hash are computed for each
- THEN the two hashes are equal

#### Scenario: Speed keeps its numeric form

- GIVEN a Preset with `voice_speed:: 1.1`
- WHEN the TTS options are built
- THEN `speed` is the number `1.1`, not the string `"1.1"`
- AND an undeclared or non-finite speed leaves `speed` absent

#### Scenario: Undeclared delivery values add nothing to the key

- GIVEN a Scene resolving no `voice_speed` and no `voice_emotion`
- WHEN the TTS options are built
- THEN the options contain no `speed` or `emotion` key

#### Scenario: Emotion keeps its trimmed form

- GIVEN a Preset with `voice_emotion:: " calm "`
- WHEN the TTS options are built
- THEN `emotion` is `calm`

#### Scenario: Language changes the key

- GIVEN two Scenes with identical narration, voice and voice model, one resolving `language:: Spanish` and one `language:: English`
- WHEN the TTS cache hashes are computed
- THEN the two hashes differ

#### Scenario: Same language keeps the key

- GIVEN two computations for the same Scene with `language:: English`
- WHEN the TTS cache hashes are computed
- THEN they are equal

## ADDED Requirements

### Requirement: TTS Request Carries The Resolved Language

The asset synthesizer MUST send the resolved cascade `language` in the TTS provider request. It MUST NOT substitute a hard-coded default language. When no language is supplied, it MUST fail with a named error rather than synthesize in an assumed language.

#### Scenario: Language reaches the provider request

- GIVEN a TTS synthesis for a Scene resolving `language:: English`
- WHEN the provider request is built
- THEN the request sends `language: English`

#### Scenario: Missing language fails

- GIVEN a TTS synthesis called with no `language`
- WHEN the request is built
- THEN it fails with an error naming `language` and no provider call is made

### Requirement: Overlay Emission Is Complete And Visible

The renderer MUST emit into `index.html` every overlay in the manifest `tracks.overlays`, including `watermark`, `cta` and the overlays lowered from scene text Layers. Each emitted overlay MUST be visible in rendered frames during its interval: it MUST have a computed style that is displayed, non-zero opacity at its visible time, and a stacking order that places it above scene content. The root cause of the invisible Chrome overlays MUST be fixed, not masked.

#### Scenario: Every manifest overlay is emitted

- GIVEN a manifest with N overlays across title, lower-third, caption, watermark and CTA
- WHEN the project is emitted
- THEN `index.html` holds N overlay hosts, one per manifest overlay

#### Scenario: Overlay is above scene content

- GIVEN an emitted watermark overlay and a full-frame scene host
- WHEN stacking order is evaluated
- THEN the overlay is stacked above the scene host

#### Scenario: Overlay shows at its time

- GIVEN a rendered video with a watermark overlay active between 0 s and 5 s
- WHEN a frame at 2 s is sampled
- THEN the watermark region differs from the same region of the frame rendered without the overlay

## REMOVED Requirements

None.
