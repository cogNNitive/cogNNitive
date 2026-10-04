# Proposal: Lineage Modal Simplification (File Preview)

## Why

`FilePreviewModal.vue` (975 lines) has drifted into two competing modals in one:
a file viewer (Preview / Code) and a provenance viewer (Lineage). Three concrete
problems, all visible at first open:

| Problem | Evidence | Cost |
|---|---|---|
| A 4-card metadata strip (SHA-256, Size/Status, Normalized At, Original File) permanently occupies a full row, most of it low-signal for the common case. | `FilePreviewModal.vue:104-184` | Visual noise on every open, regardless of why the file was opened. |
| Opening a file **pointed at by a knowledge unit** (a `sources::` pill) forces `Code` mode, even for Markdown and CSV, so the user lands in a wall of source text instead of the rendered section/row. | `FilePreviewModal.vue:836-842` | The most common deep-link path starts in the least readable view. |
| The Lineage view offers only a top-down Mermaid graph. A provenance chain ("this comes from that, which comes from…") is a linear story that a graph renders poorly, and node identity (`id` / `slug`) is not shown at all. | `FilePreviewModal.vue:515-614` | Provenance is hard to read and elements are not identifiable. |

The "Original File → open" action is among the most used actions and is hidden
inside the metadata strip only when `source_file` exists.

## What Changes

1. **Header cleanup.** The metadata strip is collapsed behind a `⋯` (more) menu.
   `Original File` with its "open" action stays **always visible** on its own thin
   row (disabled when the file declares no `source_file`). The three text mode
   buttons (`Preview` / `Code` / `Lineage`) become compact icon toggles with
   tooltips.

2. **Preview-first deep links.** When the modal opens pointed at a knowledge unit
   (a section, field, CSV row, or cell), the default mode becomes `Preview` and
   the preview auto-scrolls to the targeted section/row/cell (the highlight already
   exists; the scroll anchor is added). `Code` remains available via its icon.

3. **Lineage Timeline — default.** The Lineage tab gains a second style, `Timeline`,
   shown **by default** when the tab opens; `Graph` (today's Mermaid) becomes the
   alternate. The timeline renders the known chain vertically: upstream
   (`source_file`) → focal (current file) → citing model elements → related
   elements. Every node shows its `id` and, when present, its `slug` and
   `file#heading` / `file@unit` reference.

4. **Element identity everywhere in lineage.** Both Timeline and Graph surfaces
   expose the element `id` (qualifiedId) and optional `slug` so a user can identify
   and reference an element from the provenance view.

### Deferred (explicitly out of scope — iteration 2)

**Recursive upstream chaining.** Following `source_file` backwards through every
upstream file (A came from B came from C…) is **not** in this change. Today the
lineage knows exactly one upstream hop (the focal file's own `source_file`) plus
downstream citations. Iteration 2 will add recursive upstream resolution, with
cycle protection and a bounded depth. This proposal documents the seam (the
timeline is built from a data structure that iteration 2 can extend) but does not
implement the recursion.

## Capabilities

### New Capabilities
- `lineage-timeline-view`: the vertical provenance chain style, its default-on
  behavior, its nodes and per-node identity, and the Timeline/Graph switch.
- `lineage-focus-resolution`: preview-first default mode for unit-pointed opens and
  the preview scroll-focus to the targeted section/row/cell.

### Modified Capabilities
- `file-preview-modal-ui`: the modal header layout — always-visible Original File
  action, metadata behind a more-menu, icon-based mode toggles.
- `lineage-graph-legibility`: the Graph style remains available and unchanged in
  behavior, but is no longer the default style when the Lineage tab opens.

## Impact

- `iNNfo/apps/innfo-editor/src/components/editor/FilePreviewModal.vue` — header,
  metadata menu, mode toggles, lineage style switch, timeline rendering, id display,
  preview scroll-focus.
- `iNNfo/apps/innfo-editor/src/composables/useUnitResolution.ts` — may gain a preview
  anchor helper (render-surface-aware scroll target), or the anchor is added in the
  modal's preview markup and the existing `scrollToResolved` is reused.
- `iNNfo/apps/innfo-editor/tests/component/FilePreviewModal.test.ts` — new tests for
  header behavior, default mode, timeline, and id rendering.

No data, dependency, MCP, or blueprint changes. Ships entirely in the editor app.

## Success Criteria

- [ ] Opening a unit-pointed Markdown/CSV file lands in Preview, scrolled to the
      targeted section/row/cell with the target highlighted.
- [ ] `Original File` + open action are visible on every open; the action is disabled
      (not hidden) when there is no `source_file`.
- [ ] The metadata strip no longer occupies a permanent row; its cards are reachable
      from the `⋯` menu.
- [ ] The Lineage tab opens on `Timeline` by default; `Graph` still renders the
      existing Mermaid definition.
- [ ] Timeline and Graph both display each element's `id`, and `slug`/citation ref
      when present.
- [ ] Editor test suite, typecheck, and lint are green.
