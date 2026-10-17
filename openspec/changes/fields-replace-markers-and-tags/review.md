# Review: fields-replace-markers-and-tags

Reviewer: fresh-context adversarial review, 2026-10-17. Code read at `5bc3564f` (planning on top of `3afaa90e`), plus the unmerged sibling branches `session/ku-lifecycle-fixes` (`769e02f0`) and `session/global-console-filter` (`f9260520`). Nothing implemented, no planning artifact edited.

## Verdict

**Ready after fixes.** The decisions (D1-D13) are coherent and the design is mostly faithful to them. Four defects would make `sdd-apply` produce wrong behaviour or a wrong living spec if applied literally (C1-C4). None of them reopens a maintainer decision. One challenge to a design choice (not to a decision) is labelled as such.

Verified correct (no action): the select array bug (`metaschema.ts:113-122` does `String(rawVal)`, so `[a, b]` is checked as the string `"a,b"`); the hash input (`element-hash.ts:39-45` hashes `{concept, description, fields, markers, name}`, and tags live outside `fields`, so today they are not hashed); `tags::` interception (`parser/sections.ts:234-249`); `WIDGET_CONFIG_KEYS` drift (`metaschema.ts:131-135` has `cycle: ['order']` and no `unit`, while visual-catalog ships `unit` and `multi`); `item-markers` handling in `review.js:25-37`.

## Findings

### CRITICAL

**C1. `*` expansion at depth 0 leaks the domain Fields of included bluepriNNts across the whole composite.**
- Evidence: `iNNfo/specs/bluepriNNts/business/spec_NN.md:10-20` includes `business-model`, `analysis`, `organization`, `projects` and `metrics`. `design.md:19` (DQ5) expands `*` once, at depth 0, over "every Concept Definition of the effective schema". `proposal.md:42-43` (A2) gives `organization`/`procedures` a `complexity` Field and `projects` a `health` Field, both with `concept:: *`.
- Failure: in a `business` document, every `analysis` Risk, `metrics` Metric and `business-model` concept gains `complexity` (scale 0-100) and `health` (a closed `[nominal, warning, critical]` select). They show up in facets, editors and the guide. The closed `health` vocabulary is enforced on concepts that never asked for it. Removing an included bluepriNNt changes the Fields on unrelated concepts.
- Fix (design choice, not a decision): scope a `*` to the concepts of the bluepriNNt that declares it, plus the ones it includes. Expand it in that bluepriNNt's own resolution, and let only the root's `*` reach every concept of the composite. The spec scenario "Star reaches included concepts" (`specs/field-value-model/spec.md:18-21`) still holds, because it is the root's `*`. Add the scenario "an included bluepriNNt's `*` does not reach sibling includes". The shared `tags` Field is unaffected: it dedupes either way. The alternative is to write A2 Fields with explicit concept lists, which leaves a trap for every future `*`.

**C2. The `changeset-apply-engine` delta is written against living text that `ku-lifecycle-fixes` has already rewritten.**
- Evidence: `specs/changeset-apply-engine/spec.md:5-12` makes `bump_version` and `freeze_slugs` direct maintenance ops ("Maintenance operation writes directly ... no changeset is written"). On `session/ku-lifecycle-fixes`, `openspec/specs/changeset-apply-engine/spec.md:339-347` says `freeze_slugs`/`bump_version` are changeset `ChangeOp`s on Level-3 models, `generate_index` is the only direct maintenance op, and schema ops on Level-3 fail `SCHEMA_OP_ON_LEVEL3`.
- Failure: archiving this change would overwrite the lifecycle requirement and bring back direct writes for Level-3 bumps. `sdd-apply` working from the delta would implement the old contract against new code.
- Fix: after `ku-lifecycle-fixes` merges, rebase the planning onto it and rewrite the MODIFIED requirement from the new text. Change only the `set_marker` removal and the two new ops. Recheck `mutation-level-gating` the same way. Task 1.17's classification partition must include `freeze_slugs`/`bump_version` as ChangeOps.

**C3. The plan treats the frozen `cogNNitive` and `workspace` bluepriNNts as ordinary L2s, and the `base-composite-template` delta contradicts the code.**
- Evidence: `manifest/source.yaml:138-150` declares `frozen_blueprints: [cogNNitive, base, workspace]`. `scripts/blueprint-catalog.mjs:47` has `FROZEN_NAMES = ['cogNNitive', 'base', 'workspace']`. `cogNNitive/spec_NN.md:2-7` is `spec_version V_0-2-1` (parent `iNNfo_V_0-2-1`, `template_version`), and `workspace_spec_NN.md:2-7` is `V_0-2-2`. The delta `specs/base-composite-template/spec.md:26` instead names `scripts/template-catalog.mjs` (this file does not exist), sets `FROZEN_NAMES = ['cogNNitive']`, uses `frozen_templates:`/`catalog.templates` (the real names are `frozen_blueprints`/`blueprints`), and keeps "Frozen template files MUST remain byte-identical", while tasks 2.6 and 2.9 edit those same frozen files. Task 2.16 repeats the wrong path and array.
- Failure: applied literally, the delta drops `workspace` from the frozen partition, which changes the catalog and starts upgrade notices for it. Read strictly, it forbids the edit that 2.6/2.9 need. Without that edit, `MARKERS_REMOVED` fires on the parent of every domain's lineage record. The design's "minor bump and re-parent to 0-5-0" (`design.md:81`) also hides a jump from L1 0-2-x, not from 0-3-0.
- Fix: rewrite the delta against `blueprint-catalog.mjs` and `frozen_blueprints` (keep `workspace`, drop only `base`). State that "byte-identical" applies to the `_V_x-y-z_` files (`cogNNitive_V_0-2-1_NN.md`, `workspace_V_0-2-2_NN.md`), not to the live `spec_NN.md`. Write tasks 2.6/2.9 as frozen-blueprint edits: `template_version` bump, `FROZEN_NAMES` path. See question Q1.

**C4. The new ops are missing from the `changes` bluepriNNt's closed `op` vocabulary.**
- Evidence: `changes/spec_NN.md` (embedded at `schema/canonical-registry.ts:44`) declares `op` as `type:: select` with `options:: [update_field, add_element, remove_element, rename_element, rename_concept, update_matrix_cell, comment, add_model]`. Tasks 1.16/1.17 add `update_concept_field` and `remove_matrix` to `ChangeOp` only.
- Failure: every changeset that uses a new op, including the `MARKERS_REMOVED` recipe changeset (spec "A full remediation is expressible as one changeset"), fails Level-3 validation with `Invalid value "update_concept_field" for "op"`. The recipe's acceptance test (5.4) would catch it only if it validates the changeset document as well as the target.
- Fix: add a task to S1 that edits `changes/spec_NN.md` `op` options (and the prose list), bumps `blueprint_version`, regenerates the registry and catalog, and registers the version. Coordinate the order with `ku-lifecycle-fixes`, which touches the same file (`changes/spec_NN.md | 30 +-`).

### WARNING

**W1. The L1 `iNNfo_V_0-5-0` is never registered in the canonical registry.** `scripts/generate-canonical-registry.mjs:39` maps `INNFO_SPEC_CONTENT` to `iNNfo_V_0-3-0_NN.md` only, and the `innfo` aliases (`canonical-registry.ts:295-309`) cover 0-2-x and 0-3-0. No task adds 0-5-0, `lineage/record.ts:19` still hardcodes the 0-3-0 URL, and the serializer comment (`parser/serializer.ts:174`) is untouched. Failure: L2s re-parented in S2 resolve their L1 remotely, against a URL that does not exist before release, or against the 0-3-0 metaschema, which has no `multiple`/`widget`/`number`. Fix: a task in 1.19/2.1 that adds the 0-5-0 slot and aliases, and an offline-resolution test.

**W2. Which L2s get the shared `tags` Field is ambiguous, and three are untasked.** The spec says "every content bluepriNNt except `sidecar`" (`field-value-model/spec.md:230`), and the design says "every one except `sidecar`" (`design.md:81`). Tasks 2.3-2.9 never mention `changes`, `video-script`, `design-presets` or `workspace`'s catalog role. The catalogue test (2.2) will then fail, or someone will silently decide. Fix: list the L2s explicitly in the spec table, and say whether catalog/record bluepriNNts (`changes`, `procedures`, `sources`, `artifacts`) count as "content".

**W3. Concept-level `base_hash` is undefined.** `changeset-apply-engine/spec.md:38` says `update_concept_field` and `remove_matrix` "participate in ... the `base_hash` precondition like other content ops". `base_hash` is element-scoped only (`changeset/conflicts.ts:176-180`), and concepts and matrices have no hash. Fix: specify the precondition (for example `from` equals the current concept value for `update_concept_field`, none for `remove_matrix`), or drop the sentence.

**W4. The hash moves twice, not once, and S2 leaves fixtures stale.** S2 removes `item-markers` matrices and converts flags in samples and testlab (tasks 2.13-2.15), so those elements' `markers` become `{}` and their hash changes in S2. S3 then moves `tags` into `fields` and changes it again. Task 2.15 defers regeneration to S3, which contradicts "main stays green after each" (`tasks.md:32`) if any suite compares committed `domaiNN_console.html` or ledger hashes. Fix: regenerate testlab artifacts in S2 as well, or merge U2b and U3 into one green point.

**W5. The concept-level parse rule is stricter than today's, in a silent direction.** Today a concept-level `tags::` is accepted anywhere before the first element (`parser/sections.ts:245-249`), and element properties anywhere in the element body (`:225-243`). The new rule stops at the first non-property line. A `tags::` written after concept prose then becomes prose with no diagnostic, and that tag disappears from inheritance. Task 1.12 only checks the opposite direction (prose swallowed). Fix: the corpus scan must also assert that no existing concept-level `tags::` moves into `content`, and `CONCEPT_FIELD_AFTER_PROSE` (WARNING) should be emitted for a `key:: value` line found later in the concept prologue.

**W6. `update_concept_text` vs concept-level values.** `update_concept_text` is an existing ChangeOp (`changeset/types.ts:14`). Nothing says whether it rewrites the new property block or preserves it. Fix: one requirement and a test stating that concept text excludes the concept-field block, and that `update_concept_text` never drops it.

**W7. Living specs that mention markers have no delta.** The proposal lists `skill-shared-rules`, `legacy-quarantine` and `citation-parser-resolver` as modified (`proposal.md:82`), and their living specs mention markers or tags (`rg -ci` gives 2, 1 and 1). No delta exists under `specs/`, so archive leaves stale text. Fix: add the three deltas, or remove them from Capabilities with a reason.

**W8. Write-once historical samples and `validation-baseline.json`.** `business/samples/Ghostbusters_V_0-1-0|0-2-0|0-2-1_business_NN.md` carry `item-markers` and cannot be edited. The convention (`openspec/changes/2026-10-13-DEPENDENCIES.md:110`) records write-once failures in `iNNfo/validation-baseline.json`. Task 2.16 only removes `base` entries. Fix: in S3, a task to add `MARKERS_REMOVED` baseline entries for every write-once sample and spec that now fails (or to state that they are out of the validated corpus). `base/samples/` also holds `workspace_NN.md` and `Ghostbusters_cogNNitive_NN.md` (referenced by `scripts/lib/nn-name-invariant-guard.test.js:85` and the baseline), and task 2.16 names only the `_V_0-1-0_base` sample.

**W9. In-flight `global-console-filter` rewrites the same filter code.** `session/global-console-filter` changes `innfo-runtime.js` (+210: global omnibar, a dynamic fields dropdown, quoted operator values in the query parser) and regenerates the binary `innfo-console.bundle.js` and `domaiNN_console.html`. Tasks 4.2/4.6 rewrite the same filter grammar and facet menu, and the proposal's conflict list does not mention it. Fix: land it first, then rebase S4 and build `field:a|b` on its parser (quoted values may already cover `|`).

**W10. Remediation for a custom L2 has no operation.** Task 1.1's open question has an answer in the code: changesets are Level-3 documents, and Level-2 edits are direct schema ops (`add_concept`, `add_field`). No op removes a Marker Definition section. A custom L2 can therefore only be fixed by a consented direct edit (recipe step 4), and its dependent L3s stay blocked until then. Fix: close 1.1 now, state this in the recipe, and keep 1.1 as a verification task only.

**W11. The test-trap gotchas are missing from tasks.** `tasks.md:6-14` omits two traps that the badges design lists: the shared fake-indexeddb, and happy-dom letting `javascript:` through. Task 4.3 asserts "tag text is inert" and needs `// @vitest-environment jsdom`. Fix: add both gotchas, and the pragma to 4.3/4.5.

### SUGGESTION

**S1. Typos in an open vocabulary.** `tags:: [pricng]` silently creates a new facet value. `levenshteinDistance` already exists (`sourceRef.ts:268`). A WARNING `TAG_NEAR_DUPLICATE` (distance 1 to an existing value in the domaiNN) costs about 20 lines and keeps open vocabularies honest.

**S2. An unowned `facet token model`.** The design promises badges `{field, values[], mode}` (`design.md:107`), but no requirement or task produces it. Either add it to `innfo-console-runtime` "Field Facet Matching" with a task, or drop it from the contract and let badges call the filter-string API.

**S3. Task-file path fixes.** Task 1.17 cites `changeset/apply.ts`, which does not exist (the apply logic lives in `mutate.ts` and `innfo-mcp/src/tools/apply-change.ts`). Task 2.16 cites `scripts/template-catalog.mjs` (see C3). Scenario `changeset-apply-engine/spec.md:16` uses `set_field`, which is not a ChangeOp.

**S4. The `widget_config` table "covers Field and Matrix alike".** Make it explicit that the type-compatibility rule (`set` requires `select` + `multiple`) applies to Fields only. Matrices have no `type`, and `repository` ships `widget:: set` on matrices (`repository/spec_NN.md:139,147`).

**S5. Simplify: `MULTI_VALUE_UNBRACKETED`.** Today's `parseTagList` accepts `a, b`. If no corpus file uses an unbracketed list for a `multiple` Field, the warning has no data behind it. Check with the corpus scan, and drop it if there are zero hits (YAGNI).

## Improvement suggestions (not defects)

- Merge U3a and U3b: their split exists only to separate the hash change from the deletion, and both regenerate the same fixtures.
- After C1, add a composite golden test in S1 that resolves `business` and snapshots the Fields of each concept. It is the cheapest guard against composition surprises.
- Run the recipe acceptance test (5.4) against a copy of the frozen simulacro fixture plus validation of the changeset document, not only of the result (it would have caught C4).

## Questions for the maintainer

1. **Frozen `cogNNitive`/`workspace`:** convert them in place (edit the live `spec_NN.md`, bump `template_version`, keep them in `frozen_blueprints`), or treat them like `base` (they are frozen precisely because they are legacy)? Today every domain's lineage record has `cogNNitive` as parent, so deleting it is not free.
2. **Removing an inherited value:** union is the rule for multi-valued Fields, so an element cannot drop a concept-level tag, and a single-valued inherited value cannot be "unset" (only overridden). Accept this limitation explicitly, or add an exclusion form (for example `tags:: [-core]`)?
3. **`*` scope (C1):** do you accept scoping an included bluepriNNt's `*` to its own concepts, keeping composite-wide reach for the root's `*` only?

## Maintainer answers (2026-10-17)

1. Q1 → (a): convert `cogNNitive` and `workspace` in place: edit the live `spec_NN.md`, bump `template_version`, keep them in `frozen_blueprints`. "Byte-identical" applies only to the `_V_x-y-z_` files.
2. Q2 → (a): no exclusion syntax. An element cannot drop an inherited multi-valued value or clear an inherited single value; documented in the spec and pinned by a scenario.
3. Q3 → (a): a `*` reaches the concepts of its declaring bluepriNNt and that bluepriNNt's includes; only the root's `*` reaches the whole composite.

## Applied fixes (2026-10-17)

All CRITICAL and WARNING findings are applied to `proposal.md`, `design.md`, `tasks.md` and the specs `field-value-model`, `template-includes-collision-resolution`, `changeset-apply-engine` (rewritten against the `ku-lifecycle-fixes` text), `base-composite-template` and `markers-removed-diagnostic`. SUGGESTIONs are not applied.

- **Correction to W7:** the finding was wrong. The "marker" hits in `skill-shared-rules` (a marker-delimited block), `legacy-quarantine` (quarantine markers) and `citation-parser-resolver` (the JSON array-end marker) are unrelated senses. The fix is to remove the three from the proposal's Capabilities, not to write deltas.
- **W2 default, open to veto:** the `tags` list follows the existing rule literally ("every L2 except `sidecar`") and now names the L2s explicitly, including `changes`, `video-script`, `design-presets` and the catalog bluepriNNts.
- `mutation-level-gating` needed no change: `ku-lifecycle-fixes` does not touch it.
