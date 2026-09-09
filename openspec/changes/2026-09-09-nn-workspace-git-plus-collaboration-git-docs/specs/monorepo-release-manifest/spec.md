# Delta for monorepo-release-manifest

## ADDED Requirements

### Requirement: Workspace Git Skill Registration

The skills section of `manifest/source.yaml` MUST declare `nn-workspace-git` with `repo: cogNNitive/cogNNitive`, `path: actioNN/skills/nn-workspace-git`, and `ref_key: skills` at release time (the `chore(release)` commit, precedent `73cbc64` — NOT in the feature change). The entry MUST NOT reference any archived repository.

#### Scenario: Skill entry declaration

- GIVEN the skills section of `manifest/source.yaml`
- WHEN the `nn-workspace-git` entry is inspected
- THEN its `repo:` is `cogNNitive/cogNNitive`
- AND its `path:` is `actioNN/skills/nn-workspace-git`

#### Scenario: Distribution stays unified

- GIVEN manifest validation of the skills section
- WHEN all skill entries are scanned
- THEN zero entries declare an archived repository
