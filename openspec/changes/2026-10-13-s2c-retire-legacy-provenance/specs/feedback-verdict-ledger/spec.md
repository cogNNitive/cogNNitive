# Delta for feedback-verdict-ledger

## REMOVED Requirements

### Requirement: Feedback verdict ledger

**Reason**: Per D15, the changeset is the single provenance medium. The
`feedback-ledger.jsonl` file, its engine (`feedback-ledger.ts`, `feedbackStateFor`) and
the two MCP tools (`evaluate_feedback_items`, `record_feedback_verdict`) are retired.
`apply_change` never wrote the ledger, so its only writers were the retired tools.

**Migration**: None. Reviewed/stale console state is derived from the changesets
(per-element `history`) and per-draft `base_hash`. Any `feedback-ledger.jsonl` on disk is
ignored.

#### Scenario: The ledger engine is gone
- GIVEN the repository after this change
- WHEN `feedbackStateFor` or `feedback-ledger` is searched for
- THEN no definition remains

#### Scenario: The tools are gone
- GIVEN the MCP tool list
- WHEN it is read
- THEN neither `evaluate_feedback_items` nor `record_feedback_verdict` is present
