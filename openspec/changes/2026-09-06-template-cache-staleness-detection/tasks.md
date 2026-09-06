# Tasks: Template Cache Staleness Detection (2026-09-06)

Source: proposal.md + specs (`template-cache-staleness-detection`, `template-immutability-guard`) + design.md (D1–D5).
Branch: `fix/integrity-audit-blockers`. `strict_tdd: true` — every component starts RED (failing test), then GREEN.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800 (proposal budget) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: innfo-mcp (A) → PR 2: scripts guard (B) → PR 3: preflight (C) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | innfo-mcp resolver + validate freshness (D1–D3) | PR 1 | Self-contained; core unchanged; bundle NOT rebuilt |
| 2 | scripts guard + verify.js wiring (D4) | PR 2 | Zero-dep; independent of PR 1 |
| 3 | preflight `--workspace-dir` scan (D5) | PR 3 | Independent of PR 1/2 |

## Component 1 — innfo-mcp resolver freshness (D1/D2)

- [x] 1.1 RED — `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts`: add ON-path cases — local-tier doc + differing remote → `stale` (fetch called once); equal → `fresh`; fetch reject → `unknown` + resolution succeeds; network-resolved doc → no extra fetch; step-0 local-path URL → no check; freshness map holds only the top doc. Verify (fails): `npm --prefix iNNfo run test` (target: `resolver-node.spec.ts`)
- [x] 1.2 GREEN — `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts`: add `FreshnessVerdict`/`FreshnessResult` + `ResolverOptionsWithFreshness` (local, no core change); per-iteration `resolvedFromLocalTier` (step 1 only); when `checkFreshness && depth===0 && fromLocalTier && /^https?:\/\//i.test(currentUrl)` → `download()` + sha256 (UTF-8) compare; throw → `unknown`; read-only (no `saveSpecOnce`); return `SpecCache & { freshness?: Map<string, FreshnessResult> }`
- [x] 1.3 Verify — `npm --prefix iNNfo run test` green (R-LSR-01 tests untouched) + `npm --prefix iNNfo run typecheck`
- [ ] 1.4 Commit — `feat(innfo-mcp): opt-in resolver freshness check (D2)`

## Component 2 — innfo-mcp validateModel warning (D3)

- [x] 2.1 RED — `iNNfo/packages/innfo-mcp/test/validate-workspace-schema-cache.test.ts`: pass `{ checkFreshness: false }` on both `validateModel` calls (hermetic — local template + `example.com` URL, no fetch mock). Verify: `npm --prefix iNNfo run test`
- [x] 2.2 RED — create `iNNfo/packages/innfo-mcp/test/freshness-warning.test.ts`: stale → `[TEMPLATE_CACHE_STALE]` warning (severity `warning`, path `parent_spec`) + `valid` unchanged; fresh → no warning; fetch fail → `unknown`, no warning. Verify (fails): `npm --prefix iNNfo run test`
- [x] 2.3 GREEN — `iNNfo/packages/innfo-mcp/src/tools/spec.ts`: `resolveTemplateWithCache(rootDir, url, name, options?: { checkFreshness?: boolean })` forwards option; return `freshness: FreshnessResult | null` (entry for requested name)
- [x] 2.4 GREEN — `iNNfo/packages/innfo-mcp/src/tools/validate.ts`: 6th options param default `{ checkFreshness: true }`; capture verdict from whichever resolution produced the template; push `[TEMPLATE_CACHE_STALE]` warning before the D8 decoration (validate.ts:390); never touches `valid`
- [x] 2.5 Verify — `npm --prefix iNNfo run test` + `npm --prefix iNNfo run typecheck` + `npm --prefix iNNfo run lint`
- [ ] 2.6 Commit — `feat(innfo-mcp): TEMPLATE_CACHE_STALE warning on validateModel (D3)`

## Component 3 — scripts template immutability guard (D4)

- [x] 3.1 RED — create `scripts/guard-template-immutability.test.js` (plain node, `--diff-file` fixtures): `M` → exit 1 + bump-and-rename remediation; `A` mismatch `template_version` → exit 1; `A` match → exit 0; `R100\told\tnew` → exit 0; `D` → exit 0; clean diff → exit 0; `samples/*_V_*` `M` → not an error. Verify (fails): `node scripts/guard-template-immutability.test.js`
- [x] 3.2 GREEN — create `scripts/guard-template-immutability.js` (zero-dep CJS): `--diff-file`/`--root`/`--staged`; parse `<STATUS>\t<path>` + `R<score>\t<old>\t<new>` (new = last token); filter `_V_x-y-z` + `.md` excluding `/samples/`/`/assets/`; `M` → error; `A` → frontmatter `template_version` vs filename via `require('../../actioNN/skills/nn-preflight/scripts/lib/yaml-lite')`; `R`/`D` pass; exit 0/1
- [x] 3.3 GREEN — `scripts/verify.js`: append steps 7–9 after step 6 (guard test, guard vs real git, preflight test) per D4; existing 1–6 untouched. Verify: `node scripts/verify.js`
- [ ] 3.4 Commit — `feat(scripts): template immutability guard + verify wiring (D4)`

## Component 4 — preflight workspace freshness (D5)

- [ ] 4.1 RED — `actioNN/skills/nn-preflight/scripts/preflight-check.test.js`: add scenarios with local http server + tmp `--workspace-dir` — stale spec → exit 1 + ACTION_REQUIRED + `summary.specsStale`; all-fresh → exit 0; no-flag run → existing assertions unchanged. Verify (fails): `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js`
- [ ] 4.2 GREEN — `actioNN/skills/nn-preflight/scripts/preflight-check.js`: read `--workspace-dir` via `getArg`; absent → no scan; scan after Node check, before manifest fetch; recursive `specs/` walk skipping `.staging-*` + `node_modules|.git|dist|.spec-cache|backups|archive`; `spec_url ?? parent_spec.url`; native fetch + AbortController (~6 s); sha256 compare; `summary.specsStale/Fresh/Offline`; stale → ACTION_REQUIRED exit 1 (also folded into manifest-offline early return), offline → warning; human-report stale section
- [ ] 4.3 Verify — `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js` green; no-flag output byte-for-byte unchanged
- [ ] 4.4 Commit — `feat(nn-preflight): --workspace-dir staleness scan (D5)`

## Gate checks (final verification pass)

- [ ] 5.1 `npm --prefix iNNfo run test` — full suite green (offline)
- [ ] 5.2 `npm --prefix iNNfo run typecheck` + `npm --prefix iNNfo run lint`
- [ ] 5.3 `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js`
- [ ] 5.4 `node scripts/guard-template-immutability.test.js`
- [ ] 5.5 `node scripts/verify.js` — steps 7–9 green
- [ ] 5.6 Working tree carries only intended changes; `bin/innfo-mcp.bundle.js` NOT rebuilt (per design Open Questions — deferral accepted)

## Notes

- No `innfo-core` change; `SpecDocument` untouched (D1). Resolver default OFF preserves R-LSR-01; `validateModel` default ON is the only behavior delta.
- Guard `A`-check reuses `actioNN/skills/nn-preflight/scripts/lib/yaml-lite.js` — single source of truth, no new parser.
- Open question (bundle rebuild) deferred to release pipeline per design; revisit only if CDN immediacy is required.