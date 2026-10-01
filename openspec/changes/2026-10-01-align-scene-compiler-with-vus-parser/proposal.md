# Proposal: Align the Scene Compiler with the Vendored VUS Parser

## Why

The `self-hosted-video-engine` change (archived) vendored the VUS parser
(`@cognnitive/innfo-video-parser`) and repointed `vus-parse.mjs` / `vus-spec.mjs`
to it, so a script can now be validated against the real grammar with no
external repository. That work stopped at the **parser**. The **render-manifest
compiler** kept its own hand-rolled parser and drifted from the grammar:

- `skills/nn-video-script/scripts/remotion-scene-compiler.mjs` `parseScript()`
  splits scenes on `## ` headings only. A valid VUS script whose scenes are
  declared with `@Template Scene Title` (the canonical form) collapses into a
  single bogus scene named after its section header, with all narration merged
  and no scene boundaries.
- Because `compileVideo()` then iterates that bogus scene list, it synthesizes
  the **wrong** number of TTS calls and emits a manifest with one giant scene
  instead of the N real ones. The failure is silent: no parse error, just a
  structurally wrong manifest (and, with a TTS provider configured, real spend).
- The vendored parser already returns a correct `Project` for the same input.
  The compiler duplicates parsing logic instead of consuming it, so the two
  disagree — the exact anti-pattern `cognnitive-video-engine`
  (Requirement: Programmatic Remotion Scene Compilation) is meant to prevent.

Observed on a real Series script (Cosicah): the vendored parser reports 6 scenes
with 2 benign warnings (two video-only scenes without narration), while
`remotion-scene-compiler.mjs` reports 1 scene named `Scenes`.

## What Changes

- **Single source of parsing truth**: `remotion-scene-compiler.mjs` MUST stop
  parsing VUS text itself. It MUST consume the `Project` produced by
  `@cognnitive/innfo-video-parser`'s `parse()` and lower that AST into the
  Remotion Composition Manifest.
- **Faithful scene mapping**: one VUS scene MUST map to exactly one
  `RemotionSceneTrack`, preserving scene order, names, layers, and the
  template-derived properties the parser resolved (property sets, template
  chains, per-model TTS overrides).
- **TTS parameter fidelity**: `compileVideo()` MUST source TTS voice parameters
  from the parsed scene's resolved properties (e.g. `scene_tts_model` and its
  `<model>/voice_id`, `speed`, `emotion`, `pitch`, `intensity` overrides) rather
  than a single generic `scene_voice`. Voice/model values MUST come from the
  vendored spec, never from prose.
- **Shared module boundary**: parsing lives in the parser package; compilation
  lives in the skill. The skill MUST import the parser rather than reimplement a
  grammar subset, and MUST fail loudly (non-zero, named error) when the parser
  reports blocking issues.

## Deliverables & Phases

1. **Phase 1 — RED: compiler contract tests**: add failing tests that feed a
   multi-scene VUS script (with `@scene`/`@@layer` and a `# Sets` block) through
   `RemotionSceneCompiler` and assert scene count, ordering, and per-scene layer
   mapping against the vendored parser's `Project`.
2. **Phase 2 — GREEN: consume the parser**: replace `parseScript()`'s text
   scanning with an adapter over `parse()`'s `Project`; keep the manifest output
   shape stable so `render`/`preview` are unaffected.
3. **Phase 3 — GREEN: TTS/layer fidelity**: bind resolved scene/layer properties
   (including per-model TTS overrides) into the manifest and the synthesis
   options; assert narration-per-scene matches the parser.
4. **Phase 4 — Repoint + verify**: switch the compiler's import to the in-repo
   parser; run the skill gates (`check-script`, `vus-parse`) plus `lint`,
   `typecheck`, and the video-parser test suite; re-sync the installed skill copy.
