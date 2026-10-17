# Proposal: Unified knowledge-unit badges

Change: `unified-knowledge-unit-badges` | Store: openspec | Delivery: `exception-ok` (one large PR accepted; slicing below is the internal commit order) | Input: `exploration.md` (same folder).

## Intent

Every knowledge unit the console shows (domaiNN, kNNowledge document, concept, element, field definition, value, matrix, Source) must have ONE presentation, ONE canonical address and ONE action contract. Today there are two taxonomies (`KnowledgeUnit` in core vs `KU_KINDS` in the kit), five address dialects, three legacy builders that never delegated to `KuBadge`, bare-text table cells, actions nested inside badges, an info icon that does nothing for non-element units, and custom views that show edit buttons outside review mode. The result is inconsistent UI, pips that cannot reach matrix cells, and no way to guard against new bypasses.

## Fixed decisions (maintainer, not re-litigated)

| # | Decision |
|---|---|
| D1 | ONE pure descriptor (`describeUnit`) + ONE DOM builder (`Ku`) render every unit, address-first. `ElementPill`, `ConceptPill`, `MarkerChip`, `QudChip`, FAKE chips and bare unit cells are deleted. A two-layer guard (static scan + jsdom "every unit cell holds an addressed badge") fails on any new bypass; `Ku` throws on an unknown kind. |
| D2 | Two orthogonal axes: **nature** (container / structure / content) and a second axis for where the unit lives (domaiNN / bluepriNNt / kNNowledge / Source), derived from core `roleOf()`. It is NOT called `origin`: that name already means citation provenance (`agent/human/document/error`, `data-origin`, `ORIGIN_VARIANTS`). Proposed name: **`home`** (`data-ku-home`; info panel label "Lives in"). Grammar: double border = container, dashed + mono = structure, solid = content, paper fill = Source, concept color = concept identity. |
| D3 | `value` is ONE kind with a `vtype` taken from the declared L1 0-5-0 Field type (`string, select, reference, markdown_inline, number, boolean, ...`), the Field `widget` or the matrix `widget`, with documented inference; nothing invented beyond the L1 types (`number`/`boolean` are L1 types once the companion lands; `text` is not). The old `field` badge (`name: value`) splits into a field-definition unit (structure) and a value unit (content), each with its own address and actions. Matrix cells and CSV cells are `value` units. |
| D4 | Actions live OUTSIDE the badge, immediately beside it (`console-ui-kit` "Knowledge-Unit Badge Family", no action nested in the badge). View mode: info. Review mode: info + pencil. |
| D5 | Action icons appear on hover or keyboard focus of the unit (~900 badges per page), stay reachable by keyboard, and meet WCAG 2.2 AA 2.5.8 (>= 24x24 px target; today 22 px). |
| D6 | Source: never a pencil. Containers (kNNowledge document, domaiNN): info only, also in review mode. |
| D7 | Structure units (concept definition, field definition, matrix definition) get a pencil only while an "Edit structure" switch in the floating review dock is ON (default off, reset on exit). In this change that pencil opens `EditModal` in COMMENT-ONLY mode (produces a `comment` draft). |
| D8 | The info icon works for EVERY kind through a unit info panel (kind, nature, home, address, lives-in location, editability), not only for elements. |
| D9 | Every badge carries a canonical address that innfo-core's address parser (`parseUnitAddress`) accepts ("one presentation per canonical address" = one visual form, not once per screen). Citation parsing is unchanged. The concrete form is a design question (DQ1). (Reworded 2026-10-17 by the maintainer, review Q4: previously "the real innfo-core parser".) |
| D10 | Tags render as `value` badges of an ordinary `select` field, colored by a stable hash of the tag name. No `marker` kind. The tag/marker model belongs to `fields-replace-markers-and-tags`, which lands first. |
| D11 | Fix org-chart and roadmap custom views that render edit buttons outside review mode (`controller.openEdit` has no mode check). |
| D12 | No backwards-compat aliases or delegating wrappers left at the end; migration cost is not a concern. |

### Corrections to the mockup (`temp/cau/mockups/knowledge-units.html`)

Visual grammar approved; these mockup assumptions are wrong and MUST NOT reach specs:
- Its `@` addresses are not the canonical form (`kNNowledge/X_NN.md@slug` needs the header grammar; `X_V_0-1-0@slug` is not a model id; `&*&col` is a literal row id).
- No `axis` kind: matrix headers are `element` badges; the structure part is the `concept` badge in the corner.
- "Concept" is two units: the bluepriNNt concept definition (structure) and the kNNowledge concept section (content container of elements, already addressed `model@Concept` by changesets).
- Value type `text` is not an L1 type; `number`/`boolean` are L1 0-5-0 types from the companion (see D3).

## Scope

### In scope
- Core: canonical address builders and a separate address parser `parseUnitAddress` (citation parsing unchanged), domaiNN handling, `home` derivation (an explicit table that uses `roleOf()` only for the knowledge/source split).
- Payload: `address` (+ declaring bluepriNNt) on elements, values, cells, schema concepts/fields/matrices, documents, domaiNN, citations; schema dedup keeps each definition's bluepriNNt.
- Kit: `describeUnit`, `Ku`, CSS grammar, Source paper tokens (light + dark, contrast test), unit info panel, comment-only structure editing.
- Every renderer: cards, mini cards, tables, matrices, rail, facets, guide, dialogs (ref, field, citation), document view, stepper, timeline, DraftList/RelList, repo-owned bluepriNNt views (`organization`, `projects`, `innovation`, `metrics`, `changes`, `procedures`).
- Review: replace post-hoc DOM decorators in `review.js` with descriptor-driven actions; address-keyed pips (fixes matrix-cell pips); "Edit structure" switch in `#innfo-review-dock`.
- Guard test, legacy deletion, console version bump, regenerated bundle/payload/testlab fixtures, docs, living-spec deltas.
- Fix drift found while there: `EditModal` tabs vs spec, `StatusBadge` statuses, ignored `ElementPill.onClick`.

### Out of scope (follow-ups)
- Real bluepriNNt writes (a structure-edit op for concept/field/matrix definitions). Explicit follow-up change.
- Editing document / domaiNN metadata.
- The marker and tag model itself (companion change).
- Unifying the second address parser (`innfo-mcp` `apply-change.ts` `parseTargetAddress`) unless DQ1 forces it.
- Metamodel SVG nodes and chart series as badges (documented exemption, see DQ5).
- Regenerating frozen copies (`simulacro-refactorizacion`, `metrics/samples`).

## Capabilities

### New Capabilities
- `knowledge-unit-address`: the canonical unit address grammar, `unitAddress` builders, `parseUnitAddress` and `unitHome`. Separate from the citation grammar, which is unchanged.

### Modified Capabilities
- `console-ui-kit`: badge family rewrite (kinds, nature/home grammar, address attrs, unknown kind throws), field split, actions outside, hover/focus reveal + target size, legacy components removed, no-bypass guard, Source/structure presentation, tag row as select value.
- `console-review-mode`: mode gating, per-nature editability, Edit-structure switch, info panel for all kinds, address-keyed pips, cell/value editors.
- `console-payload-builder`: unit addresses, declaring bluepriNNt, domaiNN descriptor, matrix header element addresses.
- `changeset-document-model`: canonical address vs D5 target relation (element, element value and matrix cell addresses equal changeset `target::`).
- Not modified: `citation-parser-resolver`, `typed-source-references` (citation grammar unchanged, Q4) and `nn-naming-contract` (`roleOf()` unchanged; `unitHome` maps its roles).
- `console-field-citations`: citation dialog renders Source badges.
- `innfo-console-runtime`, `console-view-registry`: renderers and custom views consume `ctx.ui.Ku`; view-mode edit buttons removed.

## Approach

Exploration approach A (descriptor + one builder) in C-style order. `describeUnit(entity, payload) -> {address, kind, nature, home, vtype?, label, slot, editable}` is the deep seam: pure, DOM-free, consumed by `Ku`, the info panel and the guard. Editability is derived, never passed: `home==source` -> never; `nature==container` -> info only; `structure` -> needs switch; else review mode. Actions use event delegation (one listener) to bound cost.

Slicing (commit order inside the single PR):
0. Decision record: vocabulary, canonical address per kind, mode-gating choice.
1. Core addressing (`innfo-core/src/sourceRef.ts`, `naming/contract.ts`) + grammar spec deltas.
2. Payload addresses (additive) + `console-payload.generated.cjs`.
3. Kit: `describeUnit`, `Ku`, CSS, tokens, info panel, docs; bundle rebuild.
4. Renderer migration: 4a cards/mini/table/field split; 4b matrices, dialogs, Sources, document view; 4c rail, facets, guide, timeline, stepper, views, DraftList/RelList.
5. Review integration: descriptor-driven actions, pips, Edit-structure switch.
6. Guard on, legacy deleted, version bump, fixtures regenerated, spec/doc sync.

## Dependency on `fields-replace-markers-and-tags`

Must land first (at least through its console slice S4). This change consumes from it:
- payload schema fields with `type`, `options`, `widget`, `widgetConfig`, multi-value flag, `description` (feeds `vtype` and value editors);
- per-element own field values plus separately labelled inherited concept-level values with provenance concept (value addresses and `home`);
- one exported, tested `tag name -> color slot` hash (value badge styling);
- removal of `kind:'marker'`, `MarkerChip`, the guide "Markers" section, `item-markers` header branch in `renderMatrices`, `decorateTagRow`;
- the generic field + value facet model (badge click filters by it);
- `update_concept_field` in the `changes` bluepriNNt `op` options (the concept-level value pencil emits it).

Also lands first: `session/global-console-filter` (filter bar, field dropdown and query parser the badge click feeds) and `session/ku-lifecycle-fixes` (touches `innfo-runtime.js`, `domaiNN_console.html` and the binary bundle).

If the companion slips: this change does not migrate markers or tags; `MarkerChip`/`TagRow`/`[data-marker-id]` stay behind a guard allow-list with an explicit expiry, and slices 3-5 skip them.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/innfo-core/src/console/unit-address.ts` (new), `sourceRef.ts` | New / Modified | Address builders, `parseUnitAddress`, `unitHome`; `sourceRef.ts` only exports existing grammar pieces for reuse |
| `iNNfo/packages/innfo-core/src/console/{payload-builder,slot}.ts`, `scripts/export-console.mjs` | Modified | Addresses, declaring bluepriNNt, domaiNN descriptor |
| `iNNfo/specs/bluepriNNts/console/{ui-kit,innfo-runtime,review,render-procedure-stepper}.js`, `innfo-ui.css` | Modified / Removed | One builder, renderers, review actions, legacy DOM |
| `iNNfo/specs/bluepriNNts/*/assets/console-view-*.js` | Modified | Views use `ctx.ui.Ku`; mode-gated edit |
| `innfo-console.bundle.js`, `console-payload.generated.cjs`, `console/package.json`, `manifest/source.yaml`, `test/fixtures/testlab/**` | Regenerated | Bundle, payload, pin, fixtures |
| ~20 console suites, `sourceRef*.spec.ts`, `phase2-addressing-grammar.test.ts`, kitchen-sink fixture | Modified / New | Tests + guard |
| `docs/innfo/documentation/{console-ui-kit,reviewer-guide,innfo-mcp}.md` | Modified | Docs |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Density: ~900 badges + icons per page, ~2x in review | High | Hover/focus reveal, event delegation, field definitions once in table headers, roving tabindex per card/row |
| A11y: border/fill-only cues, one shared button label, 22 px targets | High | Text/`aria-label` encoding of nature + home, unique action names, 24 px targets, `role="switch"`, info panel focus management, no hover announcements |
| ~20 suites + bundle + payload + fixtures break together | Certain | Additive core/payload first; regenerate all generated outputs in the final slice; `verify.js` + `check:integrity` |
| Merge conflicts on generated files with sibling worktrees (`ku-lifecycle-fixes`, companion) | High | Never hand-resolve generated files; rebase then regenerate |
| Third-party custom views (`consoles/views/<slug>.js`) bypass `Ku` | Med | Documented contract (`ctx.ui.Ku` only); guard covers repo-owned code only |
| Address grammar leaks into citations or `apply_change` targets | Low | Separate `parseUnitAddress` (Q4); slice-1 regression tests pin that `parseCitation` still rejects what it rejects today |
| Comment-only structure pencil reads as a false affordance | Med | Modal states "proposal to the bluepriNNt maintainer"; real writes are the follow-up |

## Rollback Plan

Single PR: revert the merge commit on `dev`/`main` and republish the previous console pin (`innfo-console-v*`); regenerated bundle, payload and fixtures revert with it. Core grammar additions are additive, so a partial revert of only the console slices is safe.

## Open design questions

1. **DQ1 Canonical address form**: semantic D5 `model@slug[&field]` (recommended; requires the parser to accept real model stems) vs header form `file_NN.md@## NN Concept: Name&field` (shown as "location" in the info panel). Plus semantic aliases for bluepriNNt definitions (`<blueprint>@<Concept>[&field]`), the domaiNN address, and a CSV-column unit.
2. **DQ2 Mode gating**: A1 controls always in the DOM and hidden by CSS/data attributes (relaxes "no edit control exists in the DOM" to "not rendered, not focusable, not in the accessibility tree") vs A2 controls created when review mode / Edit structure turns on (keeps the current scenario).
3. **DQ3 Axis name**: confirm `home` vs `layer` / `lives-in`.
4. **DQ4 Block values**: markdown, media, lists inside a block-variant value badge vs unbadged body with actions beside it.
5. **DQ5 Exemptions**: metamodel SVG, charts, timeline numeric cells; how the guard allow-list is reviewed.
6. **DQ6 Info panel content** for concepts, documents, domaiNN (usage counts, bluepriNNt link) and who owns it (`describeUnit` vs runtime).

## Success Criteria

- [ ] Every unit in the kitchen sink and the testlab domain console renders through `Ku`; the jsdom guard finds no unit cell without an addressed badge and no address with two kinds.
- [ ] Every `data-ku-address` in the testlab console parses with innfo-core `parseUnitAddress`, and the parsed kind equals the descriptor kind (test iterates all of them).
- [ ] Static guard: zero legacy class names / builders in `console/*.js` and repo-owned views; `Ku` throws on unknown kind.
- [ ] No action control nested inside a badge; icons reveal on hover and focus; targets >= 24x24 px.
- [ ] Info opens a panel for all kinds; Sources never show a pencil; containers info-only; structure pencils only with Edit structure ON and producing `comment` drafts.
- [ ] Matrix cells show pending-change pips.
- [ ] Org-chart and roadmap show no edit control outside review mode.
- [ ] `node scripts/verify.js`, `npm run check:console-bundle`, `npm run check:integrity` green.
