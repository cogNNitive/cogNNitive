# S3a — Parity audit: `innfo-editor` → domain console

> **Maintainer review: PENDING** — Task 1.2 is intentionally left open.
> Outcome: ____________________  Date: __/__/______  Reviewer: ____________
>
> This document is the S3a gate. It classifies **every `.vue` component and every
> route** under `iNNfo/apps/innfo-editor/src/` as **in console** / **port** / **drop**,
> records the seven explicit decisions from `design.md`, and states the D14 embed check.
> No code is written by S3a (`strict_tdd: true`; `verify.js` gates).

## Method

- One row per `.vue` file and one row per route (design table; scope in `proposal.md`).
- **Decision** is exactly one of **in console** / **port** / **drop**:
  - **in console** — the feature (or its equivalent) already exists in `domaiNN_console.html`.
  - **port** — a real use exists and the console lacks it → a new `InnfoUI` component or
    `registerView` read-only view on the shared modal (S3b).
  - **drop** — no evidence of real use, or replaced by the changeset flow / retired UI
    (deleted with S5).
- **Evidence of real use** is a test under `iNNfo/apps/innfo-editor/tests/**` that encodes
  a user flow, or a doc under `docs/innfo/documentation/*.md` that teaches it. Test paths
  below are relative to `iNNfo/apps/innfo-editor/` unless prefixed with `test/` (repo root).
  No evidence ⇒ `none found` ⇒ decision **drop** (design: "no evidence means drop").
- **Console today** — surfaces available now: concept rail, element cards, Model Explorer,
  Matrices, Changes (review), Model Map (metamodel), full-text search, reference popups,
  hash routing, one shared edit modal, review mode, per-element **Lineage** tab (history +
  citations), draft store, changeset status badges, and registered read-only views
  (`changes`, `timeline`, `organization`/`org-chart`, `procedure`, `roadmap`). There is
  **no** model/submodel creation UI and **no** workspace lineage graph.

## Table legend

`PT` = Port target. `—` = nothing to port (drop). Cross-references like "Decision 1" point
to the explicit-decisions section below.

---

## Routes (`src/router/index.ts`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `/` — HomeView (open folder, resume, starter apps, load-from-URL) | `tests/component/HomeView-{bootstrap-flow,deep-link,folder-fallback,workspace-resume}.test.ts`; `docs/.../innfo-editor.md` §Home; `docs/.../live-preview.md` (deep-link context) | The console is a static artifact opened directly; no workspace picker/resume. URL load superseded by the artifact itself (Decision 6) | **drop** | — |
| `/innfo-doc` (alias `/info-doc`) legacy redirect | `tests/unit/router.test.ts` (redirects + query/hash preservation) | Retired route; no console equivalent needed | **drop** | — |
| `/workspace` — WorkspaceView (requiresHandle guard) | `tests/integration/workspace.integration.test.ts`; `tests/component/ActiveView.test.ts`; `docs/.../innfo-editor.md` §End-to-end flow | Replaced by the single console shell (`domaiNN_console.html`); no handle guard | **drop** | — |

## `src/App.vue` and shared chrome (`src/components/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `App.vue` — root shell (router-view + global banners/toast/confirm) | `tests/progressive-smoke.test.ts` (app boots) | Console shell owns boot; no Vue router | **drop** | — |
| `ToastMessage.vue` — transient notifications | `tests/unit/ValidationService.test.ts` (toasts on validation outcome) | Console surfaces status/badges; no toast primitive | **drop** | — |
| `ValidationReport.vue` — full validation overlay (summary, copy log, copy AI prompt, prompt hints) | `tests/component/ValidationReport.test.ts`; `tests/unit/ValidationService.test.ts`; `docs/.../innfo-editor.md` §Validation | Console lacks a validation overlay; validation is authoritative in MCP `validate_model`/`check_workspace` (Decision 7) | **port** | Read-only `validation` registered view (`kind: readonly`) composing `InnfoUI` (flagged — see Decision 7) |

## Editor — element cards, fields, widgets host (`src/components/editor/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `AIGuidePanel.vue` — step checklist to connect an external agent | `tests/unit/AIGuidePanel-steps.test.ts`; `tests/unit/guide.test.ts`; `docs/.../innfo-editor.md` §AI Guide | Agent is now the interface; console is read-only review | **drop** | — |
| `AiWorkflowPanel.vue` — "Use AI" workflow view | `tests/component/AiWorkflowPanel.test.ts`; `docs/.../innfo-editor.md` §AI Guide View | Same as above; authoring-time guidance | **drop** | — |
| `BlockConnections.vue` — "Connections Overview" of a node | `tests/unit/useNodeConnections.test.ts`; console `test/console-field-renderers.test.mjs` ("incoming relations with a count") | Element cards show incoming relations + Model Map edges | **in console** | Element cards / Model Map |
| `BlockFeed.vue` — pinned concept sheet + element feed | `docs/.../innfo-editor.md` §Editing sub-views (BlockFeed element cards); `tests/component/BlockSheet.test.ts` | Model Explorer + element cards (`test/console-element-card.test.mjs`) | **in console** | Element cards |
| `BlockMatrixSummary.vue` — matrix summary on an element | `tests/component/BlockMatrixSummary.test.ts` (R-SC-04) | Matrices tab (`test/console-tabs-matrices.test.mjs`) | **in console** | Matrices tab |
| `BlockRelationships.vue` — element relationships block | `tests/component/BlockRelationships.test.ts` (R-SC-03) | Element cards reference fields + reference popups; Model Map edges | **in console** | Reference popups / Model Map |
| `BlockSheet.vue` — the element card | `tests/component/BlockSheet.test.ts` (layout, fields, assets, tags, inherited concepts) | Element cards (`InnfoUI.ElementCard`; `test/console-element-card.test.mjs`) | **in console** | Element cards |
| `BlockSheetConceptBody.vue` — concept-level body | `tests/component/BlockSheet.test.ts` §Header/Layout, §Fields Schema | Element cards + concept rail | **in console** | Element cards |
| `BlockSheetEditForm.vue` — in-card field editing | `tests/component/BlockSheet.test.ts` §Fields Schema | Single shared edit modal (D13) | **in console** | Shared edit modal |
| `BlockSheetElementBody.vue` — element instance body | `tests/component/BlockSheet.test.ts` §Header/Layout | Element cards | **in console** | Element cards |
| `BlockSheetHeader.vue` — card header (concept, markers, controls) | `tests/component/BlockSheet.test.ts` §Header/Layout | Element cards (`ku-actions`, change pip) | **in console** | Element cards |
| `ConceptContainer.vue` — concept section wrapper | `none found` (structural container; exercised only indirectly) | Concept rail / pills cover the need | **drop** | — |
| `ConceptTableView.vue` — spreadsheet-like element list | `tests/component/ConceptTableView.test.ts` | Model Explorer element table (`test/console-element-table.test.mjs`) | **in console** | Model Explorer |
| `ConnectionPill.vue` — connection/inline reference pill | `tests/component/ConnectionPill.test.ts` | `InnfoUI.ElementPill` / reference popup | **in console** | ElementPill / reference popup |
| `FieldDetailModal.vue` — field detail dialog | `test/console-field-renderers.test.mjs` (field-detail dialog on cell double-click) | Field-detail dialog exists in console | **in console** | Field-detail dialog |
| `FieldSchemaView.vue` — fields schema metadata | `tests/component/FieldSchemaView.test.ts` | Element card fields + Model Map (metamodel) | **in console** | Model Map |
| `FieldViewer.vue` — field viewer (R-SC-06) | `tests/component/FieldViewer.test.ts` | `InnfoUI.FieldRow` / `FieldValue` (`test/console-field-renderers.test.mjs`) | **in console** | Field rendering |
| `FilePreviewModal.vue` — original-file action; Preview/Code/Lineage modes; unit-pointed opens | `tests/component/FilePreviewModal.test.ts`; `docs/.../innfo-editor.md` §File preview and lineage | Console links heavy sources and caps citation excerpts; no preview modal (Decision 2) | **port** | Read-only file-preview view/modal composing `InnfoUI` (Decision 2) |
| `FileRefPill.vue` — `sources::` pill + citation parsing | `tests/component/FileRefPill.test.ts`; `docs/.../sources-citations-lineage.md` | `InnfoUI.CitationIcon` / `KuBadge` + reference popup | **in console** | CitationIcon / KuBadge |
| `GraphViewer.vue` — node/relationship graph | `tests/unit/useGraphData.test.ts` (origin legend); `docs/.../innfo-editor.md` §Visualization | No workspace graph; per-element Lineage is history+citations only (Decision 1) | **port** | Read-only `lineage` graph view (`kind: readonly`) — Decision 1 (flagged) |
| `IconRenderer.vue` — concept icon renderer | `tests/unit/useConceptVisuals-getConceptMeta.test.ts` | `InnfoUI.icon()` / concept icons from schema | **in console** | InnfoUI icon |
| `KnowledgeInfoPanel.vue` — model information + template-version badge | `tests/component/KnowledgeInfoPanel-{explorer,templateBadge,version}.test.ts` | Model Map (metamodel) + model meta cover the info; the freshness badge half is **drop** (Decision 7) | **in console** | Model Map (badge half: Decision 7) |
| `MarkerButton.vue` — unified marker interaction | `tests/component/MarkerButton.test.ts` | `InnfoUI.MarkerChip`; matrix cells (`test/console-matrix-cells.test.mjs`) | **in console** | MarkerChip / matrix cells |
| `MarkerTooltip.vue` — marker tooltip | `tests/component/MarkerButton.test.ts` (marker interaction) | `MarkerChip` tooltip in kit | **in console** | MarkerChip |
| `MatricesGrid.vue` — editable matrices grid (virtual scroll) | `tests/component/MatricesGrid.test.ts` (R-MV-01…07) | Matrices tab + matrix cells (`test/console-matrix-cells.test.mjs`) | **in console** | Matrices tab |
| `MatrixPill.vue` — matrix selector pill | `tests/component/MatrixPill.test.ts` | Matrices tab / matrix pills | **in console** | Matrices tab |
| `MetamatrixConfig.vue` — dynamic relational matrix *definitions* | `tests/unit/useMatrixDefinitions.test.ts`; `tests/component/matrix-selection-index.test.ts` | Console renders matrices read-only; no definition authoring | **drop** | — |
| `ModelDashboard.vue` — model dashboard | `none found` (no dedicated test) | Model Explorer covers the need | **drop** | — |
| `NodeMedia.vue` — node media/attachments (R-SC-05) | `tests/component/NodeMedia.test.ts` | `FieldValue` media renderers — image/video/audio (`test/console-field-renderers.test.mjs`) | **in console** | FieldValue media |
| `OpenCodePromptModal.vue` — inherited-concepts OpenCode prompt helper | `tests/component/BlockSheet.test.ts` §Inherited Concepts (OpenCode Prompt Helper) | Agent owns authoring prompts; console is read-only | **drop** | — |
| `Pill.vue` — generic concept/element pill | `tests/component/Pill.test.ts` (interaction, ghost, YIQ contrast, tags) | `InnfoUI.ConceptPill` / `ElementPill` / `KuBadge` | **in console** | InnfoUI pills |
| `SearchResultsView.vue` — search & tag-filter results | `tests/component/SearchResultsView-concept-tags.test.ts`; `tests/unit/searchStore.test.ts`; `docs/.../tags-and-taxonomy.md` §5 | Full-text search + concept rail filter (`test/console-rail-filter.test.mjs`) (Decision 3) | **in console** | Console search (tag AND-filter flagged) |
| `TextEditor.vue` — raw markdown body editing | `docs/.../innfo-editor.md` §Editing sub-views (TextEditor) | Console is read-only; authoring moves to agent changesets | **drop** | — |
| `TreeEditor.vue` — structural node editing | `docs/.../innfo-editor.md` §Editing sub-views (TreeEditor) | Console is read-only; authoring moves to agent changesets | **drop** | — |

## Layout (`src/components/layout/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `ConceptTreeNode.vue` — concept tree node (-concept nesting, ghost, diamond, submodels) | `tests/component/ConceptTreeNode.test.ts`; `tests/unit/useKnowledgeConcepts-compact.test.ts` | Concept rail + element cards (Decision 4) | **in console** | Concept rail |
| `ExperimentalBanner.vue` — experimental-feature banner | `tests/component/ExperimentalBanner.test.ts` | No console equivalent needed | **drop** | — |
| `FileTreeNode.vue` — explorer file-tree row | `tests/component/WorkspaceExplorer.test.ts`; `tests/unit/explorerClassify.test.ts` | Model Explorer tab | **in console** | Model Explorer |
| `Header.vue` — header + search popup (concepts/tags) + view switcher | `tests/component/Header.test.ts`; `tests/unit/searchStore.test.ts`; `docs/.../tags-and-taxonomy.md` §5 | Console banner + full-text search + concept rail (Decision 3) | **in console** | Console search / rail |
| `LeftSidebar.vue` — dual-mode sidebar + breadcrumb ancestry + submodel tree | `tests/component/LeftSidebar-{dual-mode,navigation,ghost,ordering,model-header,submodel-tree,template-taxonomy}.test.ts` | Concept rail replaces the tree; dual-mode/breadcrumb/submodel chrome (Decision 4) | **in console** | Concept rail (dual-mode/breadcrumb/submodel nesting: Decision 4) |
| `LegacyDomainBanner.vue` — legacy-domain warning | `tests/unit/useLegacyDomain.test.ts` | Legacy layout detection owned by MCP/`verify.js` | **drop** | — |
| `RightGuidanceSidebar.vue` — resizable right guidance panel | `none found` | No console equivalent | **drop** | — |
| `SampleBanner.vue` — starter-sample banner | `none found` | No console equivalent (no starter apps) | **drop** | — |
| `SaveWorkspaceModal.vue` — save-to-disk / version-bump modal | `tests/unit/WorkspacePersistenceService.test.ts`; `tests/unit/workspaceStore*.test.ts` | Static artifact; persistence is the agent's (`apply_change`) | **drop** | — |
| `VirtualGroupNode.vue` — virtual/ghost concept group (progressive batch) | `tests/component/VirtualGroupNode-{ghost,progressive}.test.ts` | Concept rail with per-concept counts | **in console** | Concept rail |
| `WorkspaceDashboard.vue` — workspace overview dashboard | `none found` (bulky overview removed per `LeftSidebar-dual-mode.test.ts`) | Model Explorer covers the need | **drop** | — |
| `WorkspaceExplorer.vue` — filesystem explorer (filter, select) | `tests/component/WorkspaceExplorer.test.ts`; `tests/component/KnowledgeInfoPanel-explorer.test.ts`; `tests/unit/explorerClassify.test.ts`, `sidecarDiscovery.test.ts` | Model Explorer tab | **in console** | Model Explorer |
| `WorkspaceIntegrityNotice.vue` — workspace integrity bands | `tests/component/WorkspaceIntegrityNotice.test.ts` | `verify.js` / MCP `check_workspace` owns integrity; console is a frozen artifact | **drop** | — |

## UI primitives (`src/components/ui/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `Badge.vue` — generic badge primitive | `none found` | Superseded by `InnfoUI` `KuBadge` / `StatusBadge` | **drop** | — |
| `ConfirmDialog.vue` — confirm modal | `tests/unit/confirmStore.test.ts` | Console uses its own confirm/export flow | **drop** | — |
| `MinimalMarkdownEditor.vue` — inline markdown authoring | `tests/component/widgets8-14.test.ts` (MarkdownWidget edit mode); `tests/unit/markdown-sanitization.test.ts` | Console renders markdown read-only (`FieldValue`); authoring is agent-side | **drop** | — |
| `StatusBadge.vue` — pass/warn/error status badge | `tests/component/Header.test.ts` (status badges) | Console changeset status badges (`InnfoUI.StatusBadge`) | **in console** | StatusBadge (changesets) |
| `TagInput.vue` — tag authoring input (chips, suggestions) | `tests/component/TagInput.test.ts`; `docs/.../tags-and-taxonomy.md` §5 (Decision 3) | Console has no tag authoring; tags authored by agent changesets | **drop** | — |
| `TagList.vue` — tag list display | `tests/component/BlockSheet.test.ts` §Tags viewing and authoring; `docs/.../tags-and-taxonomy.md` (Decision 3) | Console field renderers do not render tags | **drop** | — |

## Widgets (`src/shared/widgets/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `CategoryWidget.vue` — category field | `tests/component/widgets.test.ts` (CategoryWidget) | `FieldValue` select pill (`test/console-field-renderers.test.mjs`) | **in console** | FieldValue |
| `CodeWidget.vue` — code field | `tests/component/widgets8-14.test.ts` (C.10) | `FieldValue` code rendering | **in console** | FieldValue |
| `ColorWidget.vue` — color field | `tests/component/widgets8-14.test.ts` (C.3) | No console renderer for color fields | **drop** | — |
| `CycleWidget.vue` — cycle/marker field | `tests/component/widgets8-14.test.ts` (C.9) | Matrix/marker cell values (`test/console-matrix-cells.test.mjs`) | **in console** | Matrix cells |
| `DateWidget.vue` — date field | `tests/component/widgets8-14.test.ts` (C.1) | No console renderer; value falls back to text | **drop** | — |
| `DiagramWidget.vue` — DSL diagram field | `tests/component/widgets8-14.test.ts` (C.12) | No console renderer | **drop** | — |
| `FallbackWidget.vue` — unported-type safety net | `tests/component/FallbackWidget.test.ts` | Console `FieldValue` returns null for unknown types | **drop** | — |
| `FieldAsset.vue` — nested canonical asset paths | `tests/component/FieldAsset.test.ts` | `FieldValue` media renderers (image/video/audio) | **in console** | FieldValue media |
| `FieldBoolean.vue` — boolean field | `tests/component/widgets.test.ts` (boolean); `test/console-field-renderers.test.mjs` (Yes/No) | `FieldValue` boolean | **in console** | FieldValue |
| `FieldKnowledge.vue` — knowledge field + "Create & bind new model" / inline submodel creation | `tests/component/FieldKnowledge.test.ts` §inline submodel creation | Model creation is **drop** (agent changesets + "New element" draft); knowledge *rendering* exists as a document pill, but the row's distinctive feature is creation (Decision 5) | **drop** | Decision 5 |
| `FieldNumber.vue` — number field | `tests/component/widgets.test.ts` (FieldNumber) | `FieldValue` plain/structured value | **in console** | FieldValue |
| `FieldReference.vue` — reference field | `tests/component/widgets.test.ts` (FieldReference) | `ElementPill` / reference popup (`reference-popup` need) | **in console** | Reference popup |
| `FieldSelect.vue` — select field | `tests/component/widgets.test.ts` (FieldSelect) | `FieldValue` select pill | **in console** | FieldValue |
| `FieldString.vue` — string field | `tests/component/widgets.test.ts` (FieldString) | `FieldRow` / plain field badge | **in console** | FieldRow |
| `InnovationVisual.vue` — animated innovation SVG | `none found` (no dedicated test) | No console equivalent | **drop** | — |
| `MarkdownFieldEditor.vue` — markdown authoring surface | `tests/unit/markdown-sanitization.test.ts` | Console renders markdown read-only | **drop** | — |
| `MarkdownWidget.vue` — markdown field | `tests/component/widgets8-14.test.ts` (C.14) | `FieldValue` markdown rendering | **in console** | FieldValue |
| `MermaidWidget.vue` — mermaid field | `tests/component/widgets8-14.test.ts` (C.11) | No console field renderer for mermaid | **drop** | — |
| `MultiSelectWidget.vue` — multi-select field | `tests/component/widgets8-14.test.ts` (C.4) | No console renderer; falls back to text/array | **drop** | — |
| `RatingWidget.vue` — rating field | `tests/component/widgets8-14.test.ts` (C.6) | No console renderer | **drop** | — |
| `ScaleWidget.vue` — scale/marker field | `tests/component/widgets8-14.test.ts` (C.7) | Matrix/marker cell values | **in console** | Matrix cells |
| `TagsWidget.vue` — tags field | `tests/component/widgets8-14.test.ts` (C.5); `docs/.../tags-and-taxonomy.md` (Decision 3) | No tag authoring in console | **drop** | — |
| `TextWidget.vue` — text field | `tests/component/widgets.test.ts` (TextWidget) | `FieldRow` plain value | **in console** | FieldRow |
| `TimestampWidget.vue` — timestamp field | `tests/component/widgets8-14.test.ts` (C.13) | No console renderer | **drop** | — |
| `ToggleGroupWidget.vue` — segmented toggle field | `tests/component/widgets8-14.test.ts` (C.8) | No console renderer | **drop** | — |
| `UrlWidget.vue` — url field | `tests/component/widgets8-14.test.ts` (C.2) | `FieldValue` safe url link | **in console** | FieldValue |
| `WeightWidget.vue` — weight/number field | `tests/component/widgets.test.ts` (WeightWidget) | `FieldValue` numeric | **in console** | FieldValue |
| `WidgetField.vue` — widget dispatcher (`resolveWidgetComponent`) | `tests/component/WidgetField.test.ts`; `tests/component/widgets.test.ts` (registry) | Console `FieldRow`/`FieldValue` dispatch (`test/console-field-renderers.test.mjs`) | **in console** | FieldRow / FieldValue |

## Views (`src/views/`)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `HomeView.vue` — landing (open/resume/starter/URL + bootstrap modal) | `tests/component/HomeView-*.test.ts` (4); `docs/.../innfo-editor.md` §Home | Console artifact is opened directly; no home surface (Decision 6) | **drop** | — |
| `WorkspaceView.vue` — editor shell (header, sidebar, active view, save) | `tests/integration/workspace.integration.test.ts`; `tests/component/ActiveView.test.ts` | Single console shell replaces it; read-only review | **drop** | — |

## Feature-bearing `.ts` rows (sole embodiment of a distinct feature)

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|
| `components/editor/lineageChain.ts` — lineage step model | `tests/unit/lineageChain.test.ts` | Not in console (Decision 1) | **port** | Read-only `lineage` view (Decision 1, flagged) |
| `composables/useBlueprintVersionNotice.ts` — template freshness + migration prompt | `tests/unit/useBlueprintVersionNotice.test.ts`; `tests/unit/shipped-template-versions.test.ts` (Decision 7) | Freshness owned by MCP/`verify.js`; console is frozen | **drop** | Decision 7 |
| `config/workspaces.ts` — workspace presets | (Decision 6) | Presets dropped with the hosted app | **drop** | Decision 6 |
| `composables/useUrlDocLoader.ts` — deep-link URL document loader | (Decision 6) | Deep links dropped with the hosted app | **drop** | Decision 6 |

---

## The seven explicit decisions (design.md)

### Decision 1 — Workspace lineage graph → **port** (flagged for review)

`GraphViewer.vue` (Mermaid) + `lineageChain.ts` + the Timeline inside `FilePreviewModal.vue`
(specs `lineage-graph-legibility`, `lineage-timeline-view`, `lineage-focus-resolution`).

- **Evidence of real use:** `tests/component/FilePreviewModal.test.ts` (Timeline default, Graph
  style, "+N hidden" collapse, element id/slug), `tests/unit/lineageChain.test.ts`,
  `tests/unit/useGraphData.test.ts`, `docs/.../innfo-editor.md` §File preview and lineage.
- **Console today:** the per-element **Lineage** tab (`ui-kit.js:1561-1672`) is History
  (changesets that touched the element) + Citations (Sources it derives from). It is **not** a
  workspace graph.
- **Decision:** **port** a read-only `lineage` registered view (`kind: readonly`) composed of
  `InnfoUI` primitives — upstream `source_file` → focal file → citing elements, Graph style
  included. **S5 must not claim the console supersedes the workspace graph** unless this port
  lands.
- **Flag:** heaviest port; the console Model Map partly overlaps. Confirm in 1.2 whether to port
  or to instead record an explicit **drop** of the workspace graph.

### Decision 2 — File preview modal → **port**

- **Evidence of real use:** `tests/component/FilePreviewModal.test.ts` (original-file action,
  Preview/Code/Lineage, CSV row/cell + markdown field unit targeting), `docs/.../innfo-editor.md`
  §File preview and lineage.
- **Console today:** no preview modal; heavy sources are **linked**, not embedded (citation
  excerpt cap).
- **Decision:** **port** a read-only file-preview view/modal composing `InnfoUI` (compose the
  existing `KuBadge`/`CitationIcon`/`ElementCard` primitives; one shared modal for editing).

### Decision 3 — Tag authoring and tag search

- **Tag authoring** (`TagInput.vue`, `TagsWidget.vue`, `TagList.vue`) → **drop**.
  Evidence: `tests/component/TagInput.test.ts`, `tests/component/widgets8-14.test.ts` (C.5),
  `docs/.../tags-and-taxonomy.md`. The console is read-only; tags are authored by agent
  changesets.
- **Tag search** (`Header.vue` search popup + `SearchResultsView.vue`) → **in console**.
  Evidence: `tests/component/SearchResultsView-concept-tags.test.ts`, `tests/unit/searchStore.test.ts`,
  `docs/.../tags-and-taxonomy.md` §5. Console full-text search + concept rail filter cover it.
- **Flag:** the console has no tag **AND-filter** (multi-tag intersection). Confirm in 1.2 whether
  full-text search is acceptable or the tag filter is upgraded to a **port**.

### Decision 4 — Dual-mode sidebar, breadcrumb ancestry, submodel nesting → **in console** (concept rail), editor chrome **drop**

- **Evidence of real use:** `tests/component/LeftSidebar-dual-mode.test.ts`,
  `LeftSidebar-navigation.test.ts`, `LeftSidebar-submodel-tree.test.ts`,
  `tests/component/ConceptTreeNode.test.ts` (submodel nesting), `tests/component/VirtualGroupNode-*.test.ts`.
- **Console today:** a single built-in concept rail + Model Explorer; **no** dual-mode toggle,
  **no** breadcrumb ancestry, **no** submodel nesting.
- **Decision:** the navigation **function** is **in console** via the concept rail + Model
  Explorer. The editor-specific chrome — the dual-mode toggle, breadcrumb ancestry, and submodel
  nesting — is **drop**.
- **Flag:** confirm in 1.2 that dropping submodel nesting (element-owned nested submodels) is
  acceptable; the console lists models flat.

### Decision 5 — Model and submodel creation → **drop** (resolved)

- **Evidence of real use:** `tests/component/FieldKnowledge.test.ts` §inline submodel creation,
  `tests/unit/knowledgeStore.test.ts` (`scaffoldSubmodel`), `HomeView-bootstrap-flow.test.ts`.
- **Console today:** no model/submodel creation UI.
- **Decision:** **drop**, per design — models are created by agent changesets (`add_model`,
  `add_element`, S6) and the console offers only a "New element" draft (S6d). Recorded so S5 can
  remove it.

### Decision 6 — Workspace presets / deep links → **drop**

- **Evidence:** `config/workspaces.ts`, `composables/useUrlDocLoader.ts`, `HomeView.vue`
  deep links (`tests/component/HomeView-deep-link.test.ts`), `docs/.../live-preview.md`.
- **Decision:** **drop** with the hosted app (design). The console is opened directly; there is
  no `?ws=`/deep-link surface.

### Decision 7 — Validation report and template-freshness warnings

- **Validation report** (`ValidationReport.vue`) → **port** (flagged for review).
  Evidence: `tests/component/ValidationReport.test.ts`, `tests/unit/ValidationService.test.ts`,
  `docs/.../innfo-editor.md` §Validation. Console lacks it → port a read-only `validation`
  registered view.
- **Template-freshness warnings** (`useBlueprintVersionNotice.ts`, `KnowledgeInfoPanel` badge) →
  **drop**.
  Evidence: `tests/unit/useBlueprintVersionNotice.test.ts`, `tests/unit/shipped-template-versions.test.ts`.
  Freshness is authoritative in MCP/`verify.js`; the console is a frozen artifact.
- **Flag:** confirm in 1.2 whether a read-only validation view is wanted, or whether validation is
  fully delegated to the agent (`validate_model`) and recorded as **drop**.

---

## D14 check

The console payload embeds, in the single `domaiNN_console.html`:

- **every model** — `meta.models` carries one summary per model with its `filePath`, `blueprint`
  and `sha256` (`scripts/export-console.mjs`; `test/console-export.test.mjs`
  "lists the metrics model in meta.models[]", asserting a 64-hex `sha256`).
- **per-element history** — each element carries its `el.history` from the domain changesets,
  and the domain payload carries the `changes` collection so the console never reads files
  (`scripts/export-console.mjs`; `test/console-export.test.mjs` "carries every changeset with
  sources/replaced_sources").
- **the source index** — `el.citations` (per field, resolved into `el.citations.sources`) plus
  `meta.sources` and `meta.citationsResolvedAt` (`scripts/export-console.mjs`;
  `test/console-export.test.mjs` "resolves citations to el.citations.sources map").
- **heavy sources are linked, not embedded** — only a citation excerpt is embedded (excerpt cap);
  the raw source is linked, never inlined into the slot.
- **the size budget gates the export** — `evaluateSizeBudget` (`scripts/console-views.mjs`,
  `CONSOLE_SIZE_BUDGET` warn 5 MB / fail 15 MB) runs at export and fails an oversized artifact.

These are verified by `test/console-export.test.mjs` (models, history, citations, embed/link and
escaping) and — for the size-budget thresholds specifically — by `test/console-views-lib.test.mjs`
(`CONSOLE_SIZE_BUDGET` and `evaluateSizeBudget` at/above each threshold). Note for 1.2: the
size-budget assertions live in `console-views-lib.test.mjs`, not in `console-export.test.mjs`.

---

## Row accounting

- **Total rows:** 93 — 86 `.vue` files + 3 routes + 4 feature-bearing `.ts` rows.
- **in console:** 46
- **port:** 4 — `ValidationReport.vue`, `FilePreviewModal.vue`, `GraphViewer.vue`,
  `components/editor/lineageChain.ts`.
- **drop:** 43

### Rows flagged for maintainer confirmation (task 1.2)

| Row | Flag |
|---|---|
| `GraphViewer.vue` + `lineageChain.ts` (Decision 1) | Port the workspace graph view vs. drop — heaviest port; Model Map partly overlaps |
| `FilePreviewModal.vue` (Decision 2) | Port scope (preview/code/lineage + unit-pointed opens) |
| `ValidationReport.vue` (Decision 7) | Port a read-only validation view vs. drop (validation is authoritative in MCP) |
| `SearchResultsView.vue` / `Header.vue` (Decision 3) | Tag AND-filter: in console via full-text search vs. upgrade to port |
| `LeftSidebar.vue` / `ConceptTreeNode.vue` (Decision 4) | Drop of dual-mode/breadcrumb/submodel nesting |
| `KnowledgeInfoPanel.vue` (Decision 7) | Template-freshness badge: drop (owned by verify/MCP) |
