# Feedback Verdict Ledger Specification

## Purpose

Persist reconcile verdicts (`applied` / `rejected` / `stale`, plus `pending` to reopen) in an append-only ledger separate from immutable feedback sources.

## Requirements

### Requirement: Append-Only Ledger

Verdicts MUST be stored in `<domain>/feedback-ledger.jsonl`: one committed file at the domain root, one JSON object per LF-terminated line. It MUST NOT live under `sources/`, `import/` or `.cogNNitive/`. Each entry MUST carry `v`, `at`, `source {kind, path, sha256}`, `item`, `model_id`, `model_version`, `status` and `by`, and MAY carry `target_hash`, `layer`, `severity` and `note`. Entries MUST only be appended; existing entries MUST NOT be edited or deleted. `source.kind` (`console-json` | `docx`) makes the envelope path-agnostic so the DOCX reconcile can write to it later. Verdicts MUST be written through the `record_feedback_verdict` MCP tool, never by hand-editing the file. The entry key is `source.sha256#item`.

#### Scenario: Verdict persisted

- GIVEN a feedback item accepted by reconcile
- WHEN reconcile finishes
- THEN one `applied` entry is appended keyed by `source.sha256#item`

#### Scenario: Entries are never rewritten

- GIVEN an existing ledger with N entries
- WHEN a new verdict is recorded
- THEN the first N lines are byte-identical

#### Scenario: Parse errors carry the line

- GIVEN a ledger with one malformed line
- WHEN it is parsed
- THEN the error names that line number and the other entries still load

### Requirement: Latest Entry Wins

The effective status of an item MUST be that of its newest ledger entry. A `rejected` item MAY be reopened by appending a newer entry, and appending `pending` reopens an item.

#### Scenario: Reopen rejected

- GIVEN an item with a `rejected` entry
- WHEN a later `applied` entry is appended
- THEN its effective status is `applied`

### Requirement: Feedback Sources Stay Immutable

Reconcile MUST NOT modify any feedback source file.

#### Scenario: Source unchanged

- GIVEN feedback files before and after a reconcile run
- WHEN their hashes are compared
- THEN all are identical

### Requirement: Stale Item Flagging

When an item's `base_hash` differs from the current hash of its target element, reconcile MUST append a `stale` entry. An `applied` entry over a `stale` item MUST be refused unless the call passes `confirm_stale: true`, and the confirmation is recorded as the newer entry.

#### Scenario: Changed target blocked

- GIVEN an item whose target content changed since export
- WHEN reconcile runs
- THEN the item is flagged `stale` and `applied` is refused until `confirm_stale: true`

### Requirement: Feedback State in Console

The regenerated console MUST embed `meta.feedbackState` as `[{id, source, element_id, status, version}]` derived from effective ledger statuses, computed by `feedbackStateFor(entries, modelId)`.

#### Scenario: Verdict survives regeneration

- GIVEN an `applied` verdict and a re-run of reconcile
- WHEN the console regenerates
- THEN `meta.feedbackState` still lists the item as `applied`

### Requirement: Triage Lives in the Ledger

Reconcile SHALL set optional `layer` (`scope` | `data` | `domain` | `anomaly`, mapped to the four layers of `reconcile_artifact_feedback`) and `severity` (`low` | `medium` | `high`) on ledger entries only. They MUST NOT appear in `feedback.schema.json` or in reviewer exports.

#### Scenario: Reviewer export omits triage

- GIVEN a console export
- WHEN items are inspected
- THEN none carries `layer` or `severity`, and the schema does not define them

### Requirement: Read-Only Status Tool

The `feedback_items_status` MCP tool MUST report, per item, the effective status, `target_changed` and `orphaned`, without writing.

#### Scenario: Orphaned item

- GIVEN an item matching no element by `element_id` or `concept` + `element`
- WHEN status is requested
- THEN it is reported `orphaned`
