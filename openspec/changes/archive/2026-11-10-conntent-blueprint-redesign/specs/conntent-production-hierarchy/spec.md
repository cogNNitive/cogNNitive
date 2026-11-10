# conntent-production-hierarchy Delta Spec

Source decisions: D1 and the F5 reconciliation (Slice 1: Structure). The Subject level is confirmed unused: no Concept, Field or folder of the `coNNtent` blueprint, the skill scripts or the package defaults refers to a Subject, and the only mentions are in this capability. It is removed.

## REMOVED Requirements

### Requirement: Four-Level Hierarchy

(Reason: the Workspace → Subject → Series → Video hierarchy declares a Subject level that no Concept, Field, folder or script of the blueprint implements. It is replaced by "Three-Level Production Hierarchy" below. The "A Video declares its Subject and Series" and "Subject and Series vary independently" scenarios are removed with it.)

### Requirement: Subject Referenced Generically, Not Standardized

(Reason: with the Subject level removed there is nothing to reference. Facts and sources stay available to a Video through the existing `sources::` link and the episode `sources/` folder, which this change does not alter.)

## ADDED Requirements

### Requirement: Three-Level Production Hierarchy

The system MUST recognise three production levels: domaiNN, Series and Video (episode). The domaiNN MUST hold the shared defaults, the catalog overlay and the domaiNN `library/`. A Series MUST represent the production format: its Presets (see capability `conntent-presets`), its Scene Kinds and Chrome (see capability `conntent-scene-kinds`), its host Character (see capability `conntent-character`) and its `library/`. A Video MUST belong to exactly one Series, except an episode outside any series folder, which has no series level. The blueprint MUST NOT define a `Subject` Concept or a `subject` Field.

#### Scenario: A Video declares its Series by location
- GIVEN an episode at `series/X/episodes/e/`
- WHEN its owning Series is resolved
- THEN the Series is `X`, found through the scope chain, and no `subject` value is required

#### Scenario: Series supplies presets
- GIVEN a Series whose scope document defines a Preset `Lucas`
- WHEN a Video of that Series references `presets:: [Lucas]`
- THEN the Preset is resolved from the Series and no script template is required for it

#### Scenario: Series supplies the scene grammar
- GIVEN a Series whose scope document declares Scene Kinds `Gancho` and `Cierre` and a watermark chrome
- WHEN an episode of that Series is produced
- THEN its scenes state those kinds and the watermark is applied by the engine without the episode declaring it

#### Scenario: Series supplies a host character
- GIVEN a Series declaring `character:: lucas`
- WHEN a scene of an episode of that Series resolves `voice`
- THEN the value comes from the Character `lucas` unless a nearer level overrides it

#### Scenario: Subject is not a Concept
- GIVEN the `coNNtent` blueprint
- WHEN its Concepts and Fields are listed
- THEN no `Subject` Concept and no `subject` Field is present

## MODIFIED Requirements

### Requirement: Series Is A Folder Anchored By Its Scope Document

A Series MUST be the folder `series/<s>/` anchored by its Series document `<s>_coNNtent_NN.md` (naming per `conntent-folder-contract`) carrying `scope: true` and the `# NN Series` element (recognised by the marker, never by file name), MUST be found through the nn-core scope chain, and MUST NOT require a `video`-template model file, a `series:` frontmatter block, a script-template path or a shared-assets path entry. Its episodes MUST live in `series/<s>/episodes/` and its reusable content in `series/<s>/library/`.
(Previously: the same, without the locations of the episodes and the library.)

Source: D1, D9, settled default 5.

#### Scenario: Video resolves its Series from the scope chain
- GIVEN a Video in `series/X/episodes/e/` and `series/X/X_coNNtent_NN.md` with `scope: true`
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

#### Scenario: Episode in the retired location
- GIVEN a Video document at `series/X/assets/e/`
- WHEN the owning procedure runs
- THEN it fails with `legacy-layout` ("episodes now live in `series/X/episodes/e/`; recreate this domaiNN") and the Series is not resolved from that location
