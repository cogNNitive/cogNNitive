# Design: Dev→Main Process Gaps

## Technical Approach

Make the failures observable earlier without changing release semantics. Reuse
the existing root manifest suites, local test commands, and scanner behavior;
add one small deterministic guard and one shared test helper. Keep prose-only
release documentation separate from executable changes.

The pending sibling change remains the authority for session attribution,
merge-gate enforcement, deploy-DoD escalation, and CI on `dev`; this change
does not repeat those specifications.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Invoke existing manifest suites from `verify.js` vs duplicate their assertions | Duplication drifts; wiring lengthens verification slightly | ADOPTED: invoke `generate-manifest.test.js`, `validate-manifest.test.js`, and `check-parity.test.js` |
| Separate encoding guard vs reuse every scanner | A dedicated guard produces one actionable file/reason message | ADOPTED: new tracked-text guard for `U+FFFD`/undecodable bytes |
| Full local `build:docs` vs preserve existing local coverage/spec-URL additions | `build:docs` is heavier and rewrites tracked docs; the observed CI gap was coverage + spec URLs | ADOPTED: preserve/add only coverage and spec URLs; document residual `build:docs` nonequivalence if not mirrored |
| Central git-visibility helper vs per-scan exclusions | Per-scan hardcoding drifts whenever caches change | ADOPTED: one helper that returns tracked + nonignored paths and falls back without git |
| Shared `rmWithRetry` vs duplicated retry loops | Two copies already exist and can drift | ADOPTED: shared import in both `innfo-mcp` specs |
| Document Console in `nn-dev-release` vs defer it | Console is already distributable, so release guidance is needed now | ADOPTED: prose-only Console option and `-v` tag rule |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/verify.js` | Modify | Call the three root manifest suites as part of deterministic verification |
| `scripts/guard-text-encoding.js` | Add | Fail fast on undecodable tracked text or `U+FFFD`, with file/reason |
| `scripts/guard-text-encoding.test.js` | Add | Cover tracked inclusion, binary/fixture exclusions, and failure reporting |
| `iNNfo/scripts/check-spec-version.mjs` | Modify | Centralize git-visible selection for repository scans |
| `scripts/check-integrity.js` | Unchanged, verified | Coverage (innfo-mcp `test:coverage`) and `check:spec-urls` were already present in Group 5 — landed in commit `918e43a`; no edit was needed |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modify | Align Group 5 prose with maintained behavior and residual nonequivalence |
| `.agents/skills/nn-dev-release/SKILL.md` | Modify | Add Console option and `-v` tag-shape requirement |
| `iNNfo/packages/innfo-mcp/test/helpers/fs-retry.ts` | Add | Bounded retries for transient Windows cleanup errors |
| `iNNfo/packages/innfo-mcp/src/tools/check-workspace.spec.ts` | Modify | Replace local retry with shared helper |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts` | Modify | Replace local retry with shared helper |

## Interfaces / Contracts

```text
node scripts/verify.js
node scripts/manifest/generate-manifest.test.js
node scripts/manifest/validate-manifest.test.js
node scripts/manifest/check-parity.test.js
node scripts/guard-text-encoding.js
npm --prefix iNNfo/packages/innfo-core test
npm --prefix iNNfo/packages/innfo-mcp run test:coverage
npm --prefix iNNfo/apps/innfo-editor test
npm --prefix iNNfo run check:spec-urls
node scripts/check-integrity.js --pre-push
```

No new package boundaries. No network is required by unit-level encoding or
filesystem tests; temporary-git tests MUST use disposable fixtures and clean
them up.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | New text-encoding filter and reporting | Focused Node tests with tracked/ignored/binary fixtures |
| Unit | Git-visible selection | Disposable git repository fixture; assert ignored paths excluded and tracked paths retained |
| Unit | Shared temporary cleanup | Transient-error fixture retries and succeeds; persistent errors throw |
| Integration | Wired manifest suites | Run all three through the updated verification path |
| Integration | Local pre-push mirror | Coverage failure and spec-URL failure each fail the gate |
| Review | Release docs | Reviewer reads the Console option and `-v` requirement |

## Migration / Rollout

No pins, tags, branches, manifests, bundles, or user data change. The change is
safe to land on `dev` once the local commands above pass; it does not require
the pending sibling change first.

## Open Questions

- Exact fixture location and import path for the shared `fs-retry` helper.
- Whether the residual `build:docs` local/CI difference should later move into
  a dedicated `--ci` local mode.
