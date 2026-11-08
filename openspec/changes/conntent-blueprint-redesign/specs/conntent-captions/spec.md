# conntent-captions Delta Spec

Slice 3, PR 3b. The field definitions (`captions`, `caption_model`) are registered by Slice 2 in `conntent-field-registry`; this capability specifies their behaviour, the alignment and the failure rules. Burned-in captions only; no subtitle sidecar files.

## ADDED Requirements

### Requirement: Captions are a per-scene render-class mode

`captions` MUST resolve per scene through the cascade to one of `off`, `words` or `lines`, and `caption_model` MUST resolve per scene to a whisper model name or be unset. With `off` for every scene the engine MUST NOT invoke `hyperframes transcribe`, MUST NOT require whisper.cpp, and MUST emit no captions host. With `words` the captions MUST show the narration one word at a time at its aligned time. With `lines` the captions MUST show the narration as consecutive text lines, each visible from the aligned start of its first word to the aligned end of its last. Captions MUST be styled by the resolved frame's caption skin. A scene resolving `off` inside an episode whose other scenes resolve `words` MUST show no captions for its duration.

#### Scenario: Off needs no whisper

- GIVEN every scene resolves `captions: off` and whisper.cpp is not installed
- WHEN `produce` runs
- THEN no transcribe call is made, no captions host is emitted and the run does not fail on whisper

#### Scenario: Words mode

- GIVEN a scene resolving `captions: words` with aligned timings
- WHEN the project is emitted
- THEN the root captions host holds one word entry per script word with its aligned start and end

#### Scenario: Lines mode

- GIVEN a scene resolving `captions: lines`
- WHEN the project is emitted
- THEN the captions host holds lines whose start is the aligned start of their first word and whose end is the aligned end of their last word

#### Scenario: Mixed episode

- GIVEN scene 1 `words` and scene 2 `off`
- WHEN the project is emitted
- THEN the captions host holds entries only within scene 1's interval

### Requirement: The model is derived from the language and the default model is never used

The engine MUST choose the whisper invocation from the scene's resolved language code: for `en` it MUST use the model `small.en`; for any other language it MUST use the model `small` with `--language <code>`. When `caption_model` is set it MUST replace the model name only, and the `--language <code>` argument MUST still be passed for a non-English language. The engine MUST NOT invoke `hyperframes transcribe` without an explicit model, because the default model translates non-English speech. An English-only model name (ending `.en`) with a non-English language MUST fail validation before spend with `caption-model-language-mismatch` (the code of `conntent-model` "Shared Field Definitions"). For a language written without spaces between words (for example `zh`, `ja`), `captions: words` MUST fail validation before spend with `captions-words-unsupported` naming the language, because whisper returns such a script as one word (design G9, R3); `lines` and `off` remain valid. Whether this should instead fall back to `lines` is an open product question listed in the proposal; the hard error is the recommended default.

#### Scenario: English

- GIVEN a scene with `language: en`
- WHEN alignment runs
- THEN the transcribe call uses the model `small.en` and no `--language` argument is required

#### Scenario: Spanish

- GIVEN a scene with `language: es`
- WHEN alignment runs
- THEN the transcribe call uses the model `small` with `--language es`

#### Scenario: Never the default

- GIVEN any language
- WHEN the transcribe command line is built
- THEN it always names a model explicitly

#### Scenario: Override keeps the language

- GIVEN `caption_model: medium` and `language: es`
- WHEN the command is built
- THEN it uses the model `medium` with `--language es`

#### Scenario: English-only model on Spanish

- GIVEN `caption_model: small.en` and `language: es`
- WHEN the episode is validated
- THEN validation fails before spend with `caption-model-language-mismatch` naming the model and the language

#### Scenario: Word captions for an unspaced language

- GIVEN `language: ja` and `captions: words`
- WHEN the episode is validated
- THEN validation fails before spend with `captions-words-unsupported` naming `ja`
- AND the same episode with `captions: lines` validates

### Requirement: The displayed text is the script and whisper supplies only timings

The caption text MUST be the scene's narration as authored. The words returned by whisper MUST be used only for their start and end times. Each script word MUST be matched in order to a whisper word after normalisation: Unicode decomposed, combining marks removed (accents), lowercased, punctuation and symbols removed, whitespace collapsed. A script word with no match MUST receive times interpolated linearly between the nearest matched neighbours (or the scene boundaries); a whisper word with no script counterpart MUST be dropped.

#### Scenario: Script text wins

- GIVEN narration "Hola, mundo" and whisper words "hola" and "mundo" with times
- WHEN captions are built
- THEN the displayed words are "Hola," and "mundo" with whisper's times

#### Scenario: Accents and case normalised

- GIVEN narration "Canción" and whisper word "cancion"
- WHEN the words are matched
- THEN they match

#### Scenario: Extra whisper word dropped

- GIVEN whisper returns a word not present in the narration
- WHEN captions are built
- THEN that word is not displayed

#### Scenario: Unmatched script word interpolated

- GIVEN narration with a word whisper missed between two matched words
- WHEN captions are built
- THEN the word appears with times between its neighbours' times and the match ratio counts it as unmatched

### Requirement: Fewer than 90 percent matched words stops the run

The match ratio of a scene MUST be matched script words divided by script words. The threshold MUST be a named constant equal to 0.90. A ratio below the threshold, a transcribe failure, a result without word-level times, or a nonzero exit of the transcribe command MUST stop the run before the animatic and before render with the named error `caption-alignment-failed` naming the scene, the ratio (when known) and the cause, exit status 1. There MUST be no estimated-timing fallback. A scene with no narration words MUST NOT be aligned and MUST NOT fail.

#### Scenario: 90 percent passes

- GIVEN a ten-word narration with nine matched words
- WHEN alignment is evaluated
- THEN it passes

#### Scenario: 80 percent fails

- GIVEN a ten-word narration with eight matched words
- WHEN alignment is evaluated
- THEN the run stops with `caption-alignment-failed` naming the scene and 0.80
- AND no animatic and no render file is produced

#### Scenario: No word-level times

- GIVEN a transcribe result that has text but no per-word times
- WHEN alignment is evaluated
- THEN the run stops with `caption-alignment-failed`

#### Scenario: No estimated fallback

- GIVEN a failed alignment
- WHEN the project is searched for caption timings
- THEN none were estimated or written

#### Scenario: Silent scene

- GIVEN a scene without narration
- WHEN alignment runs
- THEN the scene is skipped without error

### Requirement: Alignment is cached

The alignment cache key MUST be the sha256 of the concatenation of `sha256(audio bytes)`, the narration text and the model version (the model name and the whisper tool version, with the language code for a non-English language). The cached value MUST be the aligned timings. A hit MUST NOT invoke transcribe. The key MUST contain no path, folder name or output name. The cache MUST live beside the TTS and image caches.

#### Scenario: Hit skips transcribe

- GIVEN a prior alignment of the same audio, text and model
- WHEN alignment runs again
- THEN no transcribe call is made

#### Scenario: Text change misses

- GIVEN the same audio and a different narration text
- WHEN the key is computed
- THEN it differs

#### Scenario: Model change misses

- GIVEN the same audio and text with another model
- WHEN the key is computed
- THEN it differs

#### Scenario: Layout independence

- GIVEN an episode moved to another folder
- WHEN the key is recomputed
- THEN it is equal

### Requirement: Whisper is checked before spend

When any scene resolves `captions` other than `off`, the engine MUST check whisper.cpp availability during validation, before the first provider call, and MUST fail with `whisper-missing` (exit 1) naming the consent-gated install command when it is absent. `produce` MUST NOT install anything. The install offer, its notice and its idempotence are owned by `conntent-skill-dependency-bundling` "Whisper.cpp install is consent-gated and reported by `--check`"; the moment the offer is raised at domaiNN setup is owned by `conntent-procedures` "Set up the Domain". `captions: off` MUST remain valid everywhere so that production is never blocked by whisper.

#### Scenario: Missing whisper, captions on

- GIVEN `captions: words` and no whisper.cpp
- WHEN `produce` runs
- THEN it fails with `whisper-missing` before any provider call, names the install command and installs nothing

#### Scenario: Off proceeds

- GIVEN no whisper.cpp and `captions: off`
- WHEN `produce` runs
- THEN the run is not blocked

### Requirement: Caption stage position

The alignment stage MUST run after the scene's TTS audio exists and before the animatic, per scene. Alignment for several scenes MAY run concurrently. The alignment stage MUST spend no money and MUST append a timing row.

#### Scenario: Order

- GIVEN a run with captions on
- WHEN the timing log is read
- THEN the `captions` stage starts after `tts` finishes for the same scene and before `animatic`

#### Scenario: No cost

- GIVEN a run with captions on
- WHEN the ledger rows of the stage are read
- THEN none has a positive `actual_usd`
