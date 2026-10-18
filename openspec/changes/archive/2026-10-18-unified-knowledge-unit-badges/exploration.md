# Exploration: Unified knowledge-unit badges (`unified-knowledge-unit-badges`)

Phase: sdd-explore. Store: openspec. Worktree: `cogNNitive-ku-mockup` (branch `session/ku-mockup`).
Maintainer decisions (one builder, nature x origin axes, `value` as one typed kind, actions outside the badge, edit-structure toggle, no `marker` kind) are taken as given; this document explores their impact. Everything below was read from the code or verified by a probe (the probe is described under "Address findings").

## 1. Current state

### 1.1 Two taxonomies, plus three more address dialects

| Where | Vocabulary |
|---|---|
| `innfo-core/src/sourceRef.ts:54` (`KnowledgeUnit`) | `header`, `row`, `pointer`, `element`, `matrix` (plus `subunits[]`: field / column / matrix row+col) |
| `ui-kit.js:2769` (`KU_KINDS`) | `document`, `element`, `concept`, `field`, `cell`, `marker`, `reference` |
| Console element id (`scripts/export-console.mjs:935`) | `${modelId}@${slug}` (D5 target prefix) |
| Pip/ledger key (`review.js:1332`) | `elementId + '#' + field` |
| Footer path (`export-console.mjs:954`) | `${file}@## ${Concept}: ${Name}` (header form) and `unitSlug` `${file}@${concept}--${element}` |
| Prior archived change (`2026-10-11-console-ku-badge-unification`, decision 1) | marker score address `element-slug#marker:<slug>` |

So "one presentation per canonical address" (spec `console-ui-kit` line 321) is not achievable today: there is no single canonical address to key on. Matrix-cell drafts have no `element_id` at all (`review.js:546`, `normalizeDraft`), so `decorateChangePips` (`review.js:1327`, skips drafts without `element_id`) can never put a pip on a matrix cell.

### 1.2 `KuBadge` today (`ui-kit.js:2787`)

- Pure builder, `data-innfo-component="ku-badge"`, `data-ku-kind`. An unknown kind silently falls back to `element` (line 2790): it does not throw, so it cannot be a guard.
- `field` kind renders `name: value` in ONE badge (the thing the maintainer wants split into field-definition + value).
- `marker` kind overwrites `data-kind` with the marker kind (line 2819) - a different attribute namespace than `data-ku-kind`.
- Actions: `KuActions` (`ui-kit.js:2868`) is a separate builder; the kit is stateless and edit exists only if the caller passes `onEdit`. In practice the kit never gets `onEdit`; `review.js` decorates the DOM after render (see 3).

### 1.3 Legacy builders that do NOT delegate to `KuBadge`

The 2026-10-11 change promised `ConceptPill/ElementPill/MarkerChip` would "delegate"; they did not. All three build their own DOM: `ConceptPill` `ui-kit.js:485`, `ElementPill` `:509`, `MarkerChip` `:544`.

## 2. Inventory of every place a knowledge unit is rendered

Legend: **KB** = goes through `KuBadge`; **BYP** = bypasses it; **FAKE** = hand-built span that copies `data-ku-kind` to look like a badge.

### 2.1 `iNNfo/specs/bluepriNNts/console/ui-kit.js`

| Line | Component | Unit(s) | Status |
|---|---|---|---|
| 485 | `ConceptPill` (rail, facets, matrix corner, ref dialog, KpiGrid, DraftList) | concept | BYP |
| 509 | `ElementPill` (RelList, FieldRow ref, DraftList, table name cell, badges view, stepper, timeline view) | element / reference | BYP |
| 544 | `MarkerChip` (card head, ElementMini, guide) | marker | BYP (removed by companion change) |
| 594 | `QudChip` | element id + its OWN info button (`innfo-qud-btn`) | BYP, competing info affordance |
| 649 | `TagRow` / `.innfo-tag` | tag | BYP (becomes select value in companion) |
| 682 | `RelList` | field-def chip `innfo-rel-field innfo-ku-field-chip` + element pill | FAKE + BYP |
| 735 | `StatusBadge` | not a unit | n/a |
| 765/788 | `CitationIcon(s)` | citation origin icons (the Source pointer is only visible in the dialog) | BYP |
| 989-1172 | `FieldValue` renderers (`innfo-field-bool`, `innfo-field-select`, `innfo-obj-chip`, `innfo-file-pill`, url, image, media, code, markdown, list) | value (typed) | BYP; they are the value BODY today, hosted INSIDE the `field` badge via `valueNode` |
| 1174 | `FieldRow` | field + value | KB (`kind:'field'`) |
| 1432 | `ElementMini` | concept + element (KB) + markers (BYP) + own `innfo-mini-info` button | mixed |
| 1532 | `ElementCard` | concept + element (KB), strip chips `innfo-obj-chip` and `innfo-strip-rel` (BYP, lines 1683-1753), status pill, tags, `RelList` | mixed |
| 1832 | `DraftList` | concept (BYP), element (BYP), field chip (FAKE, line 1897) | BYP |
| 2918 | `Table` (public kit API; only tests call it) | columns `element`/`field`/`cell` KB; `text` -> `td.textContent` (line 2983) | mixed, effectively dead code |
| 3017 | `KpiGrid` | concept | mixed |
| 3053 | `<innfo-ku>` custom element | any kind | KB |

### 2.2 `innfo-runtime.js`

| Line | Surface | Unit(s) | Status |
|---|---|---|---|
| 732-815 | Navbar identity + own "Domain info" popover (`innfo-navbar-info-btn`) | **domaiNN** (title as `textContent`) | BYP |
| 868 | Banner title | kNNowledge document | KB (`kind:'document'`) |
| 991, 1077 | Facet menus (model / concept rows, count badges) | document, concept | BYP |
| 1135-1197 | Active-filter pills (concept pill hand-colored, model pill) | concept, document | BYP |
| 1236-1245 | Rail item | concept | BYP (`ConceptPill`) |
| 1280-1330 | Hierarchical rail (`<details>` per model) | document | BYP |
| 1484-1495 | Concept guide head (`innfo-card-concept-badge`) | concept | BYP |
| 1534 | Guide "Fields" list (`innfo-ku-field-chip`, `data-ku-kind="field"`) | field definition | FAKE |
| 1564 | Guide "Markers" (`MarkerChip`) | marker definition | BYP (companion removes) |
| 1584 | Guide matrix pair (`ConceptPill` x2) | concept | BYP |
| 1897-1911 | `mountElementCards` fallback concept badge (`innfo-card-concept-badge`) | concept | BYP (redundant with ElementCard) |
| 1977 | `mountElementBadges` (`ElementPill`) | element | BYP; passes `onClick`, but `ElementPill` only honors `onSelect`/`href` -> latent dead handler |
| 2008 | `mountElementMiniCards` | concept + element | KB inside `ElementMini` |
| 2120-2264 | `mountElementTable` (does NOT use `UI.Table`) | header field label KB (`kind:'field', label` - a field DEFINITION shown as `field`, line 2152); name cell `ElementPill` (2192, BYP); concept cell `ConceptPill` (2217, BYP); field cells `el('td', ..., text)` (**2239, bare**); tags cell plain text (**2253, bare**) | mostly BYP |
| 2295-2411 | `renderMatrices` | matrix title = `KuBadge{kind:'element', id:'matrix-<slug>'}` (fake element id, line 2331); headers = `KuBadge` element/marker (2307); corner = `ConceptPill` (2364); cells = `KuBadge{kind:'cell'}` (2400) | mostly KB |
| 3325, 3354 | Timeline grid group badge `innfo-grp-badge`, metric rows | metric rows (elements) | BYP |
| 4015 / 1832 | Review tab -> `DraftList` | see above | BYP |
| 4154 | `renderRefDialog` | concept (`ConceptPill`), fields as bare `dl/dd` | BYP |
| 4333 | `renderFieldDetailDialog` | field name as `h2`, value via `FieldValue` | BYP |
| 4399 | `renderMetamodelView` | concepts as SVG circles, matrix/relation edge labels as SVG text | BYP (SVG; needs its own decision) |
| 4594 | `renderCitationDialog` | **Source units** as `dl/dd` (Path, Anchor, Version, SHA-256) | BYP |
| 4675-4732 | `renderDocument/View` | elements as `h2/h3`, fields as `dl/dd` | BYP |
| 4854-4935 | Floating dock `#innfo-review-dock` (status, reviewer chip, Changes, Drafts count, Export, Exit) | not a unit; this is the "floating edit bar" | n/a |

### 2.3 `render-procedure-stepper.js`
`refButton` (line 308) uses `ElementPill` (BYP) and passes `onClick`, which `ElementPill` ignores. Step elements are headings built bare (135 DOM-building calls in the file).

### 2.4 Blueprint views (`iNNfo/specs/bluepriNNts/*/assets/console-view-*.js`)
- `innovation/console-view-portfolio-timeline.js` -> `ctx.ui.ElementPill` (BYP).
- `innovation/console-view-portfolio-kanban.js` -> `ctx.ui.ElementMini` (mixed).
- `organization/console-view-org-chart.js`, `projects/console-view-roadmap.js` -> `textContent` for position/person/milestone/task/date plus their OWN `editButton` (`ctx.modal.edit`) that renders in view mode (BYP; also a pre-existing violation of "no edit control outside review mode", because `controller.openEdit` has no mode check, `review.js:802`).
- `changes/console-view-changes.js`, `metrics/console-view-timeline.js`, `procedures/console-view-procedure.js`, `innovation/console-view-portfolio-charts.js` -> plain text.
- Views receive `ctx.ui` (InnfoUI), so third-party custom views (`consoles/views/<slug>.js`) can always bypass; a repo guard can only police repo-owned code.

### 2.5 `review.js` post-hoc decorators (they query the DOM by attributes of the legacy markup)
`decorateCard` (1107) appends a pencil INSIDE the element badge and INSIDE each `[data-marker-id]` chip (1131, 1149); `decorateTagRow` (1164, `x`/`+ tag` inside the tag chip); `decorateRelList` (1206); `decorateFieldRow` (1248, `annotateControl` inside the field badge); `decorateMatrixCell` (1258, pencil inside the `td`); `decorateInfoActions` (1282) appends the info cluster INSIDE the badge when `kind==='field'` (line 1297-1298) and as a sibling otherwise. So the rule "actions live outside the badge" (spec `console-ui-kit` 342, `console-review-mode` 180) is violated today for name, marker and field.

## 3. Review mode, `KuActions`, `EditModal`, edit bar

- **Mode** = `html[data-innfo-review=on]` + controller closure `enabled` (`review.js:508, 1555`). Toggle button is built by `buildToggle` (1531). On `disable()` every node with `data-innfo-review-ctl` is physically removed (1592); on `enable()` `decorate()` walks the DOM again. Info actions and pips are decorated in both modes (`applyDecorations`, 1467).
- **Floating bar** = `#innfo-review-dock`, built in `innfo-runtime.js:4854` (status dot, reviewer chip, `Changes`, `Drafts: N`, `Export changes`, `Exit`); `review.js` adds `+ New element` next to Export (`buildNewElementButton`, 1032). The "Edit structure" toggle plugs in beside the reviewer chip; it needs a shared state holder (a `data-innfo-structure=on` attribute next to `data-innfo-review`, same pattern) and must reset on `disable()`.
- **`EditModal`** (`ui-kit.js:2100`): tabs are `Edit | Lineage | Connections` (NOT the "Info | Edit mode-gated tabs" the living spec `console-review-mode` line 176 describes). Info = `openInfo` -> `openEdit({info:true})` -> `startTab:'history'`, but the Edit tab and the "Save draft" button stay reachable from the Info entry, so spec and code diverge. Worse: `kuModalTarget` (`review.js:599`) returns `null` for anything that is not an element name/description/marker/field/relation/matrix cell, and `openEdit` then returns `false` - so an info icon on a concept, document, domaiNN or Source badge would do NOTHING today. The unified info surface needs its own panel (the mockup's "Unit info" aside: kind, nature, lives-in, address, editable) or a new modal tab; it cannot reuse `EditModal`'s element-centric data.
- **Write paths that exist today** (`draftToChange`, `innfo-runtime.js:4977`; `CHANGE_OPS` in `innfo-core/src/changeset/types.ts:8`):
  - console emits: `update_field`, `update_matrix_cell`, `rename_element` (field `name`), `remove_element`, `add_element`, `comment`.
  - engine also supports but the console never emits: `rename_concept`, `update_concept_text`, `add_model` (mutations on the kNNowledge document, not on the bluepriNNt).
  - **No op edits a bluepriNNt**: field definitions, marker definitions, matrix definitions, concept definitions (icon/color/type) have NO write path. They are `## NN Field Definition: x`, `## NN Concept Definition: x`, `## NN Matrix Definition: x` sections of a (published, write-once, hosted) `spec_NN.md`; the editor that could have touched them was retired (S5, `archive/2026-10-15-2026-10-13-s5-retire-innfo-editor`).
  - Consequence: the "Edit structure" toggle can only produce `comment` drafts (like tag/relation proposals do today, `review.js:841-857`). Decide explicitly (see 8, Q1) whether the toggle ships now (comment-only structure proposals) or waits for a structure-edit op.
- **Value editing**: the existing `kuModalTarget` already maps a field to widgets by declared type (`string/number/boolean/select/multiselect/reference/markdown`); a matrix cell maps to `string/boolean/select` by the marker/matrix `widget`. These are exactly the two `value` sources the new unified `value` kind must carry as its `vtype`.
- **Mode gating contract**: living spec says "With review mode off, no edit ... control exists in the DOM" (`console-review-mode` line 12). The mockup hides edit via CSS (`display:none`), which keeps the control in the DOM. Either the spec scenario is relaxed (hidden + removed from the tab order and accessibility tree) or the DOM is decorated lazily as today. See approaches.

## 4. Payload builder: what each unit gets vs what the unified badge needs

`buildConsolePayload` (`innfo-core/src/console/payload-builder.ts:145`) + `export-console.mjs` (domain assembly, lines 900-1090) + `buildConsoleSchemaSlot` (`slot.ts:64`).

| Need | Available now | Gap |
|---|---|---|
| Element address | `element.id = ${modelId}@${slug}` (domain console), `slug`, `hash`, `modelId`, `modelFile`, `canonicalUnit` (header form) | three spellings (id / `canonicalUnit` / `unitSlug`); `modelId` is a free-form stem (`kNNowledge/GhostOps`, `X_V_0-1-0`), which the core `@` parser rejects (see 5) |
| Field value address | none; runtime would compose `id + '&' + fieldName` | no per-field `address`, no declared `vtype` on the value (schema `fields[]` has `type`) |
| Matrix cell address | cell keys `row`/`col` in `matrices[].cells`; drafts carry `matrix,row,col,knowledge_id` | no address; row/col are display labels, not normalized names |
| Matrix header/axis | `head.rows/cols[label].{concept,kind:'element'|'marker'}` | headers are ELEMENTS (or Markers for `item-markers matrix`), not an "axis" unit; no element id on header entries |
| Concept (structure) | `schema.concepts[]` (`name, color, icon, type, fields, markers`) | no address, no source-blueprint identity (the domain slot de-duplicates concepts/fields/markers/matrices FIRST-WINS across models, `export-console.mjs:1008-1043`, dropping which bluepriNNt declared each) |
| Field definition | `schema.fields[]` flat `{concept,name,type,options,target_concepts}` | no address, no blueprint identity |
| Matrix definition | `schema.matrices[]` (`name, source, target, values, widget`) | same |
| Document (kNNowledge) | `meta.models[]` `{id,title,filePath,blueprint,version,sha256,sources,changeCount,conceptNames,elementCount}` | no address; `blueprint` is the base name only (no path/URL) |
| domaiNN | `meta.title/domainId` (root folder name) | no address and no unit descriptor at all |
| Source | `element.citations[field][]` `{path, anchor, exists, origin, error, sha256, version, excerpt, href}` | no canonical `path@anchor` string, and `origin` here is the CITATION origin (`agent/human/document/error`), a different meaning from the new origin axis |
| nature / origin / editable | none | none carried; must be derived once (see 5.3) |
| Pending changes per unit | `drafts` (element_id#field or matrix/row/col) | pip keyed by a non-canonical string |

Important: `payload-builder.ts` runs offline in the exporter (compiled to `console-payload.generated.cjs`); the browser bundle imports only `InnfoSlug` (`scripts/lib/console-bundle.js` `SOURCES`). Anything the badge needs at runtime must either be emitted by the payload, or be a new small generated browser module in the same style as `innfo-slug.generated.js` (the spec `console-field-citations` "Console runtime slug parity with core" is the precedent).

## 5. Address findings (verified by a probe against `sourceRef.ts`)

Probe: `parseKnowledgeUnitRef`/`parseCitation` bundled with esbuild (scratch only, no repo write):

| Input | Result |
|---|---|
| `ghostops@slimer&owner` | `model` / `element` / sub `owner` (valid) |
| `GhostOps_V_0-1-0@slimer&owner` (what the console ids look like) | **NULL** (model part must match `^[a-z0-9]+(-[a-z0-9]+)*$`, `resolveUnitPath`) |
| `kNNowledge/GhostOps_NN.md@slimer` (what the MOCKUP uses) | **NULL** (a `.md` path switches to the header grammar and requires `#`) |
| `kNNowledge/GhostOps_NN.md@## NN Incident: Library haunting&owner` | valid header unit - a SECOND legitimate address for the same field |
| `ghostops@risk-matrix&high&severe` | `matrix` (2 subunits) |
| `ghostops@risk-register&high&severe` | `matrix` (any 2 subunits) |
| `ghostops@risk-matrix&high` | **`element`** with subunit `high` (one-subunit ambiguity) |
| `ghostops@risk-matrix` | `matrix` only because the slug matches `/matrix-|-matrix$/` (heuristic) |
| `sources/s.csv@*&borough` (mockup "column alone") | parses as row id literally named `*`, i.e. a collision, not a wildcard |
| `domaiNN_NN.md` | `source` (entrypoint is classified as a source by `kind`) |
| `…/procedures/spec_NN.md@## NN Field Definition: category` | valid header unit, classified `source` |

Consequences for the maintainer's "address gaps" list:

1. **Concepts, field definitions, marker definitions and matrix definitions DO have an `@` address today**: they are headers of the bluepriNNt file (`## NN Concept Definition: Procedure`, `## NN Field Definition: category` with `concept:: Procedure`, `## NN Matrix Definition: work-roles matrix`). What is missing is a SEMANTIC alias (`<blueprint>@<concept>&<field>`) and a way to resolve the blueprint file from a payload that dedupes schema first-wins. Note a field definition belongs to ONE concept (`concept::` on the definition), so the mockup's `bp@incident&owner` nesting is a presentation choice, not the file structure.
2. **A kNNowledge concept section** (the container of elements, which also carries narrative `text` and `rename_concept`/`update_concept_text` ops) is a DIFFERENT unit from the bluepriNNt concept definition. The mockup's "concept" kind conflates them. The D5 address for it already exists in changesets: `model@Concept` (used by `add_element`, `rename_concept`, `update_concept_text`).
3. **Matrix "axes" are not bluepriNNt structure.** The matrix DEFINITION declares `source`/`target` concepts; the actual row/column labels in a kNNowledge matrix are references to ELEMENTS (or Markers in the reserved `item-markers matrix`, which the companion change deletes). So there is no `axis` kind: a matrix header is an `element` badge (already how `headerBadge` renders it), and the structure part of an axis is a `concept` badge in the corner. The mockup's `axisRow/axisCol` addresses (`&likelihood`, `&*&impact`) are not in the grammar.
4. **The domaiNN** has no semantic address; the only parseable form is its file (`domaiNN_NN.md`), which `parseKnowledgeUnitRef` types as `source`.
5. **A bare CSV column** has no address (`*` is a literal row id); a new unit kind or an explicit rule is needed (grammar change in `sourceRef.ts` + `citation-parser-resolver` spec).
6. **`origin` can be derived, not passed.** `naming/contract.ts:95` `roleOf()` already classifies a path: `entrypoint` -> domaiNN, `spec` -> bluepriNNt, `knowledge`/`changeset`/`procedure`/`catalog` -> kNNowledge, `source`/`artifact`/`sidecar` -> Source. One pure function in core, no per-call-site choice.
7. **Vocabulary collisions to resolve in the proposal**: existing `origin` (citation origin `agent/human/reviewer/document/error`, `data-origin`, `ORIGIN_VARIANTS`, `CitationIcon`) vs the new origin axis (domaiNN/bluepriNNt/kNNowledge/Source); existing `kind` of draft (`correction/comment/delete/new`) vs `data-ku-kind` vs `data-kind` (marker). Rename one side before coding (suggest keeping `origin` for the citation provenance and calling the new axis `home`, `layer` or `lives-in`; the mockup info panel already says "Lives in").
8. **Value type vocabulary mismatch.** The mockup uses `text/number/boolean/reference`. The declared L1 field types (`iNNfo_V_0-4-0_NN.md:155`) are `string, select, reference, markdown_inline, markdown_file, image, file, video, audio, url, knowledge, citation`; `number`, `boolean`, `multiselect` are NOT L1 field types (the console infers them from the value's shape, `FieldValue` step 1, and `kuModalTarget` falls back to `typeof`), while matrix cells use `widget: boolean|cycle|scale|set|text`. A `citation` value is a list of SOURCE units, and a `reference` value is an element reference. The proposal must define `vtype` as declared-type with documented inference.

## 6. What must change

### 6.1 Living specs (`openspec/specs/...`)
There is no spec literally named `knowledge-unit-uri`; the `@` grammar lives in `citation-parser-resolver`, `typed-source-references`, `changeset-document-model` (D5 target) and `console-export-cli`.

- `console-ui-kit/spec.md`
  - MODIFIED: "InnfoUI Component Contract" (component id list, `ku-unit`), "ElementPill", "MarkerChip", "ConceptPill" (become wrappers/removed), "CitationIcon and FieldRow" (field splits into definition + value), "Knowledge-Unit Badge Family" (rewrite: kinds, nature/origin axes, border grammar, address attr, unknown-kind throws), "Unit Action Cluster" (placement rule, derived editability), "Pending-Change Pip" (keyed by address, cells), "Type-Aware Field Value Rendering" (value body inside the value badge), "Renderers Consume the Kit" (no-bypass scenarios), "Element Card Tag Row" (tags as a select value), "Semantic Token Injection" / "Status Color Contrast Floor" (source-paper tokens, light+dark).
  - ADDED: "Unit Nature And Origin Grammar", "Canonical Address On Every Unit", "No Bypass Guard", "Source Unit Presentation", "Structure Unit Presentation".
  - Drift to fix while there: `StatusBadge` spec lists `pending/applied/rejected/stale` but code accepts `applied/conflict/proposed` (`ui-kit.js:734`).
- `console-review-mode/spec.md`: MODIFIED "Review Mode Toggle" (the no-edit-control-in-DOM scenario), "Unit Info And Edit Entry Points" (nature-derived editability; containers info-only; sources never; structure behind toggle; the Info surface for non-element units), "Pending-Change Indicator" (address-keyed, matrix cells), "Constrained Matrix Cell Editor" (cell = `value` unit), "Inline Annotation Popover" (field-row anchor -> value unit); ADDED "Edit Structure Toggle" (location in the dock, default off, reset on exit, what an edit produces).
- `console-payload-builder/spec.md`: ADDED "Unit Addresses In The Payload" (and `nature/origin` or the rule to derive them); MODIFIED "Matrix Header Metadata" (header entries carry the element address, `item-markers` branch goes with the companion), "Declared Field Definitions in the Schema Slot" (+ address + declaring blueprint), "Element Ids and Hashes" (id vs address relation), "Payload Meta" (domaiNN descriptor), "Element Tags in the Payload" (companion).
- Address grammar: `citation-parser-resolver` ("`parseCitation` unit kinds", "Citation paths are workspace-relative"), `typed-source-references` ("Single shared source-reference parser": unit kinds list at line 13), `changeset-document-model` (D5 concept address), plus whichever spec owns `roleOf`/naming (`nn-naming-contract`) if origin derivation lives there. Possibly `element-concept-tags` and `console-field-citations` (citation dialog renders Source badges).
- `document-badge` is unrelated (Markdown header badge syntax), do not touch.

### 6.2 Docs
`docs/innfo/documentation/console-ui-kit.md` (components table lines 39-52, "Knowledge-unit badges" 72-97, tokens, hand-off), `docs/innfo/documentation/reviewer-guide.md` (review mode wording), `docs/innfo/documentation/innfo-mcp.md` (mentions ku-badge).

### 6.3 Code
`iNNfo/specs/bluepriNNts/console/ui-kit.js`, `innfo-runtime.js`, `review.js`, `innfo-ui.css` (~60 `ku-badge` rules plus `innfo-obj-chip`, `innfo-ku-field-chip`, `innfo-card-concept-badge`, `innfo-tag`, `innfo-marker-chip`), `render-procedure-stepper.js`, `artifact_shell.html` (dock markup is runtime-built; shell probably untouched), blueprint views (`organization`, `projects`, `innovation`, `metrics`, `changes`), `innfo-core/src/sourceRef.ts` (+`naming`) and `console/payload-builder.ts`, `console/slot.ts`, `scripts/export-console.mjs`.

### 6.4 Generated / bundled artifacts
- `iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js` (`npm run build:console`; drift gate `npm run check:console-bundle`, `scripts/lib/console-bundle.js`).
- `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs` and `innfo-slug.generated.js` (`scripts/build-console-payload.mjs`; any new browser address module would be added here and to `SOURCES` in `console-bundle.js`).
- Console release pin: `console/package.json` version + `manifest/source.yaml` `console_assets` (`getConsoleReleaseInfo`); generated shells must carry the current pin (`console-shell-guard.js` rule 7).
- Fixtures regenerated from the exporter: `test/fixtures/testlab/domaiNN_console.html` and the two `test/fixtures/testlab/artifacts/*_console/` folders (embedded bundle copies + `innfo-ui.css`). The `simulacro-refactorizacion` and `metrics/samples` copies are "frozen copies" (permanent history, `console-ui-kit.md` line 210): do NOT regenerate.
- Sibling worktree `cogNNitive-ku-lifecycle-fixes` (`session/ku-lifecycle-fixes`) already modifies `console-payload.generated.cjs`, `test/fixtures/testlab/domaiNN_console.html` and `openspec/specs/typed-source-references/spec.md`; expect merge conflicts on generated files, regenerate after merging rather than hand-resolving.

### 6.5 Tests
Rewrite or extend: `console-ui-kit-ku-badge.test.ts` (109 lines, 9 cases), `console-ui-kit-pills.test.ts`, `console-ui-kit-card.test.ts`, `console-ui-kit-table.test.ts`, `console-ui-kit-kitchen-sink.test.ts` + `tests/fixtures/console-kitchen-sink/kitchen-sink.js`, `console-ui-kit-review.test.ts`, `console-review-info-pip.test.ts`, `console-review-popover.test.ts`, `console-review-tab.test.ts`, `console-dom.test.ts`, `console-runtime.test.ts`, `console-citations-dom.test.ts`, `console-thinning.test.ts`, `console-ui-kit-contrast.test.ts` (new paper tokens), `test/console-element-card.test.mjs`, `scripts/export-console.test.mjs`, `scripts/lib/console-bundle.test.js`, `scripts/lib/console-shell-sync.test.js`, `innfo-mcp/test/console-export-roundtrip.test.ts`, and `sourceRef.spec.ts`/`sourceRef.unit.spec.ts` + `tests/phase2-addressing-grammar.test.ts` for the grammar additions.

### 6.6 Guard test (no new bypass)
Static scans alone are weak: `td.textContent` and `el('td', ..., text)` are indistinguishable from legitimate non-unit cells. Recommended two layers (precedent: `console-thinning.test.ts` source scans, the "No duplicate builders" scenario):
1. **Static**: forbid the legacy class names and the legacy builders' DOM identifiers (`innfo-element-pill`, `innfo-marker-chip`, `innfo-ku-field-chip`, `innfo-card-concept-badge`, `innfo-obj-chip`, `innfo-tag`, `innfo-field-select`, `innfo-field-bool`, `data-ku-kind` assigned outside `ui-kit.js`) in every `console/*.js` and `*/assets/console-view-*.js`.
2. **Behavioural**: mount the kitchen-sink and the testlab domain console in jsdom, then assert (a) every `td`/`th`/`dd`/`dt` in an allow-list-free region contains a `[data-innfo-component=ku-badge]` unless it matches an explicit, reviewed allow-list (timeline numeric cells, totals), (b) no two badges share an address with different `kind`, (c) every badge carries `data-ku-address`, `data-ku-nature`, `data-ku-origin`.
3. `KuBadge` itself must THROW on an unknown `kind` (today it falls back to `element`), or the guard cannot trust the type system.

## 7. Approaches

| Approach | Description | Pros | Cons | Effort |
|---|---|---|---|---|
| **A. Descriptor + one `Ku` builder (recommended)** | A pure `describeUnit(entity, payload) -> {address, kind, nature, origin, vtype?, label, slot, editable}` seam, plus one DOM builder `InnfoUI.Ku(descriptor, opts)` that returns `ku-wrap` = badge + actions. Editability is derived (`origin==source` or `nature==container` -> info only; `structure` -> needs toggle; else review). Mode is CSS/data-attribute state, not DOM surgery. Legacy `ElementPill/ConceptPill/MarkerChip/QudChip` are deleted or become one-line wrappers that call `Ku`. | Deep module (small interface, large leverage); testable without a DOM; guard test has a single funnel; kills `review.js` selector coupling | Biggest rewrite; payload and kit change together; spec contract changes (relaxed "no edit control in DOM") | High |
| B. Keep `KuBadge`, add kinds, keep review.js decorators | Extend `KU_KINDS` with `value/structure/...` and let `review.js` keep post-hoc decorating by `data-ku-kind` | Smallest diff | Preserves selector coupling and inside-badge pencils; guard test cannot be total; two address dialects survive | Medium, but it re-creates today's problem |
| C. Payload-only unification first | Land canonical addresses + nature/origin in core/payload now, UI later | Safe, reviewable; unblocks MCP/changeset consumers | UI inconsistency persists for a release; two PR waves | Medium |

Recommendation: **A, delivered through C-style ordering** (address and payload first, kit second, renderers third, review integration fourth, guard last). A standalone `describeUnit` seam (pure) is what the guard and the docs info panel both consume.

Mode-gating sub-choice (inside A): (A1) emit the edit control for every editable unit and hide it with CSS on `body[data-mode]` / `html[data-innfo-structure]` (mockup behaviour; simple; requires relaxing the living-spec scenario; roughly doubles buttons in the DOM) vs (A2) keep creating edit controls only when review mode turns on, driven by the same descriptor (keeps the spec scenario; needs a re-render hook on toggle, already exists via `innfo:rendered`). A2 is the lower-risk path with the existing spec; A1 is simpler to reason about. Decide in the proposal.

## 8. Recommended slicing (each slice must stay <= 400 changed lines or use chained PRs; forecast: **Chained PRs recommended: Yes, 400-line budget risk: High**)

0. **Decision record (docs/spec only)**: vocabulary (rename origin axis, `value` types), the canonical address per kind (semantic D5 form `model@slug[&field]`, with the header form demoted to a "location" in the info panel), grammar changes, structure-edit policy, mode-gating choice, companion sequencing.
1. **Core addressing** (`innfo-core`): model-stem tolerant parse, `domain`/`column` unit handling, `unitAddress()` builders, `originOf(roleOf)`, tests, spec deltas for the grammar.
2. **Payload**: emit `address` (+ declaring blueprint, `nature`/`origin` or the derivation) for elements, field values, cells, schema concepts/fields/matrices, documents, domaiNN, citations; fix the first-wins schema dedup so each definition keeps its blueprint; rebuild `console-payload.generated.cjs`. Additive, old consoles ignore it.
3. **Kit**: `describeUnit` + `Ku` + CSS grammar + source-paper tokens (light/dark, contrast test) + unit info panel + docs. Old components still exported. Bundle rebuild.
4. **Renderer migration** (split in 3 PRs): (4a) element cards/mini/table + field split + `UI.Table` convergence; (4b) matrices, CSV/citation dialog, Source badges, ref/field dialogs, document view; (4c) rail, facets, guide, metamodel, timeline, stepper, blueprint views, DraftList/RelList.
5. **Review integration**: replace the post-hoc decorators with descriptor-driven actions, address-keyed pips (fixes matrix-cell pips), "Edit structure" toggle in the dock, info panel for non-element units.
6. **Guard + cleanup**: delete `ElementPill/MarkerChip/ConceptPill/QudChip` legacy DOM, enable the two-layer guard, bump the console version, regenerate testlab fixtures, final spec/doc sync.

Dependency on the companion `fields-replace-markers-and-tags`: it touches the same code (`MarkerChip`, `TagRow`, `decorateTagRow`, `item-markers` headers in `renderMatrices`, `payload-builder` markers/tags, the guide "Markers" section, `element-concept-tags` spec). Recommended order: land the companion FIRST (or at least its payload/spec part), because slices 3-5 here would otherwise migrate markers and tags that are about to be deleted. If they must run in parallel: this change defines no `marker` kind, wraps tags as a `value` of a `select` field, and leaves `MarkerChip`/`TagRow`/`[data-marker-id]` untouched behind a guard allow-list with an expiry. Also: tag hash colors (companion) feed `data-slot`-like styling in the value badge; concept-level `tags::` are inherited by elements and would become concept-level values.

## 9. Open questions

1. **Edit structure with no backing op.** Ship the toggle now producing only `comment` drafts (proposals to change a blueprint) or defer until a bluepriNNt-edit op exists? A toggle that offers a pencil which can only comment is a false affordance. Related: `rename_concept`/`update_concept_text` exist but act on the kNNowledge concept section, which is a different unit than the bluepriNNt concept definition (finding 5.2).
2. **Which address is canonical for an element/field**: semantic D5 `model@slug&field` (changeset target, what `id` already is) vs header form `file_NN.md@## NN Concept: Name&field` (what `canonicalUnit` and the core citation grammar produce). The mockup uses a third, invalid form. Recommendation: D5 semantic; but the core parser must first accept real model stems.
3. **Field definition = definition or usage?** One definition belongs to one concept (`concept::`), so per-concept repetition on every card is the same address N times. "One presentation per canonical address" must be read as "one visual form", not "once on screen"; in tables the definition belongs in the column header once.
4. **Markdown/media/long values in a "badge"**: `markdown_inline`, `image`, `video`, `audio`, objects and lists render block-level bodies today (`FieldValue`). Is the value badge the frame around any body (a block variant), or are those values rendered unbadged with only the actions beside them? The mockup only shows scalars.
5. **Does `domaiNN` get a new address form** (`domaiNN_NN.md` bare path typed as `domain`) and does a document badge for a changeset/procedure/catalog carry a different icon (all are kNNowledge)?
6. **Metamodel SVG and charts**: do SVG concept nodes and chart series become badges (HTML overlay) or are they explicitly out of scope of "every unit gets a badge"?
7. **Third-party views**: custom views get `ctx.ui`; does the contract require them to call `ctx.ui.Ku`, and how is that enforced (guard only covers repo-owned views)?
8. **Info for a pure view-mode user** on units with no element behind them: what does the panel show for a concept (usage counts? blueprint link?) and who owns its content (the runtime or `describeUnit`)?
9. **Mode gating** (A1 vs A2 above), and whether to relax "no edit control exists in the DOM".
10. **`value` identity for repeated values** (same select value in 40 cells): each is its own unit with its own address (the cell/field it lives in), not the value text.

## 10. Risks

- **Density and cost**: sample `Ghostbusters_V_0-4-2_business_NN.md` has ~188 `## NN` sections, ~299 field lines and 87 table rows. Splitting every field into definition + value, giving every unit an info button and every editable unit a pencil implies roughly 900+ badges and 900+ icon buttons in view mode (about 2x in review mode) on one page. Mitigations: event delegation for actions (one listener), definitions in column headers for tables, lighter chrome for repeated definitions, virtualization or lazy action creation, an overall `Tab` stop budget (roving tabindex per card/row).
- **Accessibility**: icon-only buttons need unique accessible names (`KuActions` today uses one fixed label "Knowledge unit info" for all); the mockup's 22px targets are below WCAG 2.2 AA 2.5.8 (24x24) unless spaced; nature is encoded in border style (double/dashed/solid) and fill (paper), which assistive tech cannot perceive, so each badge needs a text/`aria-label` encoding of nature and origin; paper fill needs contrast checks in dark mode and must not be the only Source cue; the info panel needs focus management and a live region that does not announce on every hover; the Edit-structure switch must be a real `role="switch"` and remove the pencils from the tab order when off.
- **Blast radius**: ~20 console suites and four generated outputs break at once (precedent: the 2026-10-11 change's risk table). Mitigate with additive-first slices and delegating wrappers until slice 6.
- **Spec drift already present** (EditModal tabs vs spec, StatusBadge statuses, inside-badge actions, `ElementPill.onClick` ignored, the custom-view edit buttons visible outside review mode): fix or document these inside the delta specs rather than carrying them forward.
- **Grammar compatibility**: any change to `parseKnowledgeUnitRef` (model stem tolerance, column unit, domain unit) touches published citations, `apply_change` targets (`parseTargetAddress` in `innfo-mcp/src/tools/apply-change.ts:605` is a second, independent parser), and `impact`/lineage checks. Needs its own slice and tests before the UI depends on it.
- **Two parsers for one grammar**: `sourceRef.ts` (strict slug) vs `apply-change.ts parseTargetAddress` (free-form split on `@`/`&`). Unification is out of this change's scope unless the canonical address choice (Q2) forces it.
- **Concurrent sessions** touching generated files (`ku-lifecycle-fixes`), and the console pin/manifest (`check-integrity`) must be re-run after bundle changes.
- **Trust model**: the guard cannot police custom views loaded from a domain (`consoles/views/<slug>.js`).

## 11. Ready for proposal

Yes, with conditions. The proposal should (1) record the nine corrections above to the mockup/decision set (valid addresses, axes are elements, concept = two units, value types, origin derivable from `roleOf`, vocabulary collision, structure has no write path, `info` has no surface for non-element units, legacy components never delegated), (2) pick answers to Q1, Q2 and Q9 before specs are written, and (3) sequence against `fields-replace-markers-and-tags` (companion first is recommended).
