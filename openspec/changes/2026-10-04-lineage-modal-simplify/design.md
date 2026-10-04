# Design: Lineage Modal Simplification (File Preview)

## Technical Approach

One file owns almost all of this: `FilePreviewModal.vue`. The change is
composition, not new subsystems.

**Header.** Replace the metadata strip block (`:104-184`) with:

- a thin, always-visible `Original File` row directly under the header
  (`metadata.source_file` value + the existing `openOriginalFile()` action; button
  `:disabled` when `!metadata.source_file`). Move the `openOriginalError` message
  here.
- a `⋯` (MoreVertical) button in the header that toggles a small popover containing
  the SHA-256 / Size-Status / Normalized-At cards. Reuse the existing card markup;
  only its container changes. Close the popover on outside click and on Escape.

The three mode buttons become icon buttons: `Eye` (Preview), `Code` (Code),
`GitFork` (Lineage), each with `title` and `aria-label`. `Eye` and `Code` are
always available for md/html/source; `GitFork` only where lineage is available.

**Default mode (focus resolution).** In the `watch(() => props.isOpen)` body, the
branch `viewMode.value = isCsv.value ? 'preview' : 'code'` for `slug || unit` is
replaced with `viewMode.value = 'preview'` for all unit/slug opens. The existing
content-type default for plain opens is unchanged.

**Preview scroll-focus.** Preview currently has no scroll anchor. Two options:

- Option A (chosen): after load, in Preview, reuse the existing resolution
  (`resolvedSection` for Markdown slug, `resolvedUnit`/`resolvedRowIndex` for
  CSV) and scroll the rendered preview element. Give preview rows the same
  `data-csv-row` attribute they already have (they do — see `:280`), and give the
  resolved Markdown heading a DOM anchor. Markdown is rendered with `v-html` by
  `renderMarkdown`; add an `id` to the target heading post-render (walk the rendered
  `.markdown-body` headings and match the resolved heading text), then
  `scrollIntoView`.
- Option B (rejected): always switch CSV/slug opens to Preview but scroll via the
  Code view's `#line-N` ids — impossible, those ids do not exist in Preview.

The scroll routine lives beside `useUnitResolution` as a small
`scrollPreviewToResolved(resolved)` (or the existing `scrollToResolved` is
generalized to accept a preview root). Keep it one function.

**Lineage style switch + Timeline.** Introduce a `lineageStyle` ref
(`'timeline' | 'graph'`), default `'timeline'`. The Lineage branch of the content
area renders a `Timeline` / `Graph` segmented control, then:

- `Graph`: the existing Mermaid block (the existing `showOutgoing` toggle and
  `lineageMermaidCode` computed are untouched, except the graph labels gain the
  element id — see below).
- `Timeline`: a new vertical chain render.

**Timeline data structure (extensible seam for iteration 2).** Add a computed
`lineageChain: LineageStep[]`:

```ts
interface LineageStep {
  role: 'upstream' | 'focal' | 'citation' | 'related'
  icon: string            // emoji or lucide name
  label: string           // display name / file name
  id?: string             // element qualifiedId, or file path for file nodes
  slug?: string
  ref?: string            // file#heading or file@unit
  subtitle?: string       // sha256 short, relationship label, etc.
}
```

Built from: `metadata.source_file` (one upstream step), the focal file, then
`knowledgeStore.getSourceCitations(props.filePath)` (one `citation` step each),
then each citation's outgoing relationships as `related` steps (respecting the
existing `showOutgoing` collapse semantics so the two styles agree). Iteration 2
extends this list with further upstream steps; the render contract does not change.

**Element identity in both styles.**

- Timeline: `id` (and `slug`, `ref`) are rendered as mono sub-lines per step.
- Graph: extend the Mermaid node labels to include the id, e.g.
  `🧩 Section: Intro\nid: CaseStudy/Intro`, sanitized through the existing
  `sanitize()` (which strips `[](){}"` and newlines — the current sanitizer removes
  `\n`, so the id is appended inline: `🧩 Section: Intro · CaseStudy/Intro`).

**Footer.** Remove the permanent footer band. The traceability affirmation, if kept,
becomes a small inline badge in the header region or the `⋯` popover; the Close
button is dropped (header `X` and Escape already close). Simplest: drop the footer
entirely and put the affirmation as a tooltip/badge near the header close.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Metadata menu scope | `⋯` popover, custom (Tailwind + click-outside), no new dependency | A UI kit menu (new dep for one popover); leaving metadata always visible (the problem) |
| D2 | Original File placement | Its own always-visible thin row | Inside the `⋯` (it is the most-used action — the proposal requires it visible) |
| D3 | Preview scroll anchor | Scroll rendered preview (Markdown heading matched post-render, CSV `data-csv-row`) | Forcing Code for unit opens (the current, worse behavior); scroll via non-existent `#line-N` in preview |
| D4 | Lineage default style | `timeline` on tab open | `graph` (today's, explicitly rejected by maintainer) |
| D5 | Timeline source | `lineageChain` computed over existing data | A new store/resolver (iteration 2 will extend the computed, not add a subsystem) |
| D6 | Recursive upstream | Out of scope (iteration 2) | Implementing now (unbounded, needs cycle protection; separate change) |
| D7 | Id in Graph | Append to node label, reuse `sanitize()` | New label node layer (heavier; graph legibility spec is about not shrinking) |
| D8 | Footer | Removed; affirmation folded to a header badge | Keeping the band (it is the noise being removed) |

## Data Flow

```
props.{filePath, slug, unit, subunits}
        │
        ├─ loadFileContent() ──► metadata { source_file, sha256, size, normalized_at }
        │
        ├─ viewMode default: unit/slug ? 'preview' : contentType
        │        │
        │        └─ preview rendered ──► scrollPreviewToResolved(resolvedSection | resolvedUnit)
        │
        └─ lineageChain = [ upstream? ] + [ focal ] + citations + related
                 │
                 └─ lineageStyle: 'timeline' (default) | 'graph'
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/apps/innfo-editor/src/components/editor/FilePreviewModal.vue` | Modify | Header (Original File row, `⋯` metadata popover, icon toggles), default Preview + focus scroll, Lineage style switch + Timeline, id display, remove footer |
| `iNNfo/apps/innfo-editor/src/composables/useUnitResolution.ts` | Modify (maybe) | Preview-aware scroll helper if the anchor logic does not stay local to the modal |
| `iNNfo/apps/innfo-editor/tests/component/FilePreviewModal.test.ts` | Modify | New/updated tests (see Testing Strategy) |

## Interfaces / Contracts

```ts
// inside FilePreviewModal.vue (or a co-located lineage util if it grows)
type LineageStyle = 'timeline' | 'graph'

interface LineageStep {
  role: 'upstream' | 'focal' | 'citation' | 'related'
  icon: string
  label: string
  id?: string
  slug?: string
  ref?: string
  subtitle?: string
}
```

If `lineageChain` proves reusable (e.g. Graph labels also want the id), extract a
pure builder `buildLineageChain(input): LineageStep[]` into
`src/components/editor/lineageChain.ts` so it is unit-testable without mounting.
Preferred if the computed exceeds ~40 lines.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (pure builder) | `buildLineageChain` ordering (upstream→focal→citation→related), identity fields, no-upstream case | Vitest, plain fixtures — if extracted |
| Component | Default mode = Preview for a unit-pointed Markdown and CSV open | Vitest + Vue Test Utils, waitFor preview node |
| Component | Preview scroll-focus target present (heading anchor / `data-csv-row`) | Query rendered preview, assert focused element exists |
| Component | Original File row visible with no `source_file`, action disabled | Mount without frontmatter, assert row + disabled state |
| Component | Metadata hidden by default; visible after `⋯` activation | Mount, assert absence then click and assert presence |
| Component | Lineage opens on Timeline; element `id`/`slug` visible; Graph toggle still yields the Mermaid code | Mount with a citing node that has id + slug |
| Component | Footer band removed; header close still closes | Query footer text absent; click X emits close |

## Migration / Rollout

No data or API migration. Editor-only change; ships on `dev` and rides the app
build. The Graph style and its Mermaid contract are preserved, so the existing
`lineage-graph-legibility` spec tests continue to pass (with the addition that the
graph is no longer the default style — the graph assertions select the Graph style
first).

## Open Questions

- [ ] Should the traceability affirmation survive at all (as a header badge/tooltip)
      or be dropped with the footer? Design leans to a small header badge; confirm
      during apply.
- [ ] For very long element ids, Timeline rows may wrap. Lean: show the id on a
      truncated mono line with a `title` attribute revealing the full value.
