# Archive Report: 2026-10-12-console-review-hardening

**Archived**: 2026-10-12
**Mode**: openspec

## Specs Synced
| Capability | Action | Details |
|------------|--------|---------|
| innfo-console-runtime | Updated | 3 requirements added (untrusted text and CSP, resolvable exported changesets, per-draft staleness) |
| console-review-mode | Updated | 1 requirement added (multi-tab draft store, visible write failures, clear exported drafts) |
| console-export-cli | Updated | 1 requirement added (stable domain identity, model-qualified element ids) |
| changeset-apply-engine | Updated | 2 requirements added (base_hash precondition, crash-safe persist); Phase 2 wording "moved" changed to "copied" |
| feedback-verdict-ledger | Updated | 1 requirement added (sourcePath containment) |

Living specs only grew: 144 lines added, 2 removed (the Phase 2 wording).

## Verification
- Implemented in PR #169 (single PR, `size:exception` declared in the description). CI green.
- A fresh-context review found no critical issues; three warnings were fixed in `575570d3` and a test of the fix was corrected in `1e5ecedb`.
- The full `scripts/verify.js` did not finish locally (over 30 minutes); CI `verify` is the verifier.
- Deferred, tracked in cogNNitive/cogNNitive#171: cross-model apply rollback, false `STALE_BASE_HASH` with duplicate element names, draft-key migration, guard-primary-tree checking cwd instead of target path, CSP tightening, symlink-aware `isInsideRoot`, splitting the runtime.
- No version bump: `innfo-console` stays 0.9.7 until a release is cut.
