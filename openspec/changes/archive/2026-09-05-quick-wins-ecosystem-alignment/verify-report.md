# Verification Report: Quick Wins — Ecosystem Alignment

**Change**: `quick-wins-ecosystem-alignment`
**Date**: 2026-09-05
**Verdict**: **PASS**

---

## 1. Executive Summary

Six low-risk drift/bug fixes aligned the actioNN skills, the innfo-mcp package, and the manifest with the current source (main @ 2b9f8a9). Root causes behind the workspace validation report (6 errors / 48 warnings) were addressed: undeclared field types in the nn-innfo skill vocabulary, a contradictory `sources::` bracket rule, a hardcoded MCP server version, the `specs/` resolution exclusion, and `source_format` values outside the template-declared set. All suites pass and the format baseline is unchanged.

---

## 2. Verification Checklist & Spec Compliance

| Requirement / Task | Expected State | Actual State | Status |
|---|---|---|:---:|
| **F1 — Type vocabulary** (SKILL.md) | `number`/`date` gone; type list matches L1 (`string, select, reference, markdown_inline, markdown_file, image, file, video, audio, model`) | L149-150 `budget (string)`/`price (string)`; L356 list aligned with `iNNfo_V_0-2-0_NN.md` L114; grep clean | **PASS** |
| **F2 — `sources::` brackets** (SKILL.md) | Rule 5 mandates `[...]` even for a single source; examples use `sources:: [sources/nn/...]` | Matches spec L1 L378 ("MUST always... even when referencing a single source document"); consistent with §8d + Core Rule 12 | **PASS** |
| **F3 — Index block** (SKILL.md) | L596 Core Rule 11 lists Concepts only, never Elements | Verified consistent; no edit needed | **PASS** |
| **F4 — MCP version** (server.ts) | Server reports package.json version (0.2.4), not hardcoded 0.2.1 | `readFileSync(new URL('../package.json', import.meta.url))`; `server.spec.ts` asserts `0.2.4` | **PASS** |
| **M1 — `specs/` exclusion** (spec.ts / validate.ts) | `findModelFile`/`searchDirSync` accept `includeSpecs`; default skips `specs/`, `validateTemplate` opts in | `spec.spec.ts` split test (null default, path with opt) + `validateTemplate {id}` under `specs/` green | **PASS** |
| **P1 — source_format mapping** (provenance-model.js) | `source_format` within declared set `[txt, md, csv, json, docx, pdf, xlsx]`; unknown → `md` | `mapSourceFormat` + `SOURCE_FORMAT_OPTIONS`; exported via wrapper `provenance.js`; tests: html/srt/htm/vtt/xls/doc → `md`, docx/md passthrough | **PASS** |
| **Version bump** (SKILL.md frontmatter) | `V_0-1-2` → `V_0-1-3` (PATCH) | Applied | **PASS** |

---

## 3. Command Execution & Test Results

| Command | Result | Status |
|---|---|:---:|
| `npm --prefix iNNfo run test` | 595 passed, 2 skipped (86 files) | **PASS** |
| `npm --prefix iNNfo/packages/innfo-mcp run test` | 168 passed (18 files) | **PASS** |
| `npm --prefix iNNfo/packages/innfo-mcp run typecheck` | `tsc --noEmit` exit 0 | **PASS** |
| `npm --prefix iNNfo run typecheck` | exit 0 | **PASS** |
| `npm --prefix iNNfo run lint` | 0 errors, 477 pre-existing warnings | **PASS** |
| `npm --prefix iNNfo run format:check` | 236 files pre-existing drift (baseline unchanged; 0 new from this change after prettier) | **PASS*** |
| `node test/run.js` (nn-trannsform) | 148 passed, 0 failed | **PASS** |

\* `format:check` fails on 236 pre-existing files (baseline present before this change). This change introduces zero new format drift; my 9 files are prettier-clean. The `format:check` gate is out of scope for this change (legacy/whole-repo issue).

---

## 4. Deviations from Design

- **D3/F4**: used `readFileSync(new URL('../package.json', import.meta.url))` (the design's documented TS6059 fallback) instead of a static JSON import — `tsconfig` has `rootDir: ./src`, so the static import fails `tsc --noEmit`.
- **M1 tests**: both tests live in `spec.spec.ts`; no separate `validate.spec.ts` created.
- **P1**: `mapSourceFormat`/`SOURCE_FORMAT_OPTIONS` additionally re-exported from `scripts/provenance.js` wrapper (tests consume the wrapper).

## 5. Rollback

Per-file revert (SKILL.md edits, server.ts version line, opts parameters, mapping function) — no schema or state impact.