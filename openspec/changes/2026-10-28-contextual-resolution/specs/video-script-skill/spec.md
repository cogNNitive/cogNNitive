# Delta for video-script-skill

Scope (Adoption A): the skill consumes nn-core scope discovery and resolution instead of
private cascade and lookup code, and the duplicated `draft_scene_visuals` procedure
exists once, with series filling its slots.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (draft JSON → a
self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter) and
`build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document). Thumbnails
MUST be produced by the single `render-thumbnail.mjs` tool. The draft JSON schema MUST be named
neutrally (`video-script.draft.v1`). The tools MUST read series values through the parameter
cascade (series, then domain Video Defaults, then package Video Defaults), resolved by nn-core
from the scope chain of the input file's folder (or `--series <dir>`). There MUST be no
`video.series.json`, `--config` flag or built-in series config. The generated script's
frontmatter MUST be copied from the series document and its filename MUST use the Series slug.
The tools MUST NOT write cascaded scene values that the engine resolves itself, and MUST NOT
hardcode any series' template names, scene slugs, music, filename pattern or model.
(Previously: the cascade was found by a skill-private walk from the input file's folder.)

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

#### Scenario: Series value comes from the nn-core chain

- GIVEN a series that sets no `music_volume` and a domain Video Defaults that sets one
- WHEN a tool resolves `music_volume` for a draft in that series
- THEN the domain value is used
- AND the resolution trace names the domain Video Defaults as supplier

## Out of scope

`video-guard.json` `allowedModels` stays a shallow override until the `restrict` strategy
is unlocked, and the `shared/` versus `assets/` drift is deferred. See the proposal's
Deferred table (`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
