# Task 2.10 — bare `V_0-1-0` source-literal audit

Audit-only (per tasks.md 2.10 + design D3). **Default verdict: KEEP.** No file in this
list is edited by PR 2 beyond what design.md already promoted from *audit* to *edit*
(the three `${SAMPLE_BASE}` starter-sample URL files — done in task 2.8). Behavioural
`V_0-1-0` defaults inside `packages/innfo-core` and `packages/innfo-mcp` are explicitly
**out of scope** ("no `packages/innfo-core` or `packages/innfo-mcp` behaviour changes",
design Technical Approach). Where a literal is a genuine "current default" assumption
that a stricter change would fix, it is KEEP-for-PR-2 + **FOLLOW-UP** flag.

Scan command:
`rg -n "V_0-1-0" packages/innfo-core/src packages/innfo-mcp/src apps/innfo-editor/src -g '!*.test.ts' -g '!*.spec.ts'`

## packages/innfo-core (7 files)

| # | File:line | Literal context | Nature | Verdict |
|---|---|---|---|---|
| 1 | `src/schema.ts:5` | `"Root primitives of the Metaplantilla Nivel 1 (V_0-1-0)."` | Definitional comment — records which spec version introduced the L1 primitive set | **KEEP** (historical) |
| 2 | `src/helpers.ts:18` | JSDoc `` `Ghostbusters_V_0-1-0_business_NN.md` → `0-1-0` `` | Illustrative example of version extraction | **KEEP** (example) |
| 3 | `src/types.ts:47` | `"Values array (V_0-1-0+)."` | Documents since-version of a field | **KEEP** (historical) |
| 4 | `src/validator/content.ts:144` | error msg `"model_version must match V_x-y-z (e.g. V_0-1-0)"` | Format-shape example in a diagnostic | **KEEP** (example) |
| 5 | `src/validator/model.ts:292` | comment `"real V_0-1-0 fixtures use matrix ..."` | Refers to committed test fixtures | **KEEP** (historical) |
| 6 | `src/parser/sections.ts:5` | `"Unified syntax (Metaplantilla Nivel 1, V_0-1-0)."` | Definitional comment | **KEEP** (historical) |
| 7 | `src/parser/serializer.ts:28` | `lines.push(\`spec_version: "${fm.spec_version \|\| 'V_0-1-0'}"\`)` | Behavioural fallback: a model serialized without `spec_version` gets `V_0-1-0` | **KEEP** for PR 2 (engine behaviour out of scope). **FOLLOW-UP**: this fallback should track `DEFAULT_INNFO_VERSION` or be dropped once every model carries an explicit `spec_version`. |

## packages/innfo-mcp (5 files)

| # | File:line | Literal context | Nature | Verdict |
|---|---|---|---|---|
| 8 | `src/server.ts:69,209,211` | tool input-schema `description` strings — `e.g. Ghostbusters_V_0-1-0_business`, `arenzano_V_0-1-0_cogNNitive`, `cogNNitive_V_0-1-0` | Illustrative stem/name examples | **KEEP** (example) |
| 9 | `src/server.ts:213` | `"Initial version of the model (e.g. V_0-1-0, defaults to V_0-1-0)"` | Doc string mirroring the `create_model` code default (#10) | **KEEP**; tied to **FOLLOW-UP** #10 — update together |
| 10 | `src/tools/mutate.ts:849,853,854` | `const modelVersion = args.model_version \|\| 'V_0-1-0'`; generated FM `spec_version: "V_0-1-0"` + `spec_url: .../iNNfo_V_0-1-0_NN.md` | **Genuine current-default assumption** — `create_model` scaffolds NEW model files pinned to the now-`Deprecated` L1 spec | **KEEP** for PR 2 (MCP behaviour out of scope). **FOLLOW-UP — highest priority**: point `create_model` at `iNNfo_V_0-2-0_NN.md` (+ its own `DEFAULT_INNFO_VERSION` equivalent). |
| 11 | `src/tools/list-read.ts:58-59` | JSDoc filename-stem example | Illustrative | **KEEP** (example) |
| 12 | `src/tools/spec.ts:30,50,51` | JSDoc stem→file resolution examples | Illustrative | **KEEP** (example) |
| 13 | `src/tools/spec.ts:267` | `let version = 'V_0-1-0'` then overwritten from `fm.version`/`fm.spec_version` | Defensive fallback for a discovered spec file with no version frontmatter — not a "current default" claim | **KEEP** (defensive) |
| 14 | `src/tools/resolver-node.ts:91` | JSDoc comment example `business_V_0-1-0_NN.md` | Illustrative | **KEEP** (example) |

## apps/innfo-editor (source; excludes files already edited by PR 1/PR 2 and `src/ai-guide/procedure_NN.md` which is Phase 3 task 3.3)

| # | File:line | Literal context | Nature | Verdict |
|---|---|---|---|---|
| 15 | `src/config/samples.ts:32,35` | `analysis: 'V_0-1-0'`, `'business-model': 'V_0-1-0'` | **Correct** — these two slugs genuinely ship `template_version V_0-1-0` (R-SV-03). Added by task 2.4. | **KEEP** (accurate) |
| 16 | `src/utils/version.ts:6,33` | `V_MAJOR-MINOR-PATCH (e.g. V_0-1-0)` and `` e.g. `V_0-1-0` `` | Format-shape examples (design D3 explicitly says keep) | **KEEP** (example) |
| 17 | `src/services/SpecResolverService.ts:90` | JSDoc `e.g. business_V_0-1-0` | Illustrative | **KEEP** (example) |
| 18 | `src/composables/useTemplateVersionNotice.ts:28` | JSDoc `e.g. "business_V_0-1-0"` | Illustrative | **KEEP** (example) |
| 19 | `src/views/HomeView.vue:566` | `placeholder="https://example.com/CodeReviewProcess_V_0-1-0_procedures_NN.md"` | Input `placeholder` — a dummy example URL on `example.com`, not a real sample ref | **KEEP** (example; outside D3 line scope) |
| 20 | `src/views/StandaloneProcedureView.vue:71,72,75,76,77` | `canonicalSampleMarkdown` embedded demo doc — `specification_version`, `specification_url`, `parent_spec.name: "procedures_V_0-1-0"`, `parent_spec.url`, `model_version: "V_0-1-0"` | **Genuine current-default assumption** — hardcoded demo pins to the `Deprecated` L1 spec and the older procedures template | **KEEP** for PR 2 (not in design's File-Changes scope — design promoted only the 3 `${SAMPLE_BASE}`-URL files). **FOLLOW-UP**: bump this embedded demo to `V_0-2-0` (spec + `procedures_V_0-2-0` + refreshed sample). |
| 21 | `src/components/layout/SetupWizard.vue:215` | `model_version: 'V_0-1-0'` in the `blank`-template scaffold frontmatter | New document's own **initial** version — legitimate starting point, not a spec pin | **KEEP** (correct semantics) |
| 22 | `src/components/layout/SetupWizard.vue:217` | `template: { name: 'business', version: 'V_0-1-0' }` in the same scaffold | Current-default assumption — pins the scaffolded model's parent template to `business V_0-1-0` though `business` now ships `V_0-2-0` | **KEEP** for PR 2 (out of design File-Changes scope). **FOLLOW-UP**: raise to `V_0-2-0` (consider deriving from `SHIPPED_TEMPLATE_VERSIONS`). |
| 23 | `src/components/editor/FilePreviewModal.vue:181` | UI string `"Trazabilidad verificada con especificación iNNfo V_0-1-0"` | User-facing claim of the "current" spec version, hardcoded | **KEEP** for PR 2 (out of design File-Changes scope; component not otherwise touched). **FOLLOW-UP**: render `DEFAULT_INNFO_VERSION` instead of a literal. |

## Summary

- **Total source hits reviewed**: 23 sites across 20 files (7 innfo-core, 7 innfo-mcp, 6 innfo-editor — excluding PR 1/PR 2 edited files and the Phase 3 `ai-guide/procedure_NN.md`).
- **KEEP (illustrative / historical / definitional / defensive / semantically correct)**: 18 sites.
- **5 flagged current-default assumptions** — 4 FIXED post-verify (Phase 2b), 1 deferred:

| Site | Verdict |
|---|---|
| `innfo-mcp/tools/mutate.ts:864-865` (`create_model` frontmatter) + `server.ts:213` doc | ✅ **FIXED** — `spec_version` / `spec_url` → `V_0-2-0` / `iNNfo_V_0-2-0_NN.md`. TDD: `test/mutate-repair.test.ts` ×2 + `test/includes-and-scaffold.test.ts` ×1 expectations updated RED→GREEN. mcp 130/130. `model_version` default `V_0-1-0` kept (a new model legitimately starts at V_0-1-0). |
| `innfo-editor/views/StandaloneProcedureView.vue:71-77` (embedded demo) | ✅ **FIXED** — `specification_version` / `_url` / `parent_spec` / `model_version` → V_0-2-0 + `procedures_V_0-2-0`. Editor suite still at the pre-existing 7-fail baseline. |
| `innfo-editor/components/layout/SetupWizard.vue:210-214` (blank scaffold) | ✅ **FIXED** — `spec_version: 'V_0-1-5'` → `'V_0-2-0'`, `template.version: 'V_0-1-0'` → `'V_0-2-0'`. |
| `innfo-editor/components/editor/FilePreviewModal.vue:181` (UI copy) | ✅ **FIXED** — literal `iNNfo V_0-1-0` → `iNNfo V_0-2-0`. |
| `innfo-core/parser/serializer.ts:28` — `fm.spec_version \|\| 'V_0-1-0'` serialize fallback | ⏳ **DEFERRED** — engine behaviour, explicitly out of this change's design scope, and directly in the blast zone of the 7 pre-existing `recursiveSerializer` / golden round-trip failures. Own follow-up: make it track `DEFAULT_INNFO_VERSION` (or drop it once every model carries an explicit `spec_version`), with its own golden regen review. |
