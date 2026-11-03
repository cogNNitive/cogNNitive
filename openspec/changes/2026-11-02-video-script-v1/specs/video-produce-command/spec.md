# video-produce-command Specification

## Purpose

Defines `produce <episode>`: the single deterministic engine command, a resumable state machine keyed on `plan_hash`, that takes an episode from a proposed script to a master with formats, recorded cost and timings, and the only two places where it stops. Decisions D4, D6 of change `2026-11-02-video-script-v1`, aligned to design.md A4 and the data-flow section.

## Requirements

### Requirement: One Command Sequences The Whole Pipeline

The engine CLI MUST provide `produce <episode>` that performs, in this order and without further instruction: intake of the proposed changeset, validation (registry keys, kinds, catalog, chrome), review or skip, kind and chrome expansion, cascade resolution, estimate, budget gate, TTS, image synthesis, avatar synthesis, compile, asset linking, render, format derivation, chapter block, and lifecycle writes. The agent MUST NOT need to invoke any of these steps individually. The CLI MUST NOT accept model-id or output-size flags, because the cascade has no `cli` level.

#### Scenario: Skip-review episode goes to produced in one run

- GIVEN an episode with an applied proposal, `script_review:: skip` and an estimate within budget
- WHEN `produce <episode>` runs
- THEN it ends with exit 0, the master and every declared format written, the state `produced`, and a summary of real cost and stage timings

#### Scenario: Order is fixed

- GIVEN a successful run
- WHEN the timing log of that run is read
- THEN the stages appear in the fixed order `plan`, `tts`, `image`, `avatar`, `compile`, `render`, `formats`, `apply` and no provider spend precedes the estimate

#### Scenario: Model flag refused

- GIVEN the engine CLI
- WHEN `produce` is run with `--avatar-model X`
- THEN it exits non-zero with a usage that does not list the flag

### Requirement: Intake Applies The Proposed Changeset

When an `idea` episode has a sealed proposed changeset P from the agent, `produce` MUST validate P against the field registry by a dry apply, then apply it and set `status:: draft` in a separate engine changeset. An invalid P MUST fail with the named error and change nothing. An `idea` episode with no P MUST fail naming that no script was proposed.

#### Scenario: Valid proposal is applied

- GIVEN an `idea` episode and a valid sealed P
- WHEN `produce` runs
- THEN P is applied, a second changeset sets `status:: draft`, and the run continues to the review gate

#### Scenario: Invalid proposal changes nothing

- GIVEN a P containing an unknown key
- WHEN `produce` runs
- THEN it fails with `unknown-key` and the episode document is unchanged

#### Scenario: No proposal

- GIVEN an `idea` episode without P
- WHEN `produce` runs
- THEN it fails naming that no script was proposed

### Requirement: Produce Stops Only At Two Points

`produce` MUST stop only (a) at the script review, exit status 10, when `script_review` resolves to `required` and no review has approved every scene (including when a scene is `needs-change`), and (b) before spend, exit status 11, when the estimate exceeds the cascaded `budget` and the run was not given `--approve <plan_hash>` for the current hash. Every other failure MUST be a named non-zero error with exit status 1. A stop MUST leave no partial spend. Exit status 0 means done.

#### Scenario: Review stop

- GIVEN `script_review:: required` and a draft with no review applied
- WHEN `produce` runs
- THEN it exits 10, exports the Episode review view, spends nothing and states how to continue

#### Scenario: Needs-change stop lists scenes

- GIVEN a scene with `review:: needs-change` and a `comment`
- WHEN `produce` runs
- THEN it exits 10 listing the scene and its comment

#### Scenario: Budget stop

- GIVEN `script_review:: skip` and an estimate above `budget`
- WHEN `produce` runs without `--approve`
- THEN it exits 11 naming the estimate, the budget and the `plan_hash`

#### Scenario: Approved hash proceeds

- GIVEN an over-budget estimate and `--approve <plan_hash>` with the current hash
- WHEN `produce` runs
- THEN no stop occurs and the run proceeds to spend

#### Scenario: Stale approval stops again

- GIVEN `--approve` with a hash that no longer equals the current `plan_hash`
- WHEN `produce` runs
- THEN it exits 11

### Requirement: Fail Before Spend

All validation and estimation MUST complete, and the ledger MUST be writable, before the first provider call. A run MUST NOT call a provider when validation, catalog resolution, guard or budget checks fail.

#### Scenario: Invalid script costs nothing

- GIVEN a script with an `unknown-key`
- WHEN `produce` runs
- THEN it fails and no ledger row of kind spend and no provider request exist

### Requirement: Produce Is Resumable And Cache-Aware

Every stage MUST be idempotent through the cache, so a re-run reuses cache hits at zero cost and resumes pending provider predictions without re-billing. The estimate of a re-run MUST price cached items at $0. The `plan_hash` MUST include resolved prices (see capability `video-run-facts`).

#### Scenario: Second run is free

- GIVEN a produced episode with unchanged inputs
- WHEN `produce` runs again
- THEN every item is a cache hit, no provider request is made and the master is replaced atomically

#### Scenario: Interrupted run resumes

- GIVEN a run interrupted after a provider prediction was submitted
- WHEN `produce` runs again
- THEN the pending prediction is resumed and not submitted twice

### Requirement: The Engine Owns Lifecycle Writes

`produce` MUST set `approved` when the review is done or skipped (removing the `Variant` elements in the same changeset) and `produced` with the `master` field only after the master and every declared format exist. Each write MUST be an engine changeset written with `writeProposedChangeset` and applied with `executeChangesetApply`. A failed run MUST NOT set `produced`.

#### Scenario: Produced is set last

- GIVEN a run that fails during rendering
- WHEN the episode record is read
- THEN the state is `approved` and `master` is unchanged

#### Scenario: Status written through the apply engine

- GIVEN a successful run
- WHEN the change history of the episode is read
- THEN the `approved` and `produced` writes are changesets applied by the engine and valid under the changeset parser

### Requirement: Produce Refuses Episodes It Cannot Produce

`produce` MUST fail with a named error for an episode in state `published` or `archived`, and for an episode whose frontmatter `blueprint_version` is not the installed one.

#### Scenario: Archived cannot be produced

- GIVEN an episode in state `archived`
- WHEN `produce` runs
- THEN it fails naming the state

#### Scenario: Old pinned version

- GIVEN an episode with `blueprint_version: V_0-14-1`
- WHEN `produce` runs
- THEN it fails naming the pin and the installed version, and converts nothing

### Requirement: Produce Reports Real Cost And Timings

At the end of a run `produce` MUST print, per stage, duration and cache hits, the total real cost against the estimate and the budget, the link mode, and the chapter block of the description.

#### Scenario: Summary printed

- GIVEN a completed run
- WHEN the summary is read
- THEN it lists each stage with its duration, the real total cost, the estimate, the budget and the chapter lines
