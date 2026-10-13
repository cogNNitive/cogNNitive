# Design: S3 — domain console parity gate and edit modal

## Audit method (S3a)

For each `innfo-editor` route, view and component, `audit.md` records one row:

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|

Decision is one of:

- **in console** — the feature exists (`console-architecture`, `console-ui-kit`,
  `console-view-registry`, `console-review-mode`);
- **port** — a real use exists and the console lacks it: a new `InnfoUI` component or view
  on the shared modal (S3b);
- **drop** — no real use, or replaced by the changeset flow: deleted with S5.

Evidence of use is a test that encodes a user flow, a doc that teaches it, or a
maintainer statement in the audit review. No evidence means **drop**.

## Decisions the audit MUST record explicitly

These editor features have no console equivalent today, or one whose parity is disputed;
the audit decides each, and S5's spec removals follow it:

1. **Workspace lineage graph** (Mermaid graph and Timeline, `lineage-graph-legibility`,
   `lineage-timeline-view`, `lineage-focus-resolution`). The console's "Lineage" tab
   (`ui-kit.js:1561-1672`) is per element (history + citations), not a workspace graph.
   Either port a graph view (a `readonly` registered view) or record that the workspace
   graph is dropped. S5 must not claim the console supersedes it unless it is ported.
2. **File preview modal** (`file-preview-modal-ui`): original-file action, preview/code
   modes, unit-pointed opens.
3. **Tag authoring and tag search** (`element-concept-tags` UI half,
   `editor-tag-authoring`).
4. **Dual-mode sidebar and breadcrumb ancestry** (`dual-mode-sidebar`,
   `editor-navigation`), including submodel nesting.
5. **Model and submodel creation** (`model-primitive-type` inline submodel creation):
   decided as *drop* in favour of agent changesets (`add_model`, `add_element`, S6) and the
   console "New element" draft (S6d); recorded so S5 can remove it.
6. **Workspace presets / deep links** (`docs-workspace-explorer` presets): drop with the
   hosted app.
7. **Validation report and template freshness warnings** (`template-freshness-diagnostic`).

## Widget porting contract (S3b)

- Pure `InnfoUI` components; no framework, no store, no network; offline `file://`.
- Compose the semantic tokens and existing primitives; never a second card or pill.
- Wire through the single shared modal (`review.js` controller) — one modal for every
  editable component (D13). Read-only views use `registerView` with `kind: readonly`.

## D14 remainder

Check, and fix if missing: the domain payload embeds every model, the precomputed history
and the source index; heavy sources are linked, not embedded; the size budget
(`evaluateSizeBudget`, `console-view-registry` "Size budget") gates the export.

## D17

Record in `iNNfo/specs/vocabulary.json` and `docs/innfo/documentation/vocabulary.md`:
"console" is the user-facing term (domain console = the one per domaiNN; views are tabs
of it). "editor" and "hosted app" are not user-facing terms after S5 (the `app` alias of `bluepriNNt` is a different entry and stays).

## Re-planning S3b

After the maintainer reviews `audit.md`, a planning run (not an apply) appends to this
change: one delta requirement per *port* row (on the capability the row names), and a
batch-sized task group per port with a Review Workload Forecast. If the audit has no
*port* rows, S3b is empty and S3 archives after S3a.

## Cross-cutting

`strict_tdd: true` for S3b; S3a writes no code. `verify.js` gates.
