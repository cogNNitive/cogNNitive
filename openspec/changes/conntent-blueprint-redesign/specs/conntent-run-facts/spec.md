# conntent-run-facts Delta Spec

Slice 3, PR 3b. One ledger path (written equals read), a persisted plan with `plan_hash`, the new pipeline stages in the timing log, and the gate-state record.

## MODIFIED Requirements

### Requirement: Facts Are Machine-Local Files Under .cognnitive/video

The ledger MUST be `<domaiNN>/.cognnitive/video/ledger.jsonl` and the timing log `<domaiNN>/.cognnitive/video/timings.jsonl`, one file of each per machine, and the engine MUST write to and read from exactly those paths through one path-resolution function used by both the writer and every reader. The previous `.cognnitive/video-ledger.jsonl` MUST NOT be written or read; its presence MUST fail the run before spend through the layout check with `legacy-layout`, naming the new path (`conntent-folder-contract`, "Legacy Layouts Are Rejected, Not Adapted", the owner of that message). The files MUST be gitignored and MUST NOT be committed. Comparing machines MUST merge the files at console export time.
(Previously: a legacy ledger was silently ignored, and the code wrote a path the spec did not name.)

#### Scenario: New location

- GIVEN a run on a domaiNN
- WHEN the domaiNN is listed
- THEN the facts are under `.cognnitive/video/` and no `.cognnitive/video-ledger.jsonl` is written

#### Scenario: Writer equals reader

- GIVEN a spend recorded by `produce`
- WHEN the console data collector and the daily-budget check read the ledger
- THEN both find the row at the path the writer used

#### Scenario: Legacy ledger rejected

- GIVEN a legacy `.cognnitive/video-ledger.jsonl` with records
- WHEN `produce` runs
- THEN it fails with `legacy-layout` before any provider call and names `.cognnitive/video/ledger.jsonl`

### Requirement: Prices Are Part Of The Plan Hash

The plan MUST be built from per-scene slices (design D-P1, X3). The plan slice hash of a scene MUST be the sha256 of canonical JSON `{scene, items:[{kind, model, cache_key, units, unit_price, price_date}]}` over that scene's items. The episode `plan_hash` MUST be the sha256 of canonical JSON `{episode, blueprint_version, slices:[{scene, slice_hash}]}` with the slices sorted by scene, so that a price change yields a different hash and invalidates an earlier approval, and a change confined to one scene changes only that scene's slice hash. Both values MUST be stored in the persisted plan and published in the console data; the episode `plan_hash` MUST also be printed by `produce` and written to the ledger rows of the run. A `preview` verdict carries the scene slice hash and a `budget` verdict carries the episode `plan_hash` (`conntent-review-gates`). Cached items MUST appear in `items` with their unit price so that a cache change alters the hash only through `cache_key`.

#### Scenario: Price change changes the hash

- GIVEN two estimates of the same script with different resolved prices
- WHEN their hashes are compared
- THEN they differ

#### Scenario: Same inputs same hash

- GIVEN two estimates with identical script and prices
- WHEN their hashes are compared
- THEN they are equal

#### Scenario: One value everywhere

- GIVEN a run
- WHEN the persisted plan, the ledger rows and the console data are read
- THEN they carry the same `plan_hash`

#### Scenario: One-scene change touches one slice

- GIVEN a three-scene plan and a narration edit in scene 2
- WHEN the plan is rebuilt
- THEN only scene 2's slice hash changes and the episode `plan_hash` changes

### Requirement: Stage Timing Row Schema

Every stage of every run (`plan`, `tts`, `image`, `captions`, `animatic`, `avatar`, `compile`, `render`, `qa`, `formats`, `description`, `delivery`, `apply`) MUST append one row with `v` (1), `ts`, `run_id`, `episode`, `plan_hash`, `stage`, `start`, `end`, `duration_ms`, `link_mode`, `machine`, `cache` (`hits`, `misses`) and, for `render`, `render` (`frames`, `fps_effective`, `width`, `height`). The `qa` stage MUST append one row per checkpoint (master, output set). The `tts` and `image` rows MAY overlap in time. `machine` MUST carry `fp`, `cpu`, `cores`, `gpu` (or null), `ram_gb`, `os`, `node` and `hyperframes`, where `fp` is the first 12 hex characters of the sha256 of the canonical `machine` object without `fp`. A failed stage MUST record its outcome and no later stage row of that run MUST exist, except that the rows of a concurrent stage already running MAY complete.
(Previously: stages `plan`, `tts`, `image`, `avatar`, `compile`, `render`, `formats`, `apply`, strictly sequential.)

#### Scenario: Render row

- GIVEN a completed render stage
- WHEN its timing row is read
- THEN it carries frames, effective fps, width, height and duration

#### Scenario: Fingerprint is derived

- GIVEN any timing row
- WHEN `fp` is recomputed from the rest of `machine`
- THEN it equals the stored `fp`

#### Scenario: Failed stage is recorded

- GIVEN a render that fails
- WHEN the log is read
- THEN the render row has the failure outcome and no later stage row exists

#### Scenario: New stages are logged

- GIVEN a run with captions on that delivers
- WHEN the log is read
- THEN rows exist for `captions`, `animatic`, `qa` (twice), `description` and `delivery`

#### Scenario: Concurrent stages overlap

- GIVEN uncached TTS and image items
- WHEN the `tts` and `image` rows are compared
- THEN their intervals overlap

## ADDED Requirements

### Requirement: The plan is persisted next to the episode

The plan written by `produce` before spend MUST be stored at the single plan location defined by `conntent-folder-contract` (`plan.json` in the episode folder), with the episode `plan_hash`, the per-scene slices and their hashes, the items, the total, the effective `budget`, the run id and the time. Only one plan file per episode MUST exist; it is rewritten each run. The plan MUST be readable by the console data exporter.

#### Scenario: One plan file

- GIVEN two successive runs
- WHEN the episode folder is listed
- THEN there is one plan file and it holds the second run's `plan_hash`

#### Scenario: Plan matches ledger

- GIVEN a completed run
- WHEN the plan items and the ledger rows of the run are compared by `cache_key`
- THEN every spend row corresponds to a plan item

### Requirement: Gate-state records live with the facts

The gate-state record (components of each gate hash when a verdict was first seen as current, and the re-open causes) MUST be stored under `.cognnitive/video/`, MUST be machine-local and gitignored, MUST be overwritten in place per episode, and MUST NOT be needed for correctness: its absence only degrades a re-open cause to `unknown`.

#### Scenario: Absence is safe

- GIVEN a deleted gate-state record
- WHEN the gate states are computed
- THEN every state is the same as before and causes are `unknown`

#### Scenario: Not committed

- GIVEN a domaiNN with git
- WHEN the ignore rules are applied to the record
- THEN it is ignored

### Requirement: Blocked rows record gate stops

A run stopped by the `budget` gate (exit 10) or by a spend stop (exit 11) MUST record a ledger row with `outcome: blocked` naming the `plan_hash` and the reason. A run stopped by `script` or `preview` MUST NOT write a spend row.

#### Scenario: Budget stop recorded

- GIVEN a run stopped by the budget gate
- WHEN the ledger is read
- THEN a row with `outcome: blocked` names the `plan_hash`

#### Scenario: Review stop spends nothing

- GIVEN a run stopped by the `script` gate
- WHEN the ledger is read
- THEN no spend row was written by it
