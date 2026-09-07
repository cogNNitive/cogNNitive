# Tasks: Template Pin ↔ Main Coherence Gate

Contract: `proposal.md` + delta spec `specs/monorepo-release-manifest.md`
("Stable Template Main Coherence") + `design.md`. Strict TDD: tests land RED
before implementation. Each step's gate: `node scripts/manifest/validate-manifest.test.js`
and `node scripts/verify.js` (runs script typecheck via `tsconfig.scripts.json`
`checkJs` + stable validation). iNNfo is untouched — do NOT run `npm test` there.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

---

## Phase 1: Tests (RED, TDD first)

All cases extend `scripts/manifest/validate-manifest.test.js`, reusing
`stubHttpsGetSequence` / `freshValidatorModule`. Cases 16–20 exercise the rule
through the `validate-manifest.js` re-export with a 2-body stub (pin fetch,
then main fetch); case 19 uses `200` then `403`.

- [x] 1.1 Case 16 (identical): stub two identical bodies → `checkTemplateMainCoherence(template)` returns `[]`; `stub.urls()` contains `/<commit>/` then `/main/`
- [x] 1.2 Case 17 (main-ahead drift): pin body ≠ main body → 1 violation naming `path`, `commit`, and both revisions (`/main/` + pinned commit)
- [x] 1.3 Case 18 (tag-ahead drift): reverse fixture (main body ≠ pin body) → 1 violation, same direction-agnostic message shape
- [x] 1.4 Case 19 (rate limit): stub `200` pinned then `403` main → violation matches `/RATE_LIMIT_HINT/`, no throw
- [x] 1.5 Case 20 (CRLF/BOM): pin body = `\uFEFF` + `\r\n`, main body = LF no BOM → `[]` (normalized equal)
- [x] 1.6 Case 21 (preview not evaluated): `validateTemplate(t, CHANNELS.preview)` → no `urls()` entry matches `/\/main\//`, no coherence violation
- [x] 1.7 Case 22 (wiring, stable): full stable sequence (commit-exists, resolveRef tag, provenance identical, contents@commit, version-parity fetch, coherence pin, coherence main — all `200`, identical bodies) → `validateTemplate` returns `[]` and both raw URLs fetched
- [x] 1.8 Run `node scripts/manifest/validate-manifest.test.js` — assert the new cases FAIL (rule not yet implemented)

## Phase 2: Implementation (`scripts/manifest/lib/manifest-rules.js`)

- [x] 2.1 Add private `normalizeTemplateText(text)` — strip leading `\uFEFF` + CRLF→LF, zero deps; JSDoc `@param`/`@returns` (checkJs in verify step 4); NOT exported
- [x] 2.2 Add `async checkTemplateMainCoherence(template)` → `Promise<string[]>`: two `fetchString` calls (`raw/<repo>/<commit>/<path>` and `<repo>/main/<path>`), normalize both, compare; each fetch in its own `try/catch` → violation, never throw
- [x] 2.3 In `checkTemplateMainCoherence`, detect rate limit via `/status:\s*(403|429)/` on `err.message` → append `RATE_LIMIT_HINT`; fetch failures report `could not fetch <path> at <commit|main>`; drift reports `content at <path> differs between pinned commit <commit> and main in <repo>` (names both revisions, direction-agnostic)
- [x] 2.4 Append gate line at end of `validateTemplate` (after version-parity block): `if (policy.requireProvenance) violations.push(...await checkTemplateMainCoherence(template));`
- [x] 2.5 Add `checkTemplateMainCoherence` to `module.exports` in `manifest-rules.js`
- [x] 2.6 Verify: `node scripts/manifest/validate-manifest.test.js` green + `node scripts/verify.js` green (typecheck/checkJs + stable)

## Phase 3: Wiring (`scripts/manifest/validate-manifest.js`)

- [x] 3.1 Re-export `checkTemplateMainCoherence` from `validate-manifest.js` (1 line, line count stays under 200)
- [x] 3.2 Verify: `node scripts/manifest/validate-manifest.test.js` green (cases 16–22 pass) + `node scripts/verify.js` green

## Phase 4: Global Verification

- [x] 4.1 `node scripts/manifest/validate-manifest.test.js` — all cases 1–22 pass
- [x] 4.2 `node scripts/verify.js` — stable gate green (no iNNfo test run; change touches scripts only)
- [x] 4.3 Confirm no new drift: `git diff --stat` limited to `scripts/manifest/lib/manifest-rules.js`, `scripts/manifest/validate-manifest.js`, `scripts/manifest/validate-manifest.test.js` (spec merge deferred to sdd-archive; do NOT touch `openspec/specs/`)
- [x] 4.4 Confirm untouched: `generate-manifest.js`, `check-spec-version.mjs`, `scripts/verify.js`, `github-client.js`, frontmatter URLs, skills/MCP
