# Video Script Skill Specification

## Purpose

Defines the cogNNitive-owned skill that authors native iNNfo Level-3 video-script documents inside an iNNfo workspace. The skill is embedded in the `video-script` blueprint package; script validity is enforced by the `video-script` blueprint, with no external repository dependency.
## Requirements
### Requirement: Authors iNNfo L3 Script Documents

The skill MUST author video scripts as iNNfo Level-3 kNNowledge documents that adopt the `video-script` blueprint. The skill MUST NOT author VUS scripts and MUST NOT ship, vendor, or invoke a VUS parser.

#### Scenario: Skill authors an L3 document

- GIVEN a workspace with a registered Video Element and its owning Series
- WHEN the skill authors a script for that Video
- THEN it writes an iNNfo L3 document adopting the `video-script` blueprint
- AND the document validates against the blueprint

#### Scenario: No VUS parser artifact present

- GIVEN the skill directory
- WHEN its files are inspected
- THEN no vendored VUS parser artifact is present
- AND no VUS parse code path is referenced

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned video-script skill embedded in the `video-script` bluepriNNt package at `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` that authors iNNfo Level-3 video-script documents and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. (Previously: it authored VUS scripts using a vendored parser and VUS specification, embedded in the `video` bluepriNNt package.)

#### Scenario: Skill authors a document with no external repository

- GIVEN a workspace with a registered Video Element and its owning Series, and no external video repository present
- WHEN the skill authors a document for that Video
- THEN the document is written to the Video's own folder
- AND no external-repository path is referenced

#### Scenario: No external reference remains

- GIVEN the skill directory
- WHEN its files are inspected
- THEN they reference no repository outside cogNNitive

#### Scenario: Installed copy authors with no monorepo checkout

- GIVEN the skill installed at `~/.agents/skills/nn-video-script/` with no monorepo present
- WHEN the skill authors a valid L3 script document
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: No-Prose-Copy of Syntax Facts

The skill's own documentation and prompts MUST NOT restate blueprint Field names, allowed `type::` values, or other schema facts as literal prose. Every such fact MUST be resolved by reading the blueprint at run time. (Previously: the prose restricted VUS voice IDs and property names sourced from the pinned VUS spec.)

#### Scenario: Allowed layer type resolved from the blueprint

- GIVEN a document that needs a valid Layer `type::`
- WHEN the skill selects a value
- THEN it reads the allowed values from the `video-script` blueprint, never from a hardcoded list in its own prose

#### Scenario: Restated schema fact rejected in review

- GIVEN a skill document containing a literal Layer `type::` list not sourced from the blueprint
- WHEN skill content is reviewed against this requirement
- THEN it is flagged as a no-prose-copy violation

### Requirement: Declared Asset Provider Dependency

The skill MUST declare its external asset-provider dependency (TTS/media via WaveSpeed or
Replicate) **and its renderer dependency (HyperFrames)** in its own frontmatter `depends_on`, so
the setup step can check it. Direct provider fetch through environment-variable credentials SHALL
remain the supported path. The skill MUST NOT retain the local OS-native TTS fallback (Windows
SAPI). Engine setup MUST verify provider credentials, renderer availability and optional
agent-MCP presence with user consent before proceeding. The skill MUST NOT declare or install a
Remotion engine.
(Previously: declared only the asset provider; the frontmatter pinned `engine: @remotion/renderer`.)

#### Scenario: Provider and renderer dependencies are declared

- GIVEN the skill's frontmatter
- WHEN it is inspected
- THEN it declares its asset-provider dependency under `depends_on`
- AND it declares the HyperFrames renderer dependency with a pinned version

#### Scenario: No Remotion engine is declared

- GIVEN the skill's frontmatter and setup script
- WHEN they are inspected
- THEN no `@remotion/*` engine or installer is declared or referenced

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

### Requirement: Embedded Skill Tests Run In Verify

Test suites that live inside the embedded skill MUST be discovered and executed by `node scripts/verify.js`, without double-running suites already collected from `iNNfo/packages`. Moving the suites MUST NOT reduce the number of executed suites.

#### Scenario: Moved suites still run

- GIVEN the skill's suites under `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/test/`
- WHEN `node scripts/verify.js` collects suites
- THEN each remaining suite is in the executed set

### Requirement: Compiler Resolves Layers via Explicit Parentage

The video script compiler MUST bind `Layer` elements to their parent `Scene` using explicit `parentSlug` values before falling back to slug prefix matching. Flat legacy scripts lacking `parentSlug` MUST continue resolving via slug prefix fallback.

#### Scenario: Nested layers bind by parent slug

- GIVEN a script with nested Layer elements specifying `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its parent Scene via `parentSlug`

#### Scenario: Flat legacy layers fall back to slug prefix

- GIVEN a legacy script lacking `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its Scene via slug prefix

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

### Requirement: Cost Estimator Invoked Through Any Path

The cost estimator MUST run `main()` when invoked through a symlinked or junction path (its entry
guard MUST compare real paths), so an agent invoking it through a skill junction is never a silent
no-op.

#### Scenario: Junction invocation runs the estimator

- GIVEN the estimator invoked through a junction (`~/.config/opencode/skills/...`) that resolves to the real skill path
- WHEN the CLI runs
- THEN `main()` executes and the plan is written (not an exit-0 no-op)

### Requirement: Package Ships Defaults, Skill Ships Neutral Fallbacks And A Slot Reference

The `video-script` bluepriNNt package (not the skill) MUST ship `defaults/video-defaults_NN.md`,
a `Video Defaults` document holding every cascade default (the `blueprint` level). The skill
MUST ship exactly one neutral fallback component per slot (`title`, `lower-third`, `caption`,
`quote`, `watermark`, `b-roll`), one neutral frame `frames/neutral.md`, and a reference doc
listing, per slot, its variables and a one-line registry hint, plus the sound event keys. Engine
code MUST NOT name any component, sound, frame or default value; only the Video Defaults
document MAY name them (for example `scene-boundary=whoosh`, `frame:: neutral`). The skill MUST
NOT ship sound files. All shipped files MUST be English-only and series-neutral.

#### Scenario: Every slot has a fallback

- GIVEN a fresh install of the skill
- WHEN the shipped components are listed
- THEN one fallback exists for each of the six slots

### Requirement: Domain Adoption Copies The Video Defaults

SKILL.md MUST instruct the agent, when a domain adopts the `video-script` bluepriNNt and its
root has no `video-defaults_NN.md`, to copy the package's `defaults/video-defaults_NN.md` there
unchanged. Domain tuning MUST be an edit of that copy. No script MUST create it.

#### Scenario: Adoption step is documented

- GIVEN SKILL.md
- WHEN its domain setup section is read
- THEN it names the package source path and the domain-root destination of the copy

#### Scenario: Fresh install renders and checks clean

- GIVEN a fresh install and a script using every slot, with no series overrides
- WHEN the project is emitted
- THEN `hyperframes check` reports zero errors

#### Scenario: Defaults live only in the defaults document

- GIVEN the skill's `scripts/` tree
- WHEN it is searched for `whoosh`, `minimax/speech-2.8-hd` or `0.2` as a music-volume default
- THEN none is found

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

