# Tasks: Lineage Modal Simplification (File Preview)

## How to apply

- At session start load `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`;
  the AGENTS.md mandate) and run its concurrency scan before any repo write.
- Work lands on `dev` via the session worktree (`session/provenance-modal-simplify`).
  Conventional commits only, no AI attribution. Stage by explicit path; never
  `git add -A` / `git add .` / `git stash` / `git reset --hard` / `git clean`.
- Strict TDD: every RED task is seen failing for the intended reason before its GREEN
  task starts.
- Layer split: editor changes use Vitest
  (`npm --workspace=@cognnitive/innfo-editor test`). No core/MCP changes in this change.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500-650 (one Vue file + tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No (one component, one coherent UI change) |
| Delivery strategy | single slice on `dev` |
| Chain strategy | n/a (single slice) |

Decision needed before apply: No (all product decisions are approved in the proposal;
the two design Open Questions are non-blocking defaults).

---

## 1. Lineage chain builder (pure, testable)

- [ ] 1.1 **RED**: add `iNNfo/apps/innfo-editor/src/components/editor/lineageChain.test.ts`
      asserting `buildLineageChain` returns steps in order upstream→focal→citation→related,
      that a model-element step carries `id` and `slug`, that a citation step carries
      `ref` (`file#heading`), and that a file without `source_file` yields no upstream
      step. Run and watch it fail (module missing).
      `[lineage-timeline-view:Requirement:Timeline renders the known provenance chain]`
      `[lineage-timeline-view:Requirement:Timeline nodes expose element identity]`
      `[lineage-timeline-view:Requirement:Timeline is built from an extensible chain structure]`
- [ ] 1.2 **GREEN**: create `lineageChain.ts` exporting `LineageStep` and
      `buildLineageChain(input)` with the shape from design.md. Input:
      `{ sourceFile?, filePath, fileName, unitLabel?, slug?, citations }`.
      `[lineage-timeline-view:Requirement:Timeline is built from an extensible chain structure]`
- [ ] 1.3 **RED**: extend the builder test for the collapse semantics parity: when
      `showOutgoing` is false, related steps beyond the cap are represented as a single
      "N hidden" summary step, matching the graph.
      `[lineage-timeline-view:Requirement:Timeline renders the known provenance chain]`
- [ ] 1.4 **GREEN**: implement the collapse parity in `buildLineageChain`.
- [ ] 1.5 Verify: `npm --workspace=@cognnitive/innfo-editor test` green for the builder
      suite. **Defer full run to CI if local install is partial** (see Notes).

## 2. Header: Original File always visible, metadata behind ⋯, icon toggles

- [ ] 2.1 **RED**: component test — mount with no `source_file`; assert the
      `Original File` label is present and the open button is `disabled`; mount with
      `source_file` and assert the button is enabled.
      `[file-preview-modal-ui:Requirement:Original File action is always visible]`
- [ ] 2.2 **RED**: component test — assert SHA-256 / Size / Normalized At cards are
      NOT present on open, and ARE present after activating the `⋯` control.
      `[file-preview-modal-ui:Requirement:Low-signal metadata is collapsed behind a more-menu]`
- [ ] 2.3 **GREEN**: implement the always-visible Original File row (reuse card markup),
      the `⋯` MoreVertical popover with outside-click + Escape close, and the icon mode
      toggles (`Eye`/`Code`/`GitFork`) with `title`/`aria-label`.
      `[file-preview-modal-ui:Requirement:Mode toggles are compact icons]`
- [ ] 2.4 **RED**: component test — the old footer band text is gone and the header close
      control still emits `close`.
      `[file-preview-modal-ui:Requirement:The traceability affirmation is not a permanent footer band]`
- [ ] 2.5 **GREEN**: remove the footer band (fold the affirmation into a header badge or
      drop it — see design Open Question 1) and keep header close + Escape.
- [ ] 2.6 Update the two existing Spanish-string tests and the "does not render sourceId
      badge" test to match the new header layout (labels remain English; `Original File`
      still present).
- [ ] 2.7 Verify: editor component suite green for header tests.

## 3. Preview-first default + focus scroll

- [ ] 3.1 **RED**: component test — opening a Markdown file with a `unit` (section)
      lands in Preview (no `#line-N` code view visible as the active mode) and the
      targeted preview element exists.
      `[lineage-focus-resolution:Requirement:Unit-pointed opens default to Preview]`
- [ ] 3.2 **RED**: component test — opening a CSV with a `unit` (row) lands in Preview,
      the CSV table renders, and the target row exists / is scrolled-to.
      `[lineage-focus-resolution:Requirement:Preview auto-scrolls to the targeted unit]`
- [ ] 3.3 **GREEN**: change the `isOpen` watch so `slug || unit` selects `preview`; add
      the preview anchor (Markdown heading id post-render; reuse `data-csv-row` for CSV)
      and call the scroll helper after load.
      `[lineage-focus-resolution:Requirement:Plain opens keep the content-type default]`
- [ ] 3.4 **GREEN**: add `scrollPreviewToResolved` (in `useUnitResolution.ts` or local to
      the modal) and wire it. Keep it one function.
- [ ] 3.5 Verify: the existing knowledge-unit tests (field highlight, CSV row/cell
      highlight) still pass; note they assert highlight, not mode, so they must remain
      green.

## 4. Lineage Timeline (default) + Graph toggle + IDs

- [ ] 4.1 **RED**: component test — activating Lineage shows the Timeline style (a chain
      row for the upstream / focal / citing element), NOT the Mermaid widget; selecting
      `Graph` then renders `.widget-mermaid`.
      `[lineage-timeline-view:Requirement:Lineage style switch defaults to Timeline]`
- [ ] 4.2 **RED**: component test — the Timeline shows the citing element's `id` and
      `slug` text.
      `[lineage-timeline-view:Requirement:Timeline nodes expose element identity]`
- [ ] 4.3 **GREEN**: add `lineageStyle` ref (default `'timeline'`), the
      Timeline/Graph segmented control, and the vertical chain render over
      `lineageChain`.
- [ ] 4.4 **GREEN**: append the element `id` to the Mermaid node labels (Graph style),
      reusing `sanitize()`.
- [ ] 4.5 Update the existing lineage tests (`switches to the lineage view…`,
      `renders the lineage graph at natural size…`, `collapses the 4th-level…`,
      `shows no collapse toggle…`) to select the `Graph` style first, since the tab now
      opens on Timeline. Assert the graph definition is unchanged.
- [ ] 4.6 Verify: editor component suite green for lineage tests.

## 5. Lineage vertical chain visual polish

- [ ] 5.1 **GREEN**: style the Timeline (connector line, role badges
      upstream/focal/element/related, mono id line with `title` for overflow).
      `[lineage-timeline-view:Requirement:Timeline nodes expose element identity]`
- [ ] 5.2 **GREEN**: keep the `showOutgoing` collapse semantics consistent between
      Timeline and Graph (same count, same toggle affordance).
- [ ] 5.3 Manual check: Timeline legible in light and dark; long ids truncate with a
      `title`.

## 6. Docs and verification

- [ ] 6.1 Docs: update the editor/lineage page under `docs/innfo/documentation/` to
      describe the Timeline default, the metadata menu, and the always-visible Original
      File action; register if new.
- [ ] 6.2 Run the gate: `node scripts/verify.js`, `npm run check:integrity`,
      `npm run typecheck`, `npm run lint`. **Defer to CI if the session worktree's
      node_modules junction is partial** (see Notes).
- [ ] 6.3 Commit with a conventional message (no AI attribution).

---

## Notes

- **Iteration 2 (deferred, documented):** recursive upstream chaining (A←B←C…).
  `buildLineageChain` is the seam: iteration 2 adds upstream hops to the input/loop;
  the render contract does not change. Cycle protection + bounded depth are part of
  that change, not this one.
- **Environment:** if the worktree's `node_modules` is a partial junction (no `vitest`),
  run the suite in CI on push (established pattern: the pre-push hook re-runs
  typecheck; `scripts/verify.js` runs in CI). Do not `npm install` inside the worktree —
  it breaks the junction isolation (see the 2026-10-03 console-hub notes).
- The Graph Mermaid contract (`useMaxWidth:false`, `graph TD`, 4th-level collapse) is
  preserved; only the default style and node labels (add id) change.
