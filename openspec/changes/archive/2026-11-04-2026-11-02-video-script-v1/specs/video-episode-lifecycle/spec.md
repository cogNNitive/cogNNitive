# video-episode-lifecycle Specification

## Purpose

Defines the episode states, who sets each, the version pin, and the computed series index that replaces the hand-kept one. Decisions D9, D13 of change `2026-11-02-video-script-v1`.

## ADDED Requirements
### Requirement: Episode States And Setters

An episode record MUST hold exactly one `status` from `idea`, `draft`, `approved`, `produced`, `published`, `archived`, set only by the actor in this table and written through apply_change.

| State | Set by | Meaning |
|---|---|---|
| `idea` | agent or user | title, series and linked Sources only |
| `draft` | engine | the agent proposed the script |
| `approved` | engine | review done or skipped, budget gate passed |
| `produced` | engine | master and formats written |
| `published` | user | with `published_url` |
| `archived` | user | the episode is discarded |

The previous values `scripting` and `rendering` MUST NOT exist.

#### Scenario: Retired status is rejected

- GIVEN an episode with `status:: scripting`
- WHEN it is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: Engine sets draft

- GIVEN an `idea` episode and a valid sealed proposed script changeset
- WHEN `produce` applies it
- THEN a separate engine changeset sets the status to `draft` and the engine is the writer

### Requirement: An Idea Holds Only Its Seed

An episode in `idea` MUST carry only a title, its Series and linked Sources (nn-sources sidecars) and MUST NOT carry scenes. The backlog of an episode series is the set of `idea` episodes in the model.

#### Scenario: Idea with scenes

- GIVEN an `idea` episode that contains Scene elements
- WHEN it is validated
- THEN validation fails naming the state and the Scene

### Requirement: Transitions Are Checked

The check MUST enforce: `approved` and `produced` require a script; `produced` requires the `master` file to exist beside the episode; `published` requires `published_url`; `archived` is reachable from any state. A script change to an episode in `approved` or `produced` MUST return it to `draft`.

#### Scenario: Produced without master

- GIVEN an episode with `status:: produced` and no master file on disk
- WHEN the check runs
- THEN it fails naming the missing file

#### Scenario: Published without URL

- GIVEN `status:: published` and no `published_url`
- WHEN the check runs
- THEN it fails naming `published_url`

#### Scenario: Script edit demotes

- GIVEN an `approved` episode
- WHEN a changeset edits one scene's narration
- THEN the state becomes `draft`

### Requirement: Episodes Pin The Blueprint Version

Every V_0-15-0 episode MUST record the blueprint version it was authored against in its frontmatter `blueprint_version`. A tool run on an episode whose pin differs from the installed blueprint MUST fail with a named error and MUST NOT convert, alias or reinterpret it.

#### Scenario: Pin recorded

- GIVEN a new episode created under `coNNtent_V_0-15-0`
- WHEN its record is read
- THEN its frontmatter has `blueprint_version: V_0-15-0`

#### Scenario: Mismatch fails

- GIVEN an episode pinned to a version other than the installed one
- WHEN any engine command targets it
- THEN it fails naming both versions and writes nothing

### Requirement: The Series Index Is Computed

The list of a Series' episodes by state MUST be computed from the episode records. No hand-kept series index document MUST exist, and no tool MUST write one. Computed counts MUST equal the states of the records.

#### Scenario: Index follows the records

- GIVEN a Series with 2 `idea`, 1 `draft` and 3 `produced` episodes
- WHEN the index is computed
- THEN it lists those counts and the episodes in each state

#### Scenario: Stale index cannot exist

- GIVEN an episode that moves from `draft` to `produced`
- WHEN the index is computed again
- THEN it shows `produced` with no manual edit

### Requirement: Old Episodes Stay An Archive

Episodes authored before V_0-15-0 MUST NOT be migrated or converted by any tool; they remain readable under their pinned version.

#### Scenario: No converter exists

- GIVEN the skill's scripts
- WHEN they are searched for a converter of pre-V_0-15-0 episodes
- THEN none is found
