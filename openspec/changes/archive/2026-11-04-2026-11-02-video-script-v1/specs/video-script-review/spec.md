# video-script-review Specification

## Purpose

Defines the single review gate of an episode: the script, before spend. Covers what the reviewer decides, how verdicts and reasons are represented, how the gate and the budget interact, and how a needs-change scene is regenerated alone. Decision D4 of change `2026-11-02-video-script-v1`: reviews edit model data in place, and `changeset-document-model` is unchanged.

## ADDED Requirements
### Requirement: Review Decisions Are Per Scene

For each scene the reviewer MUST be able to edit the narration and field values in place, and set the Scene field `review:: approved` or `review:: needs-change`. A reason for `needs-change` MUST be recorded as a changeset `comment` operation on the scene. The reviewer MUST see the estimated cost against the budget with price provenance.

#### Scenario: Verdict and reason

- GIVEN a scene the reviewer rejects with the comment "too long"
- WHEN the review is saved
- THEN the scene has `review:: needs-change` and a `comment` operation on it carries "too long"

#### Scenario: Cost is visible

- GIVEN a proposed script
- WHEN the review is opened
- THEN the estimated total and the budget are shown

### Requirement: Decisions Are Persisted As Changesets, Never View-Only

Every review decision (edited narration, field values, verdict, comment) MUST be persisted as a changeset operation applied to the episode, and MUST reach the produced master. A decision that exists only in view state MUST NOT exist. No sidecar document MUST hold review state. The pipeline MUST read the applied model only.

#### Scenario: Edit reaches the master

- GIVEN a reviewer edit of one scene's narration applied as a changeset
- WHEN `produce` runs after the review
- THEN the TTS input of that scene equals the edited text

#### Scenario: Reload keeps decisions

- GIVEN verdicts applied through the review changeset
- WHEN the view is closed and reopened
- THEN the same verdicts and comments are shown

### Requirement: Approval Requires Every Scene Approved

The script MUST be approved only when every scene has `review:: approved`. A single `needs-change` scene MUST keep the episode out of `approved`.

#### Scenario: One scene needs change

- GIVEN a script with 5 scenes, 4 approved and 1 `needs-change`
- WHEN `produce` runs
- THEN it exits 10 and the state is not `approved`

#### Scenario: All approved

- GIVEN every scene `approved`
- WHEN `produce` runs
- THEN the state becomes `approved`

### Requirement: Review Gate Is A Cascade Field

`script_review` MUST be a cascade field with values `required` and `skip`, settable on Series, Video and Video Defaults, with the blueprint default `required`. With `skip`, the review gate MUST NOT stop the run, and the script MUST be treated as approved.

#### Scenario: Series skips review

- GIVEN a Series with `script_review:: skip` and an episode that sets none
- WHEN `produce` runs on a proposed script
- THEN no review stop occurs and the state becomes `approved`

#### Scenario: Episode requires review

- GIVEN a Series with `skip` and an episode with `script_review:: required`
- WHEN `produce` runs
- THEN it exits 10 at the review gate

### Requirement: Budget Gate Is Independent Of The Review Gate

`budget` MUST be a cascade field (a number in the domaiNN currency, per episode). When the estimate does not exceed the budget, the cost MUST be auto-approved and no approval MUST be requested. When it exceeds the budget, `produce` MUST stop with exit 11 unless it was given `--approve <plan_hash>` for the current hash. The bluepriNNt MUST ship no `budget` default, so an unset `budget` MUST be treated as an amount no estimate can fit: the gate asks (exit 11) rather than auto-approving. `script_review:: skip` MUST NOT bypass this stop.

#### Scenario: Under budget auto-approves

- GIVEN an estimate of 1.20 and `budget:: 2.00`
- WHEN the review is approved
- THEN no cost approval is requested

#### Scenario: Unset budget always asks

- GIVEN no level declares `budget`
- WHEN `produce` reaches the budget gate without `--approve <plan_hash>`
- THEN it exits 11 naming the estimate and the unset budget
- AND it spends nothing

#### Scenario: Over budget stops even when review is skipped

- GIVEN `script_review:: skip`, an estimate of 3.50 and `budget:: 2.00`
- WHEN `produce` runs
- THEN it exits 11 and spends nothing

#### Scenario: Plan change invalidates approval

- GIVEN `--approve` for hash `h1` and a narration edit that changes the hash
- WHEN `produce` runs
- THEN it exits 11 again

### Requirement: A Needs-Change Scene Is Regenerated Alone

A scene marked `needs-change` MUST be returned to the agent with its comment, and the agent MUST write a new proposed changeset scoped to that scene's addresses only. Every other scene's narration, verdict and cached assets MUST remain untouched, and unchanged scenes MUST keep `review:: approved`.

#### Scenario: Only one scene changes

- GIVEN scenes 1 to 5 where scene 3 is `needs-change`
- WHEN the agent regenerates it
- THEN the new proposal addresses only scene 3
- AND scenes 1, 2, 4 and 5 are unchanged, keep their verdicts, and their TTS cache entries are still hits

#### Scenario: Regenerated scene returns to review

- GIVEN a regenerated scene 3
- WHEN the review is opened
- THEN scene 3 is shown as pending and the others remain approved
