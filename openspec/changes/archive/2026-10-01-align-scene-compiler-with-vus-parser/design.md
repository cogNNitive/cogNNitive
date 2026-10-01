# Design: Align the Scene Compiler with the Vendored VUS Parser

## Context

`self-hosted-video-engine` (archived) gave the ecosystem a vendored, in-repo VUS
parser with no external dependency. Two consumers exist in
`skills/nn-video-script/scripts/`:

| Consumer | Current parser | Correct? |
|---|---|---|
| `vus-parse.mjs` / `vus-spec.mjs` | `@cognnitive/innfo-video-parser` (vendored) | Yes |
| `remotion-scene-compiler.mjs` | its own `parseScript()` line-scanner | **No** |

`remotion-scene-compiler.mjs` is the render-manifest compiler consumed by
`video-engine-cli.mjs compile/render`. Its private parser understands only a
subset (`## ` section headings, `- k: v`, `@@`) and mis-parses the canonical
`@Template Scene Title` scene header, collapsing an N-scene script into one
scene. This change makes the compiler consume the parser it should have used.

## Architecture Seam

The boundary is: **parse in the parser package, lower-to-manifest in the skill.**

```
script.md
   │  parse(text, title?)            ← @cognnitive/innfo-video-parser (unchanged)
   ▼
Project { sections[].scenes[] }      ← single source of structural truth
   │  __lowerProjectToManifest()      ← NEW adapter in remotion-scene-compiler.mjs
   ▼
RemotionCompositionManifest          ← shape unchanged (render/preview stable)
```

`RemotionSceneCompiler` keeps its public surface (`parseScript`, `compile`,
overlay builders). `parseScript()` becomes an adapter:

- **Old**: returns a `{ title, fps, width, height, scenes[] }` shape built by
  scanning lines; only `## ` lines start a scene.
- **New**: calls `parse()` and lowers `Project` into the *same* internal shape,
  so downstream `compile()` and overlay logic are untouched.

This is the smallest change that removes the duplicated grammar. It also satisfies
the `video-script-skill` "Internal Parser Resolution" requirement by construction:
the parser is imported from the monorepo, never reimplemented.

## Data Flow (VUS → Manifest)

1. `Project.sections[].scenes[]` → ordered `RemotionSceneTrack[]`.
   - `scene.name` → track name; `sceneId` derived deterministically (`scene_<i>_<slug>`).
   - resolved scene properties (sets + template chain + per-model overrides) →
     `track.props`, consumed by overlay builders exactly as today.
2. `scene.layers[]` (`@@`) → per-track layer list; Markdown media syntax already
   lowers to the layer asset source in the parser, so no re-scanning of
   `![...](...)` in the compiler.
3. `scene.narration` → TTS synthesis input; one call per narrated scene.
4. Overlays (`lowerThird`, `kineticTitle`, `conceptCallout`) keep reading
   `layer_text_content` (already required by the engine spec — no change).

## TTS Parameter Resolution

Today `compileVideo()` passes `{ voice: sc.properties?.scene_voice || 'default' }`.
That drops every per-model override the script declares. New behavior:

- Read the resolved scene properties produced by the parser:
  `scene_tts_model` plus `<model>/voice_id`, `<model>/speed`, `<model>/emotion`,
  `<model>/pitch`, `<model>/intensity`.
- Pass them through `AssetSynthesizer.synthesizeTTS(text, voiceOptions)`.
- Any literal voice/model/catalog value MUST be resolved from the vendored spec
  at run time (no-prose-copy), not hardcoded.

## Error Handling

The compiler MUST distinguish "parser warnings" (benign, e.g. a video-only scene
with no narration) from "parser errors" (blocking). On blocking issues it throws
a named error and exits non-zero **before** any synthesis or manifest write, so a
malformed script can never spend API credits or emit a wrong manifest.

## Files Affected

- `skills/nn-video-script/scripts/remotion-scene-compiler.mjs` — `parseScript()`
  becomes a `Project`→internal-shape adapter; `compile()` unchanged.
- `skills/nn-video-script/scripts/video-engine-cli.mjs` — TTS options sourced
  from resolved scene properties; loud failure on blocking issues.
- `skills/nn-video-script/scripts/*.test.mjs` (+ fixture VUS script) — new
  contract/parity tests.
- Installation copy under `~/.config/opencode/skills/nn-video-script/` — re-synced.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Manifest shape drift breaks `render`/`preview` | Keep the internal parsed shape and manifest identical; guard with existing render tests |
| Parser `Project` shape differs from assumptions | Parity test (compiler scenes == parser scenes) is the contract |
| TTS provider spend during tests | Tests use cache/local providers; no live synthesis in CI |
| Concurrent repo work on `dev` | Single cohesive diff; explicit-path staging per `nn-dev-development` |
