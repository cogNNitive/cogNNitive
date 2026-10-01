# Tasks: Canonical Workspace Layout (kNNowledge/)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300 lines |
| 400-line budget risk | Medium |
| Delivery strategy | single-pr / direct batch |

---

## Phase 1: Bootstrap & Tests (TDD)
- [x] 1.1 **RED — test bootstrapped layout**: Add test in `scripts/` verifying `bootstrap.js` creates `kNNowledge/`, writes `domaiNN_NN.md`, and evaluates to `kind: 'current'`. `[bootstrap-workflow:Requirement:Canonical Bootstrap Output]`
- [x] 1.2 **GREEN — canonical bootstrap**: Update `bootstrap.js` and `provenance-knowledge.js` to scaffold `kNNowledge/`, `domaiNN_NN.md`, and declare `iNNfo_V_0-3-0`. `[bootstrap-workflow:Requirement:Canonical Bootstrap Output]`

## Phase 2: Scripts & Readers Migration
- [x] 2.1 **Update `nn-trannsform` scripts**: Replace `models/` with `kNNowledge/` across `impact-checker.js`, `lineage-check.js`, `provenance-knowledge.js`, `duplicate-guards.js`, and `index.js`. Update tests. `[workspace-layout:Requirement:Canonical Knowledge Directory]`
- [x] 2.2 **Update `nn-preflight`**: Wire `legacy-detect` into `preflight-check.js --json` and update SKILL.md. `[preflight-freshness-reporting:Requirement:Layout Detection in Preflight]`

## Phase 3: MCP Fallbacks Cleanup
- [x] 3.1 **Clean `innfo-mcp` tools**: Remove unreachable `models` fallbacks from `list-read.ts`, `spec.ts`, `validate.ts`, `init-knowledge.ts`, `apply-change.ts`. `[workspace-layout:Requirement:Canonical Knowledge Directory]`
- [x] 3.2 **Update template scaffolds**: Update `skills/nn-innfo/templates/workspace_spec_NN.md` and related docs.

## Phase 4: Verification
- [x] 4.1 Run unit test suites and `npm run test`.
- [x] 4.2 Run `npm run check:integrity` and `node scripts/verify.js`.
