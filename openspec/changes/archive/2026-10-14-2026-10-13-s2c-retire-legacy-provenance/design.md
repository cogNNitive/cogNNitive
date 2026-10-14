# Design: S2c — retire legacy provenance

## Why the ledger can go

The console review badges read `meta.feedbackState`, built by `feedbackStateFor(ledger)`
from `<domain>/feedback-ledger.jsonl` (`export-console.mjs:600-604`). The only writer of
that ledger is `record_feedback_verdict`, called by the `reconcile_feedback` procedure from
a reviewer feedback JSON. `apply_change` never wrote it. Deleting the writer, the two
tools and the JSON import removes every producer; nothing else depends on the file.

## What replaces each retired piece

| Retired | Replacement |
|---------|-------------|
| Feedback JSON export | The changeset export (already in the same modal, `composeChangesetExport`) |
| `meta.feedbackState` verdict badges | `element.history` (applied changesets: `applied` / `conflict`) and proposed changesets of the #1C `changes` collection (`proposed`) |
| Verdicts `pending` / `rejected` / `stale` | None. A proposal is reviewed by applying it or not. Per-draft staleness stays (`base_hash`) |
| `reconcile_feedback` + two MCP tools | The agent proposes and applies changesets (`apply_change`; `propose_changeset` from S6) |
| `source_type: feedback` import | None: reviewer input arrives as a changeset |
| Agent Modification block and `origin: agent/human` from it | `origin` from the `author::` of the cited `## NN Change:` block |
| `origin: reviewer` | None |
| `change-log.js` (orphan) | The changeset is the change record |

## Deletion order (safety)

1. Re-point consumers: verdict badges (`review.js:318-319,1191-1193`) and citation origin
   (`console/citations.ts`, `resolve-sources.ts:14,30`) to changesets; tests first.
2. Delete the console feedback JSON export (`composeExport` feedback branch,
   `serializeFeedback`, `buildFeedbackFilename`, `validateFeedback`) and
   `feedback.schema.json`.
3. Delete the ledger engine (`feedback-ledger.ts`, `feedbackStateFor`,
   `FEEDBACK_LEDGER_FILENAME`), `meta.feedbackState`, the ledger read in
   `export-console.mjs:600-604`, and the `legacy-write-guard.js:61` entry.
4. Delete the two MCP tools and their `server.ts` registration; delete
   `reconcile_feedback_NN.md` with its template-package registration.
5. Delete the `nn-sources` feedback import and the orphan `change-log.js`.
6. Delete `agentModification.ts` and its `index.ts:173-174` / `browser.ts:81-82` exports.
7. Skills, docs, specs.

## Cross-cutting

- `strict_tdd: true`: each group leads with the test that pins the replacement or the
  absence of the symbol.
- Regenerate `console-payload.generated.cjs`, the console bundle and the innfo-mcp bundle;
  `verify.js` gates (its shape-based suite discovery picks up deletions automatically).
- Write-once: `reconcile_feedback_NN.md`, `feedback.schema.json` and `vocabulary.json` are
  unversioned and may be deleted or edited; no `_V_x-y-z_` spec file is edited.
- The console identifiers are renamed by the console spine (`single-console-shell`): need
  `feedback-export` → `changeset-export`, DOM ids `#innfo-feedback-*` → `#innfo-changeset-*`
  (and `[data-innfo-feedback-root]` → `[data-innfo-changeset-root]`). This slice does not
  rename them (dependency file, question 5, resolved).
