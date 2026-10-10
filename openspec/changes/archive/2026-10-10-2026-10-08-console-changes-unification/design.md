# Design: Console Changes Unification

## Architecture Decisions

### D1: Changes as Canonical Concept
- Every mention in UI copy evolves from "Feedback" / "Review" to "Changes" (e.g., "Export changes", "Pending changes", "Changes").
- Internal technical IDs (`#innfo-feedback-modal`, `#innfo-feedback-open`, `#innfo-tab-review`, `needs: ["feedback-export"]`) are kept intact to satisfy harness and template parity rules without requiring cascading rewrites across frozen artifacts.

### D2: Elimination of JSON Export from Runtime
- The modal layout is streamlined:
  - Header: "Export proposed changes"
  - Preview section: `UI.DraftList`
  - Identifier input: "Author / Reviewer identifier"
  - Markdown preview `<textarea data-innfo="changeset-preview" readonly>` displaying normative Changeset Markdown.
  - Actions:
    - `<button data-innfo="download-changeset">Download _changes_NN.md</button>`
    - `<button data-innfo="copy-changeset-prompt">Copy Changeset Prompt</button>`
- The legacy JSON `<textarea data-innfo="export-json">` and legacy JSON action buttons (`data-innfo="download"`, `data-innfo="copy"`) are removed.

### D3: Changes Tab Direct Export Trigger
- Inside `renderReviewTab()` in `innfo-runtime.js`, render an action bar at the top of the Changes panel if drafts are present:
  - "Export changes" button that triggers the export modal.
