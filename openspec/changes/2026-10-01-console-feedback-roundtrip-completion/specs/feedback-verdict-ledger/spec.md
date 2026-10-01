# Feedback Verdict Ledger Specification

## Purpose

Persist reconcile verdicts in an append-only ledger at the domaiNN root, separate from the immutable feedback sources. New capability: absent from `openspec/specs/` at HEAD. Parse, serialize and latest-wins logic exist in `innfo-core/src/console/feedback-ledger.ts` (path-agnostic, pure); the gaps are the location, the write path, and stale detection.

## Requirements

### Requirement: Ledger Location and Format

Verdicts MUST be stored in `<domaiNN root>/feedback-ledger.jsonl`, one JSON object per LF-terminated line. The ledger MUST NOT live under `sources/`, `import/` or `.cogNNitive/`, because `sources/import/feedback/*.json` are immutable citable sources. Each entry MUST carry `v`, `at`, `source {kind, path, sha256}`, `item`, `model_id`, `model_version`, `status` (`pending`|`applied`|`rejected`|`stale`) and `by`, and MAY carry `element_id`, `target_hash`, `layer` (`scope`|`data`|`domain`|`anomaly`), `severity` (`low`|`medium`|`high`), `note` and `confirm_stale` (`true`). The entry key is `source.sha256#item`.

#### Scenario: Root path

- GIVEN a reconcile run that records a verdict
- WHEN the file is located
- THEN it is `<domaiNN root>/feedback-ledger.jsonl` and no ledger exists under `sources/`

#### Scenario: Parse errors carry the line

- GIVEN a ledger with one malformed line
- WHEN parsed
- THEN the error names that line number and the other entries still load

### Requirement: Writes Go Through a Validating Tool

Entries MUST be written only by two MCP tools: `record_feedback_verdict` (validates and appends exactly one verdict line) and `evaluate_feedback_items` (appends `stale` observations only, see below). Each append MUST be a single validated LF-terminated line behind a per-path write queue, and a tool MUST refuse to write when the file's last byte is not `\n`. The tools MUST derive `source.sha256`, `model_id`, `model_version`, `element_id` and `target_hash` themselves; the caller supplies only `source_path`, `item`, `status`, `by` and optional triage. Agents MUST NOT edit the file as free prose. Existing lines MUST NOT be edited or deleted.

#### Scenario: One validated line appended

- GIVEN a ledger with N lines and a valid verdict
- WHEN the tool is called
- THEN the file has N+1 lines and the first N are byte-identical

#### Scenario: Invalid entry refused

- GIVEN a verdict with an unknown `status` or a missing `source.sha256`
- WHEN the tool is called
- THEN it errors and the file is unchanged

### Requirement: Latest Entry Wins

The effective status of an item MUST be that of its newest entry per `source.sha256#item`. Appending a newer entry, including `pending`, MUST reopen a `rejected` item.

#### Scenario: Reopen rejected

- GIVEN an item with a `rejected` entry
- WHEN a later `pending` entry is appended
- THEN its effective status is `pending`

### Requirement: Stale Detection and Reconfirmation

A pure `innfo-core` function (`evaluateFeedbackItems`) MUST compute staleness. An item MUST be `stale` when it carries `base_hash` and that differs from the current hash of its target element; an item without `base_hash` MUST be `stale` when `source_knowledge_version` differs from the current model version. An item whose target element cannot be found (by `element_id`, nor by `concept` plus element name) MUST be `orphaned`.

Staleness MUST be evaluated BEFORE an item is applied, never at record time: applying an item changes its element hash, so a check made when the verdict is recorded would flag every applied item. The `evaluate_feedback_items` tool MUST run that evaluation, MUST append a `stale` entry for each newly stale item (idempotent: no second `stale` entry while the effective status is already `stale`), and MUST NOT append anything else. The recorded `target_hash` of every entry is the item's `base_hash` (the hash at export time), not the current hash.

The `record_feedback_verdict` tool MUST refuse an `applied` entry while the item's effective status is `stale`, unless called with `confirm_stale: true`; the confirmation MUST be persisted on the appended entry. It MUST refuse `applied` on an orphaned item. A refusal MUST leave the file unchanged.

#### Scenario: Changed target blocks apply

- GIVEN an item whose target element content changed since export
- WHEN `evaluate_feedback_items` runs before any apply
- THEN a `stale` entry is appended for it
- AND a later `record_feedback_verdict` with `applied` and no `confirm_stale` is refused with the file unchanged

#### Scenario: Reconfirmation

- GIVEN a `stale` item
- WHEN `applied` is recorded with `confirm_stale: true`
- THEN the entry is appended with `confirm_stale: true` and the effective status is `applied`

#### Scenario: Applied item is not flagged after its own edit

- GIVEN a fresh item that was evaluated before apply and then applied, which changed its element hash
- WHEN `applied` is recorded
- THEN it is accepted without `confirm_stale`

#### Scenario: Unchanged target

- GIVEN an item whose `base_hash` equals the current element hash
- WHEN evaluated
- THEN it is not stale

#### Scenario: Version fallback and orphan

- GIVEN an item without `base_hash` and a model version differing from `source_knowledge_version`, and another item whose element no longer exists
- WHEN evaluated
- THEN the first is `stale` and the second is `orphaned`, and `applied` over the orphan is refused

#### Scenario: Evaluation is idempotent

- GIVEN an item already `stale` in the ledger
- WHEN `evaluate_feedback_items` runs again
- THEN no new line is appended

### Requirement: Feedback Sources Stay Immutable

Reconcile MUST write only `<domaiNN root>/feedback-ledger.jsonl` for verdicts and MUST NOT modify any feedback source file.

#### Scenario: Sources unchanged

- GIVEN feedback sources hashed before a reconcile run
- WHEN the run ends
- THEN every source hash is identical

### Requirement: Triage Lives Only in the Ledger

`layer`, `severity`, `target_hash` and `stale` MUST exist only on ledger entries. `feedback.schema.json` MUST NOT define them as allowed properties; because the schema keeps `additionalProperties: true`, it MUST forbid each of them on items as an explicit `false` property. They MUST NOT appear in reviewer exports.

#### Scenario: Export omits triage

- GIVEN a console export
- WHEN inspected
- THEN no item carries `layer`, `severity` or `target_hash`, and the schema allows none of them (each is a `false` property)
