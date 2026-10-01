# Delta for Batch Domain Update

## ADDED Requirements

### Requirement: Discovery and Classification

`batch-update.js --scan` MUST discover candidate domaiNN workspaces under a parent directory, excluding `-backup-*`, `_archive`, `_templates`, and dot-directories. The scan MUST be READ-ONLY (zero domain writes) and MUST classify each candidate `ready`/`noop`/`blocked`/`skipped`.

#### Scenario: Backups and archives are never candidates
- GIVEN a parent directory containing a domaiNN and its `-backup-*` sibling
- WHEN `--scan` runs
- THEN `-backup-*` is excluded
- AND never classified `ready`

#### Scenario: Scan does not write
- GIVEN any set of candidates
- WHEN `--scan` runs
- THEN no domain file is created, modified, or deleted

### Requirement: Persisted Batch Plan

`--scan` MUST write a machine-readable `batch-plan.json` recording each domain's `path`, `status`, op count, and `planHash`. The plan MUST be re-runnable and diffable, and `batch-plan.json` MUST NOT be discovered as a candidate.

#### Scenario: Plan records per-domain hash
- GIVEN two `ready` domaiNNs
- WHEN `--scan` completes
- THEN `batch-plan.json` lists both with `status: ready`, op count, and `planHash`

### Requirement: Explicit Non-Interactive Selection

Selection MUST be expressible via `--only`/`--exclude` and/or the plan file, with NO blocking numbered menus; an empty selection MUST apply nothing.

#### Scenario: Empty selection is a no-op
- GIVEN a valid `batch-plan.json`
- WHEN `--apply` runs with `--exclude` matching every candidate
- THEN no domain is applied

#### Scenario: Explicit subset
- GIVEN candidates `A`, `B`, `C`
- WHEN `--apply --only A --yes` runs
- THEN only `A` is applied

### Requirement: Per-Domain Atomic Apply with Drift Guard

`--apply` MUST run each selected domain through the existing unit (`migrate-domain.js --apply --plan-hash <hash>`). Each domain's `planHash` MUST be re-validated; a mismatch MUST abort that domain without partial writes. `--yes` consent MUST be required.

#### Scenario: Drift aborts one domain
- GIVEN a domain whose tree changed since `--scan`
- WHEN `--apply --yes` runs
- THEN that domain aborts with a drift error
- AND no partial write occurs for it

#### Scenario: Consent required
- GIVEN a selected `ready` domain
- WHEN `--apply` runs without `--yes`
- THEN nothing is applied

### Requirement: Per-Domain Atomicity (No Fused Transaction)

The batch MUST NOT fuse domains into one transaction; each domain MUST keep its own backup and journal. One domain's failure MUST NOT invalidate already-applied domains.

#### Scenario: Independent journals
- GIVEN domains `A` and `B` applied in one run
- WHEN `B` fails
- THEN `A` remains applied with its own backup and journal
- AND `B`'s failure does not roll back `A`

### Requirement: Aggregate Journal and Batch Rollback

The run MUST record an aggregate journal referencing per-domain backups/journals in order, enabling reverse-order restore of the batch or a subset via `migrate-domain.js --restore`.

#### Scenario: Reverse-order restore
- GIVEN a completed batch of `A` then `B`
- WHEN the aggregate journal is replayed for rollback
- THEN `B` is restored before `A`

### Requirement: Idempotent and Resumable

Re-running MUST skip `noop` and already-applied domains without duplicate work or backup-of-backup chains.

#### Scenario: Re-run is a no-op
- GIVEN a batch whose selected domains are already applied
- WHEN `--apply` re-runs
- THEN each domain is skipped
- AND no new backup is created

### Requirement: Skill Integration (Flow C)

The capability MUST be documented as `nn-upgrade` Flow C and MUST reuse `migrate-domain.js`; it MUST NOT reimplement migration logic and MUST NOT delete legacy/quarantine code.

#### Scenario: Reuse, not reimplement
- GIVEN Flow C is invoked
- WHEN per-domain migration runs
- THEN it delegates to `migrate-domain.js`
- AND no migration logic is duplicated

### Requirement: Scope Boundary

v1 MUST cover Flow A only (offline/deterministic); Flow B (blueprint version upgrade) batching is out of scope. The run MUST gate the legacy-ledger removal condition without itself removing legacy code.

#### Scenario: No legacy deletion
- GIVEN a completed batch run
- WHEN it finishes
- THEN no legacy/quarantine code is deleted
