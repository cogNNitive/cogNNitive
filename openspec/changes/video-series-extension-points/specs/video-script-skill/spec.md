# Delta for video-script-skill

Scope: the skill ships the blueprint-level defaults document, neutral slot fallbacks and a slot
reference; draft tools read the Series document instead of `video.series.json`; versions bump.

## ADDED Requirements

### Requirement: Skill Ships Defaults, Neutral Slot Fallbacks And A Slot Reference

The skill MUST ship `defaults/series_NN.md`, a `Series` document holding every cascade default
(the `blueprint` level). It MUST ship exactly one neutral fallback component per slot (`title`,
`lower-third`, `caption`, `quote`, `watermark`, `b-roll`) and a reference doc listing, per slot,
its variables and a one-line registry hint, plus the sound event keys. Engine code MUST NOT name
any component, sound or default value; only the defaults document MAY name them (for example
`scene-boundary=whoosh`). The skill MUST NOT ship sound files. All shipped files MUST be
English-only and series-neutral.

#### Scenario: Every slot has a fallback

- GIVEN a fresh install of the skill
- WHEN the shipped components are listed
- THEN one fallback exists for each of the six slots

#### Scenario: Fresh install renders and checks clean

- GIVEN a fresh install and a script using every slot, with no series overrides
- WHEN the project is emitted
- THEN `hyperframes check` reports zero errors

#### Scenario: Defaults live only in the defaults document

- GIVEN the skill's `scripts/` tree
- WHEN it is searched for `whoosh`, `minimax/speech-2.8-hd` or `0.2` as a music-volume default
- THEN none is found

## MODIFIED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (draft JSON → a
self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter),
`build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document), and
`thumbnail-v1.mjs`. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The
tools MUST read series values through the parameter cascade (series, then domain, then the
shipped defaults), found by walking from the input file's folder (or `--series <dir>`). There
MUST be no `video.series.json`, `--config` flag or built-in series config. The generated
script's frontmatter MUST be copied from the series document and its filename MUST use the
Series slug. The tools MUST NOT write cascaded scene values that the engine resolves itself, and
MUST NOT hardcode any series' template names, scene slugs, music, filename pattern or model.
(Previously: parameterized by a `video.series.json` series config with built-in defaults.)

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

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by
installing the `video-script` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Its `version` MUST be `V_0-6-0` as skill frontmatter, the `video-script`
blueprint version MUST be `V_0-4-0`, and any change under `video-script/skills/**` MUST bump the
`video-script` `blueprint_version`. Every registry that records these versions MUST be updated
in the same change.
(Previously: skill version pinned to `V_0-5-0`; blueprint at `V_0-3-8`.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` and `defaults/series_NN.md` exist and its scripts run

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

#### Scenario: Versions are registered consistently

- GIVEN the bumped skill and blueprint versions
- WHEN `node scripts/verify.js` runs
- THEN it passes with no version-registration mismatch
