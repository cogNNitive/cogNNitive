# Proposal: Console TiddlyWiki Patterns (Declarative Filter Syntax & Live Draft Overlay)

## Why

Following the integration of Preact, HTM, DaisyUI, and Lucide icons into the offline console bundle (`2026-10-08-console-ui-modern-foundation`), the console runtime (`innfo-runtime.js`) now has a reactive VDOM engine, but still retains two limitations derived from its earlier imperative heritage:

1. **Primitive substring search:** The toolbar search only supports flat substring search across element text (`elementHaystack`). Users cannot filter by structural coordinates or review status (e.g., `concept:Task`, `is:draft`, `is:reviewed`, `!has:notes`).
2. **Disconnected review draft feedback:** When a user records edits or comments via `Review.recordDraft()`, the live cards and statistics still only render the base static elements. The user cannot see a live preview or visual diff of their changes in the main layout before exporting the changeset.

Drawing lessons from TiddlyWiki's 20-year history as a single-file offline knowledge base, this change brings two essential patterns adapted to cogNNitive's typed, human-in-the-loop paradigm without overengineering.

## What Changes

1. **Declarative Filter Engine (`filterElements` enhancement):**
   - Introduces structured tokenized filtering in `innfo-runtime.js`:
     - `concept:<name>` / `concept:<regex>`
     - `is:draft` / `!is:draft`
     - `is:reviewed` / `is:changed`
     - `has:<field>` / `!has:<field>`
     - Free text fallback tokens matched against element name, description, and fields.
   - Zero external libraries, pure lightweight functional predicate logic (< 100 lines).

2. **Reactive Draft Overlay (Live Review Projection):**
   - Extends card rendering in `mountElementCards` to reflect live drafts:
     - Elements with an active draft display a visible DaisyUI badge (`badge badge-warning` / `badge badge-sm`) and highlight edited field values.
     - New elements added as drafts (`kind: 'new'`) are projected into the visible list.
     - Elements marked for deletion (`kind: 'delete'`) are visually flagged (`opacity-60 line-through`).
   - Cards update dynamically upon draft creation, modification, or deletion.

## Capabilities

### New Capabilities
- `console-declarative-filters`: Tokenized filter operator parsing in console search toolbar (`concept:`, `is:draft`, `is:reviewed`, etc.).
- `console-draft-overlay`: In-memory projection of uncommitted feedback drafts over the base model elements in the console layout.

### Out of Scope
- Complex transclusion syntax (rejected to avoid runtime overhead).
- Plugin hot-swapping marketplace (the bundled batteries-included approach is retained).
