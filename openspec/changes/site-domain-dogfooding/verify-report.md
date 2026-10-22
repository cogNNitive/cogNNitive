# Verify report: site-domain-dogfooding

Mode: openspec, Strict TDD. Branch session/site-domain-dogfooding-s4 (all 5 slices). Verdict: **PASS WITH WARNINGS**.

## Test results (actual runs)

- node --test scripts/site glob: 121 pass, 0 fail, 0 skipped.
- vitest site-domain.spec.ts (cwd iNNfo/packages/nn-mcp): 1 file, 36 tests passed.
- node scripts/verify.js --fast: 157 of 158 steps green. One failure: scripts/verify-offline.test.js (timing assertion expected only hang, got hang and ok). Rerun alone: passes. Known load-sensitive test, unrelated to this change. All five scripts/site test steps, Typecheck Scripts, NN Name Invariant, Text Encoding, Legacy Write and Docs-Derived Facts Drift guards were green.

Freshness: compile-site.test.mjs "committed docs/next/ matches a fresh compile of site_NN/" passes, so docs/next/ equals a fresh compile.

Change-set scope (git diff --name-status ada87652^1..HEAD): 47 files, all status A, all under site_NN/, scripts/site/, docs/next/, openspec/changes/site-domain-dogfooding/ or iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts. No modification or deletion anywhere; shared extractors, skills/nn-sources, verify.js, package.json, build-docs.mjs, CI, catalog, manifest and role (c) paths are untouched. Worktree clean before this report was written.

Tasks: 36/36 ticked, 0 unchecked.

## TDD compliance

- TDD evidence table present in apply-progress for all 5 batches; test files exist for every task; all GREEN now; triangulation adequate (multiple cases per behavior, mutation checks reported).
- Assertion quality audit: no tautologies or orphan empty checks found. Loops over seed Pages (compile-site.test.mjs:166-178, markdown-subset.test.mjs:110-125) are guarded by a non-empty seed set and a companion count test (compile-site.test.mjs:157), so they are not ghost loops.
- Layers: node:test unit and integration plus one vitest integration spec; no E2E tooling installed or needed.

## Requirement coverage

BP = site-blueprint, SC = site-compiler, CF = site-code-facts. Test refs: S.spec = iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts; CS, SM, MS, IC, ST = scripts/site/ compile-site, site-model, markdown-subset, import-code-facts, site-staleness .test.mjs.

| Requirement | Evidence | Status |
|---|---|---|
| BP Domain-local resolution (nn-core + MCP, no network) | S.spec:55, :62 | PASS |
| BP Resolution failure (fallback B) | S.spec:69 (negative control PARENT_RESOLUTION_FAILED); gate passed, fallback B not needed | PASS |
| BP Site and Page model: conforming Page | S.spec:62, :107-170 | PASS |
| BP missing field rejected | SM:138; S.spec:191 (characterization) | PASS |
| BP relative base_url rejected | SM:106, :220 | PASS |
| BP second Site rejected | SM:150; S.spec:198 | PASS |
| BP Kind set: each kind / unknown kind | S.spec:108, :179 | PASS |
| BP Slug/order: malformed, no slug Field, missing/dup index, order | SM:87, :92, :83, :100; S.spec:86, :146 | PASS |
| BP sources reserved: non-citation rejected | SM:159; S.spec:206 | PASS |
| BP header-unit citation passes | S.spec:252 | PASS |
| BP Document naming: misnamed fails guard; conforming passes guards | No change-specific test; repo guards NN Name Invariant, Text Encoding, Legacy Write in verify.js --fast (green) | PASS (guard evidence; W3) |
| BP Prose-safe body: field-like prose, dup names | SM:64, :71, :75, :79, :212 | PASS |
| BP Seed coverage: every kind; reference cites snapshot | S.spec:108, :232, :241, :252 | PASS |
| BP Isolation from distribution | diff inspection (no protected path touched); no automated test | PASS (manual) |
| BP Procedure documents: tool exists, usage exists, shell/css | S.spec:170; CS:324, :336 exercise the real shell slots; css copy CS:90; usage procedure covered by Check Usage Procedure Convention guard. Shell has 7 slots, BP scenario says four | PASS with W1 |
| SC Domain-only input; outDir override | CS:228, :256 | PASS |
| SC One flat HTML per Page (flat path, non-ASCII, BOM/CRLF, U+FFFD) | CS:75, :128, :136, :142 | PASS |
| SC Derived navigation | CS:96, :115, :537 | PASS |
| SC Markdown subset (supported, indentation, page link, unknown link, unsupported, raw HTML, unsafe scheme) | MS:16-:53, :58, :62-:103, :131-:171; CS:149 | PASS |
| SC Parser agreement with nn-core | SM:174 | PASS |
| SC Fail on ambiguous content | SM:83, :64, :79 and others | PASS |
| SC Citation policy (superseded warn, unresolved fail, unknown file/unit, stale hash, visible) | CS:392-:451 | PASS |
| SC Output ownership/failure | CS:267, :286, :297, :313, :475-:502 | PASS |
| SC sitemap.xml and llms.txt | CS:180, :191, :201 | PASS |
| SC Deterministic output (rerun, path independence, freshness) | CS:214, :221, :206, :460 | PASS |
| SC Zero deps / no shared edits | diff inspection (all A, allowed paths) | PASS (manual) |
| SC Test discovery | verify.js log lists all five scripts/site suites; deliberately-failing-test scenario not exercised | PASS (structural) |
| CF One snapshot per fact group | IC:49, :56, :83; diff for extractors | PASS |
| CF Write-once members + sidecars | IC:83, :112, :136, :172 | PASS |
| CF Idempotent import | IC:101 | PASS |
| CF Deterministic snapshot content | IC:63, :154 | PASS |
| CF Header-unit citations resolve / missing rejected | S.spec:252, :259 | PASS |
| CF Staleness check (clean, superseded, unresolved, --json, end-to-end) | ST:67, :75, :91, :102, :114, :131 | PASS |
| CF Not defeated by in-place refresh | IC:127 | PASS |
| CF Isolation (confined output, portable paths) | IC:145; manual scan of snapshots and sidecars for drive letters, /Users/, /home/ found none (only https URLs) | PASS |
| CF Test discovery | verify.js log lists suites | PASS (structural) |

Proposal success criteria: all seven met (local resolution proven; byte-identical rerun and freshness; all six kinds plus sitemap/llms; reference Page cites header units and validateCitations passes; changed import flags the Page, ST:131; no protected-path diff; verify.js --fast green except the flaky unrelated test, which passes alone; no new dependency).

## CRITICAL

None.

## WARNING

- W1. Spec drift, BP "Procedure documents": text and scenario still say four shell slots (title, nav, content, sources); implementation and site-compiler spec use seven. Reconcile the BP delta before archive.
- W2. Spec drift, CF "Write-once family members": sidecar name is stated as <member>_sidecar_NN.md; actual is <member>.md_sidecar_NN.md (apply-progress finding 2). The design Open Questions checklist is still unchecked.
- W3. No change-specific automated test for BP "misnamed document fails the name guard", usage-procedure existence, or "deliberately failing test fails the gate"; these rely on repo-wide guards.
- W4. scripts/verify-offline.test.js failed once in the full verify.js --fast run (timing-sensitive), passed alone. Unrelated, but can redden the gate under load.
- W5. The snapshot stamp 20261022T184940Z comes from the real clock, and the reference Page and docs/next/reference.html depend on it. Future fact changes flag the Page as superseded until re-cited (intended).

## SUGGESTION

- S1. Add one test asserting the shell-slot list and the usage procedure exist (closes W3 for this change).
- S2. Wire site-staleness.mjs into CI later (already a stated precondition for blueprint promotion).
- S3. At archive, diff and wc -l the archived artifacts against the sources (known haiku truncation risk).
