# Tasks: One Source of Truth Per Version, Derived Refs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~580 (incl. tests/renames across 4 slices) |
| 400-line budget risk | Low (all slices < 200 lines, single-branch commits) |
| Chained PRs recommended | No |
| Suggested split | S1 → S2 → S3 → S4 (batched commits on dev) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| S1 | Derive `refs[].ref`, `channel-refs.js`, 4 call sites | Commit S1 | Standalone, pure read-time derivation |
| S2 | Skills to `source.yaml`, rename to `sync-versions.mjs` | Commit S2 | Extends source.yaml writer, drops parity check |
| S3 | MCP generation, dissolve version square to `cdn-bundle-staged.js` | Commit S3 | Drops version comparisons, keeps staged check |
| S4 | Documentation truth-up | Commit S4 | Updates references & guides |

## Phase 1: Slice 1 — Read-Time Channel Ref Derivation (S1)

- [x] 1.1 RED: Create `scripts/lib/channel-refs.test.js` with test cases for `resolveChannelRefs` (semver, literal ref, ambiguous, missing, table lookup, shape validation).
- [x] 1.2 GREEN: Implement `scripts/lib/channel-refs.js` exporting `resolveChannelRefs(sourceDoc, channel)` and `VERSION_SOURCE`.
- [x] 1.3 Migrate `manifest/source.yaml` stable channel refs to drop `ref:` and add `version:`.
- [x] 1.4 Update callers (`scripts/manifest/generate-manifest.js`, `scripts/freshness.js`, `scripts/lib/console-release-info.js`) and their tests to use `resolveChannelRefs`.
- [x] 1.5 Verify migration equality: `generate-manifest.js --channel stable --check` passes with byte-identical output.

## Phase 2: Slice 2 — Skill Version Generation & Script Rename (S2)

- [x] 2.1 RED: Rename `scripts/sync-template-versions.test.mjs` → `scripts/sync-versions.test.mjs` and add skill sync + cross-write tests.
- [x] 2.2 GREEN: Rename `scripts/sync-template-versions.mjs` → `scripts/sync-versions.mjs` with per-section maps and `skills` collection.
- [x] 2.3 Update references across `package.json`, `scripts/verify.js`, `scripts/check-integrity.js`, and regenerate `iNNfo/apps/innfo-editor/src/config/samples.ts`.
- [x] 2.4 Delete skill version comparison in `scripts/manifest/check-parity.js` and update `scripts/manifest/check-parity.test.js`.
- [x] 2.5 Verify `npm run sync:versions` and `npm run check:versions`.

## Phase 3: Slice 3 — MCP Generation & Version Square Dissolution (S3)

- [x] 3.1 RED: Add tests in `scripts/sync-versions.test.mjs` for MCP version generation (`source.yaml` mcp, `innfo-core/package.json`, dependency range).
- [x] 3.2 GREEN: Implement MCP generation targets in `scripts/sync-versions.mjs`.
- [x] 3.3 RED: Create `scripts/cdn-bundle-staged.test.js` (presence only) and delete `scripts/version-square.test.js`.
- [x] 3.4 GREEN: Move `scripts/lib/version-square.js` → `scripts/lib/cdn-bundle-staged.js` (reduced to bundle presence check).
- [x] 3.5 Update callers in `scripts/verify.js`, `scripts/check-integrity.js`, and remove MCP version comparison in `scripts/manifest/check-parity.js`.
- [x] 3.6 Verify `npm run verify` and migration equality check.

## Phase 4: Slice 4 — Documentation & Reference Truth-up (S4)

- [x] 4.1 Update `.agents/skills/nn-dev-check-integrity/SKILL.md` (remove dissolved checks, update references).
- [x] 4.2 Update `.agents/skills/nn-dev-release/SKILL.md` (update manual editing instructions to `npm run sync:versions`, record ADR-008 note).
- [x] 4.3 Update `openspec/specs/quality-gates/spec.md` and `workspace_NN/workspace_NN.md` for renamed scripts.
- [x] 4.4 Run full verification suite (`node scripts/verify.js` and `npm run check:integrity`).
