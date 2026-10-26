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
redirect or dual path. Its `version` MUST be `V_0-5-0` as skill frontmatter, and any change under
`video-script/skills/**` MUST bump the `video-script` `blueprint_version`.
(Previously: version pinned to `V_0-4-0`; renderer was Remotion.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists and its scripts run

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

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
self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter),
`build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document), and
`thumbnail-v1.mjs`. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The
tools MUST be parameterized by a **series config** and MUST NOT hardcode any single series' template
names, music default, filename pattern or avatar model.

#### Scenario: Tools run against a non-iNNteresante series

- GIVEN a series config for a series other than iNNteresante
- WHEN `build-script-from-draft.mjs` runs
- THEN the emitted filename and template references come from that config

#### Scenario: No series is hardcoded

- GIVEN the promoted tools
- WHEN they are inspected
- THEN no single series' name, template names, music path or filename pattern is hardcoded in prose or code

#### Scenario: Generated script validates

- GIVEN a reviewed draft JSON and a series config
- WHEN `build-script-from-draft.mjs` runs
- THEN it emits an L3 document that validates against the `video-script` blueprint with no schema errors

#### Scenario: Review HTML is self-contained

- GIVEN a draft JSON referencing thumbnails
- WHEN `build-draft-html.mjs` runs
- THEN the HTML embeds the thumbnails (base64), opens from `file://`, and exports `<slug>_reviewed.json`

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the
HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning
step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine.

#### Scenario: Render uses HyperFrames

- GIVEN a compiled script and its manifest
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

### Requirement: Cost Estimator Invoked Through Any Path

The cost estimator MUST run `main()` when invoked through a symlinked or junction path (its entry
guard MUST compare real paths), so an agent invoking it through a skill junction is never a silent
no-op.

#### Scenario: Junction invocation runs the estimator

- GIVEN the estimator invoked through a junction (`~/.config/opencode/skills/...`) that resolves to the real skill path
- WHEN the CLI runs
- THEN `main()` executes and the plan is written (not an exit-0 no-op)

