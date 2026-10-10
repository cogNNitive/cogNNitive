# Proposal: Console Changes Unification

## Why
Currently in the domain and model consoles (`iNNfo/specs/bluepriNNts/console/`), two parallel export workflows coexist inside `#innfo-feedback-modal`:
1. Legacy JSON review export (`<Model>_V_<Version>_<user>_review.json` and raw JSON clipboard copy), which was scheduled for retirement under Decision D15 (`openspec/backlog.md`).
2. Modern Changeset Markdown export (`<Model>_<user>_<stamp>_changes_NN.md` and prompt copy), which produces canonical iNNfo `changes` blueprint documents.

Furthermore, UI terminology is fragmented across "feedback", "review", and "changes". The canonical vocabulary and blueprint hierarchy formalizes this layer as **changes** (e.g. `changes` bluepriNNt, `_changes_NN.md`, `apply_change`).

## What Changes
1. **Unify UI Terminology to "Changes"**:
   - Header action button: "Export changes" (with backward-compatible IDs/classes).
   - Review tab label: "Changes" (target `#innfo-tab-review`).
   - Modal title & headings: "Export proposed changes" / "Export Changeset".
2. **Retire Legacy JSON Export**:
   - Remove the JSON textarea (`[data-innfo="export-json"]`) and JSON download/copy buttons from `#innfo-feedback-modal`.
   - The modal exclusively displays the Changeset Markdown preview, "Download _changes_NN.md" and "Copy Changeset Prompt".
3. **Tab Action Integration**:
   - Provide direct action buttons ("Export changes" / "Download _changes_NN.md") directly inside the Changes tab (`#innfo-tab-review`) so users don't have to seek out the header button when reviewing their draft list.
4. **Preserve Compatibility**:
   - Retain existing DOM IDs (`#innfo-feedback-modal`, `#innfo-feedback-open`, `#innfo-tab-review`) and config need (`feedback-export`) to avoid breaking existing templates, harnesses, and test queries.

## Resolution (2026-10-10)

Implemented in PR #156: the legacy JSON review export was removed — the hidden
`data-innfo="download"` / `data-innfo="copy"` buttons, their wiring, and the
`downloadFeedbackExport` / `copyExport` / `downloadExport` handlers are gone; the
preview textarea is now `data-innfo="changeset-preview"` and every export affordance
is the changeset. The `composeExport` API is retained. Console bundle rebuilt; the
affected tests were repointed to the changeset hooks.
