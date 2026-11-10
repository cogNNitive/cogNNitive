# Delta for conntent-template

Decision of the spec phase: `conntent-template` is kept as a delta, not removed. Its procedure-content requirements are superseded by `conntent-procedures`; its branding and skill-ownership requirements are unaffected.

## MODIFIED Requirements

### Requirement: Procedures Reference The Installed Skill Path

The coNNtent procedures document `procedures/usage_procedures_NN.md` MUST reference the skill's tools through the installed, stable location `~/.agents/skills/nn-conntent/scripts/...`, and MUST NOT reference `skills/nn-conntent/` at the repository root or a bluepriNNt-package-relative path. This applies to all six procedures of `conntent-procedures`.
(Previously: the requirement named the file `generate_video_script_procedures_NN.md`, which no longer exists, and a single procedure.)

#### Scenario: NN Tools paths use the installed location
- GIVEN the procedures document
- WHEN its NN Tools commands are inspected
- THEN every skill script path begins with `~/.agents/skills/nn-conntent/scripts/`

#### Scenario: No repository-root skill path remains
- GIVEN all `coNNtent` and `design-presets` package files
- WHEN searched for `skills/nn-conntent/` not preceded by `~/.agents/`
- THEN the only matches are the embedded folder's own internal relative paths

## REMOVED Requirements

### Requirement: Video Generation Procedure Migration

(Reason: superseded by `conntent-procedures`. The single generation procedure `generate_video_script_NN.md` is replaced by six procedures in `usage_procedures_NN.md`; the proposal-then-`produce` flow is now Plan an Episode and Produce an Episode, with gates approved in the console.)
(Migration: none. No redirect procedure is shipped.)

#### Scenario: Old procedure name is absent
- GIVEN the coNNtent `procedures` list
- WHEN searched for `generate_video_script_NN.md`
- THEN no entry exists

### Requirement: Interactive Provider Consultation and Cost Gate

(Reason: superseded by `conntent-review-gates` (the `budget` gate and the `preview` gate carrying `plan_hash`) and by `conntent-procedures` "Produce an Episode". The agent no longer obtains approval of the plan hash in chat; the human approves spend in the console as a `review_gate` changeset. The agent still explains provider trade-offs during Set up the Domain and Define a Character.)
(Migration: none.)

#### Scenario: Agent does not collect spend approval
- GIVEN the procedures document
- WHEN searched for a step where the agent asks the user to approve a plan hash in chat
- THEN none exists
