# Delta for dev-skills

## MODIFIED Requirements

### Requirement: Complete definition of deployed

A release SHALL be reported as "deployed" only when all legs verify in one run; a pushed tag alone MUST never satisfy the definition. The legs are: (1) the monorepo release tag is pushed, (2) the release workflow run for that tag concluded `success`, including the post-publish smoke test, (3) the mirror tag exists in `cogNNitive-web`, and (4) the published manifest and the versioned CDN bundle URLs resolve and pin the released version.

#### Scenario: All legs green
- GIVEN a release-shaped change
- WHEN Group 1 sync check runs
- THEN it SHALL verify legs (1) through (4)
- AND any failing leg SHALL be reported as an error (escalated from advisory) for release changes. Non-release changes keep advisory behavior.

#### Scenario: Tag pushed but workflow failed
- GIVEN the release tag is pushed and the workflow run failed
- WHEN deployment status is evaluated
- THEN the release SHALL NOT be reported as deployed

## ADDED Requirements

### Requirement: The release procedure is "tag, push, watch"

`.agents/skills/nn-dev-release/SKILL.md` MUST describe the release as: confirm the change is merged to `main`, that the authored version is bumped for `innfo-mcp` and `innfo-console`, and that the new version is strictly greater than the highest existing tag of the key in both repositories, create the annotated tag `<key>-v<semver>`, push the tag, and watch the release workflow to completion. The procedure MUST NOT instruct the maintainer to edit pins, channel versions, or the stable manifest by hand, to run `sync-versions` for channel refs, or to tag `cogNNitive-web`. It MUST reject a tag whose key is not allowed, whose version is not greater than every existing tag of the key, or (for `innfo-mcp` and `innfo-console`) whose version does not match the authored version.

#### Scenario: Maintainer follows the procedure
- GIVEN a merged change for `skills` and a version above the highest existing `skills` tag
- WHEN the maintainer follows `nn-dev-release`
- THEN the only manual release actions are creating and pushing `skills-v<semver>` and watching the workflow

#### Scenario: Invalid key is stopped
- GIVEN a proposed tag with a key outside the allowed set
- WHEN the procedure validates the tag
- THEN the flow stops before the tag is pushed

#### Scenario: Non-increasing or mismatched version is stopped
- GIVEN a proposed tag whose version is not greater than the highest existing tag of its key, or differs from the authored version of `innfo-mcp` or `innfo-console`
- WHEN the procedure validates the tag
- THEN the flow stops before the tag is pushed

### Requirement: Failure and re-run states are documented

The `nn-dev-release` procedure MUST document, for each release stage, the state left behind by a failure at that stage and the action to resolve it, including that re-running the workflow on the same tag is the repair path. A published tag is never deleted: after a failed smoke test the mirror tag and the manifest commit stay and a re-run on the same tag converges. The procedure MUST document manifest rollback as a manual step: re-publish the previous `docs/use/manifests/<tag>.md` snapshot. It MUST also document that a cancelled pending run (GitHub keeps one pending run per concurrency group) is repaired by re-running the same tag.

#### Scenario: Partial publish
- GIVEN the web commit was pushed but the smoke test failed
- WHEN the maintainer consults the procedure
- THEN it states the resulting state and instructs re-running on the same tag

#### Scenario: Procedure covers every stage
- GIVEN the seven release stages
- WHEN the failure section is reviewed
- THEN each stage has a documented failure state and resolution
