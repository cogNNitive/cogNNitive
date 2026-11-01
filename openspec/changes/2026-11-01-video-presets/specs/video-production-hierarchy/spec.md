# Delta for video-production-hierarchy

Scope: wording only. A Series supplies Presets instead of "one script template". The `series:` frontmatter block and its `script template` path entry are unchanged because the legacy markers are retired in the separate follow-up change `video-legacy-series-markers`.

## MODIFIED Requirements

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
