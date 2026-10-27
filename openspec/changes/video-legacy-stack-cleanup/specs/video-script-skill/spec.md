# Delta for video-script-skill

Scope: Remotion residue, dead manifest fields and dead tools leave the skill; the CLI keeps
`compile` and `render`; one thumbnail tool remains. MODIFIED blocks are copied from the living
spec as left by `video-series-extension-points` (which lands first).

## ADDED Requirements

### Requirement: No Legacy Renderer Residue

The skill MUST NOT contain the word "remotion" (case-insensitive) in any file except the one test
that enforces this rule. The scene compiler MUST be `scripts/scene-compiler.mjs` exporting
`SceneCompiler`. Manifest scene tracks MUST NOT carry `sceneType`; the `type::` binding table MUST
NOT carry React renderer names; an overlay `config` MUST carry only keys the project emitter reads.

#### Scenario: Skill tree is free of Remotion text

- GIVEN the skill directory
- WHEN every file except the guard test is searched for `remotion` ignoring case
- THEN no match is found

#### Scenario: Manifest carries no dead fields

- GIVEN a script with a title overlay and a caption overlay
- WHEN it is compiled
- THEN no scene track has `sceneType`
- AND every overlay `config` key is read by the project emitter

### Requirement: Scene Transitions Emit A GSAP Ease

A scene transition MUST be emitted with a GSAP ease name. The compiler MUST NOT write a CSS
`bezier(...)` string into the manifest; the emitter's default ease (`power2.out`) applies.

#### Scenario: Declared transition uses a valid ease

- GIVEN a Scene with `transition:: fade`
- WHEN it is compiled and its project emitted
- THEN the scene tween carries `ease: 'power2.out'`
- AND no emitted file contains `bezier(`

### Requirement: Provider Clips Are Cached As Delivered

The skill MUST cache provider video clips as delivered, with no `+faststart` remux and no `.needs-faststart` marker. Final deliverables MAY still be remuxed by `render-formats.mjs`.

(Note for the applier: S3 spike PASS only. On FAIL, delete this requirement from the delta before archive.)

#### Scenario: Avatar clip is not remuxed

- GIVEN a synthesized avatar clip
- WHEN it is cached and later compiled
- THEN no ffmpeg remux runs and no `.needs-faststart` file exists

## MODIFIED Requirements

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the
HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning
step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine. The engine CLI MUST
expose only `compile` and `render`; preview is `hyperframes preview` and a vertical master is a
native `--format 9:16` render. The skill MUST NOT ship `render-vertical.mjs` or `assemble-video.mjs`.
(Previously: the CLI also exposed a `preview` command that started nothing, and the skill shipped
an ffmpeg vertical reframe and a clip-concat tool.)

#### Scenario: Render uses HyperFrames

- GIVEN a compiled script and its manifest
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

#### Scenario: Removed command is refused

- GIVEN the engine CLI
- WHEN it is run with `preview`
- THEN it exits non-zero printing a usage that lists only `compile` and `render`

#### Scenario: Removed tools are gone

- GIVEN the skill's `scripts/` and SKILL.md
- WHEN they are inspected
- THEN neither `render-vertical.mjs` nor `assemble-video.mjs` exists or is referenced

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (draft JSON → a
self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter) and
`build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document). Thumbnails
MUST be produced by the single `render-thumbnail.mjs` tool. The draft JSON schema MUST be named
neutrally (`video-script.draft.v1`). The tools MUST read series values through the parameter
cascade (series, then domain Video Defaults, then package Video Defaults), found by walking from
the input file's folder (or `--series <dir>`). There MUST be no `video.series.json`, `--config`
flag or built-in series config. The generated script's frontmatter MUST be copied from the series
document and its filename MUST use the Series slug. The tools MUST NOT write cascaded scene values
that the engine resolves itself, and MUST NOT hardcode any series' template names, scene slugs,
music, filename pattern or model.
(Previously: `thumbnail-v1.mjs` shipped as a second thumbnail compositor.)

#### Scenario: Tools run against any series

- GIVEN a series folder whose `series_NN.md` declares `title:: Other Series`
- WHEN `build-script-from-draft.mjs` runs on a reviewed draft in that series
- THEN the filename uses the Series slug and the script frontmatter matches the series document

#### Scenario: No series is hardcoded

- GIVEN the tools
- WHEN they are inspected
- THEN no series' name, template, scene slug, music path or filename pattern appears in prose or code

#### Scenario: Generated script validates

- GIVEN a reviewed draft JSON in a series folder
- WHEN `build-script-from-draft.mjs` runs
- THEN it emits an L3 document that validates against the `video-script` blueprint with no schema errors

#### Scenario: Review HTML is self-contained

- GIVEN a draft JSON referencing thumbnails
- WHEN `build-draft-html.mjs` runs
- THEN the HTML embeds the thumbnails (base64), opens from `file://`, shows the Series `title`, and exports `<slug>_reviewed.json`

#### Scenario: One thumbnail tool

- GIVEN the skill's `scripts/`
- WHEN it is listed
- THEN `render-thumbnail.mjs` exists and `thumbnail-v1.mjs` does not

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by
installing the `video-script` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Any change under `video-script/skills/**` or `video-script/defaults/**`
MUST bump the `video-script` `blueprint_version` and the skill `version`, and every registry that
records these versions MUST be updated in the same change.
(Previously: pinned literal versions `V_0-6-0` / `V_0-4-0`, which went stale with each change.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` and the package's `defaults/video-defaults_NN.md` exist and the skill's scripts find it

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

#### Scenario: Versions are registered consistently

- GIVEN the bumped skill and blueprint versions
- WHEN `node scripts/verify.js` runs
- THEN it passes with no version-registration mismatch
