# Design: Unified knowledge-unit badges

Inputs: `proposal.md` (D1-D12 fixed), `exploration.md`, companion `fields-replace-markers-and-tags/design.md` (incl. D13: `base` deleted). Code read at `3afaa90e`. Address forms below were checked against the real `innfo-core/src/sourceRef.ts` (esbuild bundle of the worktree source, scratch only).

## Technical Approach

> **Amendment 2026-10-17 (review, `review.md`):** the maintainer's answers Q1-Q3 are applied. (1) Addresses are parsed by a separate `parseUnitAddress`, and citation parsing is unchanged. (2) Sections and definitions carry a `concept:`/`matrix:` prefix, so collisions are impossible by construction. (3) An inherited value is editable only from its concept section badge.

Every unit gets one canonical address, built and parsed by ONE core module (`innfo-core/src/console/unit-address.ts`: `unitAddress`, `parseUnitAddress`, `unitHome`) and shipped to the browser as a generated module (`innfo-address.generated.js`, same pipeline as `innfo-slug.generated.js`). The payload carries only the identity facts the builders need (model id, slugs, declaring bluepriNNt family). In the kit, a pure `describeUnit` turns `(kind, ref, index)` into a descriptor, and a single `Ku` builder renders it as `badge + action cluster`. Mode is CSS state on `<html>`; actions run through one delegated listener. `review.js` stops decorating the DOM: it supplies action handlers and pip counts keyed by address. A two-layer guard (static scan + jsdom) prevents bypasses.

## Probe results (real parser, today)

| Input | Result |
|---|---|
| `ghostops@slimer&owner` | element + subunit (valid) |
| `kNNowledge/TestLab_coverage_TestLab@element-1b&photo` (today's `element.id` and changeset `target::`) | **NULL**: the extensionless model part must be a bare slug |
| `kNNowledge/X_NN.md@slimer` | NULL (`.md` requires a `#` header) |
| `kNNowledge/X_NN.md@## NN Incident: Library haunting&owner` | header unit (valid) |
| `ghostops@journey-map&a&b` | matrix cell; `ghostops@journey-map` → **element** (matrix heuristic needs `-matrix`; `Journey map` and `change release relations` exist) |
| `domaiNN_NN.md` | bare path, `source` |
| `sources/s.csv@*&borough` | row id literally `*` |
| `business@problems&severity` | element + subunit (a blueprint alias would be indistinguishable from a model slug) |
| a parent_spec `url:` that is `https://…` | rejected (URLs are never units) |

These probes are of the CITATION parser (`parseCitation`). That parser is left unchanged. Its `resolveUnitPath` is shared by every citation site, so widening it would turn today's `KU_MALFORMED` for an extensionless typo into a misleading `KU_DANGLING_FILE`, and it would make `specs/<family>@…` citable (review C1).

## Architecture Decisions

### DQ1 Canonical address

| Option | Tradeoff |
|---|---|
| Header form `file_NN.md@## NN C: Name&field` | Valid today, but it changes on rename, can't reach remote bluepriNNts (URL), and differs from changeset targets |
| `.md` path + slug (`X_NN.md@slug`) | Breaks the `.md` ⇒ header rule |
| **D5 semantic `<modelId>@<slug>[&sub]`** | Equals `element.id` and changeset `target::`; frozen slugs are rename-stable. Needs its own parser for path model ids |

**Decision**: D5 semantic, parsed by a separate `parseUnitAddress` (maintainer Q4), not by the citation parser. It reuses the existing grammar pieces of `sourceRef.ts` (segment decoding, `&` subunit split), but it is not a citation entry point, and `parseCitation`/`resolveUnitPath` are unchanged. Its model part is an extensionless, workspace-relative POSIX path whose segments all match `[A-Za-z0-9][A-Za-z0-9_-]*`. Dots are excluded, so a path with an extension is never a model id. The unit part is either an unprefixed slug (element) or a slug prefixed with `concept:` or `matrix:` (`:` never occurs in a slug). Slugs are the output of `slugifyHeading`, so `--` boundary slugs are accepted. Two other forms are recognised: the bare entrypoint `domaiNN_NN.md` (kind `domain`) and a bare model id with no `@` (kind `document`). Any other address whose path has an extension is a Source, and it is delegated unchanged to `parseCitation` (kind `source`). Every badge address therefore parses through one function, and Source badges keep the citation grammar. The header form is shown as **Location** in the info panel only.

| Kind | Address | Example |
|---|---|---|
| `domain` | `domaiNN_NN.md` (bare entrypoint, valid today) | |
| `document` | `<modelId>` | `kNNowledge/TestLab_coverage_TestLab` |
| `section` (kNNowledge concept section) | `<modelId>@concept:<concept-slug>` | `…@concept:concept-1` |
| `element` | `<modelId>@<element-slug>` | `…@element-1b` |
| `value` own | `<modelId>@<element-slug>&<field>` | `…@element-1b&photo` |
| `value` concept-level / inherited | `<modelId>@concept:<concept-slug>&<field>` (one unit, shown on N cards labelled "inherited from") | `…@concept:concept-1&tags` |
| `value` matrix cell | `<modelId>@<matrix-slug>&<row>&<col>` (row/col = header element slug, else `normalizeName(label)`; two subunits make it a cell, so it needs no prefix and equals the changeset `target::`) | |
| `concept` definition | `specs/<family>@concept:<concept-slug>` | `specs/testlab@concept:concept-1` |
| `field` definition | `specs/<family>@concept:<concept-slug>&<field>` (`concept:: *` fields are addressed per effective concept) | |
| `matrix` definition | `specs/<family>@matrix:<matrix-slug>` | |

`<concept-slug>` is `slugifyHeading(conceptName)`. It is the same function for the parser, the payload and `unitAddress.section`, and the companion's `inherited.from` (a concept name) is slugified with it. Element, element value and matrix cell addresses stay byte-equal to `element.id`/changeset `target::`. The prefixes appear only where the subunit count leaves the kind ambiguous.
| `source` | the citation's own `path[@unit…]` | |

- **bluepriNNt alias**: `specs/<family>` uses the reserved `specs` root (in `IGNORED_DIRECTORIES`, never a kNNowledge path). That keeps it apart from model ids, and it works when the parent_spec is a URL. `<family>` is the slugified blueprint family the companion's family resolver already computes.
- **No ambiguity (maintainer Q5)**: unprefixed means element, `concept:` means section or concept definition (by root), and `matrix:` means matrix definition. Two subunits mean a cell. A concept, matrix and element sharing one slug therefore get distinct addresses by construction, and `UNIT_ADDRESS_COLLISION` is not needed. `parseUnitAddress` returns the kind, and the guard asserts it equals the descriptor's kind.
- **CSV column**: no unit in this change. `@*` is already a legal literal row id, so turning it into a wildcard would break existing citations. A column is a subunit name (the grammar is "names only"), and CSV header cells are exempt (DQ5).
- **Second parser** (`apply-change.ts parseTargetAddress`): no unification needed. It splits on `@`/`&` and matches elements by slug and matrices by name or slug. One task verifies that `update_matrix_cell` resolves row/col slugs (`matchesCoord`), with a test.

### DQ2 Mode gating

| Option | Tradeoff |
|---|---|
| A2 create controls when the mode turns on | Keeps today's scenario, but needs a re-render or post-hoc decoration, which is the selector coupling being removed |
| **A1 always emitted, CSS-gated** | One render path. The DOM is ~2x the icon nodes. The spec scenario has to be relaxed |

**Decision**: A1. `Ku` emits the edit button whenever `editability !== 'none'`. Rules on `html:not([data-innfo-review=on])` and `html:not([data-innfo-structure=on])` set `display:none`, which removes the button from the tab order and the accessibility tree. As defense in depth, the delegated handler refuses `edit` when the mode attribute is absent, and `controller.openEdit` returns `false` when `!enabled`. The `console-review-mode` scenario becomes: "edit controls are not rendered, not focusable, absent from the accessibility tree and inert".

### DQ3 Axis name

`home`, with values `domain | blueprint | knowledge | source`. Attribute `data-ku-home`, panel label "Lives in". `origin` keeps its citation-provenance meaning. `layer` was rejected because the levels L0-L3 already use it.

### DQ4 Block values

| Option | Tradeoff |
|---|---|
| Unbadged body + actions | No address on the value, so the guard can't be total |
| **Block variant** | One grammar; slightly heavier chrome |

**Decision**: `Ku(..., {variant:'block', body})` renders a framed `div` with the same nature/home grammar (`data-ku-variant="block"`). It is used for `markdown_*`, media, `file`, `code`, and for `reference`/`citation`/`knowledge` values. A block frame may host child `ku-wrap`s (target elements or Sources). An inline badge never contains a control. A multi-valued `select` (tags) is ONE value unit whose option tokens are not units: they are colored by `UI.tagSlot`, and clicking one filters `<field>:value`.

### DQ5 Exemptions

These are exempt: metamodel SVG nodes and edge labels, chart series and axes, timeline numeric cells and totals, KPI numbers, and CSV column headers. An exempt region carries `data-ku-exempt="<reason>"`. The reason must be in the frozen `KU_EXEMPT_REASONS` set in the guard test (`metamodel-svg`, `chart`, `numeric-aggregate`, `csv-subunit-label`), and the same list is in the `console-ui-kit` spec. The static scan also pins which files may write `data-ku-exempt`. Adding a reason or a file therefore takes a reviewed edit to the test and the spec. If the companion slips, a temporary reason `companion-markers` carries an expiry date that the test checks.

### DQ6 Info panel

`describeUnit` owns the facts (pure). The kit's `KuInfoPanel(descriptor)` renders them in a `role="dialog"`: focus moves to its heading, Escape returns focus to the info button, and nothing is announced on hover. The runtime only opens it. Rows: kind, nature, Lives in, address (copy button), Location (header form or URL), and editability with the reason. Then, per kind:

- concept/field/matrix: declaring bluepriNNt and version, type/options/widget, and usage count in this domaiNN
- section: element count
- document: bluepriNNt, version, element and change counts, sha256
- domain: model and Source counts
- source: anchor, version, sha256, exists
- element/value: an "Open lineage" link to the existing `EditModal` history tab

`EditModal` stays element-centric.

### Editability (derived, never passed)

`home==='source'` → `none` · `nature==='container'` → `none` (info only) · `nature==='structure'` → `structure` (the pencil needs Edit structure ON and opens `EditModal` comment-only, producing a `comment` draft) · otherwise → `review`. A concept-level value is editable only where it lives, on its concept section badge (maintainer Q6). There its pencil emits the companion's `update_concept_field` (with the `from` precondition), and the modal names the scope ("applies to every element of concept X"). On element cards the same unit is rendered labelled "inherited from <Concept>" with editability `none` (info only), so no element card can edit N elements.

## Interfaces / Contracts

```ts
// innfo-core/src/console/unit-address.ts (also bundled as InnfoAddress)
export const unitAddress: {
  domain(): string; document(modelId): string; section(modelId, concept): string
  element(modelId, slug): string; value(base: string, field): string
  cell(modelId, matrix, row, col): string
  concept(family, concept): string; field(family, concept, field): string; matrix(family, matrix): string
}
export function parseUnitAddress(address: string): { kind, modelId?, family?, slug?, subunits } | null
export function unitHome(address: string): 'domain'|'blueprint'|'knowledge'|'source'|null
```

`unitHome` is an explicit table, because `roleOf()` has no `blueprint` or `domain` role (`naming/contract.ts:95-149`): the `specs/` root gives `blueprint`; a path whose `roleOf` is `entrypoint` gives `domain`; an extensionless model id, or a path whose role is `knowledge`, `lineage-record`, `changeset`, `catalog` or `procedure`, gives `knowledge`; everything else gives `source`. `roleOf()` itself is unchanged.

```ts
```

```js
// ui-kit.js
describeUnit(kind, ref, index) -> { kind, nature, home, address, label, slot, vtype?, editability,
  parentLabel?, location?, facts }            // pure; throws on unknown kind or missing address
createKu({ index, onAction }) -> Ku           // installs ONE delegated click/keydown listener per document
Ku(kind, ref, { variant?, body? }) -> span.innfo-ku-wrap   // badge + pip + action cluster; no mode/edit options
setUnitChanges(root, countsByAddress)         // pip counts, keyed by address
```

The runtime builds `Ku` once and exposes it as `ctx.ui.Ku`. Views can no longer reach `ctx.modal.edit` (it is deleted); edits flow through `onAction('edit', descriptor)`. `vtype` is the declared L1 0-5-0 Field type (including the companion's `number` and `boolean`), refined by the Field's `widget`, or the matrix `widget` for cells. Without a declaration it is `string`; an undeclared array is a `select` with `multiple` only when the payload schema says nothing. `nature` comes from the kind (`domain/document/section` = container, `concept/field/matrix` = structure, `element/value` = content). A `source` is a container when it is a bare path and content when it has an `@` unit. `home` comes from the kind; `source` uses `InnfoAddress.unitHome`, and a citation pointing into kNNowledge renders as `element`/`document`.

**Reveal**: the action cluster's inline width is reserved next to the badge (inside the cell or row padding), and the cluster only toggles visibility, so revealing it causes no layout shift and never covers a neighbouring unit (WCAG 2.4.11). It shows on `.innfo-ku-wrap:hover` and `:focus-within`, stays visible while the pointer is over the cluster itself and until Escape or blur (1.4.13 hoverable, persistent, dismissible), and is always visible under `@media (hover: none)`, where the same reserved space holds it in normal flow. Buttons are 24x24 px. Labels are unique, e.g. "Info: element Element 1B" and "Edit value photo of Element 1B". The pip is a sibling button that is always visible ("3 pending changes on photo of Element 1B"). Keyboard: each `[data-ku-group]` (card, table row, matrix row, rail, dialog) has ONE tab stop with roving `tabindex`. Arrow keys move between units and actions, and Tab leaves the group. Every badge has an `aria-label` that spells out nature and home ("structure, lives in bluepriNNt"), so border and fill are never the only cue. The Edit-structure control is a `button[role=switch][aria-checked]` in `#innfo-review-dock`. It sets `html[data-innfo-structure=on]` and resets on `disable()`.

## Payload additions (additive in slice 2)

- `meta.domain {title, address, modelCount, sourceCount}` and `meta.models[].family`.
- Schema `concepts/fields/matrices[].declaredBy {family, version, location}`. The domain dedup key becomes `(family, name)`, replacing first-wins by name, so each definition keeps its bluepriNNt.
- Matrix `head.rows/cols[label].slug` (the header element slug) and `matrices[].slug`.
- Element `canonicalUnit` → `location`; `unitSlug` is deleted (D12). Drafts get `address` in `normalizeDraft`, which fixes matrix-cell pips.
- No per-unit `home`/`nature`: they are derived, and a parity test pins them.

## Migration of bypasses (slices 4-5)

| Bypass (exploration §2) | Becomes |
|---|---|
| `ConceptPill`, `ElementPill`, `QudChip`, `RelList` field chip, `DraftList` chips, `innfo-obj-chip`/`innfo-strip-rel`, `innfo-card-concept-badge`, guide field chips | `Ku` (`concept`/`section`/`element`/`field`/`value`); the builders are deleted |
| `FieldRow` `name: value` | `field` badge (in table headers once) + `value` badge |
| `mountElementTable` bare `td`, `UI.Table` | `value` cells via `Ku`. `UI.Table` is deleted (only tests use it) |
| `renderMatrices` fake `matrix-<slug>` element | `matrix` definition + `section`/element headers + `value` cells |
| navbar domaiNN, banner, rail, facets, filter pills | `domain`/`document`/`concept` via `Ku` |
| ref, field-detail, citation dialogs, `renderDocument` | `Ku`; Sources render as `source` badges |
| stepper `refButton`, timeline rows, repo views (`organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures`) | `ctx.ui.Ku`. The `editButton`s in org-chart/roadmap and `onEditRow` in timeline are deleted (D11) |
| `review.js` `decorateCard/TagRow/RelList/FieldRow/MatrixCell/InfoActions`, `kuModalTarget` | handlers in `onAction`; `kuModalTarget(descriptor)` keyed by kind/address |

Also: `KuBadge`, `KuActions`, `KU_KINDS` and the `<innfo-ku>` element are replaced by `Ku`, with `ku-unit` as the component id. `StatusBadge` statuses align with the code (`applied/conflict/proposed`). `EditModal` tabs align with the spec.

## Testing Strategy (Strict TDD, vitest)

| Layer | RED first |
|---|---|
| Core | `unit-address.test.ts`: every builder → `parseUnitAddress` non-null with the builder's kind, round-trip and `unitHome` (all four homes, including `specs/` → `blueprint` and `domaiNN_NN.md` → `domain`). Citation regression: `parseCitation` still returns `null` for an extensionless path such as `sources/import/notes` and for `specs/testlab@concept:concept-1`, so `validateCitations` keeps `KU_MALFORMED`. `parseUnitAddress` rejects dotted, `..`, absolute and URL model parts; an element, a section and a matrix sharing one slug yield three distinct addresses and kinds. `sourceRef*.spec.ts` and `phase2-addressing-grammar.test.ts` stay green unchanged. MCP `update_matrix_cell` by slug |
| Payload | `declaredBy` survives dedup; header slugs; draft `address`; parity `unitHome(address) === describeUnit(...).home` over the testlab payload |
| Kit | `describeUnit` table test (kind × nature × home × editability; throws on unknown kind; an inherited value on an element card is `none`, on its section badge `review`); a render budget for the testlab console (node count and render time, before and after, recorded in slice 3 and asserted in slice 6); `Ku` DOM (no control inside an inline badge, unique labels, 24 px tokens); info panel focus; contrast for the paper tokens in light and dark |
| Guard | static scan (legacy classes and builders, `data-ku-*` writes outside `ui-kit.js`, `ctx.ui.<legacy>` in views, `data-ku-exempt` file pin) + jsdom over the kitchen sink and `test/fixtures/testlab/domaiNN_console.html`: every `td/th/dd/dt` holds a badge or is exempt; every address parses with core; no address has two kinds; review off ⇒ edit inert; structure off ⇒ structure pencils hidden |
| Review | address-keyed pips on cells; the switch resets on exit; comment-only structure drafts; org-chart/roadmap show no edit control in view mode |

Gotchas: editor/console suites share one fake-indexeddb (`pool: forks`, `singleFork`), so storage and router state are reset per test. happy-dom lets `javascript:` through, so the label/href XSS assertions run under `// @vitest-environment jsdom`. `Ku` never sets `href`; navigation is a delegated `select` action.

## Regeneration and Release

Slice 2: `build-console-payload.mjs` (also emits `innfo-address.generated.js`, added to `SOURCES` in `scripts/lib/console-bundle.js`). Slices 3-6: `npm run build:console`. Slice 6: console `package.json` gets the next minor after the companion's bump, the `manifest/source.yaml` `console_assets` pin is updated, and the testlab fixtures (`domaiNN_console.html`, `artifacts/*_console/`) are re-exported. `simulacro-refactorizacion` and `metrics/samples` stay frozen. Generated files are never hand-merged: rebase, then regenerate. Gates: `node scripts/verify.js`, `npm run check:console-bundle`, `npm run check:integrity`. Docs: `console-ui-kit.md`, `reviewer-guide.md`, `innfo-mcp.md`.

## Slicing and companion dependency

| Slice | Content | Needs companion |
|---|---|---|
| 0 | this design + spec deltas | — |
| 1 | core addressing (`sourceRef.ts` rule, `unit-address.ts`, `unitHome`, collision WARNING) | — |
| 2 | payload additions + generated modules | S1 (field `type/multiple/widget`, `inherited`, `update_concept_field` in the `changes` `op` options), S3 (no marker payload); `session/global-console-filter` and `session/ku-lifecycle-fixes` merged |
| 3 | kit (`describeUnit`, `Ku`, CSS, paper tokens, info panel) | S4 (`UI.tagSlot`, facet model, `MarkerChip` gone) |
| 4a/4b/4c | renderer migration | S4 |
| 5 | review integration, switch, pips | S4 (tag corrections) |
| 6 | guard on, legacy deleted, bump, fixtures, docs | companion merged |

## Open Questions

- [x] jsdom `getComputedStyle` cascade coverage for `display:none` gating: the PRIMARY guard is the static assertion of the gating CSS rules plus the behavioural refusal of the delegated handler; a computed-style check is secondary and runs only where jsdom supports it.
- [x] `UNIT_ADDRESS_COLLISION`: no longer needed, because prefixed addresses cannot collide (Q5).
