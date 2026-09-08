# Tasks: Knowledge-Unit URI

## Pre-flight / confirm before starting (open questions — do NOT silently resolve)

- [ ] **(a) Legacy `#slug` sunset timeline.** Spec dual-accepts with warning; REMOVAL version
  undecided (proposal Open Decision 1: accept-forever vs drop at 1.0). Confirm with maintainer
  before Slice 2 wires the warning copy (wording differs if removal is scheduled).
- [x] **(b) Matrix-cell strictness.** RESOLVED by spec: unknown row/column labels are `error`.
- [x] **(c) Row-id case-sensitivity.** RESOLVED by spec: exact-after-trim, case-sensitive.
- [x] **(d) Editor placement.** RESOLVED by proposal: Slice 3 of this change (not deferred out).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1350 total across slices (S1 ~450 · S2 ~380 · S3 ~320 · S4 ~200 incl. generated) |
| Repo 800-line budget (`iNNfo/AGENTS.md`) | Every slice is under it |
| 400-line budget risk | High on S1 |
| Chained PRs recommended | Yes |
| Suggested split | PR1 core → PR2 validator+MCP → PR3 editor → PR4 release |
| Delivery strategy | ask-on-risk (assumed — not supplied) |

### Suggested Work Units

| Unit | Goal | PR | Base / depends on | Notes |
|------|------|----|-------------------|-------|
| 1 | `innfo-core` pointer grammar + normalization + resolver + types | PR1 | dev / — | TDD core; fixtures from Ghostbusters sample + `metricas_q3.csv` COPIED to `tests/fixtures/` (never depend on `temp/`) |
| 2 | Validator diagnostics + dual-accept + MCP validate workspace-mode + skill docs + trannsform parity | PR2 | PR1 | parity JS mirror updated in same step |
| 3 | Editor pill/modal/deep-link param | PR3 | PR1 | behind existing `#Concept.Element` behavior, additive |
| 4 | Minor 0.5.0 release: versions, CDN bundle, manifest/catalog, docs regen, square green | PR4 | PR1, PR2 (, PR3) | single coordinated release with query change (0.4.0 shipped 2026-09-08 with an unrelated batch) |

Dependency graph: `PR1 ─► PR2 ─► PR4` and `PR1 ─► PR3 ─► PR4`.

## Slice 1 — `innfo-core` grammar + normalization + resolver + types

Depends on: pre-flight (a) confirmed for warning copy. Blocks: slices 2, 3. Est. ~450 lines.

- [x] 1.1 RED — `src/sourceRef.unit.spec.ts` (new file, co-located): grammar matrix —
  `@## Header`, `@# C`, `@### Deep`, `@104`, `@lucas`, `&field`, `&col`, matrix `&row&col`,
  `%26`-escaped names, missing-`@` → null, empty unit → null, absolute/URL/`../`/
  `sources/original/` → null. Fails (no parser).
- [x] 1.2 GREEN — `parseKnowledgeUnitRef` + `KnowledgeUnitRef` type in `sourceRef.ts`;
  split at FIRST `@`, subunits at `&`, percent-decode pre-match. Keep `parseSourceRef`
  untouched (dual entry points during transition).
- [x] 1.3 RED — normalization cases: NFC input equality (composed vs decomposed `é`),
  non-Latin kept (`さくら` non-empty), `_` preserved in names (`mrr_usd`),
  concept-aware `nn-person--dr-egon-spengler`, row-id case-sensitivity (`Lucas`≠`lucas`).
- [x] 1.4 GREEN — revise `slugifyHeading` (NFC→NFD-strip→keep `[\p{L}\p{N}]`), add
  `normalizeName` + concept-aware slug helper; level captured pre-slugify (`^(#{1,6})\s+`).
  Extract shared `nfc()`/`transliterate()` helpers with `parser/slug.ts` (`slugify` becomes
  a thin wrapper; `uniqueSlugify` API unchanged); `extractHeadings` gains additive
  `{concept?, element?}`.
- [x] 1.5 RED — resolver matrix over `tests/fixtures/` copies: Ghostbusters element/field/
  matrix-cell, `metricas_q3.csv@104` row, `@104&mrr_usd` → `78000`, unknown → null result.
- [x] 1.6 GREEN — `resolveUnit` (section/field/row/cell/matrix-cell) + extended `SourceRef`
  (`unit`, `subunits`) in `types.ts`/`sourceRef.ts`; NO new relationship origin (spec).
  Generalize `splitSourceFieldValue` → `splitBracketList` (quoted-comma safe) for field-list
  parsing; matrix cells reuse core's existing table-row parsing (`parser/markdown.ts`,
  `parser/sections.ts` — verify importability without template context first; local
  ~30-line reader only as fallback). New shared types live in `types.ts`/`sourceRef.ts`
  (check `recursiveParser/types.ts` first — no third types home).
- [x] 1.7 VERIFY — `npm --prefix iNNfo run test` (core scope), `run lint`, `run typecheck`;
  zero new prettier drift on touched files.
- [x] 1.8 GREEN — update downstream expectations pinned to the old slug (notably
  `agentModification.spec.ts:130-138` via `slugifyHeading(scope)`); existing
  transliteration cases (`vision-estrategica`) MUST stay green — any change there is a
  bug, not an update.

## Slice 2 — Validator + MCP + skill docs + trannsform parity

Depends on: slice 1. Blocks: slice 4. Est. ~380 lines.

- [x] 2.1 RED — `tests/workspaceSources.test.ts` additions: dangling MD/CSV file (error),
  unknown slug (warning), unknown row-id (error), unknown column (error),
  field-outside-section (error), duplicate/empty CSV keys (error), legacy `#slug`
  (warning + suggestion). Fails (no rules).
- [x] 2.2 GREEN — extend `validator/workspaceSources.ts` resolver ports
  (`{exists, units, columns, fields}`), wire `attachSourceCitations` (normalize.ts) to the
  extended `SourceRef`. Add `code` to `validator/references.ts` `ReferenceDiagnostic`;
  every `KU_*` carries its stable code (tests assert codes, not prose). Replace MCP
  `validate.ts:253-268` ad-hoc `resolveSource` with the extended core ports (no duplicated
  CSV/MD parsing in MCP).
- [x] 2.3 RED — MCP `tools/validate.spec.ts`: workspace-mode case citing
  `metricas_q3.csv@999` returns the unknown-row-id error.
- [x] 2.4 GREEN — extend MCP `resolveSource`/workspace diagnostics to `.csv` + `@`/`&`.
- [x] 2.5 GREEN — skill docs: `nn-innfo/SKILL.md` §4 grammar swap + Core Rule 3;
  `nn-trannsform/citations.md` CSV-direct targets + chain examples.
- [x] 2.6 GREEN — trannsform `markdown-utils.js` mirror of revised slug + new cases in
  `test-slug-parity.js`; parity test green or the slice does not land.
- [x] 2.7 VERIFY — core + MCP suites, lint, typecheck.

## Slice 3 — Editor pill / preview modal / deep-links

Depends on: slice 1. Blocks: slice 4. Est. ~320 lines.

- [x] 3.1 RED — component tests: `FileRefPill` renders `file@unit` label; `FilePreviewModal`
  highlights a CSV row (`@104`), a CSV cell (`&mrr_usd`), an MD field (`&compensation`).
- [x] 3.2 GREEN — FIRST unify the three local pill parsers (`FieldViewer`, `FieldString`,
  `FallbackWidget` `isSourceRef`/`toFileRef`) into one `parseForPill` (they would otherwise
  miss `unit/subunits`); then `utils/sourceRef.ts` adapter gains `unit/subunits/canonical`
  and the modal resolves via core `resolveUnit` (CSV table preview new; MD section
  highlight extended to field lines). Verify `useHashSync` preserves `?ku=`
  (regression test; no fix needed — a fragment-only pushState keeps the query
  string by URL semantics) and extract a `useUnitResolution` composable (resolve + scroll) instead of per-kind
  branches in the modal.
- [x] 3.3 GREEN — deep-link param for units that does not collide with `#Concept.Element`
  / `#@Concept` (`useHashSync.ts` preserves `?ku=`; verified, no change); e2e Playwright
  case asserting the workspace guard preserves `?ku=` on redirect. NOTE: full pill→preview
  e2e is not feasible (workspace loading needs the File System Access directory picker,
  which Playwright cannot grant) — pill→preview navigation is covered at component level.
- [x] 3.4 VERIFY — editor unit + component + e2e suites, lint, typecheck.

## Slice 4 — Minor 0.5.0 coordinated release

Depends on: slices 1, 2 (, 3). Est. ~200 lines (mostly generated + manifests).

- [x] 4.1 GREEN — bump `innfo-core` + `innfo-mcp` (+ editor dep) to `0.5.0`; rebuild core
  before MCP tests.
- [x] 4.2 GREEN — rebuild MCP bundle → `docs/innfo/cdn/innfo-mcp-v0.5.0.bundle.js`, manifest
  `latest`; the 0.3.2 CDN gap observed at proposal time was closed by the 0.4.0 release on
  main (2026-09-08) — re-verify the 6-way square is still green, do not re-close.
- [x] 4.3 GREEN — `manifest/source.yaml` + `catalog.json` regen; docs regen (`llms.txt`,
  `documentation/`); `check-integrity.js` version-square green (6-way).
- [x] 4.4 VERIFY — full `npm --prefix iNNfo run test` + `test:coverage`; integrity gate clean.
  NOTE (2026-09-08, pre-existing reds NOT from this change, both tracked): (1) MCP package
  coverage below gates (lines ~87% vs 90%) — lowest files untouched by this change → backlog #17.
  (2) Stable-manifest business mismatch (manifest V_0-2-3 vs template file V_0-2-2, committed
  on dev by concurrent template work) — needs its owner; version-square (this change's gate)
  is green at 0.5.0.
  NOTE: single coordinated 0.5.0 with the query change — if query slices land first, this
  slice folds into that release instead of shipping alone.
