# Delta for video-production-hierarchy

Scope: a Series is a folder anchored by its scope document, not a reused `video`-template model. Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied first): that change modifies only "Four-Level Hierarchy" and keeps the `series:` frontmatter block and its script-template path "unchanged because the legacy markers are retired in a follow-up change". This change is that follow-up (the companion design names it). This delta does not touch "Four-Level Hierarchy". The "Design Decision" prose of the living spec describes the removed representation and cannot be changed by a delta; it MUST be edited at archive time to say that a Series is a folder anchored by its scope document.

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Series Represented as a Reused Video-Template Model

(Reason: the representation was never produced by the engine or the real domain; `findSeriesRoot` and the cascade use the scope document, and the `series:` block, script-template path and assets path anchored nothing.)
(Migration: "Series Is A Folder Anchored By Its Scope Document" in this capability. No conversion: an existing `series_NN.md` is ignored, not renamed, and Series-as-template records `*_video_NN.md` are left untouched.)
