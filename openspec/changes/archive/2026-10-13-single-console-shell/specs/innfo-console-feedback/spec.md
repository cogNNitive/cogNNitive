# Delta for innfo-console-feedback

## ADDED Requirements

### Requirement: Feedback export reads per-model state from meta.models

The feedback export `meta.source_sha256` MUST be the `sha256` of the `meta.models` entry for the model named by `source_knowledge`, in whole-domaiNN and scoped consoles alike. When no such entry exists, `source_sha256` MUST be omitted rather than invented.

#### Scenario: Scoped export carries the model hash
- GIVEN a console scoped to model A whose `meta.models[0].sha256` is `H`
- WHEN a feedback export is built
- THEN `meta.source_sha256` equals `H`

#### Scenario: No matching entry
- GIVEN a `source_knowledge` that matches no `meta.models` entry
- WHEN a feedback export is built
- THEN `meta.source_sha256` is absent and the file still validates

## Dropped from this delta (reconciled 2026-10-13)

The `MODIFIED: Reconcile Feedback Procedure` requirement was dropped. The console spine must
not author a procedure that records verdicts into `feedback-ledger.jsonl` via
`record_feedback_verdict`: the ledger and those tools are retired, and the procedure itself is
REMOVED by `2026-10-13-s2c-retire-legacy-provenance`, which owns that requirement. The ADDED
requirement above is unaffected — it reads the per-model `sha256`, not the ledger.

## MODIFIED Requirements
