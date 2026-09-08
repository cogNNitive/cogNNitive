# Verify Report — Slice 1 (`workspace-integrity-check`)

**Scope:** Slice 1 only — `innfo-core` version-status primitives, `buildWorkspaceIntegrityReport` builder, purity guard, esbuild → committed `version-status.generated.cjs`, `verify.js` drift step.
**Context:** Post-merge audit. Slice 1 was merged to `main` in `1f7411d` and shipped in the v0.3.2 / templates-v0.3.1 release before this verification could run (the pre-merge verify was killed by a session rate limit). Audit performed on branch `dev`.
**Verdict:** **PASS WITH WARNINGS** — 0 CRITICAL, 3 WARNING, 5 SUGGESTION. Nothing blocks archive of slice 1. The 3 WARNINGs are follow-up commits on `dev`.

---

## Evidence

| Command | Result |
|---|---|
| `npm --prefix iNNfo/packages/innfo-core run build` | exit 0 |
| innfo-core vitest | 40 files, **471 passed / 1 skipped** — incl. new `versionStatus.spec.ts` (27), `report.spec.ts` (17), `purity.spec.ts` (2) |
| innfo-mcp vitest | 21 files, **195 passed** — no regression |
| `node scripts/build-preflight-primitives.mjs --check` | exit 0 (`up to date`) |
| `node scripts/build-preflight-primitives.test.mjs` | 4/4 pass |
| eslint `packages/innfo-core/src/workspace/integrity/` | 0 problems |
| full `eslint .` (iNNfo) | 494 warnings, 0 errors — all pre-existing; new integrity files contribute 0 |
| innfo-editor vitest + `vue-tsc` | **could not run** — `iNNfo/node_modules` partial install (missing `.bin` shims). Pre-existing env breakage; slice 1 touches no editor file. |
| `node scripts/verify.js` | pre-existing halt at "Validate Stable Manifest" (identical on `origin/main`, documented in MEMORY.md) — not a slice-1 failure |

## Conformance

- **Slice boundary — CLEAN.** Merge `1f7411d` touches only slice-1 files (`versionStatus.ts`+spec, `report.ts`+spec, `purity.spec.ts`, `index.ts`, `browser.ts`, `version-status.generated.cjs`, `build-preflight-primitives.mjs`+test, `scripts/verify.js` +5 lines, openspec docs). No `validate.ts` / `check-workspace.ts` / `server.ts` (slice 2), no `upgrade-check.js` / `build-docs.mjs` (slice 3), no editor files / `nn-innfo` SKILL.md (slice 4). The esbuild script + generated `.cjs` + `verify.js` guard were pulled into slice 1 by the orchestrator scope note in `tasks.md` — documented, not scope creep.
- **AD-1 — conforms.** Exactly 3 required ports (`discoverModels`, `validateAll`, `fetchCatalog`) + 2 optional (`resolveTemplate?`, `checkFreshness?`). Report types match the design snippet. Freshness dedup-by-URL (`seen` Set) + concurrency cap (`runWithConcurrency`, default 4) present and correct — covered by dedup test (2 fetches / 6 models / 2 URLs) and two concurrency-cap tests.
- **AD-2 / purity — conforms, verified three ways.** By reading, by `purity.spec.ts`, and by an independent scratch-copy repro (appended `node:fs` / `fetch` / `require` to a throwaway copy — all three FORBIDDEN regexes fired; original untouched). `version-status.generated.cjs` reproducible from `build-preflight-primitives.mjs`.
- **Strict TDD — genuine.** 50 new tests (27+17+2+4), table-driven, independent-literal expectations, behavioral (all port throw-paths, dedup spy counts, concurrency probes, injected clock). Not tautological. No `.only` / `.skip` / `xit` leftovers.
- **Regressions — none.** core 471/1-skip and mcp 195 match apply-progress exactly.

---

## WARNING (follow-up commits on `dev`; none block archive)

### W1 — `gap` vocabulary: spec and code disagree
`workspace-integrity-check` spec §Per-Model Integrity Result says `gap` MUST be one of `major`, `minor`, `patch`, `none`. Implementation (`versionStatus.ts:38`) is `VersionGap = 'same' | 'major' | 'minor' | 'patch' | 'none' | null`; `classifyAgainstCatalog` returns `'same'` for `current` models and `null` for unparseable input. `apply-progress.md` "Design deviations" documents `'none'` but the spec text was never widened to permit `same` / `null`. No scenario asserts against it, so runtime behaviour is fine — but spec and code literally disagree.
**Fix:** widen the spec's gap vocabulary to include `same`/`null`, OR map `current`→`none` and unparseable→`none` in the implementation.

### W2 — `verify.js` drift guard (step 11) is unreachable in CI today
`scripts/verify.js:145` runs `build-preflight-primitives.mjs --check`, but `scripts/verify.js:125` ("Validate Stable Manifest") `process.exit(1)`s on the pre-existing stable-manifest failure that is also present on `origin/main`. CI (`node scripts/verify.js`) never reaches line 145. A future edit to `versionStatus.ts` without regenerating `version-status.generated.cjs` would NOT be caught by automation until the stable-manifest halt is resolved. The `.cjs` is currently in sync.
**Fix:** move the preflight-primitive steps above the stable-manifest step in `verify.js`, and/or resolve the stable-manifest halt (tracked separately in MEMORY.md).

### W3 — `scripts/build-preflight-primitives.test.mjs` is wired into nothing
Its sibling `preflight-check.test.js` is invoked from `verify.js:140`; the new `.test.mjs` is referenced nowhere but itself. Its 4 tests (incl. the drift-exit-1 case) only run on manual invocation. Combined with W2, the drift guard has no automated teeth.
**Fix:** add `build-preflight-primitives.test.mjs` to `verify.js` alongside `preflight-check.test.js`.

---

## SUGGESTION

1. **`templateResolved` type vs spec prose.** Spec scenarios say `true`/`false`; implementation + design AD-1 use the 4-value enum `TemplateResolution` (`resolved | hydrated | unresolved | not-checked`). Code follows design — reconcile the spec prose.
2. **`catalogSource` literal.** Spec says `remote` / `in-repo` / `none`; implementation uses `offline` for the third value. Align the literal.
3. **`catalogSource` / `offline` location.** Spec places them "in the aggregate"; implementation + design AD-1 put them on the top-level `WorkspaceIntegrityReport`. Data present — reconcile wording.
4. **`purity.spec.ts` is shallow.** Regexes only the source text of `versionStatus.ts` + `report.ts`, not the import graph. A future third module imported by `report.ts` could smuggle in `node:*`. Consider asserting on the built browser bundle too (core already has `tests/browser-safe.test.ts`).
5. **Commit granularity.** Work-unit commits bundle test + impl (`f602312` = `versionStatus.spec.ts` + `versionStatus.ts`). RED→GREEN is documented in `apply-progress.md` but not independently visible in history. Acceptable.

---

## Environment blockers for slices 2–4 (not slice-1 failures)

- **GitHub network unreachable** at audit time (`git fetch` → `Connection was reset`). Slices 2 (freshness fetches) and 3 (canonical catalog publication/URL) need network to test properly.
- **`iNNfo/node_modules/.bin` incomplete** — missing `vitest` shim (partial `npm ci`). `@vue/shared` and the `vitest` package are present. Slices 2 and 4 need a clean `npm ci` before their apply/verify can run tests through the normal path.
- **Concurrent session active on `dev`** — HEAD advanced `a408b2d` → `570c36e` (docs-only) mid-audit; untracked/modified paths present that belong to another session (`iNNfo/CHANGELOG.md`, `Ghostbusters_V_0-2-2_business_NN.md`, `openspec/changes/2026-09-08-workspace-progressive-disclosure-index/`, `specs/`).

## Next

- Slice 1: archive-eligible (PASS WITH WARNINGS, no CRITICAL). File W1–W3 as follow-up commits on `dev`.
- Slices 2–4: resume once the three environment blockers above clear (network restored, clean `npm ci`, `dev` tree quiescent).
