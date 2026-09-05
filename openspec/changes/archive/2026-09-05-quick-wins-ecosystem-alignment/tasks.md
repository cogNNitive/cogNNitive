# Implementation Tasks: Quick Wins — Ecosystem Alignment

Task breakdown for `quick-wins-ecosystem-alignment` (F1–F4, M1, P1).

---

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

* **Estimated changed lines**: ~150 (F3 verify-only, no diff)
* **Total files affected**: 8 modified, 1 new (`validate.spec.ts`)

---

## Phase 1: nn-innfo — SKILL.md Doc Fixes (F1–F3)

- [x] 1.1 **F1**: `actioNN/skills/nn-innfo/SKILL.md` L149 `budget (number)`→`(string)`; L150 `price (number)`→`(string)`; L356 type list → `(string, select, reference, markdown_inline, markdown_file, image, file, video, audio, model)`.
- [x] 1.2 **F2**: rewrite L287 rule 5 — `sources::` ALWAYS bracketed `[...]` even for a single value (per spec L1 L378); single `type:: reference` values always use WikiLink per §8d / Core Rule 12 (L597); examples updated to `sources:: [sources/nn/...]`.
- [x] 1.3 **F3 (verify-only)**: confirm L596 Core Rule 11 + "Generación del Index Block" (L605–655) list Concepts only, never Elements; no edit.
- [x] 1.4 **Verify F1–F3**: bump frontmatter `version` V_0-1-2→V_0-1-3; grep `number`/`date` gone from vocabulary; L287 consistent with L358/L597.

## Phase 2: innfo-mcp — F4 Version from package.json

- [x] 2.1 **RED**: `iNNfo/packages/innfo-mcp/src/server.spec.ts` — assert server version equals `version` from `../package.json` (0.2.4). `npm --prefix iNNfo run test` → fail (hardcoded 0.2.1).
- [x] 2.2 **GREEN**: `src/server.ts` — `readFileSync(new URL('../package.json', import.meta.url))` (TS6059 fallback — tsconfig `rootDir: ./src` blocks the static JSON import); L65 `version: '0.2.1'` → `packageJson.version`.
- [x] 2.3 **Verify**: `npm --prefix iNNfo run test` + `typecheck` + `lint` + `format:check`.

## Phase 3: innfo-mcp — M1 Scope `specs/` Exclusion

- [x] 3.1 **RED**: `src/tools/spec.spec.ts` — default `findModelFile(root, specs-only-id)` → null; `{ includeSpecs: true }` → path; write `specs/business_V_0-2-1_NN.md`, assert NEW content resolves (no stale cache). Vitest → fail.
- [x] 3.2 **RED**: create `src/tools/validate.spec.ts` — `validate_template { id }` resolves template under `specs/` (L1 chain stubbed, fetch mocked per spec.spec.ts). Vitest → "Template file not found".
- [x] 3.3 **GREEN**: `spec.ts` `findModelFile`/`recursiveFindModel` accept `opts?: { includeSpecs?: boolean }` (default false); when true, drop `'specs'` from L151 skip set.
- [x] 3.4 **GREEN**: `validate.ts` `searchDirSync`/`syncFindSubmodel` accept same opts; `validateTemplate` passes `{ includeSpecs: true }` at L508/L618; other callers keep default skip.
- [x] 3.5 **Verify**: `npm --prefix iNNfo run test` + `typecheck` + `lint` + `format:check`; discovery tests green.

## Phase 4: nn-trannsform — P1 `source_format` Mapping

- [x] 4.1 **RED**: `actioNN/skills/nn-trannsform/test/unit/test-provenance.js` — `collectSources` on `.html`/`.srt` → `source_format:: md`; `.txt` → `txt`; `mapSourceFormat` in-set passthrough, unknown → `md`; existing `docx` assertion stays. `node test/run.js unit` → fail.
- [x] 4.2 **GREEN**: `scripts/lib/provenance-model.js` — `SOURCE_FORMAT_OPTIONS = ['txt','md','csv','json','docx','pdf','xlsx']` + `mapSourceFormat(ext)` (in-set → ext, else `md`); L106 `source_format: ext` → `mapSourceFormat(ext)`; export both. Also re-exported from `scripts/provenance.js` wrapper. No `EXT_LABELS` reuse (has html/srt/vtt).
- [x] 4.3 **Verify**: `node test/run.js unit`; full `node test/run.js`.

## Phase 5: Ecosystem Regression Gate

- [x] 5.1 **Full suites**: `npm --prefix iNNfo run test` (595 passed) + `lint` (0 errors) + `typecheck` + `format:check` (236 pre-existing drift, 0 new from this change); `node test/run.js` (148 passed).
- [x] 5.2 **Validation regression**: re-run workspace validation report — `number`/`date` gone from vocabulary, L287 consistent, `initialize` = 0.2.4, `source_format::` within options, no new errors.