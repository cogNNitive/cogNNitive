# Proposal: Video Composition Media Types

## Intent

The self-contained video skill compiles a real VUS script into a
`RemotionCompositionManifest`, but its composition renders only **image-or-color**
backgrounds. On real interview media the render fails with `EncodingError`
because a `layer_type: video` source (`….mp4`) is drawn with `<Img>`. Two more
media shapes the compiler already emits are also undrawable: `talking_avatar`
(a still avatar + narration) and any asset path **outside** the video folder
(`../shared/*.mp4`, `../shared/lucas.jpeg`). Goal: the composition renders every
media shape the compiler produces, so a real domaiNN renders end-to-end.

## Scope

### In Scope
- Map each layer to the correct Remotion primitive in `scene/Scene.tsx`:
  `image` → `<Img>`, `video` → `<OffthreadVideo>`, and a distinct framed
  treatment for `talking_avatar`. Keep "background image-or-color" as the
  default when no layer resolves.
- Resolve asset paths for **both** in-dir (`assets/…`) and out-of-dir
  (`../shared/…`) sources. `compileVideo` already stages synthesized assets next
  to the script; extend that staging to copy every referenced media asset into a
  Remotion-served `public/` root and rewrite the manifest so `Scene.tsx` consumes
  an already-resolved, bundle-relative name via `staticFile()`.
- Pass the staged `publicDir` to Remotion's `bundle()` in `tryRemotionRender`,
  read from the manifest so a `render manifest.json` run (no in-process compile)
  also resolves media.
- Extend the existing plain-`node` test suite with a layer→primitive mapping
  test and an out-of-dir path-resolution test through an injected seam (no
  Remotion required).

### Out of Scope
- Composition choreography (springs, transitions, kinetic animation) — stays
  minimal.
- Asset synthesis (TTS/media providers) — untouched. WaveSpeed/Replicate
  (`depends_on`) unchanged.
- The vendored parser mirror, `ensure-engine`, and the `RemotionCompositionManifest`
  shape / stable `script-composition` id.

## Capabilities

### Modified Capabilities
- `cognnitive-video-engine`: the Remotion composition MUST render all media layer
  types the compiler emits (`image`, `video`, `talking_avatar`) with the correct
  Remotion primitive, and MUST resolve both in-dir and out-of-dir asset sources
  by staging them into a Remotion-served public directory. A genuinely missing
  asset MUST still fail loudly through `VideoRenderError`.

## Approach

Teach `compileVideo` a **staging + rewrite** step: resolve every layer/audio
source relative to the script directory, copy it into a deterministic public
root (`<scriptDir>/public/`), and rewrite the manifest's `layer_asset_source` /
audio `assetPath` to a POSIX name relative to that root, recording the root in
`manifest.metadata.publicDir`. `Scene.tsx` then calls `staticFile(name)` and
dispatches on `layer_type`; `tryRemotionRender` passes `publicDir` to
`bundle({ entryPoint, publicDir })`. Missing/unreadable assets are collected
during staging and surface as a loud `VideoRenderError`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-video-script/scripts/video-engine-cli.mjs` | Modified | Stage+rewrite assets into `publicDir`; pass it to `bundle()`; loud error on missing asset |
| `skills/nn-video-script/scripts/scene/Scene.tsx` | Modified | Layer→primitive dispatch (`Img`/`OffthreadVideo`/avatar frame)+ `staticFile()` |
| `skills/nn-video-script/scripts/scene/AvatarFrame.tsx` | New | Distinct `talking_avatar` visual treatment |
| `skills/nn-video-script/test/scene-media-types.test.mjs` | New | Layer→primitive mapping + out-of-dir resolution tests |
| `openspec/specs/cognnitive-video-engine/spec.md` | Modified | Delta requirements for media rendering + asset resolution |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Remotion `publicDir` served under a hashed path breaks on cached bundles | Low | `staticFile()` is the official resolver; use it, never hand-build URLs |
| Staging duplicates large media per compile | Med | Stage by content-hash name; skip copy when the destination already matches |
| A `render manifest.json` run lacks `publicDir` | Med | Persist the root in `manifest.metadata.publicDir` and read it in the renderer |
| Out-of-dir path escapes to an unintended location | Low | Resolve against the script dir only; no machine-absolute paths in the manifest |

## Rollback Plan

Revert the change-folder commits. `Scene.tsx` returns to image-or-color only,
`compileVideo` drops the staging+rewrite step, and `tryRemotionRender` stops
passing `publicDir`. No persisted external state changes; staged `public/` dirs
are local build artifacts.

## Dependencies

- Remotion `@remotion/bundler` `bundle({ entryPoint, publicDir })` and
  `staticFile()` (installed via `ensure-engine`).
- Successor is stacked on `2026-10-03-self-contained-video-skill-deps`
  (branch `session/video-dep-bundle`).

## Success Criteria

- [ ] `render "…/iNNtrevistas/videos/automovil/script.md"` produces an MP4 with
      no `EncodingError`; every one of the 16 scenes produces frames; narration
      audio is bound.
- [ ] Layer dispatch: `image` → `<Img>`, `video` → `<OffthreadVideo>`,
      `talking_avatar` → distinct framed treatment.
- [ ] In-dir (`assets/…`) and out-of-dir (`../shared/…`) sources both resolve
      through the staged public dir.
- [ ] A genuinely missing asset still fails loudly via `VideoRenderError`
      (non-zero), never a mock unless `--allow-mock`.
- [ ] `node scripts/verify.js` stays green; `ScriptRoot.tsx` `COMPOSITION_ID`
      and the manifest shape are unchanged.
