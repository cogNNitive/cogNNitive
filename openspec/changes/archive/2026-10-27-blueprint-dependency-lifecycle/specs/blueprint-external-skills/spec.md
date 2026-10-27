# Delta for blueprint-external-skills

## ADDED Requirements

### Requirement: CLI-Delivered Skills Are Covered By The CLI Pin

Agent skills that a pinned external CLI delivers itself (the HyperFrames skills, delivered by `hyperframes@<pin> skills update`) MUST be treated as delivered by that CLI. They MUST NOT also be declared as git-pinned entries in a bluepriNNt `skills:` array. The install MUST record them in state under the CLI pin, so one version covers the CLI and its skills.

#### Scenario: HyperFrames skills are installed under the CLI pin
- GIVEN a bluepriNNt skill whose `depends_on.cli` names `hyperframes` with `agent_skills: true` and whose `package.json` pins it at exact version P
- WHEN the consented install runs
- THEN the HyperFrames skills are delivered by the skill-local `hyperframes skills update` (version P)
- AND `state.cli.hyperframes` records `{version: P, source_skill, updated_at}`

#### Scenario: No duplicate git declaration
- GIVEN the `video-script` bluepriNNt
- WHEN its `skills:` array is validated
- THEN it contains no git-pinned entry for a HyperFrames skill
