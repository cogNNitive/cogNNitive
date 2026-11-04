# Video Script Skill Specification

## Purpose

Defines the cogNNitive-owned skill that authors native iNNfo Level-3 coNNtent documents inside an iNNfo workspace. The skill is embedded in the `coNNtent` blueprint package; script validity is enforced by the `coNNtent` blueprint, with no external repository dependency.
## Requirements
### Requirement: Authors iNNfo L3 Script Documents

The skill MUST author video scripts as iNNfo Level-3 kNNowledge documents that adopt the `coNNtent` blueprint. The skill MUST NOT author VUS scripts and MUST NOT ship, vendor, or invoke a VUS parser.

#### Scenario: Skill authors an L3 document

- GIVEN a workspace with a registered Video Element and its owning Series
- WHEN the skill authors a script for that Video
- THEN it writes an iNNfo L3 document adopting the `coNNtent` blueprint
- AND the document validates against the blueprint

#### Scenario: No VUS parser artifact present

- GIVEN the skill directory
- WHEN its files are inspected
- THEN no vendored VUS parser artifact is present
- AND no VUS parse code path is referenced

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned coNNtent skill embedded in the `coNNtent` bluepriNNt package at `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/` that authors iNNfo Level-3 coNNtent documents and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. (Previously: it authored VUS scripts using a vendored parser and VUS specification, embedded in the `video` bluepriNNt package.)

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

- GIVEN the skill installed at `~/.agents/skills/nn-conntent/` with no monorepo present
- WHEN the skill authors a valid L3 script document
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: No-Prose-Copy of Syntax Facts

The skill's own documentation and prompts MUST NOT restate blueprint Field names, allowed `type::` values, or other schema facts as literal prose. Every such fact MUST be resolved by reading the blueprint at run time. (Previously: the prose restricted VUS voice IDs and property names sourced from the pinned VUS spec.)

#### Scenario: Allowed layer type resolved from the blueprint

- GIVEN a document that needs a valid Layer `type::`
- WHEN the skill selects a value
- THEN it reads the allowed values from the `coNNtent` blueprint, never from a hardcoded list in its own prose

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

The skill MUST be made available to agents at `~/.agents/skills/nn-conntent/` solely by
installing the `coNNtent` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Any change under `coNNtent/skills/**` or `coNNtent/defaults/**`
MUST bump the `coNNtent` `blueprint_version` and the skill `version`, and every registry that
records these versions MUST be updated in the same change.
(Previously: pinned literal versions `V_0-6-0` / `V_0-4-0`, which went stale with each change.)

#### Scenario: Installing coNNtent yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `coNNtent` bluepriNNt is installed
- THEN `~/.agents/skills/nn-conntent/SKILL.md` and the package's `defaults/video-defaults_NN.md` exist and the skill's scripts find it

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `coNNtent/skills/**`
- WHEN the manifest pin is validated
- THEN the `coNNtent` `blueprint_version` is bumped

#### Scenario: Versions are registered consistently

- GIVEN the bumped skill and blueprint versions
- WHEN `node scripts/verify.js` runs
- THEN it passes with no version-registration mismatch

### Requirement: Embedded Skill Tests Run In Verify

Test suites that live inside the embedded skill MUST be discovered and executed by `node scripts/verify.js`, without double-running suites already collected from `iNNfo/packages`. Moving the suites MUST NOT reduce the number of executed suites.

#### Scenario: Moved suites still run

- GIVEN the skill's suites under `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/`
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

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine. The engine CLI MUST expose `produce` as the single pipeline command and the primitives `compile`, `render` and `synthesize-avatar`; preview is `hyperframes preview`, and there is no native 9:16 render because every other format is derived from the master. The skill MUST NOT ship `render-vertical.mjs`, `assemble-video.mjs` or `finalize-video.mjs`.
(Previously: the CLI exposed only `compile`, `render` and `synthesize-avatar`, and a combined `produce` command was forbidden.)

Source: D3, D8, D6.

#### Scenario: Render uses HyperFrames

- GIVEN an approved script
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

#### Scenario: Removed command is refused

- GIVEN the engine CLI
- WHEN it is run with `preview`
- THEN it exits non-zero printing a usage that lists `produce`, `compile`, `render` and `synthesize-avatar` and no `preview`

#### Scenario: Removed tools are gone

- GIVEN the skill's `scripts/` and SKILL.md
- WHEN they are inspected
- THEN none of `render-vertical.mjs`, `assemble-video.mjs` or `finalize-video.mjs` exists or is referenced

### Requirement: Cost Estimator Invoked Through Any Path

The cost estimator MUST run `main()` when invoked through a symlinked or junction path (its entry
guard MUST compare real paths), so an agent invoking it through a skill junction is never a silent
no-op.

#### Scenario: Junction invocation runs the estimator

- GIVEN the estimator invoked through a junction (`~/.config/opencode/skills/...`) that resolves to the real skill path
- WHEN the CLI runs
- THEN `main()` executes and the plan is written (not an exit-0 no-op)

### Requirement: Package Ships Defaults, Skill Ships Neutral Fallbacks And A Slot Reference

The `coNNtent` bluepriNNt package (not the skill) MUST ship `defaults/video-defaults_NN.md`,
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

SKILL.md MUST instruct the agent, when a domain adopts the `coNNtent` bluepriNNt and its root has no `video-defaults_NN.md`, to copy the package's `defaults/video-defaults_NN.md` there unchanged. Domain tuning MUST be an edit of that copy, and a domain MAY add `# NN Preset` sections to it. No script MUST create it.
(Previously: no mention of domain Presets; the defaults scenario searched for `0.2` as a music-volume default.)

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
- WHEN it is searched for `whoosh`, `minimax/speech-2.8-hd` or `0.2` as a background-audio-volume default
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

### Requirement: Skill Consumes nn-core Scope Resolution

The skill's scripts MUST locate the domaiNN root and the series scope through nn-core
`findScopeChain`, and MUST resolve cascaded values through nn-core `resolve`. The files
`scripts/lib/cascade.mjs` and `scripts/lib/nearest.mjs` MUST NOT exist, and no skill script
MAY contain a private frontmatter or field parser for kNNowledge. No skill script MAY
locate the workspace through `.git`.

#### Scenario: Private cascade code is gone

- GIVEN the skill's `scripts/` tree
- WHEN it is listed
- THEN neither `lib/cascade.mjs` nor `lib/nearest.mjs` exists
- AND no script imports them

#### Scenario: Workspace resolved without git

- GIVEN a `video_NN` domaiNN with `domaiNN_NN.md` and no `.git` in its ancestry
- WHEN a skill script runs from inside a series folder
- THEN it finds the domaiNN root and completes

#### Scenario: Existing cascade behavior is preserved

- GIVEN the skill's existing cascade tests (series, then domain Video Defaults, then package Video Defaults)
- WHEN they run against the nn-core based implementation
- THEN they pass with the same resolved values

### Requirement: Scene Visuals Procedure Defined Once With Slots

The `draft_scene_visuals` procedure MUST exist exactly once in the `video_NN` domaiNN, at
the highest scope that needs it, declaring its series-specific variation as named slots.
Each series MUST fill those slots instead of carrying a copy of the steps.

#### Scenario: One definition, two series

- GIVEN the `video_NN` domaiNN after Adoption A
- WHEN procedure files named `draft_scene_visuals` are counted
- THEN exactly one definition exists
- AND each of the two series that previously copied it fills the procedure's slots

#### Scenario: Both series run it through slots

- GIVEN the two series
- WHEN the procedure is resolved for a document in each
- THEN both resolve to the single definition with their own slot fillers
- AND the resolution reports no slot-contract errors

#### Scenario: No copy remains

- GIVEN the two series folders
- WHEN they are searched for the 13-step body of `draft_scene_visuals`
- THEN no copy of the step list is found in either

### Requirement: Dev Tooling Emits Current Field Names

`scripts/dev/adopt-video-plan.mjs`, `scripts/dev/lib/series-values.mjs` and `scripts/dev/validate-scope-golden.mjs` MUST emit and accept only the current field names, and `adopt-video-plan` MUST hoist a Video's voice as `voice`, not `voice_id`.

#### Scenario: Adopt plan hoists voice

- GIVEN a plan whose videos share one voice
- WHEN `adopt-video-plan` produces the series document
- THEN it declares `voice:: <value>` and no `voice_id`

#### Scenario: Series values use new names

- GIVEN a series that sets a volume and an avatar
- WHEN `series-values` emits the document
- THEN it writes `background_audio_volume` and `avatar`, never `music_volume` or `presenter_asset`

### Requirement: Skill Documents Presets And Carries No Retired Vocabulary

SKILL.md and the skill references MUST document Presets, the `presets` list and the new field names, and the reference documenting Template data (`series-template-convention.md`) MUST be replaced by one documenting Presets. The blueprint, skill and dev tooling MUST contain none of the retired field names as `::` fields or JSON keys outside `openspec/changes/archive/`.

#### Scenario: Retired names are absent

- GIVEN the blueprint, the skill and `scripts/dev`
- WHEN they are searched for `tts_model::`, `music_volume::`, `presenter_asset::`, `intro_asset::` and `template::`
- THEN no match is found

#### Scenario: Template convention document is gone

- GIVEN the skill's `references/`
- WHEN it is listed
- THEN `series-template-convention.md` does not exist and a Presets reference does

### Requirement: Domain Setup Documents The Gitignore Block

SKILL.md MUST instruct the agent, at domain setup, to add the managed gitignore block of capability `video-folder-contract` to the domain `.gitignore`.
(Previously: the section had to name `**/build/`, `**/draft_thumbs/` and `.cognnitive/cache/`.)

Source: D2.

#### Scenario: Setup step names the block

- GIVEN SKILL.md
- WHEN its domain setup section is read
- THEN it names every entry of the managed block of `video-folder-contract`, including `.cognnitive/cache/`

### Requirement: Skill Scripts Use The Scope-Anchored Series Root

The skill scripts `produce.mjs` and `render-thumbnail.mjs` MUST locate the series through `findSeriesRoot` of capability `video-folder-contract`, and the thumbnail tool MUST read the series title from the scope document.
(Previously: `build-script-from-draft.mjs` and `build-draft-html.mjs` were also listed and the script builder read the series title.)

Source: D9.

#### Scenario: Thumbnail reads the scope title

- GIVEN a series whose scope document declares `title:: Other Series` and no `series_NN.md`
- WHEN `render-thumbnail.mjs` runs without `--subtitle`
- THEN the subtitle is `Other Series`

#### Scenario: Engine surfaces a scope error

- GIVEN a series with a duplicate scope marker
- WHEN `produce` runs on an episode of that series
- THEN it fails naming `DUPLICATE_SCOPE_MARKER`

### Requirement: Dev Tooling Does Not Read video.series.json

`scripts/dev/lib/series-values.mjs`, `scripts/dev/adopt-video-plan.mjs` and `scripts/dev/validate-scope-golden.mjs` MUST NOT read `video.series.json`.

Source: D9.

#### Scenario: Tooling ignores the file

- GIVEN a series with a `video.series.json` whose values differ from the scope document
- WHEN `series-values` runs
- THEN the output reflects the scope document only

### Requirement: Retired Layout Vocabulary Is Absent

The blueprint, the skill and `scripts/dev` MUST NOT contain `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal` or `_draft_<version>.html` outside `openspec/changes/archive/`.

Source: D11 (retired names added to the scan).

#### Scenario: Scan is clean

- GIVEN the repository after the last slice
- WHEN the retired-vocabulary scan runs
- THEN it reports no match outside `archive/`

### Requirement: Draft Procedure Emits A Proposed Changeset

The skill MUST provide a draft procedure that an agent follows to produce, for one episode, a proposed changeset containing only creative work: narration, the scene kind of every scene, visual asset selection, image prompts, and the publication description prose. The agent MUST deliver it as a sealed proposed changeset (written with `writeProposedChangeset`), which MUST pass validation against the field registry, the Series kinds and the merged catalog by a dry apply before it is applied. `produce` applies it and sets the episode to `draft` (capability `video-produce-command` "Intake Applies The Proposed Changeset"); the agent MUST NOT apply it itself. The agent MUST NOT write `status` or `master`, select models outside the cascade, apply chrome, or sequence engine steps.

Source: D6, D13.

#### Scenario: Procedure delivers a valid changeset

- GIVEN an `idea` episode with linked Sources in a Series with kinds
- WHEN the agent completes the draft procedure
- THEN a sealed proposed changeset exists whose scenes each state a known `kind::`
- AND it passes the registry and catalog checks and is not yet applied

#### Scenario: Invalid proposal is not delivered

- GIVEN a proposal containing an unknown key or an unknown kind
- WHEN the procedure validates it
- THEN it fails with the named error and no changeset is delivered

#### Scenario: Agent does not touch engine-owned fields

- GIVEN a proposed changeset that sets `status:: produced` or `master`
- WHEN it is validated
- THEN it is rejected naming the engine-owned field

#### Scenario: Regeneration touches one scene

- GIVEN a scene marked `needs-change` with a comment
- WHEN the agent runs the procedure for that scene
- THEN the new proposed changeset addresses only that scene (see video-script-review)

### Requirement: Produce Is The Single Entry Command

SKILL.md MUST document `produce <episode>` as the only command an agent runs after a script is proposed, and MUST document the two stops (exit 10 review gate, exit 11 budget gate with `--approve <plan_hash>`) and how to continue from each. It MUST NOT document a sequence of `compile`, `synthesize-avatar`, `render` or finalize steps for the agent to run.

Source: D6.

#### Scenario: Workflow names one command

- GIVEN SKILL.md
- WHEN its workflow section is read
- THEN it names the draft procedure, the review, and `produce`, and no other engine step

#### Scenario: Stops are documented

- GIVEN SKILL.md
- WHEN the section on `produce` is read
- THEN it names the review-gate (10) and budget-gate (11) stops and what resumes each

### Requirement: Retired V_0 Tooling Is Absent

The skill and `scripts/dev` MUST NOT contain `draft-template.html`, `build-draft-html.mjs`, `build-script-from-draft.mjs`, `finalize-video.mjs`, `approve-plan.mjs`, `video-guard.json`, `lib/knowledge-model.mjs`, `lib/video-scope.mjs`, `lib/legacy-draft-keys.mjs`, `reviewed.json`, `draft.json`, `review_console.html`, `stageAsset` or the in-chat approval phrase `approve the plan` outside `openspec/changes/archive/`.

#### Scenario: Scan is clean

- GIVEN the repository after the last slice
- WHEN the retired-tooling scan runs
- THEN it reports no match outside `archive/`

### Requirement: Skill Reaches nn-core And The Apply Engine Through A Mirror

The skill MUST obtain the scope fold, `parseKnowledge`, `parseChangeset`, `serializeChangeset`, `computeProposalSha`, `executeChangesetApply` and `writeProposedChangeset` from one generated, drift-guarded mirror (`lib/nn-core.generated.cjs`, built by the `coNNtent` target of `build-core-mirrors.mjs`), and MUST NOT keep a parser or writer of its own. `verify.js` MUST run the mirror `--check`.

Source: design A10 (bundle size to be measured in the first slice).

#### Scenario: Stale mirror fails

- GIVEN a change to a mirrored nn-core source without regenerating the mirror
- WHEN the mirror `--check` runs
- THEN it exits non-zero naming the mirror

#### Scenario: No private parser

- GIVEN the skill's `scripts/`
- WHEN it is searched for a private frontmatter or knowledge parser
- THEN none is found

