# Design: Fields replace Markers and Tags

Inputs: `proposal.md` (D1-D13, A1-A4 fixed), `exploration.md`. Code verified at `3afaa90e`.

> **Amendment 2026-10-17 (D13):** the legacy `base` bluepriNNt is DELETED in this change (folder, samples, `manifest/source.yaml` entry, tests/fixtures, live references), not left frozen. Wherever this design says "except `base`" or "`base` stays frozen", read it as "`base` is deleted". The write-once L1 files `iNNfo_V_0-3-0` / `iNNfo_V_0-4-0` keep their historical reference; `iNNfo_V_0-5-0` omits it. `MARKERS_REMOVED` is version-agnostic.

## Technical Approach

One value primitive, the Field. Field Definitions gain `multiple`, `widget`, `widget_config` and a list or `*` `concept` target, expanded once after `includes` composition. Concept sections gain generic concept-level values, and elements inherit them (union or override). The `tags::` special path, the Marker primitive and `item-markers matrix` are deleted. Leftover marker constructs fail with `MARKERS_REMOVED`. A new L1 `iNNfo_V_0-5-0_NN.md` carries the model, and every live L2 except the frozen `base` re-parents to it.

## Architecture Decisions (DQ1-DQ10 and drift)

| DQ | Options | Tradeoff | Decision |
|---|---|---|---|
| DQ1 multi-value | infer from `[..]` shape; `multiple:: true` | Inference cannot decide union vs override for a single bare value | `multiple:: true`, legal only on `type:: select` (metaschema ERROR otherwise). Canonical form `[a, b]`. A bare scalar is a one-element list. A bare `a, b` is ONE value and warns `MULTI_VALUE_UNBRACKETED`. `multiple` decides inheritance: true = union, false = element overrides. |
| DQ2 types | widget carries meaning; add `number`/`boolean` | Widget-only typing leaves `certainty`-style heterogeneity unvalidated | Add `number` and `boolean` to `FIELD_TYPES`. `type` is the value contract; `widget` is optional interaction. The compatibility table below is enforced by the metaschema (ERROR). `scale` bounds and `step` are validated (ERROR). `parsePropertyValue` already yields numbers and booleans. |
| DQ3 case | lowercase on parse (today's tags); verbatim | Lowercasing on parse needs `rawTags` for fidelity and hides author intent | Store values verbatim. For `multiple` selects, every comparison uses one `valueKey(v) = trim().toLowerCase()`: options membership, union dedupe, filter membership and tag colour. Single selects keep exact option matching (today's behaviour). |
| DQ4 closed `tags` under `includes` | union `options`; forbid; rename | Union silently widens a closed vocabulary | Keep the existing canonical-form rule: identical open `tags` dedupe, and differing `options` raise `COMPOSITION_COLLISION`. A closed vocabulary that has to coexist uses its own Field name. No new code. Today's only composite, `business`, includes blueprints that all declare the identical open `tags`. |
| DQ5 `*` scope | expand per blueprint; after composition; at lookup | Expanding per blueprint misses included concepts. Expanding at lookup spreads `*` handling across every consumer. | Expand in `resolveBlueprintSchema` at depth 0 only, on both paths (with and without includes), after aliasing. `*` means every Concept Definition of the effective schema except `type:: text`. Lists name concepts, and an unknown name is an ERROR. A concept-specific or list Field beats a `*` Field of the same name, silently. Two different `*` Fields with the same name raise `COMPOSITION_COLLISION`. |
| DQ6 inheritance API | effective view only; own + `inherited` delta | An effective-only view loses provenance and leaks into the hash | Core computes the inheritance delta: `inherited[field] = {value, from: concept}` holds, for multi-valued fields, only the concept values the element does not already have, and for single-valued fields, a value only when the element has none. Consumers then compute effective values without knowing the rule: concatenate arrays, or `own ?? inherited`. Concept-level values are validated once against the concept's Field. Mutations and cascades touch own values only, and inherited values are never written back. |
| DQ7 `icon`/`color` on Field | keep; drop | Badges can use the concept slot and the widget | Drop them (YAGNI). `description` already exists. The badge change can add attributes later if it needs them. |
| DQ8 simulacro fixture | freeze; refresh | Freezing gives a real legacy-input test for free | Freeze. `simulacro-user-workspace.test.ts` asserts `MARKERS_REMOVED` (with marker names in `meta`) and is used as the recipe's acceptance input. |
| DQ9 diagnostic scope | L2 only; L3 only; both | Both kinds of construct exist in user data | Both: one ERROR per document, listing names. `nn-preflight` gets no new check; it only drops the reserved `markers`. The `validate_*` tools cover detection. |
| DQ9 colour hash | per-consumer; shared | Duplicate implementations drift | FNV-1a 32-bit over `valueKey(name)`, then `slot = (h >>> 0) % 12 + 1`. One implementation: `UI.tagSlot` in `ui-kit.js`, pinned by a golden-vector test. Core does not need it, because the payload carries values, not colours. |
| DQ10 review drafts | comment drafts; field corrections | Comment drafts never apply | A tag add or remove becomes a `correction` on field `tags` carrying the full new array, and applies as `update_field`. New changeset op `update_concept_field {conceptName, fieldName, value}`. Concept-level values are rendered read-only in S4; editing them belongs to `unified-knowledge-unit-badges`. |
| Select array bug | patch `String()`; one validator | The inline check is duplicated by concept-level validation | New deep function `validateFieldValue` (below) replaces the inline check in `metaschema.ts` lines 113-122. |
| Generic filter substring | keep substring; type-aware | Substring breaks membership (`tags:ai` would match `maintenance`) | `<field>:v` matches the effective value. Arrays use exact `valueKey` membership, a scalar select uses exact case-insensitive equality, and other types use substring. Numeric comparators are unchanged. Repeated tokens AND together, and `field:a\|b` within one token is any-of. `tag:` and `tag-any:` are deleted (no alias). |
| Element hash | constant `markers:{}`; drop the key | D7 accepts invalidation | `computeElementHash({concept, name, description, fields})`, still SHA-256 truncated to 16 hex. Own fields (including `tags`, verbatim) are hashed; inherited values are not. Both shifts land together in S3: one invalidation. |
| `widget_config` keys | code table; L1 prose; shipped usage | Only `matrix.ts` reads any key (`min/max/step`) | The 0-5-0 table, which code mirrors exactly, is: `scale {min,max,step,unit}`, `set {max_selections}`, `cycle {}`, `boolean {true_label,false_label}`, `text {max_length}`. Dropped: `order`, `wrap`, `multi`, `placeholder`. An unknown key becomes an ERROR. visual-catalog drops `multi`. The table covers Field and Matrix alike. |

Widget/type compatibility: `scale`: `number` · `boolean`: `boolean` · `cycle`: single `select` with `options` · `set`: `select` with `multiple` · `text`: `string`.

Concept-level parsing: the contiguous `key:: value` lines directly after `# NN <Concept>` (leading blank lines allowed), stopping at the first other line. The parse stays schema-agnostic. They are stored in `conceptFields` and `rawConceptFields`. The serializer emits a concept section whenever it has concept fields, which fixes the dropped tags-only section in `emitConceptSection`. A corpus scan test proves no prose is consumed.

## Data Flow

    L2 Field (concept:: * | [A,B])         L3 "# NN A" concept fields + "## NN A: x" own fields
          │ extract → globalFields               │ parseConceptSection
          ▼                                      ▼
    resolveBlueprintSchema(depth 0):       ParsedKnowledge.conceptFields
    compose → alias → expandFieldTargets         │
          ▼                                      ▼
    concept.fields[] ──► validateFieldValue ◄── own + concept values
          │                                      │ inheritConceptValues
          ▼                                      ▼
    slot.ts schema.fields (+widget…)       payload element {fields, inherited, hash(own)}

## Interfaces / Contracts

```ts
// types/parser.ts
interface ConceptField { name; type: FieldType; options?; target_concepts?; target_blueprint?;
  description?; multiple?: boolean; widget?: Widget; widgetConfig?: Record<string, unknown>;
  scope: 'concept' | 'list' | '*' }
interface BlueprintSchema { concepts; matrices; taxonomy; globalFields?: GlobalField[] } // no markers
// schema/field-values.ts (new deep module, the single owner of value semantics)
export function valueKey(v: unknown): string
export function validateFieldValue(def: ConceptField, value: unknown, path: string): ValidationError[]
export function inheritConceptValues(own, conceptValues, defs, concept): Record<string, {value: unknown; from: string}>
// validator/removed-constructs.ts
export function checkRemovedMarkerConstructs(parsed: ParsedKnowledge, filePath?: string): ValidationError[]
```

`MARKERS_REMOVED` (ERROR) carries `meta: {markers: string[], matrixColumns: string[]}` and `promptHint: "nn-innfo recipe MARKERS_REMOVED"`. Message: `<file> uses Marker Definitions (<names>) / an item-markers matrix (<columns>), removed in iNNfo V_0-5-0. A flag marker becomes a value of the tags Field (tags:: [name]). A valued marker becomes a declared Field (concept:: * or a list, with type/widget) whose cells become field:: value lines; concept rows become concept-level values; scores with no declared Field are dropped. Then delete the Marker Definition section or the item-markers matrix. Agents: submit the fix as a changeset.` The constructs are detected by heading (`Marker Definition` concept, `item-markers matrix`), and the generic unknown-concept and unknown-matrix checks are suppressed for them so no duplicate diagnostics appear. The core validator and `validate_knowledge` / `validate_blueprint` emit identical diagnostics. New generic changeset op: `remove_matrix {matrixName}`.

Agent recipe (`skills/nn-innfo/SKILL.md`, new section "Recipe: MARKERS_REMOVED"; `nn-upgrade` links to it):
1. Run validation and read `meta`.
2. Classify each marker. Symbol-only or `X` cells become a tag named per A1, with the name confirmed with the user. Valued markers become a Field.
3. Build one changeset: `update_field` per element (`tags` arrays, valued fields), `update_concept_field` for concept rows, `remove_matrix`.
4. For a shipped bluepriNNt, upgrade via Flow B. For a custom L2, propose the edit for consent.
5. Run `propose_changeset` for console review. Never rewrite the file directly, and state which numeric scores were dropped.

## File Changes

| Area | Action |
|---|---|
| `iNNfo/specs/iNNfo_V_0-5-0_NN.md` | Create. Copy of 0-4-0 with: 3 primitives, Field `concept` list/`*`, `multiple`/`widget`/`widget_config`, types `number`/`boolean`, concept-level values and inheritance, reconciled widget table, rewritten metaschema, `type:: model` added to the Concept `type` options. |
| `schema/{extract,compose,metaschema,field-values(new),canonical-registry}.ts`, `types/{parser,graph}.ts`, `parser/{sections,core,serializer}.ts`, `recursiveParser/*`, `merge.ts`, `mutate.ts`, `metamodel.ts`, `scaffold/knowledge.ts`, `validator/{constants,content,knowledge-checks,removed-constructs(new)}.ts`, `console/{payload-builder,element-hash,slot}.ts`, `lineage/record.ts`, `changeset/*` (two ops) | Modify / Create |
| `innfo-mcp/src/{server,tools/apply-change,tools/validate}.ts`, `bin/innfo-mcp.bundle.js` | Modify / regenerate |
| `console/{innfo-runtime,review,ui-kit}.js`, `innfo-ui.css`, bundles, `scripts/export-console.mjs` | Modify (`MarkerChip`, guide Markers, `marker:` edit path, `tag:` branches deleted) |
| All live L2s except `base`; `skills/nn-innfo/templates/workspace_spec_iNNfo_NN.md`; visual-catalog procedure | Modify: re-parent to 0-5-0, `spec_version: V_0-5-0`, minor `blueprint_version`/`template_version` bump; markers per A2; open `tags` Field (`concept:: *`, `select`, `multiple`) in every one except `sidecar`; `Tags` concept deleted |
| `_samples_nn/**` (6 SSOT renamed), synced copies, 9 domain files, testlab fixtures | Modify |
| `scripts/{sync-samples,generate-canonical-registry}.mjs`, `manifest/source.yaml`, `vocabulary.json`, docs, `nn-preflight`, generated `.cjs` mirrors | Modify / regenerate |

Regeneration per slice: `generate-canonical-registry.mjs`, `sync:versions`, `sync:samples`, `build:console`, `stage:mcp-bundle`, the core mirror builders, and the vocabulary doc. Gates: `verify.js --release`, `check:integrity`, `check:specs`, `check:samples`, `check:versions`.

## Testing Strategy (Strict TDD, vitest + node suites)

| Layer | RED first |
|---|---|
| Unit core | `field-values.test.ts` covers the multi-value/options/`valueKey` matrix, number/boolean/scale bounds and inheritance union/override. `compose` covers `*` expansion across `includes` and precedence/collision. `metaschema` covers the compatibility table and unknown `widget_config` keys. The parser/serializer covers concept fields and the tags-only section. `element-hash` uses a golden hash. `MARKERS_REMOVED` covers L2 and L3. |
| Integration | `roundtrip-fidelity` over the converted corpus (byte-identical); corpus scan with zero swallowed prose; `simulacro` expects `MARKERS_REMOVED`; MCP `validate_*` diagnostics identical to core; `apply-change` new ops |
| Console (node) | Filter membership AND / `\|`, `tagSlot` golden vectors, payload `inherited` |

## Migration / Rollout and Slices

| Slice | Ships |
|---|---|
| S1 core additive | `field-values.ts`, Field targets/`multiple`/widgets/types, concept fields plus inheritance in the payload, fixed select validator, new changeset ops, L1 0-5-0 draft. Markers and `tags::` still work. |
| S2 content | Final L1, all L2/sample/domain conversions, bumps, renames, regenerated registry/catalog/samples |
| S3 core removal | Marker/`nodeMarkers`/`conceptTags`/`set_marker` deleted, tags handled as a plain field, hash change, `MARKERS_REMOVED`, MCP enum, bundles, testlab artifacts regenerated |
| S4 console | Field facets, generic filter, `tagSlot`, widget editors, tag corrections |
| S5 skills/docs | nn-innfo (wizard, §8e, recipe), nn-upgrade link, preflight, docs, vocabulary, OpenSpec deltas |

Release order: `innfo-mcp-v` (core next minor) → `blueprints-v` → `innfo-console-v` (new CDN file, shell pins) → `skills-v`, raising `mcp.min_version` (now `0.12.0`) to that innfo-mcp release.

Consumed by `unified-knowledge-unit-badges`: `schema.fields[]` entries with `type, options, multiple, widget, widgetConfig, description, scope`; per element `fields` (own, hashed) plus `inherited{field: {value, from}}`; per concept `fields`; `UI.tagSlot`; `KuBadge` without `kind:'marker'`; the facet token model `{field, values[], mode: 'all'|'any'}`, shared by the filter and badge clicks.

## Open Questions

- [ ] Can changesets target L2 files? If not, custom-L2 remediation is a consented direct edit (recipe step 4). This needs verifying in tasks.
