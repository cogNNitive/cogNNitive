# conntent-review Delta Spec

Slice 3. The whole capability is removed and superseded by `conntent-review-gates` (with the generic operation in `changeset-review-gate`). No compatibility for `script_review` or for approval read from the `review::` field.

## REMOVED Requirements

### Requirement: Review Decisions Are Per Scene

**Reason**: Verdicts are no longer Scene fields set by the reviewer. They are `review_gate` changes applied from a human console changeset, with the reason in `notes`; `review::` is an engine-written display mirror.

**Migration**: None. See `conntent-review-gates` ("Gate state is derived, never stored in a field") and `changeset-review-gate`. The estimated cost against the budget with price provenance is shown by the console from the persisted plan (`conntent-run-facts`).

### Requirement: Decisions Are Persisted As Changesets, Never View-Only

**Reason**: Kept in substance by `changeset-review-gate` and `innfo-console-feedback` (every decision is a changeset operation; no sidecar holds review state), with verdicts now a dedicated operation instead of an edited field plus a `comment`.

**Migration**: None.

### Requirement: Approval Requires Every Scene Approved

**Reason**: Replaced by per-gate derived state and the lifecycle rule "approved when every configured gate is satisfied for every scene" (`conntent-review-gates`, `conntent-episode-lifecycle`).

**Migration**: None.

### Requirement: Review Gate Is A Cascade Field

**Reason**: `script_review` (`required`/`skip`) is replaced by `review_gates` (a list, default `[script, preview]`, `[]` for autopilot).

**Migration**: None. A document declaring `script_review` fails validation naming `review_gates`.

### Requirement: Budget Gate Is Independent Of The Review Gate

**Reason**: Replaced by "A budget gate is inserted when preview is absent and the plan is over budget" and "Spend authorization is one mechanism" in `conntent-review-gates`. The `--approve <plan_hash>` flag no longer exists; an over-budget plan is authorized only by an applied human `preview` or `budget` verdict, and an unset `budget` is a spend stop (exit 11), never an auto-approval.

**Migration**: None.

### Requirement: A Needs-Change Scene Is Regenerated Alone

**Reason**: Moved into `conntent-review-gates` ("Re-open is scoped to the affected scenes"), where scoping follows gate hashes instead of a `needs-change` field value.

**Migration**: None.
