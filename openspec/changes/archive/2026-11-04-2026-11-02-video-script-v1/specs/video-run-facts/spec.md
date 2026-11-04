# video-run-facts Specification

## Purpose

Defines the append-only JSONL facts of a run: the spend ledger and the stage timing log, their schemas, location and guarantees. Facts stay JSONL by decision (D11, D13). Console views read them. Change `2026-11-02-video-script-v1`, aligned to design.md A13 and the data shapes.

## ADDED Requirements
### Requirement: Facts Are Machine-Local Files Under .cognnitive/video

The ledger MUST be `<domaiNN>/.cognnitive/video/ledger.jsonl` and the timing log `<domaiNN>/.cognnitive/video/timings.jsonl`, one file of each per machine. The previous `.cognnitive/video-ledger.jsonl` MUST NOT be read. The files MUST be gitignored and MUST NOT be committed. Comparing machines MUST merge the files at console export time.

#### Scenario: New location

- GIVEN a run on a domaiNN
- WHEN the domaiNN is listed
- THEN the facts are under `.cognnitive/video/` and no `.cognnitive/video-ledger.jsonl` is written or read

#### Scenario: Old ledger ignored

- GIVEN a legacy `.cognnitive/video-ledger.jsonl` with records
- WHEN the Series view data is collected
- THEN none of its records is included

### Requirement: Spend Ledger Row Schema

The ledger MUST be append-only JSONL. Every row MUST carry `v` (2), `ts`, `run_id`, `episode`, `plan_hash`, `stage`, `kind`, `model`, `cache_key`, `units`, `unit_price`, `price_date`, `price_source`, `est_usd`, `actual_usd`, `cache_hit`, `outcome` (`ok`, `failed` or `blocked`), `queue_ms`, `processing_ms` and `machine` (the object carrying at least the `fp` fingerprint of "Stage Timing Row Schema"). Rows MUST NOT be rewritten or deleted by the engine. Queue time and processing time MUST be separate values, and every row MUST carry the machine fingerprint so logs from several machines can be compared when merged by hand.

#### Scenario: Row carries keys

- GIVEN a paid TTS call during `produce`
- WHEN its ledger row is read
- THEN it carries the episode, `run_id`, `plan_hash`, model, units, unit price with date and source, estimate, actual cost, outcome and the machine fingerprint

#### Scenario: Append-only

- GIVEN an existing ledger
- WHEN a run completes
- THEN every earlier line is byte-identical

#### Scenario: Cache hits are recorded

- GIVEN a cache hit
- WHEN the run completes
- THEN a row with `cache_hit: true` and zero `actual_usd` exists

#### Scenario: Queue and processing are separate

- GIVEN an avatar prediction that queued for 40 s and processed for 90 s
- WHEN its row is read
- THEN `queue_ms` is 40000 and `processing_ms` is 90000

#### Scenario: Blocked stop is recorded

- GIVEN a run stopped by the budget gate
- WHEN the ledger is read
- THEN a row with `outcome: blocked` names the `plan_hash`

### Requirement: Real Cost Per Episode Is Derivable

Summing `actual_usd` by `episode` MUST give the episode's real cost, and a run summary MUST equal the ledger rows of that run. The ledger MUST be writable before the first provider call; when it cannot be written the run MUST fail before the call.

#### Scenario: Sum equals summary

- GIVEN a completed run
- WHEN the ledger rows of its `run_id` are summed
- THEN the total equals the real cost in the summary

#### Scenario: Unwritable ledger blocks spend

- GIVEN a read-only ledger
- WHEN `produce` runs
- THEN it fails before the first provider call

### Requirement: Prices Are Part Of The Plan Hash

The `plan_hash` MUST be the sha256 of canonical JSON `{episode, blueprint_version, items:[{kind, model, cache_key, units, unit_price, price_date}]}`, so that a price change yields a different hash and invalidates an earlier approval.

#### Scenario: Price change changes the hash

- GIVEN two estimates of the same script with different resolved prices
- WHEN their hashes are compared
- THEN they differ

#### Scenario: Same inputs same hash

- GIVEN two estimates with identical script and prices
- WHEN their hashes are compared
- THEN they are equal

### Requirement: Stage Timing Row Schema

Every stage of every run (`plan`, `tts`, `image`, `avatar`, `compile`, `render`, `formats`, `apply`) MUST append one row with `v` (1), `ts`, `run_id`, `episode`, `plan_hash`, `stage`, `start`, `end`, `duration_ms`, `link_mode`, `machine`, `cache` (`hits`, `misses`) and, for `render`, `render` (`frames`, `fps_effective`, `width`, `height`). `machine` MUST carry `fp`, `cpu`, `cores`, `gpu` (or null), `ram_gb`, `os`, `node` and `hyperframes`, where `fp` is the first 12 hex characters of the sha256 of the canonical `machine` object without `fp`. A failed stage MUST record its outcome and no later stage row MUST exist.

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

### Requirement: A Timing Write Failure Does Not Stop A Run

A failure to append a timing row MUST produce a warning and MUST NOT fail or stop a run. A ledger failure remains governed by "Real Cost Per Episode Is Derivable".

#### Scenario: Timing log unwritable

- GIVEN a read-only timing log
- WHEN `produce` runs
- THEN the run completes and a warning names the file
