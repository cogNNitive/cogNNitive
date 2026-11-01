# Video Production Hierarchy Specification

## Purpose

Defines the four-level production hierarchy — Workspace → Subject → Series → Video — and how each level is represented in an iNNfo workspace.

## Design Decision: Subject and Series Representation

**Series is implemented as a Level-3 model of the existing `video` template, reused rather than duplicated as a new template.** A Series is one `series/{series-slug}/{Name}_V_x-y-z_video_NN.md` file: its frontmatter carries an added `series:` block (the procedure it extends, its script-template path, its shared-assets path), and the same file contains that Series's own Video Elements. This introduces no new Level-2 template, no new `template_version` axis, and no new spec pin for "Series" as its own concept — it reuses the `video` template's existing shape and versioning instead of inventing bespoke registry machinery, because `{modelDir}/assets/{slug}/` resolution (the mechanism that gives each Video Element its own asset folder) only applies to real iNNfo model files, not to an arbitrary config/registry file.

**Subject stays workspace-custom.** This change does not ship a new cogNNitive-owned Subject template. Subject content (facts and sources) is genuinely domain-specific per workspace — iNNtrevistas already models it as a bespoke historical-innovation template — and standardizing it now would force a premature, generic shape onto content that varies per project. Video references its Subject generically, the same way it already references `sources::`, without requiring any particular Subject template.

**Naming**: "Project" is avoided because `iNNfo/specs/templates/projects/spec_NN.md` already owns that name for an unrelated Project/Phases/Milestone/critical-path template. "Subject" is used instead for the content concept, to avoid colliding with users of either template.

## Requirements

### Requirement: Four-Level Hierarchy

The system MUST recognize four production levels: Workspace, Subject, Series, and Video. Subject MUST represent the content (facts and sources). Series MUST represent the production format: one procedure extending the generic script-generation procedure, its Presets (see capability `video-presets`), and shared series assets. Video MUST combine exactly one Subject with exactly one Series.
(Previously: Series supplied "one script template" instead of its Presets.)

#### Scenario: A Video declares its Subject and Series
- GIVEN a Video Element being authored
- WHEN it is registered
- THEN it references exactly one Subject and exactly one Series, and neither reference is optional

#### Scenario: Subject and Series vary independently
- GIVEN one Subject already produced under Series A
- WHEN a new Video is authored for the same Subject under Series B
- THEN the Subject content is reused unchanged and no coupling to Series A is required

#### Scenario: Series supplies presets
- GIVEN a Series whose scope document defines a Preset `Lucas`
- WHEN a Video of that Series references `presets:: [Lucas]`
- THEN the Preset is resolved from the Series and no script template is required for it

### Requirement: Subject Referenced Generically, Not Standardized

Video MUST reference its Subject through a generic, reserved-property-style link (analogous to `sources::`) that accepts any workspace document or Element. This change MUST NOT add a new cogNNitive-owned Subject template to `manifest/source.yaml`.

#### Scenario: Video links to a workspace-custom Subject
- GIVEN a workspace-defined Subject template (e.g. iNNtrevistas' historical-innovation model)
- WHEN a Video is registered against one of its Elements
- THEN the link resolves without requiring that Element to conform to any cogNNitive-shipped Subject template

#### Scenario: No new Subject template ships
- GIVEN this change's `manifest/source.yaml` diff
- WHEN inspected
- THEN no new Subject template entry is present

### Requirement: Series Is A Folder Anchored By Its Scope Document

A Series MUST be the folder `series/<s>/` anchored by its scope document `<s>_scope_NN.md` carrying `scope: true` and the `# NN Series` element, MUST be found through the nn-core scope chain, and MUST NOT require a `video`-template model file, a `series:` frontmatter block, a script-template path or a shared-assets path entry.

Source: D9, settled default 5.

#### Scenario: Video resolves its Series from the scope chain

- GIVEN a Video in `series/X/assets/e/` and `series/X/X_scope_NN.md` with `scope: true`
- WHEN the owning procedure runs
- THEN it locates Series `X` through the scope chain and reads its values from the scope document

#### Scenario: No reused video-template record is needed

- GIVEN a series folder with a scope document and no `{Name}_V_x-y-z_video_NN.md`
- WHEN a Video of that series is authored
- THEN authoring succeeds

#### Scenario: Old record is listed, not read

- GIVEN a series folder that still holds `{Name}_V_x-y-z_video_NN.md` with a `series:` block
- WHEN the engine runs over that series
- THEN the engine reads no value from it and the file is left untouched
