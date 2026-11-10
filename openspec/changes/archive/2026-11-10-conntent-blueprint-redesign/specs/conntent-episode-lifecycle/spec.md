# conntent-episode-lifecycle Delta Spec

Slice 3, PR 3b. The lifecycle ends at `delivered`; publishing is human and out of scope. `published` is removed; `failed_qa` is added; `delivered` is not terminal.

## MODIFIED Requirements

### Requirement: Episode States And Setters

An episode record MUST hold exactly one `status` from `idea`, `draft`, `approved`, `produced`, `failed_qa`, `delivered`, `archived`, set only by the actor in this table and written through apply_change.

| State | Set by | Meaning |
|---|---|---|
| `idea` | agent or user | title, series and linked Sources only |
| `draft` | engine | the script was proposed, or at least one gate of at least one scene is open, re-opened or `needs-change` |
| `approved` | engine | every gate configured for the episode is satisfied for every scene |
| `produced` | engine | master, every declared format and every declared thumbnail exist and QA passed |
| `failed_qa` | engine | a QA check failed; nothing was delivered by that run |
| `delivered` | engine | a `deliveries/v<N>/` folder matching the current outputs exists |
| `archived` | user | the episode is discarded |

The previous values `scripting`, `rendering` and `published` MUST NOT exist. No state MUST require or record a published URL.
(Previously: states `idea`, `draft`, `approved`, `produced`, `published`, `archived`; `published` was set by the user with `published_url`.)

#### Scenario: Retired status is rejected

- GIVEN an episode with `status:: scripting` and another with `status:: published`
- WHEN each is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: Engine sets draft

- GIVEN an `idea` episode and a valid sealed proposed script changeset
- WHEN `produce` applies it
- THEN a separate engine changeset sets the status to `draft` and the engine is the writer

#### Scenario: Approved when all gates are satisfied

- GIVEN `review_gates: [script, preview]` and approvals for every scene on both gates
- WHEN the engine reconciles the status
- THEN the status is `approved`

#### Scenario: Autopilot approves immediately

- GIVEN `review_gates: []` and a plan within budget
- WHEN `produce` evaluates the gates
- THEN the status becomes `approved` without any applied verdict

#### Scenario: Delivered is set by the engine

- GIVEN a created `deliveries/v1/`
- WHEN the engine writes the status
- THEN the status is `delivered`

#### Scenario: Only the engine sets engine states

- GIVEN an agent or user changeset setting `status:: delivered`
- WHEN it is validated against the lifecycle
- THEN it is refused naming that the state is set by the engine

### Requirement: Transitions Are Checked

The check MUST enforce: `approved`, `produced`, `failed_qa` and `delivered` require a script; `produced` requires the master, every declared format file and every declared thumbnail to exist beside the episode and a passing QA record in `qa.json`; `failed_qa` requires the QA report `qa.json` (`conntent-qa`); `delivered` requires an existing `deliveries/v<N>/` folder whose output hash equals the hash of the current outputs; `archived` is reachable from any state. A change to the content of an episode in `approved`, `produced`, `failed_qa` or `delivered` that changes the current hash of any gate of any scene (see `conntent-review-gates`) MUST return the episode to `draft`, and the open gates MUST be only those of the affected scenes. An upstream change (series or domaiNN) that changes a scene's resolved parameters MUST have the same effect for that scene.
(Previously: `published` required `published_url`; only a script edit demoted to `draft`.)

#### Scenario: Produced without master

- GIVEN an episode with `status:: produced` and no master file on disk
- WHEN the check runs
- THEN it fails naming the missing file

#### Scenario: Produced without a thumbnail

- GIVEN `status:: produced` and a declared thumbnail missing on disk
- WHEN the check runs
- THEN it fails naming the thumbnail

#### Scenario: Delivered without a delivery folder

- GIVEN `status:: delivered` and no `deliveries/` folder
- WHEN the check runs
- THEN it fails naming the missing folder

#### Scenario: Failed QA without a report

- GIVEN `status:: failed_qa` and no QA report
- WHEN the check runs
- THEN it fails naming the missing report

#### Scenario: Script edit demotes

- GIVEN an `approved` episode
- WHEN a changeset edits one scene's narration
- THEN the state becomes `draft`

#### Scenario: Edit after delivery

- GIVEN a `delivered` episode with `deliveries/v1/` and an edit to scene 2's narration
- WHEN the engine reconciles the status
- THEN the status is `draft`, only scene 2's gates are open, and `deliveries/v1/` is unchanged

#### Scenario: Upstream voice change

- GIVEN a `produced` episode and a series `voice` change that changes the resolved voice of all its scenes
- WHEN the engine reconciles the status
- THEN the status is `draft` and every scene's gates are re-opened with cause `param-changed`

#### Scenario: Archived from anywhere

- GIVEN an episode in `failed_qa`
- WHEN the user sets `archived`
- THEN the transition is accepted

## ADDED Requirements

### Requirement: Status follows gate state and is reconciled on every engine read

The engine MUST reconcile `status` with the derived gate state and with the delivery folder on every invocation that reads the episode (`produce`, validation, console regeneration), writing an engine changeset only when the value changes. `delivered` MUST NOT be terminal: a delivered episode with open gates is `draft`, and after re-production it returns to `delivered`.

#### Scenario: Reconciled on regeneration

- GIVEN a `delivered` episode edited by an applied human changeset
- WHEN the console is regenerated
- THEN the stored status is `draft`

#### Scenario: Unchanged episode keeps its status

- GIVEN a `delivered` episode with no content change
- WHEN the engine reads it
- THEN no status changeset is written

#### Scenario: Round trip

- GIVEN a `delivered` episode edited and re-produced successfully
- WHEN the run ends
- THEN the status is `delivered` and the latest delivery is `v2`

### Requirement: `failed_qa` is recoverable and blocks nothing else

An episode in `failed_qa` MUST be producible again without any content change, MUST keep its previous deliveries untouched, and MUST NOT count as a delivered episode in the series index.

#### Scenario: Re-run from failed_qa

- GIVEN a `failed_qa` episode and a fix to the engine
- WHEN `produce` runs
- THEN gates are re-evaluated, cached stages are hits, and QA runs again

#### Scenario: Series index counts it separately

- GIVEN one `failed_qa` and two `delivered` episodes in a series
- WHEN the index is computed
- THEN it lists them in separate states
