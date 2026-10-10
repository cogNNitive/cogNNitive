# Video Template (delta)

## MODIFIED Requirements

### Requirement: Video bluepriNNt Owns Its Script Skill

The `video-script` bluepriNNt package MUST embed `nn-video-script` under
`skills/nn-video-script/`. The `video-script` `spec_NN.md` and `design-presets`
references to the skill MUST describe it as embedded in the bluepriNNt. A change
under `video-script/skills/**` MUST be accompanied by a `video-script`
`blueprint_version` bump, a new `blueprints-v*` tag and a repin.
(Previously: the bluepriNNt was named `video`.)

#### Scenario: Skill is discoverable from the video-script bluepriNNt
- GIVEN the `video-script` package
- WHEN `list_blueprint_skills video-script` runs
- THEN `nn-video-script` is returned as an embedded skill

#### Scenario: Release tag accompanies the bump
- GIVEN the `video-script` package with changed `skills/**` content and a bumped `blueprint_version`
- WHEN the manifest pin is validated
- THEN it resolves to a merged `blueprints-v*` tag that contains the new content
