# Delta for video-script-model

Living spec read: `openspec/specs/video-script-model/spec.md`. Only one requirement changes: "One Video Per One Script", restated in terms of storage so that a Video is the root of its instance model and cannot also live in a registry. All other requirements (concept hierarchy, narration body, layer types, background audio, cascade, defaults, Series concept, field table, retired fields) are unchanged. One text is flagged: the hierarchy requirement keeps "Flat headings SHALL remain supported for backward compatibility"; the no-backwards-compatibility decision (7) is not applied to it by this delta because it concerns heading syntax, not identity, addressing or storage. Design should confirm or retire it.

## MODIFIED Requirements

### Requirement: One Video Per One Script

The model MUST map exactly one `Video` to exactly one script document, and that document is the Video's instance model (`concept-storage-declaration`): the Video is its root and `Scene` and `Layer` are its elements. The same Video MUST NOT also be stored as an element of any other model. The model MUST NOT provide any versioning mechanism.
(Previously: one Video per script document, with no statement about where a Video may also be stored.)

#### Scenario: A second Video is rejected

- GIVEN a script document that already declares one Video
- WHEN a second Video is added
- THEN validation fails naming the single-Video constraint

#### Scenario: A Video listed in a registry is rejected

- GIVEN the script of `villabotijos-today/pepper-mapache` and a `## NN Video:` element with `slug:: pepper-mapache` in a compact registry
- WHEN `check_domain` runs
- THEN a double-storage error names both locations

#### Scenario: Scenes belong to their instance

- GIVEN two episodes each with a Scene slugged `00-gancho`
- WHEN the Scene collection is read
- THEN there are two Scenes, addressed `villabotijos-today/pepper-mapache@00-gancho` and `innteresante/intro@00-gancho`
