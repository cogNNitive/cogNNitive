---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - gamma"
---

# NN Findings

## NN Findings: F1 C2's seam is incomplete because propose() is a write-only sink that requires five schema and model projections absent from nn-drafts
category:: change
impact:: high
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:56, iNNfo/specs/bluepriNNts/console/review.js:75, iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:817, iNNfo/specs/bluepriNNts/console/review.js:832, iNNfo/specs/bluepriNNts/console/review.js:1966
recommendation:: Extract the edit-target projection logic from kuModalTarget into a pure, schema-driven descriptor function shared by the console and MCP tools rather than treating propose() and nn-drafts as a sufficient edit contract.
tags:: [c2, q2, review-store, schema-projection, architecture]

**Answers Q2 (Attacks C2).** C2 claims that `ctx.store.propose({ kind, elementId, field, proposed })` plus the `nn-drafts` payload slot is the integration seam for an external agent-facing edit surface. The code refutes both the signature and the sufficiency of this seam:

1. **`propose` is a write-only sink coupled to the in-memory element index, not a standalone contract.** In `createReviewController`, `propose` is bound to `saveDraft(anchorData, payload)` (`review.js:705`, `review.js:1966`), which takes two objects (`anchorData` and `payload`), not the single object cited in C2. Except for `kind === 'new'` and `anchorData.matrixCell`, `saveDraft` immediately looks up `var el = elementsById[anchorData.elementId]` (`review.js:751`) and returns `null` if the element is not in memory (`review.js:752`). It must consult `el` because `store.addDraft` (`review.js:322-406`) requires `base_hash: el.hash` (`review.js:366-368`, `review.js:778`), and `saveDraft` also stamps `concept: el.concept`, `element: el.name || el.id`, `knowledge_id: el.modelId || meta.modelId`, `element_slug: el.slug`, and `original: docFieldValue(el, anchorData.field)` (`review.js:774-789`).
2. **`nn-drafts` holds only prior pending drafts, zero edit-form metadata.** The draft store (`createDraftStore` at `review.js:174-258`) and `normalizeDraft` (`review.js:101-142`) persist only previously recorded mutations (`{ v: 4, modelId, drafts }`). An untouched element does not appear in `nn-drafts` at all.
3. **Rendering a valid edit form requires five projections across `nn-schema` and `nn-model` that currently exist only inside `createReviewController`:**
   - **Field schema projection (`fieldDefOf`)**: `kuModalTarget` (`review.js:832-960`) calls `fieldDefOf(options.schema, el.concept, field)` (`review.js:56-71`, `review.js:924`) to resolve the field's declared `type` (`string`, `number`, `boolean`, `select`, `reference`, `markdown`), `multiple` arity, enum `options`, `target_concepts`, and the `valueIsContainer` safety gate (`review.js:935-944`), which forces untyped object fields into `valueCommentOnly: true`.
   - **Matrix definition projection (`matrixCellDef`)**: Matrix cell editing (`review.js:834-863`) calls `matrixCellDef(options.schema, anchorData.matrix, anchorData.col, anchorData.target)` (`review.js:37-52`) to resolve `widgetType` (`boolean`, `set`, `scale`, `cycle`) and allowed `cellValues`.
   - **Cross-model reference candidate projection (`referenceCandidates`)**: Reference fields and relation retargeting (`review.js:817-822`, `review.js:871-886`, `review.js:948-950`) query `options.referenceIndex` across all collections and models in the domaiNN to produce valid `{ title, address }` candidates filtered by `target_concepts`.
   - **Inherited tag projection (`effectiveTagsOf`)**: Tag editing (`review.js:684-703`, `review.js:1147`, `review.js:1188`) merges `el.tags` / `el.fields.tags` with concept-level `el.inherited.tags.value` case-insensitively before computing the next tag array.
   - **Un-rebased raw field values and cryptographic preconditions**: `docFieldValue(el, key)` (`review.js:75-86`) reads `el.rawFields[key]` before `el.fields` so display-rebased media paths are not corrupted on save, while `canPropose` (`review.js:537-545`) and `openModalFor` (`review.js:1014-1021`) check `el.hash` against `BASE_HASH_PATTERN = /^[0-9a-f]{16}$/` (`review.js:16`).

Without a server-side projection that packages these five inputs for a target unit, an external A2UI host cannot render a schema-valid edit surface or construct a valid draft for `nn-drafts`.

## NN Findings: F2 Generating an A2UI catalog from InnfoUI breaks on imperative DOM factories, UAX #31 naming, JSON Pointer addressing, and post-render DOM selectors
category:: change
impact:: high
effort:: low
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1682, iNNfo/specs/bluepriNNts/console/ui-kit.js:1774, iNNfo/specs/bluepriNNts/console/ui-kit.js:4196, iNNfo/specs/bluepriNNts/console/ui-kit.js:5276, iNNfo/specs/bluepriNNts/console/review.js:16, iNNfo/specs/bluepriNNts/console/review.js:75, iNNfo/specs/bluepriNNts/console/review.js:602, iNNfo/specs/bluepriNNts/console/review.js:1780, iNNfo/specs/bluepriNNts/console/review.js:1890, scripts/console-views.mjs:25
recommendation:: Do not generate an A2UI catalog from ui-kit.js; keep InnfoUI as the console's internal DOM kit and represent external edit targets as data descriptors rather than A2UI component schemas.
tags:: [c4, q4, ui-kit, a2ui-catalog, addressing, validation]

**Answers Q4 (Attacks C4).** Attempting to derive an A2UI v1.0 catalog from `InnfoUI` (`ui-kit.js:5276-5344`) breaks across six concrete axes:

1. **Imperative DOM factories and semantic data derivation vs. declarative component schemas**:
   - The `InnfoUI` export block (`ui-kit.js:5276-5344`) exposes 68 symbols mixing constants (`VERSION`, `COPY`, `TOKEN_VALUES`, `TOKENS`, `CONCEPT_BADGE_SPECS`, `ORIGIN_VARIANTS`), pure helpers (`slug`, `conceptSlot`, `describeUnit`, `buildReferenceIndex`, `referenceCandidates`, `relativeAddress`), global DOM mutators (`setUnitChanges`, `setModelOwnership`, `ensureTokens`, `setTheme`, `defineCustomElements`), and DOM factory functions (`ElementMini` at `ui-kit.js:1682`, `ElementCard` at `ui-kit.js:1774`, `ElementPreview` at `ui-kit.js:1607`, `KpiGrid` at `ui-kit.js:4196`, `EditModal` at `ui-kit.js:5324`).
   - Every visual factory requires a live `Document` (`opts.doc` at `ui-kit.js:1609, 1684, 1776, 4200`), cross-element lookup maps (`opts.byId` at `ui-kit.js:1618, 1787`), raw DOM node arrays (`opts.head` at `ui-kit.js:1887-1891`), or synchronous JS callbacks (`opts.render`, `opts.onSelect`, `opts.onCite`, `opts.onSave` at `ui-kit.js:1614, 1702, 1842`, `review.js:1034`).
   - `ElementCard` (`ui-kit.js:1774-1900`) and `ElementMini` (`ui-kit.js:1682-1772`) take a domain element object and internally compute child `Ku('section', ...)` and `Ku('element', ...)` badges (`ui-kit.js:1713-1731, 1802-1824`), strip `<unitModel>@` prefixes (`ui-kit.js:1812-1815`), filter out L3-banned `sources::` fields while hoisting `data.citations` into `CitationIcons` (`ui-kit.js:1827-1854`), and scan `data.fields` to synthesize `status` pills and `summary` previews (`ui-kit.js:1857-1885`). A2UI schemas require explicit declarative props; they cannot run internal domain projections.
2. **UAX #31 identifier rules vs. cogNNitive identifiers**:
   - A2UI v1.0 restricts catalog entities and `ComponentId`s to UAX #31 (`^[\p{XID_Start}_][\p{XID_Continue}]*$`, forbidding whitespace and `-`) and reserves `@` for envelope mixins (`@catalogId`, `@accessibility`, `@metadata`, `@checks`).
   - Every identifier family in the console violates UAX #31 or collides with `@`: canonical unit addresses use `<model-id>@<slug>&<field>` (`review.js:795`, `review.js:824-830`, `review.js:1890-1909`); view IDs and run slugs mandate hyphens (`VIEW_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/` at `scripts/console-views.mjs:25`; `RUN_SLUG = /^[a-z0-9][a-z0-9-]*$/` at `review.js:24`); draft IDs are hyphenated (`fb-001` at `review.js:98`); verdict values are hyphenated (`'needs-change'` at `review.js:27`); and concept names contain spaces (`'Execution Event'` at `review.js:709`).
3. **RFC 6901 JSON Pointer binding vs. hierarchical IDs, slugs, and polymorphic field lookup**:
   - A2UI binds widget values via static JSON Pointers (`{"@path": "/..."}`).
   - In contrast, `resolveElement(id, modelId)` (`review.js:602-611`) resolves elements via 3-way fallback (`elementsById[id]`, `elementsById[modelId + '@' + id]`, or bare slug after `@`), `docFieldValue(el, key)` (`review.js:75-86`) checks `el.rawFields[key]` first, then searches `el.fields` as an array of `{ name, value }` records (`el.fields.find(...)` at `review.js:79-83`), and falls back to `el.fields[key]`, while `effectiveTagsOf(el)` (`review.js:684-703`) computes a case-insensitive union across `el.tags`, `el.fields.tags`, and `el.inherited.tags.value`. JSON Pointer cannot express predicate array lookups or fallback inheritance chains.
4. **A2UI `@checks` vs. console and changeset validation**:
   - A2UI `@checks` evaluates local widget predicates (e.g. `required`). The console's editability gates enforce cryptographic and relational invariants: `BASE_HASH_PATTERN` (`review.js:16, 537-545, 1014`), `valueCommentOnly` on untyped object containers (`review.js:938-944`), `descriptor.editability === 'structure'` requiring `data-nn-structure="on"` (`review.js:1922-1925`), cross-model `referenceCandidates` scoped by `target_concepts` (`review.js:817-822`), and kind-specific required keys in `store.addDraft` (`review.js:325-368`).
5. **`@accessibility` and post-render DOM decoration contract**:
   - `createReviewController` wires interactivity and accessibility by querying exact DOM attributes emitted by `InnfoUI`: `[data-nn-component="element-card"][data-element-id]` for `j`/`k`/`c` keyboard navigation (`review.js:1413-1472`), `[data-nn-component="ku-unit"][data-ku-address]` for pending-change pips (`review.js:1621`), `[data-nn-component="tag-row"]` and `[data-nn-component="rel-list"]` for inline tag/relation controls (`review.js:1487-1569`), `td[data-matrix][data-row][data-col]` for matrix cell pencils (`review.js:1578-1598, 1793`), and `[data-nn="draft-count"]` for `role="status"` and `aria-live="polite"` (`review.js:1882-1888`). An A2UI host rendering native widgets emits none of these selectors.
6. **Loss of styling and semantic color tokens (A2UI v1.0 removed `theme`)**:
   - `InnfoUI` encodes domain identity into CSS variables and slot attributes: `conceptSlot` (`ui-kit.js:1691-1696, 1793, 5286`) maps concept index/color to `--nn-mini-accent: var(--nn-concept-<slot>)` and `data-concept-slot`, `ORIGIN_VARIANTS` (`ui-kit.js:5298`) styles citation provenance (`error`, `agent`, `human`, `reviewer`, `document`), and `DataTable`/`MatrixGrid`/`Timeline` rely on `COMPONENT_CSS` tokens (`ui-kit.js:4239-4243, 5279-5282`). A2UI v1.0 delegates all styling to the host framework's native theme, erasing concept-slot and provenance color semantics.

## NN Findings: F3 Bypassing the UI modal exposes unvalidated schema writes and high-privilege control drafts in saveDraft and addDraft
category:: improvement
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:15, iNNfo/specs/bluepriNNts/console/review.js:17, iNNfo/specs/bluepriNNts/console/review.js:101, iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:935, iNNfo/specs/bluepriNNts/console/review.js:1324, iNNfo/specs/bluepriNNts/console/review.js:1922
recommendation:: Harden server-side changeset/draft intake (and store.addDraft) to enforce caller authorization on control draft kinds (verdict, run_start, run_handoff), L2 blueprint schema validation, base_hash verification, and container editability locks.
tags:: [c5, q6, security, validation, draft-store]

**Answers Q6 (Refines C5).** C5 warns that if an A2UI catalog becomes the editing contract, `propose()` stops being an internal format and becomes a public contract. In reality, the serialized draft record (`STORE_VERSION = 4` at `review.js:15`, normalized by `normalizeDraft` at `review.js:101-142` and hydrated from the `nn-drafts` HTML slot via `opts.initialDrafts` at `review.js:237-258`) is *already* the persisted cross-boundary contract between the console and the MCP (`propose_changeset`, `apply_change`, and `import_console` at `review.js:18-21, 529-536`). The critical security finding is that **`saveDraft` (`review.js:705-800`) and `store.addDraft` (`review.js:322-406`) enforce only minimal structural presence checks, while schema and editability guards live exclusively in the interactive UI layer (`kuModalTarget`, `openNew`, `handleKuAction`)**:

1. **What `saveDraft` and `store.addDraft` enforce today**:
   - `normalizeDraft` (`review.js:109`) coerces unknown `kind` values to `'comment'` against `ITEM_KINDS` (`review.js:22`).
   - `store.addDraft` (`review.js:322-368`) checks required string presence by kind: `['knowledge_id', 'concept', 'element']` for `new` (`review.js:328-333`); `['knowledge_id', 'element_slug', 'gate', 'verdict', 'reviewed_hash']` and `VERDICTS = ['approved', 'needs-change']` for `verdict` (`review.js:27, 337-345`); non-empty `procedure`, object `params`, and `RUN_SLUG` for `run_start` (`review.js:24, 346-355`); `RUN_SLUG` and `HANDOFF_CHOICES = ['administrator', 'agent']` for `run_handoff` (`review.js:23, 356-365`); and truthy `element_id` + `base_hash` for non-matrix element drafts (`review.js:366-368`).
   - For existing element drafts (`correction`, `comment`, `delete`, `verdict`), `saveDraft` (`review.js:751-788`) resolves `el = elementsById[anchorData.elementId]` (returning `null` if unknown) and stamps `concept`, `base_hash: el.hash`, `knowledge_id`, `element_slug`, and `original` from `el`.
2. **What an external agent bypasses when calling `propose` / `addDraft` or writing `nn-drafts` without UI modal mediation**:
   - **High-privilege control and execution drafts**: `ITEM_KINDS` (`review.js:17-22`) includes `verdict` (approving a review gate), `run_start` (which triggers `procedure_start` during `import_console` at `review.js:18-19`), and `run_handoff` (`review.js:20-21`). Neither `saveDraft` nor `addDraft` distinguishes human user activation from an automated agent caller.
   - **Unvalidated `new` element concepts and fields**: When `payload.kind === 'new'` (`review.js:711-729`), `saveDraft` explicitly skips `elementsById` and `options.schema`, accepting any arbitrary `knowledge_id`, `concept`, `element`, and `proposed` object without checking `schemaConcepts()` (`review.js:1324-1333`) or `declaredFieldsOf(concept)` (`review.js:1337-1343`).
   - **Unvalidated field names, types, options, and reference targets**: For `kind === 'correction'`, `saveDraft` (`review.js:774-799`) never calls `fieldDefOf(options.schema, el.concept, field)` (`review.js:56-71`). It does not verify that `field` is declared on `el.concept`, that `proposed` matches `schemaField.type` / `multiple` / `options`, or that a reference value belongs to `referenceCandidates(schemaField)` (`review.js:817-822`).
   - **Bypassed editability and container locks**: `valueIsContainer` (`review.js:938, 944`, which restricts untyped object containers to `valueCommentOnly`), `descriptor.editability === 'none' | 'structure'` (`review.js:1922-1926`), and `canPropose(meta, elements)` (`review.js:537-545`) are checked only when opening the UI modal, never inside `saveDraft` or `addDraft`.
   - **Unverified `base_hash` format and matrix coordinates**: `store.addDraft` (`review.js:366`) checks only `!raw.base_hash`, not `BASE_HASH_PATTERN` (`review.js:16`), and matrix drafts (`review.js:324, 730-750`) never check `matrixCellDef` (`review.js:37-52`) or row/col existence.
3. **Mandatory server-side validation before any external proposals round-trip exists**:
   - Reject or require explicit human sign-off (`requiresUserActivation`) for `verdict`, `run_start`, and `run_handoff` drafts submitted from agent channels.
   - Resolve `(knowledge_id, element_slug)` against the authoritative L3 model and verify `base_hash` matches both `BASE_HASH_PATTERN` and the current element hash (`isTargetChanged` at `review.js:437-452`).
   - Validate `concept` against `schema.concepts`, `field` against `fieldDefOf(schema, concept, field)`, and `proposed` against field type, `multiple`, `options`, `target_concepts` reference index, and `valueCommentOnly` / `editability` restrictions.
   - Validate matrix drafts against `matrixCellDef`, row/column collection membership, and allowed cell widget values.

## NN Findings: F4 C1 is right on Level 2 and Level 3 authority, and even the steelmanned view-projection reading fails on cross-element graph derivation
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:37, iNNfo/specs/bluepriNNts/console/review.js:56, iNNfo/specs/bluepriNNts/console/review.js:550, iNNfo/specs/bluepriNNts/console/review.js:963, iNNfo/specs/bluepriNNts/console/review.js:1324, iNNfo/specs/bluepriNNts/console/ui-kit.js:1607, iNNfo/specs/bluepriNNts/console/ui-kit.js:1774, iNNfo/specs/bluepriNNts/console/ui-kit.js:5288
recommendation:: Uphold C1 by keeping Level 2 blueprints and Level 3 models as the sole definition authority, and explicitly reject using A2UI as a declarative view-definition format for Ku components.
tags:: [c1, q1, architecture, layers, ku-unit]

**Answers Q1 (Defends and sharpens C1).** C1 correctly identifies that defining a Level 3 knowledge unit as domain data through A2UI is a layer violation: domain concepts, fields, and matrices are defined by Level 2 blueprints (`schema.concepts`, `schema.fields`, `schema.matrices` queried via `matrixCellDef` at `review.js:37-52`, `fieldDefOf` at `review.js:56-71`, `schemaConcepts` at `review.js:1324-1333`, and `declaredFieldsOf` at `review.js:1337-1343`). Adopting A2UI as a data or schema definition format would duplicate `nn-schema` and `nn-model`.

However, C1 overlooks a coherent second reading of the maintainer's question: in the console codebase, "Knowledge Unit" (`Ku`) is also the name of the UI component family (`Ku`, `createKu`, `describeUnit`, `KuInfoPanel` exported at `ui-kit.js:5288-5296` and instantiated inside `ElementMini` at `ui-kit.js:1714-1731`, `ElementCard` at `ui-kit.js:1803-1824`, and `KpiGrid` at `ui-kit.js:4209-4220`). Under this steelmanned reading, the question asks whether `Ku` components and console views could be *defined as declarative A2UI view templates* bound to an L3 `dataModel`.

Even under that charitable reading, A2UI is not a viable definition surface for `Ku` and console components because their rendering is graph-derived rather than tree-bound:
- `connectionsFor(el)` (`review.js:963-985`) scans every element in `elementsById` to compute incoming and outgoing relation edges for the element's `SankeyFlow` (`ui-kit.js:5326`) inside `EditModal` (`review.js:1026`).
- `ElementPreview` (`ui-kit.js:1607-1674`) lazily instantiates a full `ElementCard` (`ui-kit.js:1616-1622`) on hover/focus using `opts.byId` and dynamic viewport geometry (`ui-kit.js:1600-1606`).
- `flattenCitations(el.citations)` (`review.js:550-570`, `ui-kit.js:1830-1854`) restructures field-keyed citation maps into header `CitationIcons` and modal provenance lists.

A2UI's flat component adjacency list (`updateComponents`) with single-path JSON Pointer bindings (`{"@path": "..."}`) has no relational query primitive to compute reverse incoming graph edges (`connectionsFor`), cross-model reference candidate lists (`referenceCandidates`), or lazy hover cards (`ElementPreview`). Thus C1 holds under both the data-definition reading and the UI-projection reading.

## NN Findings: F5 A plain JSON Edit Target Descriptor over MCP plus registerView and handleKuAction delivers the same outcome at a fraction of A2UI's cost
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:528, iNNfo/specs/bluepriNNts/console/review.js:832, iNNfo/specs/bluepriNNts/console/review.js:1890, iNNfo/specs/bluepriNNts/console/review.js:1914, scripts/console-views.mjs:339, scripts/console-views.mjs:539, scripts/console-views.mjs:806
recommendation:: Reuse registerView and data-ku-address descriptors inside the console, and expose a plain JSON Edit Target Descriptor (modeled on kuModalTarget) plus draft submission via MCP tools instead of adopting A2UI.
tags:: [q5, mcp, register-view, yagni, architecture]

**Answers Q5.** Both console view definition and dual console/agent editing can be achieved with existing mechanisms and a plain JSON descriptor, making A2UI redundant:

1. **Inside the console (`registerView` + `collectViewData` + `handleKuAction`)**:
   - Views are classic-script IIFEs wrapped by `wrapperText` (`scripts/console-views.mjs:339-345`) that call `registerView` and optionally ship a build-time `<view>.data.mjs` module executed by `collectViewData` (`scripts/console-views.mjs:539-566`) to populate `ctx.viewData`.
   - Any view that renders units through `ctx.ui.Ku`, `ElementMini`, `ElementCard`, or `KpiGrid` emits `[data-nn-component="ku-unit"][data-ku-address]` (`review.js:1621`). The review controller's `anchorFromDescriptor` and `handleKuAction(action, descriptor)` (`review.js:1890-1928`) automatically route `info` and `edit` actions on any canonical address (`<model>@<slug>&<field>`, `concept:<name>&<field>`, or `<matrix>&<row>&<col>`) into the shared `EditModal` and draft store with zero protocol boilerplate.
2. **In the agent-facing interface (Plain JSON Edit Target Descriptor over MCP vs. A2UI)**:
   - As documented at `review.js:528-536`, applying drafts already lives outside the console in the MCP (`propose_changeset` / `apply_change`).
   - `kuModalTarget(anchorData)` (`review.js:832-960`) already computes the exact JSON structure needed to describe an editable unit: `{ title, fieldName, type, value, valueCommentOnly, multiple, options, target_concepts, candidates, modelId, draftField, original, citations, history }`.
   - Returning that plain JSON descriptor from an MCP tool (alongside `base_hash` from `el.hash`) and accepting a draft object matching `normalizeDraft` (`review.js:101-142`) gives any LLM agent complete schema, enum option, reference candidate, and concurrency-hash context directly.
   - Furthermore, when a visual UI is desired inside an MCP host (Claude or Gemini), Protocol Fact #11 notes that MCP Apps (`ui://` sandboxed iframe) can directly mount the self-contained HTML produced by `inlineConsoleAssets` (`scripts/console-views.mjs:806-816`) without translating `InnfoUI` into A2UI.

| Dimension | Plain JSON Descriptor + MCP Tool / `registerView` | A2UI v1.0 Catalog + Surface Envelope |
|---|---|---|
| New protocol / SDK dependencies | None (0 bytes in bundle) | A2UI envelope, JSON Schema catalog, host renderer |
| Identifier compatibility | Native `<model>@<slug>&<field>` (`review.js:829, 1890`) | Requires bijective escaping to satisfy UAX #31 |
| Field & tag resolution | Native `docFieldValue` (`review.js:75`) & `effectiveTagsOf` (`review.js:684`) | Requires flattening `el.fields` arrays to JSON Pointers |
| Concurrency & provenance | Native `base_hash` (`review.js:16, 778`) & `citations` (`review.js:550`) | Must be smuggled in custom function args or hidden paths |
| Visual UI in MCP hosts | Existing self-contained console HTML via MCP Apps `ui://` | Partial native form lacking `SankeyFlow` & concept slots |

A2UI buys nothing over a plain JSON MCP edit descriptor unless a target host mandates A2UI native widgets and forbids both MCP Apps (`ui://`) and standard MCP tool calls.

## NN Findings: F6 Verdict is to reject A2UI for console and KU definition, defer external A2UI edit surfaces, and replace C4's read-only test with an edit-descriptor round-trip experiment
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:75, iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:537, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:832, iNNfo/specs/bluepriNNts/console/ui-kit.js:5276
recommendation:: Reject A2UI inside the console and for KU definition, defer any external A2UI edit adapter, and run a single MCP JSON edit-descriptor round-trip test instead of C4's read-only catalog generation experiment.
tags:: [c4, q7, verdict, experiment, falsification]

**Answers Q7 (Refutes C4's experiment).** C4 proposes generating an A2UI catalog from `ui-kit.js` (`ui-kit.js:5276-5344`) and rendering one knowledge unit read-only, claiming that *"if the catalog comes out clean and an agent fills it correctly from the catalog instructions, editing is viable."* That inference is a false-positive trap:
- A read-only render of one unit exercises none of the state transitions or invariants required for editing: `canPropose` (`review.js:537-545`), `kuModalTarget` schema/matrix/reference resolution (`review.js:832-960`), `docFieldValue` un-rebased raw value lookup (`review.js:75-86`), `effectiveTagsOf` inheritance merging (`review.js:684-703`), `saveDraft` `base_hash` stamping (`review.js:774-799`), or `store.addDraft` precondition checks (`review.js:322-406`).
- Conversely, generating a catalog from `ui-kit.js` is guaranteed to fail or require heavy distortion because `ui-kit.js` exports imperative DOM factories (`ElementCard`, `ElementMini`, `KpiGrid`), not declarative form schemas (Finding F2).

**Verdict:**
- **Reject** defining Level 3 knowledge units, Level 2 schemas, or console `Ku` components/views through A2UI (C1, F4).
- **Reject** embedding an A2UI runtime in `nn-console.bundle.js` or auto-generating an A2UI catalog from `InnfoUI` (`ui-kit.js:5276-5344`) (C3, C4, F2).
- **Defer** building an external A2UI edit-surface adapter (C2) until: (1) `kuModalTarget` (`review.js:832-960`) is extracted into a shared server-side Edit Target Descriptor with full L2 schema validation on draft intake (F1, F3), and (2) a concrete host integration requires A2UI native surfaces rather than MCP tool schemas or MCP Apps `ui://` iframes (F5).

**Single smallest experiment worth running:**
1. Extract a pure function `describeEditTarget(schema, model, referenceIndex, address)` mirroring `kuModalTarget` (`review.js:832-960`) and `anchorFromDescriptor` (`review.js:1890-1909`) for one real L3 element that has: (a) a `select` field, (b) a cross-model `reference` field, and (c) inherited + own `tags`.
2. Expose that plain JSON descriptor to an agent and ask it to emit a `correction` draft for each of the three fields, then validate the output through `createDraftStore.addDraft` (`review.js:322-406`) plus server-side `fieldDefOf` / `referenceCandidates` / `base_hash` checks.
3. In parallel, hand-write a minimal A2UI v1.0 surface (`createSurface` + `updateComponents` + `updateDataModel`) for the exact same 3-field element edit and count the translation shims required for UAX #31 IDs, JSON Pointer array bindings, and `base_hash` preservation.

**Falsification criterion:** If the plain JSON descriptor produces valid, schema-checked `nn-drafts` records directly while the A2UI v1.0 surface requires custom UAX #31 address escaping, `el.fields` array-to-object flattening for JSON Pointer, and out-of-band state for `base_hash` / `knowledge_id` / `original` with zero gain in draft accuracy, A2UI is falsified as an editing contract for cogNNitive.

## NN Findings: F7 C3 misdiagnoses the offline conflict because static A2UI JSON could be inlined via collectViewData, whereas A2UI's live callAgentFunction loop and classic-script budget are what actually break
category:: change
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: scripts/console-views.mjs:339, scripts/console-views.mjs:486, scripts/console-views.mjs:539, scripts/console-views.mjs:774, scripts/console-views.mjs:806, scripts/console-views.mjs:819, scripts/console-views.mjs:917, iNNfo/specs/bluepriNNts/console/review.js:17, iNNfo/specs/bluepriNNts/console/review.js:159
recommendation:: Keep A2UI out of the console bundle and HTML payload slots, citing the absence of a live agent endpoint on file:// and the classic-script bundle constraints rather than claiming JSON envelopes require network calls.
tags:: [c3, q3, console-bundle, offline, console-views]

**Answers Q3 (Critiques C3).** C3 argues that putting A2UI inside the console is a contradiction because A2UI is a streaming/network protocol whereas the console makes zero network calls on `file://`. This overstates the transport coupling while missing the two mechanisms in `scripts/console-views.mjs` and `review.js` that actually break:

1. **Why static A2UI injection outside the bundle would not break the zero-network or CSP invariant**:
   - A2UI envelopes (`createSurface`, `updateComponents`, `updateDataModel`) are plain JSON documents decoupled from transport.
   - `collectViewData({ views, rootDir, models })` (`scripts/console-views.mjs:539-566`) already runs each view's sibling `<view>.data.mjs` at export time in Node.js and embeds the returned JSON into the console HTML payload (`ctx.viewData`).
   - `allowInlineScripts(html)` (`scripts/console-views.mjs:688, 774-799`) hashes only executable `<script>` elements (`EXECUTABLE_SCRIPT_TYPES` at `scripts/console-views.mjs:688`) for the page's `Content-Security-Policy` meta tag and explicitly ignores non-executable JSON data islands (`scripts/console-views.mjs:770-771`). Thus, injecting a pre-rendered A2UI JSON snapshot as a payload slot or `ctx.viewData` entry would make zero runtime network calls and would pass CSP verification.
2. **What actually breaks when consuming A2UI in an offline `file://` console**:
   - **No live agent runtime for `callAgentFunction` / `agentFunctionResponse`**: In A2UI v1.0, user interactions that validate, recompute, or submit agent-driven surfaces invoke `callAgentFunction` over an active return channel. On an offline `file://` page, no agent process exists; the console's only write path is `window.localStorage` (`resolveStorage` and `createDraftStore` at `review.js:159-235`), and even agent procedure invocations cannot run live—they are queued as passive `run_start` and `run_handoff` drafts (`review.js:17-22, 346-365`) that do nothing until a later `import_console` run outside the browser.
   - **Classic-script compilation and size budget gates**: Every inlined script in the console must compile as a strict classic script (`assertClassicScript` and `findModuleSyntax` at `scripts/console-views.mjs:374-497`, rejecting ES module `import`/`export`), and the final HTML is gated by `CONSOLE_SIZE_BUDGET` and `evaluateSizeBudget` (`scripts/console-views.mjs:819, 917-955`). Shipping an A2UI web renderer (which targets Lit, React, or Angular ES modules) inside `nn-console.bundle.js` violates the classic-script Preact+htm architecture and duplicates `registerView` (`scripts/console-views.mjs:339-345`) for zero offline capability gain.
