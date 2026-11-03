# Delta for video-production-hierarchy

Change `2026-11-02-video-script-v1`. Decision D2: the Series declares the scene grammar and chrome of its format.

## MODIFIED Requirements

### Requirement: Four-Level Hierarchy

The system MUST recognize four production levels: Workspace, Subject, Series, and Video. Subject MUST represent the content (facts and sources). Series MUST represent the production format: one procedure extending the generic script-generation procedure, its Presets (see capability `video-presets`), its Scene Kinds and chrome (see capability `video-scene-kinds`), and shared series assets. Video MUST combine exactly one Subject with exactly one Series.
(Previously: Series supplied its Presets and shared assets but no Scene Kinds or chrome.)

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

#### Scenario: Series supplies the scene grammar

- GIVEN a Series whose scope document declares Scene Kinds `Gancho` and `Cierre` and a watermark chrome
- WHEN an episode of that Series is produced
- THEN its scenes state those kinds and the watermark is applied by the engine without the episode declaring it

### Requirement: Series Is A Folder Anchored By Its Scope Document

A Series MUST be the folder `series/<s>/` anchored by its Series document `<s>_series_NN.md` carrying `scope: true` and the `# NN Series` element (recognised by the marker, never by file name), MUST be found through the nn-core scope chain, and MUST NOT require a `video`-template model file, a `series:` frontmatter block, a script-template path or a shared-assets path entry.
(Previously: the Series document was named `<s>_scope_NN.md`.)

Source: D9, settled default 5.

#### Scenario: Video resolves its Series from the scope chain

- GIVEN a Video in `series/X/episodes/e/` and `series/X/X_series_NN.md` with `scope: true`
- WHEN the owning procedure runs
- THEN it locates Series `X` through the scope chain and reads its values from the Series document

#### Scenario: No reused video-template record is needed

- GIVEN a series folder with a Series document and no `{Name}_V_x-y-z_video_NN.md`
- WHEN a Video of that series is authored
- THEN authoring succeeds

#### Scenario: Old record is listed, not read

- GIVEN a series folder that still holds `{Name}_V_x-y-z_video_NN.md` with a `series:` block
- WHEN the engine runs over that series
- THEN the engine reads no value from it and the file is left untouched
