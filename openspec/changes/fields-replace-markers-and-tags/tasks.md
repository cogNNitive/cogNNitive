# Tasks: Fields replace Markers and Tags

Strict TDD: every behavior task is RED (failing test) -> GREEN (minimum code) -> REFACTOR, tests first. Test commands: `npm --workspace=@cognnitive/innfo-core test -- <name>` (vitest), `npm --workspace=@cognnitive/innfo-mcp test`, `npm run verify` (typecheck + both suites), `node scripts/verify.js` (node suites), `node scripts/verify.js --release`, `npm run check:integrity|check:specs|check:samples|check:versions|check-console-bundle`.
Paths: core = `iNNfo/packages/innfo-core`, mcp = `iNNfo/packages/innfo-mcp`, specs = `iNNfo/specs`, bp = `iNNfo/specs/bluepriNNts`. Spec refs name the delta capability + requirement under `specs/`.

## Gotchas (read before applying)

- Worktree `node_modules` are junctions: NEVER run `npm ci`/`npm install` from a worktree or subagent (corrupts the PRIMARY's `node_modules`). Builds and tests only.
- After any merge or core edit, rebuild innfo-core (`npm --workspace=@cognnitive/innfo-core run build`) BEFORE trusting innfo-mcp test failures (stale `dist`).
- Published `_V_x-y-z_` files are write-once: never edit `iNNfo_V_0-3-0`/`0-4-0`, `workspace_V_0-2-0`, `cogNNitive_V_0-2-0`. Changed L2s bump `blueprint_version`/`template_version` (two axes: `manifest/source.yaml` `version:` = `spec_version`, not `template_version`).
- A bare `cogNNitive/iNNfo` slug in `openspec/specs/` fails `check:spec-urls`; write split code spans.
- Never hand-merge generated files (bundles, `*.generated.cjs`, `catalog.json`): regenerate.
- `nn-preflight` tests: re-run with empty `USERPROFILE`/`HOME` before trusting green.
- Another change (`unified-knowledge-unit-badges`) consumes this one's payload/`tagSlot`; do not touch its folder.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 7,000-10,000 (about 105 files; roughly 40% generated: bundles, mirrors, catalog, testlab) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (slice order below), single PR acceptable |
| Suggested split | S1 -> S2 -> S3 -> S4 -> S5 (or one PR with work-unit commits) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units (one commit each, conventional commits, no AI attribution; main stays green after each)

| Unit | Goal | Notes |
|---|---|---|
| U1 | S1 core additive: field-values, targets, concept fields, inheritance, new ops, L1 draft | Markers and `tags::` still work |
| U2a | S2 L1 final + L2 conversions + version bumps | Regenerate registry/catalog |
| U2b | S2 samples, domain files, fixtures, `base` deletion | Regenerate samples |
| U3a | S3 `MARKERS_REMOVED` + hash change | Single invalidation point |
| U3b | S3 marker/tag code deletion + MCP enum + bundles | Rebuild core first |
| U4 | S4 console | Rebuild console bundle |
| U5 | S5 skills, docs, vocabulary, OpenSpec | Then release |

## S1 Core additive (U1)

- [ ] 1.1 Resolve design Open Question: read `core/src/changeset/*` and `mcp/src/tools/propose-changeset` to determine whether changesets can target L2 files; record the answer in `design.md` (recipe step 4 depends on it). Verify: design.md updated, no open checkbox.
- [ ] 1.2 RED `core/tests/field-values.test.ts`: `valueKey`; `validateFieldValue` matrix (single/multiple select, open/closed, case-insensitive `multiple` membership, verbatim storage, array rejected for single, number, boolean, scale bounds/step); `inheritConceptValues` union/override/delta. Spec: field-value-model "Multi-Valued Fields", "Select Vocabulary", "Number and Boolean Field Types", "Concept-Level Inheritance".
- [ ] 1.3 GREEN create `core/src/schema/field-values.ts` (`valueKey`, `validateFieldValue`, `inheritConceptValues`). Verify: 1.2 passes.
- [ ] 1.4 RED metaschema tests (extend `metaschema-selfdescribe.test.ts` or new `metaschema-fields.test.ts`): `multiple` on non-select ERROR, widget/type compatibility ERROR, unknown `widget_config` key ERROR, `scale` bounds, `MULTI_VALUE_UNBRACKETED` warning. Spec: field-value-model "Widgets on Fields", "Multi-Valued Fields".
- [ ] 1.5 GREEN `core/src/schema/metaschema.ts` (replace inline select check at lines ~113-122 with `validateFieldValue`), `validator/constants.ts` (`FIELD_TYPES` + `number`/`boolean`, widget/type table, `WIDGET_CONFIG_KEYS` = design table).
- [ ] 1.6 RED extract tests: Field `concept` list/`*`, `multiple`, `widget`, `widget_config`, `scope`. Spec: field-value-model "Field Definition Concept Targets".
- [ ] 1.7 GREEN `core/src/schema/extract.ts`, `core/src/types/parser.ts` (`ConceptField` gains `multiple`, `widget`, `widgetConfig`, `scope`; `BlueprintSchema.globalFields`).
- [ ] 1.8 RED `includes-composition.test.ts`/`includes-dedup.test.ts`: `*` expands after composition at depth 0 on both paths, skips `type:: text`, unknown list name ERROR, specific beats `*`, different `*` Fields collide, identical `*` dedupe, differing `options` collide. Spec: template-includes-collision-resolution, field-value-model "Concept Targets".
- [ ] 1.9 GREEN `core/src/schema/compose.ts` (`expandFieldTargets` in `resolveBlueprintSchema`), `canonical-registry.ts`; run `node scripts/generate-canonical-registry.mjs`.
- [ ] 1.10 RED parser/serializer tests: concept-level `key:: value` lines after `# NN <Concept>` (`conceptFields`/`rawConceptFields`), stop at first non-property line, prose not swallowed, values-only section round-trips byte-identical (tags-only section drop in `emitConceptSection`). Spec: field-value-model "Concept-Level Field Values".
- [ ] 1.11 GREEN `core/src/parser/{sections,core,serializer}.ts`, `recursiveParser/*`, `merge.ts`.
- [ ] 1.12 RED corpus-scan test: over all samples/domain/testlab files, zero prose consumed as concept fields; `roundtrip-fidelity` stays byte-identical. GREEN fix any hit.
- [ ] 1.13 RED validator tests: concept-level values validated once against the concept's Field; invalid value ERROR names concept and Field. Spec: field-value-model "Concept-Level Inheritance". GREEN `validator/{content,knowledge-checks}.ts`.
- [ ] 1.14 RED `console-payload-builder.test.ts`: `schema.fields` entries carry `multiple`, `widget`, `widgetConfig`, `description`, `scope`, one entry per concept for `*`; element `fields` (own) plus `inherited{field:{value,from}}`; concept entry `fields`; export test via `export-console.mjs --domain`. Spec: console-payload-builder "Declared Field Definitions...", "Element Field Values and Inheritance...".
- [ ] 1.15 GREEN `core/src/console/{payload-builder,slot}.ts`, `scripts/export-console.mjs` aggregation. Hash unchanged in S1.
- [ ] 1.16 RED changeset tests (`core/tests/changeset/*`): `update_concept_field`, `remove_matrix` (parse, conflicts, impact, apply, base_hash); multi-valued `update_field` per-member validation, own-only; unknown matrix rejected. Spec: changeset-apply-engine "Concept-Level Field and Matrix Removal Operations".
- [ ] 1.17 GREEN `core/src/changeset/{types,parser,conflicts,impact,apply}.ts`, `mutate.ts`; classification partition test updated (exhaustive lists).
- [ ] 1.18 RED mutate tests: `add_field` multi-concept target, `multiple`, `widget`, `number`/`boolean`, L2-only gate; GREEN `mutate.ts`, `metamodel.ts`, `mcp/src/tools/apply-change.ts`, `mcp/src/server.ts` enum. Spec: mutation-level-gating.
- [ ] 1.19 Create DRAFT `specs/iNNfo_V_0-5-0_NN.md` (copy of 0-4-0 + Field `concept` list/`*`, `multiple`/`widget`/`widget_config`, `number`/`boolean`, concept-level values, `type:: model`); RED test that the metaschema parses it and self-describes; GREEN.
- [ ] 1.20 REFACTOR: remove duplication introduced (single owner of value semantics = `field-values.ts`), lint (`npm run lint`).
- [ ] 1.21 Regenerate and gate: `npm --workspace=@cognnitive/innfo-core run build`, core mirrors (`innfo-core.generated.cjs` builders), `npm run verify`, `node scripts/verify.js`. COMMIT U1.

## S2 Content migration (U2a, U2b)

- [ ] 2.1 Finalize `specs/iNNfo_V_0-5-0_NN.md`: exactly 3 primitives, reconciled widget table (design), metaschema rewrite, concept-level values and inheritance prose; omit `base` from the template list. Verify: `check:specs`, `check:spec-urls`.
- [ ] 2.2 RED `core/tests/bluepriNNt-field-catalogue.test.ts` encoding the shipped catalogue table (A2): no live L2 has `Marker Definition`/`item-markers`; identical open `tags` Field (`select`, `multiple`, `*`) in every L2 except `sidecar`; no `Tags` concept in domaiNN/workspace; Field table rows. Spec: field-value-model "Shipped Field Catalogue", "Tags Concept Deleted".
- [ ] 2.3 GREEN organization, procedures: `complexity` (`number`, `*`, `scale` 0-100 step 5); re-parent to 0-5-0, `spec_version: V_0-5-0`, bump `blueprint_version`.
- [ ] 2.4 GREEN projects: `health` (`*`, `select` `[nominal, warning, critical]`, `cycle`).
- [ ] 2.5 GREEN repository: tag `shipped` (marker removed). GREEN visual-catalog: `confidence` on `Entry` (`number`, `scale` 0-10), tag `reviewed`, procedure step "Record Confidence and Review".
- [ ] 2.6 GREEN cogNNitive, domaiNN, workspace: tag `verified`; delete `Tags` concept and its Fields.
- [ ] 2.7 GREEN sources, artifacts, documentation: replace `tags` `type:: string` Field with the shared multi-valued `tags`.
- [ ] 2.8 GREEN analysis, business-model, innovation, blank, metrics (drop `is_variable/is_formula/is_derived`), business (re-check composition under `includes`): delete the five generic evaluative markers, add shared `tags`.
- [ ] 2.9 GREEN `bp/workspace_spec_NN.md` and `skills/nn-innfo/templates/workspace_spec_iNNfo_NN.md`: same conversion and re-parent.
- [ ] 2.10 Register new `template_version`s in the editor's `SHIPPED_TEMPLATE_VERSIONS` (recurring gap; catch it now) and any `manifest/source.yaml` pins; `node scripts/generate-canonical-registry.mjs`; `npm run sync:versions`.
- [ ] 2.11 Verify 2.2 green plus `npm run check:versions`, `check:integrity`. COMMIT U2a.
- [ ] 2.12 RED sample tests (existing `check:samples` plus a new assertion per sample): 6 SSOT Ghostbusters samples hold no markers, flags are tags (`!` priority, `*` important, `>` complete, `?` uncertain, `+` starred), `-` rating unset -> no tag, numeric `certainty` and undeclared `weight` dropped. Spec: field-value-model "Evaluative markers are gone".
- [ ] 2.13 GREEN convert 6 SSOT samples under `_samples_nn/**`, rename for `blueprint_version` bumps (`check-samples-version`), update `scripts/sync-samples.mjs` mappings, `npm run sync:samples`.
- [ ] 2.14 GREEN delete `# NN Tags` from the 9 domain files: `ecosystem_NN/domaiNN_NN.md`, `docs/workspace_NN.md`, `docs/cognitive_nn/use-cases/*/domaiNN_NN.md`, testlab domain files. Verify: `rg "# NN Tags"` = 0 hits.
- [ ] 2.15 GREEN testlab fixtures `test/fixtures/testlab/**`: convert content and `parent_spec` pins; KEEP `simulacro-refactorizacion` frozen (legacy input). Hash/ledger regeneration waits for S3.
- [ ] 2.16 D13 RED: update inventory guards (`scripts/verify.js` template inventory, `scripts/template-catalog.mjs` `FROZEN_NAMES = ['cogNNitive']`) so a `base` entry now fails; GREEN delete `bp/base/` (spec + `samples/Ghostbusters_V_0-1-0_base_NN.md`), `manifest/source.yaml` `base` entries (templates and `frozen_templates`), `iNNfo/validation-baseline.json` entries; regenerate `bp/catalog.json` (`npm run sync:versions`). Spec: base-composite-template.
- [ ] 2.17 D13 clean tests/fixtures that name `base`: `mcp/src/tools/spec.spec.ts`, `core/tests/{taxonomy-serialize-guards,metaschema-selfdescribe}.test.ts`, `scripts/lib/nn-name-invariant-guard.test.js`, `core/src/schema/canonical-registry.ts` (regenerated). Write-once files `iNNfo_V_0-3-0`/`0-4-0` and frozen peers keep their reference. Verify: `rg "bluepriNNts/base|base_V_0-1-0"` hits only write-once files and archived changes.
- [ ] 2.18 Gates: `npm run check:samples check:versions check:specs check:integrity`, `node scripts/verify.js`, `npm run verify`. COMMIT U2b.

## S3 Core removal and hash change (U3a, U3b)

- [ ] 3.1 RED `core/tests/removed-constructs.test.ts`: L2 Marker Definition, L3 `item-markers matrix`, both -> ONE `MARKERS_REMOVED`, `meta {markers, matrixColumns}`, `promptHint`, exact message, version-agnostic (`V_0-4-0` and `V_0-5-0`), free matrix unaffected, generic unknown-concept/matrix checks suppressed, no silent acceptance. Spec: markers-removed-diagnostic "MARKERS_REMOVED Error", "Actionable Remediation Message".
- [ ] 3.2 GREEN create `core/src/validator/removed-constructs.ts` (`checkRemovedMarkerConstructs`), wire in `validator/{constants,content,knowledge-checks}.ts`.
- [ ] 3.3 RED mcp tests: `validate_knowledge`/`validate_blueprint` emit identical diagnostics to core; GREEN `mcp/src/tools/validate.ts`.
- [ ] 3.4 RED `simulacro-user-workspace.test.ts` asserts `MARKERS_REMOVED` with marker names in `meta` for the frozen fixture; GREEN. Spec: "Legacy Fixture Is an Expected Case".
- [ ] 3.5 RED `core/tests/element-hash.test.ts` golden hash: input exactly `{concept, name, description, fields}`, own `tags` verbatim, inherited excluded, version-only edit stable, own field change moves it; GREEN `core/src/console/element-hash.ts` (`computeElementHash` drops `markers`). Spec: console-payload-builder "Element Ids and Hashes".
- [ ] 3.6 RED stale `base_hash` test (pre-change hash fails the precondition, nothing written) and console-export-cli old-mark `changed` test; GREEN. Spec: changeset-apply-engine, console-export-cli.
- [ ] 3.7 RED tags-as-plain-field tests: no `ElementNode.tags`/`conceptTags`/`parseTagList`; declared `tags` appears in field values; undeclared `tags::` behaves like any undeclared property. Spec: field-value-model "No Reserved `tags` Property". GREEN delete the `tags::` special path (`parser`, `types/graph.ts`, `payload-builder`).
- [ ] 3.8 RED `no-legacy-markers.test.ts` (model on `no-legacy-quarantine.test.ts`): live `src` has no `Marker`, `nodeMarkers`, `conceptMarkers`, `conceptTags`, `set_marker`, `item-markers` outside `removed-constructs.ts`. GREEN delete in `schema/{extract,compose,metaschema,canonical-registry}.ts`, `parser/*`, `recursiveParser/*`, `merge.ts`, `mutate.ts`, `metamodel.ts`, `validator/*`, `lineage/record.ts`, `types/{parser,graph}.ts`.
- [ ] 3.9 RED scaffold test: `init_knowledge` seeds no `item-markers matrix`, `Markers` concept, marker row or placeholder `tags::`, validates first try. Spec: model-scaffold-robustness. GREEN `core/src/scaffold/knowledge.ts`.
- [ ] 3.10 RED `apply-change` tests: `set_marker` -> `UNKNOWN_OPERATION`, partition exhaustive, reserved headings; GREEN `mcp/src/{server.ts,tools/apply-change.ts}` (enum, `SCHEMA_OPS`).
- [ ] 3.11 RED `recursiveParser` test: a `*_base_*.md` file gets no precedence over `workspace*.md`; GREEN remove `OVERVIEW_ROOT_RE`/`isOverviewRoot` from `core/src/recursiveParser/workspace.ts`. Spec: workspace-entrypoint.
- [ ] 3.12 REFACTOR: dead exports, lint, `npm run typecheck`.
- [ ] 3.13 Rebuild core FIRST, then `npm run stage:mcp-bundle`, core mirrors, `generate-canonical-registry.mjs`. Verify: `npm run verify`, `node scripts/verify.js`.
- [ ] 3.14 Regenerate testlab artifacts in the same slice: prune pending changesets and review ledgers (`prune_changesets`), re-export console payloads (`regenerate_console`), refresh `base_hash`es. Verify: testlab suites green.
- [ ] 3.15 Gates: `node scripts/verify.js --release`, `npm run check:integrity`. COMMIT U3a (3.1-3.6) and U3b (3.7-3.14).

## S4 Console (U4)

- [ ] 4.1 RED node test `UI.tagSlot` golden vectors (`FNV-1a 32` over `valueKey`, `% 12 + 1`), range 1..12 over 1,000 names, case/whitespace-insensitive; GREEN `bp/console/ui-kit.js`. Spec: console-ui-kit "Tag Color From Name".
- [ ] 4.2 RED filter tests (`console-runtime.test.ts`): repeated `tags:x` tokens AND, `tags:a|b` any-of, exact `valueKey` membership (no `tags:ai` vs `maintenance`), inherited values match, type-aware scalar/array/substring, `tag:`/`tag-any:` not special; GREEN `bp/console/innfo-runtime.js` (delete tag branches). Spec: innfo-console-runtime "Field Facet Matching".
- [ ] 4.3 RED ui-kit tests: no `MarkerChip`/`marker-chip`/`kind:'marker'`; `TagRow` from effective tags (own plus inherited, inert text, `[data-tag]`, slot from `tagSlot`, click -> `tags:<tag>`); multi-value field badge renders one chip per value. GREEN `ui-kit.js`, `innfo-ui.css`. Spec: console-ui-kit, console-architecture.
- [ ] 4.4 RED concept-guide tests: no Markers section; field schema with widget and multi flag; concept-level values listed. GREEN `innfo-runtime.js`. Spec: innfo-console-runtime "Concept Guidance Panel".
- [ ] 4.5 RED review tests: widget-aware field editor (boolean checkbox, bounded `scale`, `cycle`/`set` select, closed multi-select, open chip input); tag add/remove = `correction` on `tags` with full array applying as `update_field`; concept-level values read-only; `marker:` edit path gone. GREEN `bp/console/review.js`. Spec: console-review-mode.
- [ ] 4.6 RED facet rail/add-facet lists each `select` Field's values; help text states AND vs model/concept OR asymmetry; GREEN `innfo-runtime.js`.
- [ ] 4.7 Regenerate: `npm run build:console`, `npm run check:console-bundle`, export fixtures via `scripts/export-console.mjs`, `npm run test:ui` smoke. Gates: `node scripts/verify.js`. COMMIT U4.

## S5 Skills and docs (U5)

- [ ] 5.1 RED skills test (node suite under `skills/`): `nn-innfo/SKILL.md` has section "Recipe: MARKERS_REMOVED" (steps 1-5, `propose_changeset`, drop-scores statement, `update_concept_field`, `remove_matrix`), no live Marker authoring (wizard question, section 8e, primitives table, line ~918). GREEN edit `skills/nn-innfo/**`. Spec: markers-removed-diagnostic "Agent Migration Recipe", innfo-skill-menu.
- [ ] 5.2 GREEN `skills/nn-upgrade/SKILL.md`: Marker-bearing model reports `MARKERS_REMOVED` and links to the nn-innfo recipe, no mapping question. Spec: workspace-template-upgrade.
- [ ] 5.3 RED/GREEN `skills/nn-preflight/scripts/preflight-check.js` drops reserved `markers` only (no new check); run tests with empty `USERPROFILE`/`HOME`.
- [ ] 5.4 RED recipe acceptance test: run the frozen simulacro fixture through the recipe's changeset ops (`update_field`, `update_concept_field`, `remove_matrix`) and assert the result validates clean. Spec: markers-removed-diagnostic "A full remediation is expressible as one changeset".
- [ ] 5.5 GREEN `iNNfo/specs/vocabulary.json` (3 primitives, `tag` = value of `tags` Field, retired `Marker`), regenerate `docs/innfo/documentation/vocabulary.md` and docs pages (`npm run build:docs`); visual-catalog docs. Spec: canonical-vocabulary.
- [ ] 5.6 Verify success-criteria grep: `rg -i "marker definition|item-markers|set_marker|conceptMarkers|conceptTags"` over live `src`/specs/skills returns only frozen files, the simulacro fixture and the diagnostic/recipe.
- [ ] 5.7 OpenSpec: confirm the 18 delta specs (including `workspace-entrypoint`) are complete; archive step later syncs them into `openspec/specs/`. Verify archived artifacts with `diff` + `wc -l` (haiku archive truncation risk).
- [ ] 5.8 Gates: `node scripts/verify.js --release`, `npm run check:integrity check:specs check:versions`, `npm test`. COMMIT U5.

## Release (after merge to `main` with a merge commit; see nn-dev-release skill)

- [ ] R.1 Cut `innfo-mcp-v` (core next minor, 0.25 -> 0.26, pre-1.0 breaking); versions are derived (`sync-versions.mjs`), not hand-edited.
- [ ] R.2 Cut `blueprints-v` and any `templates-v*` re-pin (editing a template without a new tag turns main red on verify and skips the Pages deploy). BEFORE this, innfo-mcp must be live: older engines cannot compose `concept:: *`.
- [ ] R.3 Cut `innfo-console-v` (new CDN file, shell pins updated).
- [ ] R.4 Cut `skills-v`, raising `mcp.min_version` (now `0.12.0`) in `manifest/source.yaml` to the new innfo-mcp release; run `check:integrity`.
- [ ] R.5 Release note: one-time invalidation of `base_hash` preconditions, pending changesets and review ledgers (D7); `base` bluepriNNt removed.

## Task counts

S1: 21 | S2: 18 | S3: 15 | S4: 7 | S5: 8 | Release: 5 | Total: 74
