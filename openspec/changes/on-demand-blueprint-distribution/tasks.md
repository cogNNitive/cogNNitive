# Tasks: On-Demand Blueprint & Skill Distribution

## Review Workload Forecast

| Metric | Forecast | Notes |
|---|---|---|
| Total files touched | ~14 | Includes generated `catalog.json`, `canonical-registry.ts`, and `innfo-mcp` bundle |
| Estimated handwritten LOC | ~420 | Across `scripts/`, `innfo-core`, `innfo-mcp`, and `nn-preflight` |
| Generated / config LOC | ~600+ | Shrinks `canonical-registry.ts` and `innfo-mcp.bundle.js` by ~250–300 KB |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Suggested Work Units

| Unit | Phase | Scope & Files | Verification |
|---|---|---|---|
| Unit 1 | Phase 1: Network & Tarball Deduplication | `scripts/manifest/lib/manifest-rules.js`, `scripts/lib/skills-commands.js`, `scripts/manifest/__tests__/manifest-rules.test.js`, `scripts/__tests__/skills-manager.test.js` | `node scripts/verify.js` |
| Unit 2 | Phase 2: Core vs. Catalog Split | `scripts/blueprint-catalog.mjs`, `iNNfo/specs/bluepriNNts/catalog.json`, `manifest/source.yaml`, `scripts/generate-canonical-registry.mjs`, `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts`, `scripts/verify.js`, `scripts/release/assemble-manifest.js`, `skills/nn-preflight/scripts/preflight-check.js` | `npm test` & `node scripts/verify.js` |
| Unit 3 | Phase 3: On-Demand & Authenticated Hydration | `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts`, `iNNfo/packages/innfo-mcp/src/tools/spec.ts`, `scripts/skills-manager.js`, `scripts/lib/skills-commands.js`, regenerated `innfo-mcp` and `skills-manager` bundles | `npm test` & `node scripts/verify.js` |

## Phase 1: Network & Tarball Deduplication (Unit 1)

- [ ] 1.1 [RED] Add failing tests in `scripts/manifest/__tests__/manifest-rules.test.js` asserting repeated `(repo, ref, commit)` tuples issue at most 1 GitHub API call (`<= 45` calls total), and in `scripts/__tests__/skills-manager.test.js` asserting `install`/`update` downloads at most 1 tarball per unique `(repo, commit)`.
- [ ] 1.2 [GREEN] Memoize `checkCommitExists`, `checkRefResolvesInDeclaredRepo`, and `checkReleaseProvenance` by `(repo, ref, commit)` in `scripts/manifest/lib/manifest-rules.js`, and implement a temp-directory tarball cache keyed by `${repo}@${commit}` with exit cleanup in `scripts/lib/skills-commands.js`.
- [ ] 1.3 [VERIFY] Run `node scripts/verify.js` to confirm Unit 1 tests and manifest checks pass.

## Phase 2: Core vs. Catalog Split (Unit 2)

- [ ] 2.1 [RED] Add failing tests in `scripts/__tests__/blueprint-catalog.test.mjs`, `scripts/__tests__/verify.test.js`, `skills/nn-preflight/scripts/__tests__/preflight-check.test.js`, and `iNNfo/packages/innfo-core` asserting: (a) `catalog.json` includes `tier`, `access`, `when_to_use`, `release_tag`, and `embedded_skills`, (b) `manifest/source.yaml` and `canonical-registry.ts` contain only the 7 Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`), and (c) `preflight-check.js` ignores uninstalled optional catalog `bluepriNNts`.
- [ ] 2.2 [GREEN] Update `scripts/blueprint-catalog.mjs` and regenerate `iNNfo/specs/bluepriNNts/catalog.json`; restrict `manifest/source.yaml` and `scripts/generate-canonical-registry.mjs` to the 7 Core `bluepriNNts` and regenerate `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts`.
- [ ] 2.3 [GREEN] Update `scripts/verify.js` (`checkBlueprintInventory`), `scripts/release/assemble-manifest.js`, and `skills/nn-preflight/scripts/preflight-check.js` to validate Core `bluepriNNts` via `manifest/source.yaml` and optional verticals via `catalog.json`.
- [ ] 2.4 [VERIFY] Run `npm test` and `node scripts/verify.js` to confirm Unit 2 passes all inventory and registry checks.

## Phase 3: On-Demand & Authenticated Hydration (Unit 3)

- [ ] 3.1 [RED] Add failing tests in `iNNfo/packages/innfo-mcp/src/tools/__tests__/spec.test.ts` and `scripts/__tests__/skills-manager.test.js` covering: `list_blueprints` merging local state with `catalog.json` (`installed`, `tier`, `access`, `when_to_use`, `embedded_skills`), on-demand remote fetch via `hydrate_blueprint` and `skills-manager.js install --blueprint <name>`, Bearer auth (`COGNNITIVE_TOKEN` / `~/.agents/credentials.json`) with HTTP 401/403 token redaction, offline diagnostics, and `<bp>/skills/*` projection into `~/.agents/skills/`.
- [ ] 3.2 [GREEN] Implement `resolveAuthToken`, Bearer header injection, and error token redaction in `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts`, and update `listBlueprints` and `hydrateBlueprint` in `iNNfo/packages/innfo-mcp/src/tools/spec.ts` to merge `catalog.json`, fetch missing `bluepriNNts` on demand, and project embedded skills.
- [ ] 3.3 [GREEN] Add `--blueprint <name>` flag parsing in `scripts/skills-manager.js` (keeping file `< 200` lines) and catalog-backed installation + skill projection in `scripts/lib/skills-commands.js`; rebuild `innfo-mcp` and `skills-manager` bundles.
- [ ] 3.4 [VERIFY] Run `npm test` and `node scripts/verify.js` across the workspace to verify all unit tests, line-count guards, and bundle freshness gates pass.
