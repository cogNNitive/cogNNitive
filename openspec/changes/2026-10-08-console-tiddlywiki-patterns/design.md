# Technical Design: Console TiddlyWiki Patterns

## 1. Filter Engine Specification

In `innfo-runtime.js`, `filterElements(elements, query, drafts, reviewed)` parses query strings into predicates:

```javascript
function parseQueryTokens(query) {
  // Splits on whitespace while preserving quoted strings
  // Extracts:
  // - concept:<val> (case-insensitive concept match)
  // - is:draft / !is:draft (presence of draft targeting element id)
  // - is:reviewed (presence in reviewed map)
  // - is:changed (review state indicates base hash mismatch)
  // - has:<field> / !has:<field> (checks element.fields[field])
  // - text tokens (matched against haystack)
}
```

Matches are evaluated conjunctively (AND): all tokens must match.

## 2. Draft Overlay Model Projection

Before passing elements to `mountElementCards`:
1. Index active drafts by `element_id`.
2. For each element:
   - Check if an active draft exists.
   - If `kind === 'correction'`, overlay the `proposed` value into the displayed fields map, and mark `isEdited: true`.
   - If `kind === 'delete'`, mark `isDeleted: true`.
   - If `kind === 'comment'`, mark `hasComment: true`.
3. Collect drafts with `kind === 'new'` that don't match any existing element id, and synthesize virtual draft elements with `isNew: true` so they appear seamlessly in the list.
4. Pass decorated/projected elements to `UI.ElementCard`.

## 3. UI Indicators via DaisyUI

- Edited cards: Add `border-warning border-l-4` and a `badge badge-warning badge-sm` stating "Draft Edit".
- New cards: Add `border-info border-l-4` and a `badge badge-info badge-sm` stating "New Draft".
- Deleted cards: Add `opacity-50 line-through`.
- All styles utilize the existing DaisyUI class names without custom CSS hacks.
