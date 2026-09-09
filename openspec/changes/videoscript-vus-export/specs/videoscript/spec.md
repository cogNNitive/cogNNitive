# VideoScript Specification

## Purpose

Minimal standalone L2 `videoscript` template plus `generate-VUS` serializer emitting pure VUS V_0-3-3 `.md` for VidGeNN `ScriptParser.parse()`. Canonical L3 sample: Ghostbusters-Inc., English-only.

## Requirements

### Requirement: Minimal L2 VideoScript Template

The system MUST provide standalone L2 template `videoscript` V_0-1-0 with concepts VideoScript plus release info in canonical `spec_NN.md` layout. It SHALL declare `template_version: V_0-1-0` and follow `template-package-structure` and `template-dynamic-discovery` as-is.

#### Scenario: Discover minimal template

- GIVEN template `videoscript` V_0-1-0 installed
- WHEN catalog discovery runs
- THEN the VideoScript concept with release info is returned
- AND layout matches canonical `spec_NN.md` form

#### Scenario: Reject pipeline creep in template

- GIVEN a reviewer inspects the `videoscript` L2 spec
- WHEN checking for sources, storyboards, or asset-pipeline concepts
- THEN none are present; only VideoScript plus release info remain

### Requirement: VUS V_0-3-3 Conformance Floor

The system MUST emit VUS shaped as `//ANYDEO_SPEC: V_0-3-3` plus `# Video` (`video_anydeo_specification`, `video_title`), `# Templates` (`@template base`, `scene_voice`), `# Scenes` (`@base Title`, narration line, `@@ Layer` with `layer_type`, `layer_level`, `layer_asset_source`, `layer_generation_subject`, `layer_effects`, `layer_effect_speed`, `layer_text_content`). Levels SHALL be 0–10 background, 20–40 primary, 50+ overlay; `layer_z_index` MUST NOT appear. Until the oracle is pinned, output SHALL use confirmed-set props only.

#### Scenario: Emit conforming skeleton

- GIVEN one VideoScript element with title, voice, one scene, two layers
- WHEN serialized to VUS text
- THEN header, `# Video`, `# Templates`, and `# Scenes` blocks appear with only the 9 confirmed props
- AND layer levels fall in the specified bands

#### Scenario: Reject invented props

- GIVEN a VideoScript element carrying an unconfirmed prop
- WHEN serialized before oracle pin
- THEN the serializer omits the unconfirmed prop rather than inventing VUS syntax

### Requirement: generate-VUS Serializer Byte-Compatibility

The system MUST provide procedure `generate-VUS` serializing VideoScript elements to pure VUS `.md` that `ScriptParser.parse()` accepts with zero errors and zero invented props. The `.md` SHALL be the only VidGeNN interface; no video parse, validate, or render code SHALL be added to core or MCP.

#### Scenario: Round-trip through ScriptParser

- GIVEN the Ghostbusters canonical sample
- WHEN `generate-VUS` serializes it and `ScriptParser.parse()` reads the `.md`
- THEN parsing succeeds with no errors and all scenes and layers survive

#### Scenario: Core and MCP diff stays empty

- GIVEN a `generate-VUS` run completes
- WHEN inspecting core and MCP package diffs
- THEN no video logic files changed; only the generated `.md` is new

### Requirement: Canonical Ghostbusters Sample and Quarantine

The system MUST ship canonical L3 sample `Ghostbusters_V_0-1-0_videoscript_NN.md` that is 100% English, set in the Ghostbusters-Inc. universe, and exhausts every template field. The rock-bands fixture (Queen, Led Zeppelin, AC/DC) SHALL NOT ship as canonical and MUST stay quarantined outside `samples/`.

#### Scenario: Audit canonical sample

- GIVEN the shipped canonical sample
- WHEN checked against the audit bar
- THEN it is English-only, Ghostbusters-Inc., and every field is exercised

#### Scenario: Block rock-bands promotion

- GIVEN a review of shipped `samples/`
- WHEN listing canonical samples
- THEN no rock-bands model is present as canonical

### Requirement: Oracle Pin and Script-Only Catalog Registration

The system MUST pin the VUS oracle (`V_0-3-3.json` or VidGeNN `ScriptParser` grammar) before claims beyond the confirmed set, and MUST register `videoscript` via regen script plus mirror, never by hand-edit. The template name SHALL be fixed once as `videoscript`, and backlog #11 SHALL be cross-linked as parallel-run, not merged.

#### Scenario: Regen catalog after oracle pin

- GIVEN the pinned oracle and the new template directory
- WHEN the regen script plus mirror run after concurrent dirty files land
- THEN the script-generated catalog lists `videoscript` with no hand edits

#### Scenario: Reject premature conformance claim

- GIVEN no pinned oracle
- WHEN a change claims support for props outside the confirmed 9
- THEN verification fails until the oracle is pinned
