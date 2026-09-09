# Verify Report: Knowledge-Unit URI

Verified 2026-09-08 on `dev` against `specs/`, `design.md`, `tasks.md`. All evidence
from fresh runs unless noted.

## Requirement coverage

| Spec requirement | Evidence |
|---|---|
| Pointer grammar (`@`, `&`, `%`-escapes, rejections) | `sourceRef.unit.spec.ts` grammar matrix (32 tests green) |
| Level capture + concept-aware `--` | `slugifyUnitHeading` cases; canonical `##nn-person--dr-egon-spengler` |
| Normalization (NFC, non-Latin kept, `_` in names, case-sensitive row-ids) | unit spec + parity 15/15 JS mirror + full JS suite 292/292 |
| `--` preservation with pinned-collapse intact | `a--b` stable, `a --- b`→`a-b`, `Q3 — año` cases green |
| Resolution 0..1 (section/field/row/cell/matrix-cell) | Resolver matrix over fixtures green |
| Nearest-section ownership | Query + validator + resolver share `sectionOwnLines`; spec scenarios added at archive sync |
| CSV key convention (first column, dup/empty errors) | `KU_DUPLICATE_KEY` / `KU_EMPTY_KEY` tests green |
| Validator diagnostics + severities + codes | `workspaceSources.test.ts` 14 tests (incl. dual-accept, degradation) |
| Legacy dual-accept + deprecation | Old tests updated honestly; MCP legacy test asserts warning-only |
| MCP validate workspace-mode | `validate.spec.ts` CSV row test + `validate-workspace-sources.test.ts` update |
| Editor (pill/modal/deep-link) | Pill 21, modal 6, hash-sync 3, e2e guard-redirect 1/1 |
| Release 0.5.0 + square | `checkVersionSquare` → `{"ok":true,"version":"0.5.0"}` |

## Suite totals (fresh)

- innfo-core: 42 files, **533 passed**, 1 skipped (pre-existing skip)
- innfo-mcp: 24 files, **213 passed**
- innfo-editor (vitest): 90 files, **648 passed**, 2 skipped, **1 failed — NOT this change** (see below)
- trannsform node suite: **292 passed**; parity 15/15; Playwright `unit-deep-links`: 1/1
- `tsc` + `vue-tsc`: clean. ESLint: 0 errors (only pre-existing warnings).

## Known exceptions (pre-existing or concurrent, none from this change)

1. `tests/unit/shipped-template-versions.test.ts` fails: sibling's untracked
   `iNNfo/specs/templates/metrics/` is unregistered. Not touched (their in-flight work).
2. MCP package coverage below gates (~87% lines) → backlog #17 (lowest files untouched here).
3. Stable-manifest business V_0-2-3/V_0-2-2 mismatch committed on dev → needs its owner.
4. `package-lock.json` stale at 0.2.4 (pre-existing; untouched).
5. Root-level `vitest run` from `iNNfo/` is not a supported runner (ignores per-package
   configs; Playwright e2e mis-collected). Canonical runner is per-package (`npm --prefix iNNfo test`).

## Verdict

**PASS WITH NOTED EXCEPTIONS** — every requirement of this change is implemented and
proven green; the only reds in the tree belong to concurrent/pre-existing work listed above.
