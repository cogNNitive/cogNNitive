# Design: Console Unified Review Pipeline

## Technical Approach

A consolidated overhaul of the console system combining shell integrity, design system modernization, schema-conformant feedback loop, and streamlined review UX.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Shell Integrity** | Single `scripts/lib/console-shell-guard.js` checking `needs[]` vs required anchors and matching manifest version pins | Eliminates shell drift and guarantees shells declare only valid capabilities. |
| **Thin Shell Collapse** | Retain single config-driven `artifact_shell.html`; retire redundant thin shells | Eliminates 5 copy-paste shells with identical layouts. |
| **Design Tokens** | Standardized `--innfo-*` CSS variables attached to `:root` / `.innfo-theme` | Single source of visual styling for charts, badges, cards, modals, and typography. |
| **Payload Builder** | `buildConsolePayload` in `iNNfo/packages/innfo-core` | Guarantees identical payload structure (stable element IDs, SHA-256, relations, citations) across CLI and compile procedures. |
| **Feedback UI Injection** | Bundle injects `#innfo-banner`, `#innfo-export-open`, `#innfo-export-modal` when `feedback-export` is declared | Removes DOM anchor coupling from HTML templates. |
| **Verdict Ledger** | Append-only `sources/import/feedback/ledger.jsonl` | Preserves feedback source immutability while tracking applied/rejected verdicts deterministically. |
| **Unified Reconcile** | Single canonical `reconcile_feedback_NN.md` procedure | Replaces blueprint-specific duplication with one standard workflow. |

## Data Flow

```
1. Compile / Export
   Model Markdown ──> buildConsolePayload (innfo-core) ──> Console HTML with embedded payload

2. Review & Feedback Export
   Reviewer ──> Console In-Place Review ──> Export Feedback ──> feedback.schema.json (validated)

3. Ingestion & Reconciliation
   Feedback JSON ──> sources/import/feedback/ (immutable)
   reconcile_feedback ──> applies changes to model & writes verdicts to ledger.jsonl
   Regenerated Console reflects updated model and meta.feedbackState
```
