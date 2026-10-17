# Proposal: Fields replace Markers and Tags

Input: `exploration.md` (same folder). Backlog item 37 (`chore/markers-review`). Delivery: `exception-ok` (one large PR acceptable; slicing below is still the recommended work-unit order).

## Intent

Collapse three overlapping ways of attaching values to a knowledge unit (Marker Definitions + `item-markers matrix`, reserved `tags::`, Field Definitions) into ONE: the Field. Today the same idea (`certainty`) is a numeric score in one sample, a 1-5 scale in another and a `?` flag in a third; `tags` is a parser special case that four bluepriNNts shadow with a dead `type:: string` Field; the widget vocabulary lives on Markers and disagrees between code and L1 prose. One primitive less means one model for authors, agents, the validator and the console.

## Problem (current-state gap)

- 4 root primitives where 3 suffice; `Marker` has its own parse path, table, mutation op (`set_marker`), hash key, payload, console chips and guide section.
- `tags::` is intercepted before Field validation; `select` rejects array values; no multi-valued notion exists in the schema.
- Field `concept` targets exactly one concept; no `widget` / `widget_config`; concept-level values other than `tags::` fall into prose.
- `WIDGET_CONFIG_KEYS` (code) contradicts the L1 widget table; shipped specs already warn.
- `Tags` concept is declared and instantiated in 9 domain files but read by no code.

## Fixed decisions (maintainer; not reopened)

| # | Decision |
|---|---|
| D1 | Remove `Marker Definition` root primitive (4 -> 3: Concept, Field, Matrix). Remove reserved `item-markers matrix` and the `Markers` pseudo-concept. A grid of that shape is an ordinary free matrix. |
| D2 | Tags are an ordinary multi-valued `select` Field named `tags`: open vocabulary without `options`, closed with them; each bluepriNNt decides per field. No reserved `tags::` parsing. No color/icon/symbol: console color = stable hash of the tag name onto the existing 12 concept color slots. |
| D3 | Delete the `Tags` concept from the domaiNN and workspace bluepriNNts (and its `# NN Tags` instances). |
| D4 | Generic concept-level value inheritance: any field value written at concept level in a kNNowledge document is inherited by that concept's elements. Multi-valued: UNION (concept + element). Single-valued: element overrides concept. Concept-level values replace `applies_to: Concept` scoring. |
| D5 | Field Definition gains a multi-concept target (`concept:: *` or a list) and `widget` / `widget_config` (`boolean`, `cycle`, `scale`, `set`, `text`). An explicit multi-value property is required; its syntax is a design question (DQ1). |
| D6 | Console tag search (`tag:` AND, `tag-any:` any-of) becomes the existing generic `<field>:value` filter, generalised to array membership while keeping both AND and any-of semantics. |
| D7 | `markers` is dropped from the element hash. ACCEPTED: one-time global invalidation of `base_hash` preconditions, pending changesets and review ledgers. |
| D8 | A document still containing a Marker Definition or an `item-markers matrix` is a validation ERROR. No compat code, no silent ignore. REQUIRED: dedicated diagnostic code (e.g. `MARKERS_REMOVED`) whose message states the remediation (flag marker -> `tags` value; valued marker -> declared Field), AND an agent-skill migration recipe so an agent proposes the fix as a changeset for console review instead of improvising. |
| D9 | Delete the 5 generic evaluative markers (importance, completion, priority, rating, certainty) from every bluepriNNt WITHOUT replacement Fields. Sample flags become tags (see A1). |
| D10 | Delete metrics markers `is_variable` / `is_formula` / `is_derived` (derivable from `metricFormula`; the console already derives them). |
| D11 | Domain-specific markers migrate to Fields or tags per the mapping in A2. |
| D12 | Migration cost is not a concern (sole developer). Deletion over aliases. Published `_V_x-y-z_` files are write-once: a NEW L1 file is required. |
| D13 | Delete the legacy `base` bluepriNNt (decided 2026-10-17): the `iNNfo/specs/bluepriNNts/base/` folder (spec + samples), its `manifest/source.yaml` entry, its tests and test fixtures, and every live reference to it. Rationale: `base` composes frozen `workspace_V_0-2-0` / `cogNNitive_V_0-2-0`, which carry the `verified` Marker Definition, so it would fail `MARKERS_REMOVED` with no possible fix; it is already legacy (`domaiNN/spec_NN.md` states `*_base_NN.md` entrypoints are never loaded by current tooling) and only its own sample uses it. Published L1 files (`iNNfo_V_0-3-0`, `iNNfo_V_0-4-0`) that reference it are write-once and stay untouched; the new `iNNfo_V_0-5-0` simply does not list it. `MARKERS_REMOVED` stays version-agnostic (no per-version rule logic). |

## Assumptions to confirm (before spec)

- **A1 sample flag -> tag mapping**: `!` -> `priority`, `*` -> `important`, `>` -> `complete`, `?` -> `uncertain`, `+` -> `starred`; `rating` `-` = unset -> no tag; numeric `certainty` values (analysis 60-95, business 3-5) are dropped; the business sample's undeclared `weight` scores are dropped. Confirmed by the maintainer 2026-10-17.
- **A2 domain mapping** (from exploration section 4):

| bluepriNNt | Marker | Becomes | Ambiguity |
|---|---|---|---|
| organization, procedures | complexity | Field `complexity`, `concept:: *`, `widget:: scale` 0-100 step 5 | none (samples use 60-95) |
| projects | health | Field `health`, `concept:: *`, `select` `[nominal, warning, critical]`, `widget:: cycle` | confirmed 2026-10-17: `critical` included |
| repository | shipped | tag `shipped` | confirmed 2026-10-17: a yes/no flag is membership, so it is a tag |
| visual-catalog | confidence, review | Field `confidence` on `Entry` (`scale` 0-10); `review` -> tag `reviewed`; procedure step "Record Markers" -> "Record Confidence and Review" | confirmed 2026-10-17: `review` is a tag |
| cogNNitive, domaiNN, workspace | verified | tag `verified` | confirmed 2026-10-17: kept as a tag despite the `artifacts` `status:: verified` overlap (different scopes) |
| sources, artifacts, visual-catalog, documentation | `tags` `type:: string` Field | the shared multi-valued `tags` select Field | none |

- **A3** every content bluepriNNt declares one identical open-vocabulary `tags` Field (`concept:: *`), so ad-hoc tagging stays first-class (exploration C1).
- **A4** new L1 file is `iNNfo/specs/iNNfo_V_0-5-0_NN.md`.

## Scope

### In scope
- New L1 `iNNfo_V_0-5-0_NN.md`: 3 primitives; Field `concept` list/`*`, `widget`, `widget_config`, multi-value property; concept-level values + inheritance; rewritten metaschema; reconciled widget_config key table.
- All 12 marker-declaring L2s + workspace_spec + `skills/nn-innfo/templates/workspace_spec_iNNfo_NN.md` converted and re-parented to 0-5-0 (with `blueprint_version` bumps).
- innfo-core: schema extract/compose/metaschema, parser, serializer, normalize, merge, mutate, scaffold, validator, payload builder, slot, element hash; remove `Marker`, `nodeMarkers`, `conceptMarkers`, `conceptTags`, `set_marker`; add `MARKERS_REMOVED`.
- innfo-mcp: op enum, `SCHEMA_OPS`, reserved headings, bundle.
- Console: field facets, generic membership filter, tag hash color, widget-aware field editors; remove `MarkerChip`, guide "Markers", `marker:` edit path, tag special-casing.
- Data: 6 SSOT samples + synced copies + `sync-samples.mjs` mappings; 9 domain files lose `# NN Tags`; testlab fixtures; decide `simulacro-refactorizacion` fixture (freeze vs refresh, DQ8).
- Skills/docs: `nn-innfo` (wizard Markers question, §8e, primitives table, line 918), migration recipe (nn-innfo and/or nn-upgrade), `nn-preflight` reserved `markers`, docs pages, `vocabulary.json` + generated vocabulary doc.
- Living OpenSpec deltas (see Capabilities). Close backlog item 37 defects made moot.

### Out of scope
- `unified-knowledge-unit-badges` (separate, dependent change). It needs from THIS change: payload schema fields exposing `widget`, `widgetConfig`, multi-value flag, `options`, `type`, `description`; per element own `fields` (hashed) plus separately labelled inherited concept-level values with provenance concept, and per concept its concept-level values; one exported, tested `tag name -> slot` hash; removal of `kind:'marker'` from `KuBadge`; a generic facet model (field + value) shared by filter and badge click.
- Frozen specs (`iNNfo_V_0-1-0..0-4-0`, `*_V_*_NN.md`, `defiNNition_V_0-1-0`): untouched.
- Display attributes (`icon`/`color`) on valued Fields beyond what D2 states (DQ7).
- An in-place domain migrator in `nn-upgrade` (only the agent recipe + diagnostic).

## Capabilities

### New Capabilities
- `field-value-model`: Field multi-concept targets, multi-value cardinality, `widget`/`widget_config` on Field, concept-level values and inheritance (union/override), `select` multi-value validation.
- `markers-removed-diagnostic`: `MARKERS_REMOVED` error contract, remediation message, agent migration recipe via changeset.

### Modified Capabilities
- `element-concept-tags`: REMOVED (reserved `tags::` parsing) and replaced by `field-value-model`.
- `console-payload-builder`, `console-ui-kit`, `innfo-console-runtime`, `console-review-mode`, `console-architecture`: markers removed, field facets, generic membership filter, hash color (incl. reversing "A field named tags is not a tag source").
- `console-export-cli` (with `console-payload-builder`, `console-review-mode`, `innfo-console-runtime`, the specs that reference the element hash): hash no longer carries `markers`; own field values (incl. `tags`) enter it, inherited values do not.
- `model-scaffold-robustness`, `mutation-level-gating`, `changeset-apply-engine`: no item-markers seeding, no `set_marker`, multi-concept `add_field`.
- `template-includes-collision-resolution`, `base-composite-template`: composition of `*` Fields, no Marker dedupe.
- `innfo-skill-menu`, `workspace-template-upgrade`, `canonical-vocabulary`: marker/tag references updated.
- `workspace-entrypoint`: the `*_base_NN.md` overview-root precedence is removed (D13).
- Not modified (review W7): `skill-shared-rules`, `legacy-quarantine` and `citation-parser-resolver` only use "marker" in unrelated senses (a marker-delimited block, quarantine markers, the JSON array-end marker).

## Approach

Exploration recommendation A2 + B2 + C1 + D1: expand `*`/list targets AFTER composition in `resolveBlueprintSchema` (concept-specific Field beats a `*` Field of the same name); explicit multi-value Field property; identical open `tags` Field per bluepriNNt; generalise `conceptTags` into `conceptFields` + `rawConceptFields` with byte-identical round-trip (also fix the tags-only concept section drop in `emitConceptSection`). Inherited values are computed, never written back, and stay out of the hash.

### Slicing (additive first, destructive last; main green after each)
1. **S1 core additive**: Field targets/widgets/multi-value, concept-level fields, inheritance helper, multi-value `select` validation; L1 0-5-0 draft for metaschema tests.
2. **S2 content**: L1 final, all L2s + samples + domain files converted, version bumps, sync/catalog/registry regeneration.
3. **S3 core removal**: delete Marker primitive and tag special path, `MARKERS_REMOVED`, hash change, MCP enum, bundles.
4. **S4 console**: facets, generic filter, hash color, editors, bundle + fixtures.
5. **S5 skills/docs**: nn-innfo, migration recipe, preflight, docs, vocabulary, openspec deltas.

## Affected areas

| Area | Impact |
|---|---|
| `iNNfo/specs/iNNfo_V_0-5-0_NN.md` | New |
| `iNNfo/specs/bluepriNNts/*/spec_NN.md` (12 + business re-check), `workspace_spec_NN.md`, visual-catalog procedure | Modified |
| `iNNfo/packages/innfo-core/src/{schema,parser,recursiveParser,validator,console,scaffold,types}/**`, `merge.ts`, `mutate.ts`, `metamodel.ts`, `lineage/record.ts` | Modified / Removed code |
| `iNNfo/packages/innfo-mcp/src/{server.ts,tools/apply-change.ts,tools/validate.ts}`, `bin/innfo-mcp.bundle.js` | Modified / regenerated |
| `iNNfo/specs/bluepriNNts/console/{innfo-runtime,review,ui-kit}.js`, `innfo-ui.css`, bundles, `scripts/export-console.mjs` | Modified |
| `_samples_nn/**`, `ecosystem_NN/domaiNN_NN.md`, `docs/workspace_NN.md`, `docs/cognitive_nn/use-cases/*/domaiNN_NN.md`, `test/fixtures/testlab/**` | Modified |
| `skills/nn-innfo/**`, `skills/nn-upgrade/SKILL.md`, `skills/nn-preflight/scripts/preflight-check.js`, generated `innfo-core.generated.cjs` mirrors | Modified |
| `scripts/{generate-canonical-registry,sync-samples,blueprint-catalog}.mjs`, `iNNfo/specs/vocabulary.json`, `docs/innfo/documentation/*.md` | Modified |

## Release / versioning impact

- Breaking engine semantics: `innfo-core` 0.25 -> next minor (pre-1.0 breaking), `innfo-mcp` likewise; raise `nn-innfo` `mcp.min_version` in `manifest/source.yaml`.
- Release order across the four tag channels: `innfo-mcp-v` -> `blueprints-v` -> `innfo-console-v` (new CDN file, shell pins) -> `skills-v`. Blueprints before MCP would hand old engines `concept:: *` they cannot compose.
- Every changed L2: `blueprint_version` bump (immutability guard), `spec_version` = `V_0-5-0`, samples renamed (`check-samples-version`), `manifest/source.yaml` pins re-checked (`version:` = spec_version).

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Global hash invalidation breaks open changesets/ledgers | Certain (accepted, D7) | Prune/regenerate testlab artifacts in the same slice; release note |
| Concept-level parser swallows prose starting with `word:: x` | Low | Stop at first non-property line; corpus scan test |
| Release skew blueprints vs MCP | Med | Ordered release + `min_version` raise |
| Generated-file drift fails `verify.js` | High | Regenerate all mirrors/bundles per slice; `check:integrity` gate |
| Merge conflicts with `ku-lifecycle-fixes`, `global-console-filter` and the greenfield change (`scaffold/knowledge.ts`, `changes/spec_NN.md`, `innfo-runtime.js` filter parser, binary `innfo-console.bundle.js`, generated cjs, testlab) | High | Both session branches land first. The `changeset-apply-engine` and `mutation-level-gating` deltas are written against the `ku-lifecycle-fixes` text, and S4 builds on the `global-console-filter` query parser. Regenerate, never hand-merge generated files |
| Loss of evaluative signal (certainty numbers dropped) | Low | Accepted by D9; recorded in A1 |
| Breadth (~105 files / ~510 occurrences) | High | Strict TDD per slice; slice order above |

## Rollback plan

Revert the merge commit(s) on `dev` before any release tag. After release: tags are independent, so cut a patch release of `blueprints-v` re-pinning the previous `blueprint_version`s and of `innfo-mcp-v` from the prior core; the new L1 file stays (write-once) but unreferenced. Hash invalidation is not reversible for changesets created after the release.

## Open design questions (for sdd-design)

1. **DQ1** Multi-value property name/syntax (`multiple:: true`?); `select`-only? Accepted value forms (`[a, b]` only vs bare `a, b`); single value as one-element list.
2. **DQ2** Add `number`/`boolean` Field types, or let `widget` carry meaning (validator enforcement of `scale` bounds).
3. **DQ3** Case normalisation of `tags` values (today lowercased) vs verbatim for other fields; effect on hash color and facets.
4. **DQ4** Closed `tags` vocabularies under `includes`: union of `options`, forbid, or rename.
5. **DQ5** Where `*` stops (text concepts, reserved structural concepts); precedence rule for specific vs `*` Field.
6. **DQ6** Inheritance read API (own `fields` vs `inherited` map vs effective view); validation of an inherited value against the element's concept Field; mutation cascades touch own values only.
7. **DQ7** Do valued Fields keep `icon`/`color` (badge change may want an icon)?
8. **DQ8** `simulacro-refactorizacion` fixture: freeze as legacy input (now an expected `MARKERS_REMOVED` case) or refresh.
9. **DQ9** Exact `MARKERS_REMOVED` scope (L2 Marker Definition, L3 item-markers table, both) and whether `nn-preflight` surfaces it; hash algorithm for tag color (e.g. FNV-1a, shared core/console module).
10. **DQ10** Review-mode draft op for multi-valued fields (replacing comment drafts with `field: 'tags'`); UI for concept-level values.

## Success criteria

- [ ] L1 0-5-0 declares exactly 3 root primitives; no live L2 contains a Marker Definition or `item-markers matrix`; `Tags` concept gone from domaiNN/workspace and all domain files.
- [ ] `rg -i "marker definition|item-markers|set_marker|conceptMarkers|conceptTags"` over live `src`/specs/skills returns only frozen files and the `MARKERS_REMOVED` diagnostic/recipe.
- [ ] A document with a Marker Definition or item-markers matrix fails validation with `MARKERS_REMOVED` and a remediation message; the agent recipe produces a reviewable changeset.
- [ ] `tags:: [a, b]` validates as a multi-valued select (open and closed); concept-level values inherit (union / override) and are visible in the payload with provenance.
- [ ] Console `<field>:value` filter matches array membership with AND and any-of; tag color is deterministic and tested.
- [ ] Round-trip fidelity suite stays byte-identical over the converted corpus.
- [ ] `node scripts/verify.js --release` and `npm run check:integrity` green; releases cut in the stated order.
