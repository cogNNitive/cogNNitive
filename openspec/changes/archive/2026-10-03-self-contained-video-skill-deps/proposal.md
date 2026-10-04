# Proposal: Self-Contained Video Skill Dependencies

## Intent

`nn-video-script` only renders inside a full monorepo checkout. On an end-user's installed copy the parser import, the VUS runner's hardcoded `../../../iNNfo/...` path, missing Remotion, and a non-existent `remotion-entry.tsx` all break the pipeline — it silently falls back to FFmpeg-from-PATH or a 40-byte mock MP4. Goal: real, agent-driven video start-to-finish in a user's local workspace, **Remotion as the ONLY renderer**.

## Scope

### In Scope
- Committed **ESM** mirror `skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs`, built by `scripts/build-video-parser-mirror.mjs` (esbuild `bundle:true` embeds `zod` → self-contained; no npm install for the parser), cloned from `build-trannsform-core-mirror.mjs`; `--check` drift mode wired into `scripts/verify.js`.
- Point `remotion-scene-compiler.mjs` / `vus-parse-runner.mjs` at the mirror by relative path; drop the `@cognnitive/...` import, the `../../../iNNfo/...` hardcode, and the `tsx` loader (`vus-parse.mjs` drops `--import tsx/esm`).
- Author `remotion-entry.tsx` (index `registerRoot` + `Root.tsx` `<Composition>`) + scene/overlay components (background image-or-color, narration audio from `tracks.audio`, scene title, overlay text).
- `scripts/ensure-engine.mjs`: idempotent, consent-gated install of Remotion deps; two-stage weight notice (approx total size, then headless-browser download on first render); checks provider keys/optional MCP.
- `video-engine-cli.mjs`: `selectComposition({serveUrl,id,inputProps})` + `renderMedia(...)` per official API; DELETE the FFmpeg fallback and silent mock (Remotion failure = loud non-zero named error); mock only behind explicit `--allow-mock`. Replace `probeAudioDuration` PATH probing with `@remotion/media-parser` `parseMedia({fields:{durationInSeconds:true}})`.
- Keep direct `fetch` asset path (WaveSpeed/Replicate/TTS); delete dead Windows SAPI fallback; DECLARE provider deps in `SKILL.md` frontmatter `depends_on`; pin engine/parser version+sha256 locally in the skill. `manifest/source.yaml` untouched.

### Out of Scope
- `manifest/source.yaml` changes; parser npm publication; junction resolution.
- Composition choreography (springs/transitions) beyond simple overlays.
- **Successor change** `2026-10-XX-video-assets-via-agent-mcp`: asset synthesis delegated to the agent's MCP, synthesizer rewritten (option A). Planned follow-up, not implemented here.

## Capabilities

### New Capabilities
- `video-skill-dependency-bundling`: skill vendors its parser as a committed self-contained ESM mirror and installs its renderer runtime on demand with consent.

### Modified Capabilities
- `video-script-skill`: Internal Parser Resolution MUST use the vendored ESM mirror by relative path — no npm package, no external-checkout path, no `tsx`; provider dependency declared in frontmatter and the OS-native TTS fallback removed.
- `cognnitive-video-engine`: Programmatic Remotion Scene Compilation + Headless Video Rendering MUST render via the Remotion entry point only; FFmpeg-from-PATH is removed, mock MP4 MUST NOT masquerade as a render (explicit `--allow-mock` only).

## Approach

Clone the proven trannsform-core-mirror: esbuild bundles the parser source into a committed ESM artifact inside the skill, drift-checked in `verify.js`. Rewrite the two hangers-on to import it relatively. Author a minimal-but-structurally-complete Remotion entry/composition. `ensure-engine` installs Remotion behind consent; `video-engine-cli` renders Remotion-only, hard-failing otherwise.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs` | New | Committed self-contained ESM mirror |
| `scripts/build-video-parser-mirror.mjs` | New | esbuild bundler + `--check` drift mode |
| `scripts/verify.js` | Modified | Wire mirror drift step |
| `skills/nn-video-script/scripts/vus-parse-runner.mjs` | Modified | Mirror import; drop path + `tsx` |
| `skills/nn-video-script/scripts/remotion-scene-compiler.mjs` | Modified | Mirror import; drop package import |
| `skills/nn-video-script/scripts/vus-parse.mjs` | Modified | Drop `--import tsx/esm` |
| `skills/nn-video-script/scripts/remotion-entry.tsx` + `ScriptRoot.tsx` + scene components | New | Remotion entry + composition |
| `skills/nn-video-script/scripts/ensure-engine.mjs` | New | Consent-gated install + provider check |
| `skills/nn-video-script/scripts/video-engine-cli.mjs` | Modified | Remotion-only; FFmpeg/mock removed; media-parser duration |
| `skills/nn-video-script/scripts/asset-synthesizer.mjs` | Modified | Drop SAPI; remove ffprobe probe |
| `skills/nn-video-script/SKILL.md` | Modified | `depends_on`, ensure-engine step, weight notice |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mirror drift vs parser source | Med | `--check` in `verify.js` fails on drift |
| Remotion headless download on first render | High | Two-stage weight notice; documented |
| esbuild misses a dynamic import | Low | Integration test compiles a real script via mirror |
| Removed FFmpeg/mock breaks CI tests | Med | Explicit `--allow-mock` for CI |

## Rollback Plan

Revert the change-folder commits. The mirror file and its `verify.js` step vanish; `vus-parse-runner.mjs`/`remotion-scene-compiler.mjs` restore the prior monorepo-relative imports (parser + `tsx`), and `video-engine-cli.mjs` regains the FFmpeg/mock fallback. Regenerate the mirror (`node scripts/build-video-parser-mirror.mjs`) if a partial revert leaves it stale. `manifest/source.yaml` was never touched.

## Dependencies

- esbuild (already used by `build-trannsform-core-mirror.mjs`).
- Remotion packages + React runtime from npm (installed via `ensure-engine`, not committed).
- `@remotion/media-parser` for audio duration (bundled by Remotion, no FFmpeg).
- Provider keys (WaveSpeed/Replicate/TTS) or the optional local `wavespeed` MCP, user-supplied.
- Successor `2026-10-XX-video-assets-via-agent-mcp` (deferred).

## Success Criteria

- [ ] Installed skill copy compiles a script via the committed mirror with no monorepo path, no package import, no `tsx`.
- [ ] `render` produces a real MP4 through Remotion with no FFmpeg in PATH.
- [ ] No mock MP4 is emitted unless `--allow-mock` is passed.
- [ ] `node scripts/verify.js` fails on a drifted mirror and passes when in sync.
- [ ] CLI surface and `RemotionCompositionManifest` shape unchanged; existing tests pass.
