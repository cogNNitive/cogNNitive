# Tasks: Document Fidelity & Provenance Integrity

Strict TDD is active (`openspec/config.yaml` → `strict_tdd: true`). Every
implementation step is preceded by a failing test.

Runner: `npm --prefix iNNfo run test` · Typecheck: `npm --prefix iNNfo run typecheck`
· Gates: `npm run check:integrity`, `npm run check:samples`
· Acceptance evidence: `node simulacro/run-all.mjs`

Work units are ordered by dependency. Unit 1 must land before Unit 5, because
the template edits in Unit 5 bump `template_version` and the generator must
already own the copies.

---

- [x] 1. Template version single source of truth <!-- id: 1 -->
  - [x] 1.1 RED: add `scripts/sync-template-versions.test.mjs` asserting the generator reads `iNNfo/specs/templates/*/spec_NN.md`, writes both copies, is idempotent, and that `--check` exits non-zero on drift <!-- id: 1.1 -->
  - [x] 1.2 GREEN: implement `scripts/sync-template-versions.mjs` following the `scripts/sync-samples.mjs` precedent (AD-8); keep the `workspace_spec` omission and its reason in the generator <!-- id: 1.2 -->
  - [x] 1.3 Regenerate `SHIPPED_TEMPLATE_VERSIONS` with a "generated — do not edit" header; confirm `business: V_0-2-5` <!-- id: 1.3 -->
  - [x] 1.4 Regenerate `manifest/source.yaml` versions (`workspace → V_0-4-0`, `business-model → V_0-2-3` — live spec_NN.md drifted further under a concurrent sibling session since the task was scoped; the generator reads it live so this is correct) and re-render `docs/use/manifest.md` <!-- id: 1.4 -->
  - [x] 1.5 Add `sync:versions` / `check:versions` npm scripts; wire `check:versions` into `scripts/check-integrity.js` with a message naming the slug, expected version and fix command <!-- id: 1.5 -->
  - [x] 1.6 Verify: `npm run check:integrity` passes (except a pre-existing, unrelated `template-catalog.mjs` drift caused by the concurrent sibling session's uncommitted `business-model` bump — out of this work unit's file scope); `npm --prefix iNNfo run test` green (666 passed) <!-- id: 1.6 -->

- [x] 2. Package distribution and verification coverage <!-- id: 2 -->
  - [x] 2.1 RED: add a Node-process smoke test that imports the built `dist/` of `innfo-core` outside Vitest's resolver and asserts the public API is present <!-- id: 2.1 -->
  - [x] 2.2 GREEN: move `innfo-core` to `moduleResolution: "NodeNext"`, add explicit `.js` / `/index.js` extensions to relative imports, and resolve the `types.ts` vs `types/` ambiguity (AD-9) <!-- id: 2.2 -->
  - [x] 2.3 Confirm `exports.browser` → `dist/browser.js` still resolves and the editor Vite build is unaffected <!-- id: 2.3 -->
  - [x] 2.4 Extend `npm run typecheck` to cover `innfo-mcp`; fix any type errors it surfaces <!-- id: 2.4 -->
  - [x] 2.5 Verify: typecheck, test, and the new smoke test all green <!-- id: 2.5 -->

- [x] 3. Model document fidelity <!-- id: 3 -->
  - [x] 3.1 RED: add `roundtrip-fidelity.test.ts` asserting byte-identity over every file in `_samples_nn/` and `iNNfo/specs/templates/*/samples/`, plus idempotency over the same corpus <!-- id: 3.1 -->
  - [x] 3.2 RED: add focused unit tests for matrix axis capture, section-order preservation, bracket-list preservation and description-indentation stripping <!-- id: 3.2 -->
  - [x] 3.3 GREEN: parse matrix header axis labels into `MatrixData.source` / `.target`; the `Row` / `Col` fallback was REMOVED rather than kept — it invented axis names on write that came back as real data on re-parse (see the amendment recorded in AD-4) <!-- id: 3.3 -->
  - [x] 3.4 GREEN: add `sectionOrder` to `ParsedModel`; populate in `parseModel`, honour in `serializeModel`, append unknown sections last (AD-2) <!-- id: 3.4 -->
  - [x] 3.5 GREEN: emit properties and description lines at column 0, and strip canonical indentation on read (AD-1, AD-3) <!-- id: 3.5 -->
  - [x] 3.6 GREEN: preserve the bracket form for list-valued properties, generalising `serializeCitationValue` <!-- id: 3.6 -->
  - [x] 3.7 GREEN: emit a single blank line between elements, matching the L1 spec example <!-- id: 3.7 -->
  - [x] 3.8 Golden snapshots needed NO regeneration: the only two failures (`roundtrip.models.golden.test.ts`) were the `Row` / `Col` placeholder defect above, fixed at the source rather than re-baselined <!-- id: 3.8 -->
  - [x] 3.9 Verify: full suite green (innfo-core 797, innfo-mcp 275, innfo-editor 657); typecheck green; `npm run check:samples` green; `node simulacro/run-all.mjs 03` → 5 passed / 0 failed <!-- id: 3.9 -->

- [x] 4. Citation provenance typing <!-- id: 4 -->
  - [x] 4.1 RED: test that a field declared `type:: markdown_file` and named `source` produces no `KU_*` diagnostic, and that a field declared `type:: citation` is validated regardless of its name <!-- id: 4.1 -->
  - [x] 4.2 RED: test that `serializeKnowledgeUnitRef` emits `@## Q4 Outlook`, not `@##q4-outlook`, and that the slug is still derived on read <!-- id: 4.2 -->
  - [x] 4.3 RED: test that a duplicated pointer in a citation list is removed on write, first occurrence winning <!-- id: 4.3 -->
  - [~] 4.4 PARTIAL: `citation` added to the parser's `FIELD_TYPES` / `FieldType` union. The L1 metaschema half is BLOCKED: `iNNfo/specs/iNNfo_V_0-2-1_NN.md` is a published, write-once spec file, so declaring the type there requires cutting a new L1 spec version (with manifest, parity and template repointing) — out of scope for this change, recorded in the backlog <!-- id: 4.4 -->
  - [x] 4.5 GREEN: give `validateWorkspaceSources` an optional schema resolver; resolve citation fields from it, falling back to `SOURCE_FIELD_NAMES` with a documented comment (AD-5) <!-- id: 4.5 -->
  - [x] 4.6 GREEN: emit human-readable unit text in `serializeKnowledgeUnitRef`; dedupe citation lists on write <!-- id: 4.6 -->
  - [x] 4.7 Verified: NO shipped template declares a provenance field, so nothing needed migrating. The only `## NN Field Definition: source` in the corpus is `documentation`'s, already `type:: markdown_file` — which is exactly what AD-5 says to leave alone, and is what fixes F-06. No `template_version` bump was required <!-- id: 4.7 -->
  - [x] 4.8 CLOSED — no host plumbing was needed. `recursiveParse` stashes the composed schema on each document root and `validateWorkspaceSources` walks up to read it. The editor already supplied `resolveTemplateSchema` (`modelStore.parseFromHandle`) and the MCP already built one via `buildTemplateSchemaResolverFromCache` (`validate.ts:270-274`). The only gap was the simulacro harness, fixed in `cbf1aa4` <!-- id: 4.8 -->
  - [x] 4.9 Verify: full suite green (805 / 275 / 657); `node simulacro/run-all.mjs 01` → 10 passed / 0 failed <!-- id: 4.9 -->

- [x] 5. Mutation schema conformance <!-- id: 5 -->
  - [x] 5.1 RED: test that `add_element` with an undeclared concept is rejected when a schema is supplied, leaves the model byte-identical, and suggests the nearest declared concept <!-- id: 5.1 -->
  - [x] 5.2 RED: test that `add_element` with no schema keeps its current permissive behaviour <!-- id: 5.2 -->
  - [x] 5.3 GREEN: implement the schema check in `addElement` with a Levenshtein-based suggestion (AD-6) <!-- id: 5.3 -->
  - [x] 5.4 Add the missing `update_field` unknown-concept test so both element ops are covered <!-- id: 5.4 -->
  - [x] 5.5 Verify: test suite green; `node simulacro/run-all.mjs 02` fully green <!-- id: 5.5 -->

- [x] 6. Cross-model element identity <!-- id: 6 -->
  - [x] 6.1 RED: test that the same element name in two models produces no rename-advice issue, and that an intra-document collision still does <!-- id: 6.1 -->
  - [x] 6.2 GREEN: stop emitting rename advice for the cross-model case in `IdentityRegistry`; optionally record an `info` note naming the qualified-reference form (AD-7) <!-- id: 6.2 -->
  - [x] 6.3 Verify: opening `_samples_nn` emits zero cross-model rename issues <!-- id: 6.3 -->

- [x] 7. Shipped sample workspace repair <!-- id: 7 -->
  - [x] 7.1 `tests/shipped-workspace.test.ts` opens `_samples_nn/` through `recursiveParse` with a warmed template cache (the same path the hosts use) and asserts Requirements 1, 2, 4 and 5. `info` notes are excluded from the error assertion — they are AD-7's deliberate cross-model identity notes. A guard test asserts the template cache is non-empty, so Requirement 2 cannot pass for the wrong reason <!-- id: 7.1 -->
  - [x] 7.2 Author the normalized primary sources under `_samples_nn/sources/nn/` the documentation model cites — at least one Markdown document and one CSV table <!-- id: 7.2 -->
  - [x] 7.3 Add `citation` fields to at least three sample models across different templates, including one CSV row pointer and one subunit pointer <!-- id: 7.3 -->
  - [x] 7.4 Slug collisions resolved with explicit `slug::` declarations (8 remained, not 16): `slugCollisions` is now empty. Resolved by declaring addresses rather than renaming, so the same person keeps appearing under the concepts that genuinely describe them <!-- id: 7.4 -->
  - [x] 7.5 Either produce `artifacts/workspace_hub.html` or remove the `## NN Artifacts` entry declaring it <!-- id: 7.5 -->
  - [x] 7.6 Run `npm run sync:samples`; confirm `npm run check:samples` passes <!-- id: 7.6 -->
  - [x] 7.7 S07 is 6/6 green. RESOLVED BY RENAMING in the sample (decision taken, not re-opened): Shareholders entries now name the stake (`Venkman Equity Stake`), the duplicated Stakeholders entries carry a role parenthetical, `Communication: Press Relations` and `Costs: Equipment Maintenance Spend` were renamed on the side no matrix references. The architecture question is recorded as an explicit non-goal in `openspec/backlog.md`. Superseded note:  The last failure is 8 `Duplicate element name` issues in `Ghostbusters_business_NN.md`: the same real-world entity appears under several concepts (`Winston Zeddemore` as Stakeholders/Person/Shareholders, `Public Relations` as Communication/Activities). Each one is DROPPED from the graph, so the shipped workspace silently loses 8 elements on load. Two ways out — rename them in the sample (a product naming decision on flagship demo content), or make intra-document identity key on the slug (an architecture change: `IdentityRegistry` derives qualified ids from the name, so it moves wikilink resolution). NEEDS A DECISION <!-- id: 7.7 -->

- [x] 8. Editor workspace flows <!-- id: 8 -->
  - [x] 8.1 Decouple "expand a model inline" from "enter Focused Model Mode" in `LeftSidebar.vue`; remove the dead `toggleModel()` call and shorten the 1.1s transition (F-12) <!-- id: 8.1 -->
  - [x] 8.2 Route the `webkitdirectory` fallback through `modelStore.parseFromHandle`'s pipeline, or document why it cannot be; remove the `null`-handle history entry that makes those workspaces unreopenable (F-13) <!-- id: 8.2 -->
  - [x] 8.3 Consolidate handle persistence onto `historyStore`; remove the write-only `IndexedDbWorkspaceRepository` handle slot and the uncalled `recoverHandle`, or wire `recoverHandle` into startup (F-14) <!-- id: 8.3 -->
  - [x] 8.4 Stop re-validating the whole workspace inside `renameElementNode`; validate the affected root only (F-15) <!-- id: 8.4 -->
  - [x] 8.5 Fix `ConsoleHubView.vue`'s "Open External" to resolve through the file handle (Blob URL) rather than a bare relative path (F-16) <!-- id: 8.5 -->
  - [x] 8.6 Replace the stale extension description at `ModelInfoPanel.vue:97` with extension-driven copy <!-- id: 8.6 -->
  - [x] 8.7 Remove the unused `useFileSystem.ts` composable, or adopt it in `HomeView.vue`'s directory walk <!-- id: 8.7 -->
  - [x] 8.8 Verify: editor tests and typecheck green <!-- id: 8.8 -->

- [x] 9. Spec and dead-code hygiene <!-- id: 9 -->
  - [x] 9.1 Update `openspec/specs/innfo-console-runtime/spec.md:43` so it no longer requires the deleted `business/assets/master.html` (F-10) <!-- id: 9.1 -->
  - [x] 9.2 Update the remaining live `master.html` references: `openspec/specs/template-package-structure/spec.md:13`, `docs/innfo/documentation/offline-consoles.md`, `iNNfo/specs/templates/business-model/spec_NN.md:541` <!-- id: 9.2 -->
  - [x] 9.3 Either register `reachability.ts`'s `pruneOrphanedSpecs` as an MCP tool or remove it; coordinate with `2026-09-13-mcp-coverage-debt`, which also touches it (F-17) <!-- id: 9.3 -->
  - [x] 9.4 Give `validateWorkspaceReferences` a named error when its required `WorkspaceIndex` argument is missing, instead of a raw `TypeError` <!-- id: 9.4 -->
  - [x] 9.5 Record the in-app source import affordance (F-18) and the `canonical-registry.ts` generation question in `openspec/backlog.md` as explicit non-goals of this change <!-- id: 9.5 -->

- [x] 10. Final verification <!-- id: 10 -->
  - [x] 10.1 `npm --prefix iNNfo run typecheck` <!-- id: 10.1 -->
  - [x] 10.2 `npm --prefix iNNfo run test` <!-- id: 10.2 -->
  - [x] 10.3 `npm run check:integrity` and `npm run check:samples` <!-- id: 10.3 -->
  - [x] 10.4 `node simulacro/run-all.mjs` — every scenario green except any explicitly recorded as a non-goal <!-- id: 10.4 -->
  - [x] 10.5 `verify-report.md` written: all gates green (typecheck; 1744 tests; check:integrity; check:samples; simulacro 51 passed / 0 failed / 7 observed), with the AD-4 amendment, the two out-of-scope defects found and fixed, and the three descoped items (L1 metaschema declaration, template migration that proved unnecessary, intra-document identity) each recorded with its reason <!-- id: 10.5 -->
