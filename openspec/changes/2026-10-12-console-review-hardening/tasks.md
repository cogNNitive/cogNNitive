# Tasks: console review hardening

Single writer. Four work-unit slices, one commit each, in order. No per-task test gate:
write the tests with each slice, run everything once in slice 5.

## Slice 1 — Security quick wins (items 3, 2)

- [x] 1.1 `feedback-verdict.ts`: `isInsideRoot` guard on `sourcePath` (D5) + traversal test in `feedback-verdict.spec.ts`.
- [x] 1.2 `innfo-runtime.js`: `escapeHtml`/`textContent` at all sinks listed in D3.
- [x] 1.3 `artifact_shell.html`: CSP meta (D4); `export-console.mjs` injects inline-script `sha256-` hashes.
- [x] 1.4 Hostile-content tests: title, concept name, hash token, error string.
- [x] 1.5 Rebuild bundle + shells; commit `fix(console): escape untrusted text, add CSP, guard verdict sourcePath`.

## Slice 2 — Console -> apply contract (item 1)

- [x] 2.1 Payload exposes model file stem + element slug; `draftToChange` uses D1 address.
- [x] 2.2 `new` -> `add_element` (D2).
- [x] 2.3 Round-trip test: console export -> `parseChangeset` -> `applyChange` on a fixture domain.
- [x] 2.4 Rebuild bundle + shells; commit `fix(console): export changesets resolvable by apply_change`.

## Slice 3 — Identity, drafts, staleness (items 4, 5, 6)

- [x] 3.1 `export-console.mjs`: content-derived `modelVersion` and store key (D6); model-qualified ids (D7) incl. `review.js` `elementsById`.
- [x] 3.2 `review.js` `createDraftStore`: read-merge-write + `storage` listener, `onError`, clear-after-export (D8); runtime toast + clear prompt.
- [x] 3.3 Wire `isTargetChanged` into the review UI (stale draft flag).
- [x] 3.4 `base_hash` in changeset parser/serializer, export, and `apply_change` precondition (D9).
- [x] 3.5 Tests: two-tab merge, write failure surfaced, stale banner fires, `base_hash` mismatch rejected.
- [x] 3.6 Rebuild bundle + shells; commit `feat(console): domain identity, multi-tab drafts, base_hash precondition`.

## Slice 4 — Crash-safe persist (item 7)

- [x] 4.1 `apply-change.ts`: copy-to-archive then rename tmp over live (D10) + failure-injection test.
- [x] 4.2 Commit `fix(mcp): crash-safe apply persist`.

## 5. Final verification (once)

- [x] 5.1 Rebuild innfo-core dist; run innfo-core, innfo-mcp and console suites; `node scripts/verify.js`.
- [x] 5.2 Open one regenerated shell in a browser: no CSP violations, views and iframes load.
- [x] 5.3 Fix any red, amend into the owning slice's follow-up commit.

## Review Workload Forecast

| Slice | Est. changed lines (excl. regenerated bundle/shells) |
|-------|------------------------------------------------------|
| 1 Security | ~170 |
| 2 Export contract | ~130 |
| 3 Identity/drafts/staleness | ~300 |
| 4 Persist | ~40 |
| **Total** | **~640** |

- Estimated changed lines: ~640 hand-written (+ large generated bundle/shell diffs).
- 400-line budget risk: **High** (total), Low per slice (each < 400).
- Chained PRs recommended: **Yes** — one PR per slice (slices are independently committable).
- Decision needed before apply: **Yes** — confirm chained-per-slice vs. single PR with `size:exception`, and the chain strategy.
