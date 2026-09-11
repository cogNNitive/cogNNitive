# Proposal: Remaining Dev→Main Process Gaps

## Intent

Turn the remaining retrospective process and tooling gaps into small, executable
corrections after the 2026-09-10 batch failure. This change complements—not
duplicates—the pending sibling proposal
`openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening`, which
owns session attribution, merge-gate enforcement, deploy-DoD checks, and CI on
`dev`.

## Scope

### In Scope

- Wire the existing root manifest suites into `scripts/verify.js`.
- Add deterministic guards for tracked-text encoding and repository file
  visibility.
- Preserve and document the local pre-push coverage + spec-URL behavior.
- Document the Console release path and required `-v` tag shape.
- Consolidate the duplicated Windows temporary-directory cleanup helper.

### Out of Scope

- No changes to the sibling change's process rules: session attribution,
  merge-gate enforcement, deploy-DoD escalation, or CI-on-`dev`.
- No `--release` behavior changes: live stable-manifest validation stays
  release-only and `main`-only.
- No branch, tag, pin, manifest-source, bundle, or user-facing behavior changes.
- No MCP, template, editor, or user-facing skill behavior changes.
- No coverage-threshold changes.

## Complete recommendation map

| # | Retrospective recommendation | Status | Role in this change |
|---|------------------------------|--------|---------------------|
| 1 | Run CI on `dev` | Owned by the pending sibling change | Context and compatibility only |
| 2 | Wire manifest generator/validator/parity tests into `verify.js` | Open | Implemented |
| 3 | Fail on mojibake/`U+FFFD` in tracked text files | Open | Implemented |
| 4 | Preserve local coverage and spec-URL behavior; document residual pre-push/CI parity | Partially present | Locked and documented |
| 5 | Make repository scans git-aware | Open | Implemented |
| 6 | Require a green `main` CI signal before a batch merge | Owned by the pending sibling change | Context only |
| 7 | Add a Console subsystem and `-v` tag-shape rule to `nn-dev-release` | Open | Implemented |
| 8 | Consolidate the duplicated `rmWithRetry` cleanup helper | Open | Implemented |
| 9 | Worktree/`wip:` isolation for concurrency | Sibling rejects worktrees and prescribes `wip:` attribution | Context only |

## Capabilities

### New Capabilities

- `deterministic-manifest-tests`: root manifest generator, validator, and parity
  suites run under the deterministic verification path.
- `tracked-text-encoding-guard`: known-invalid tracked text cannot pass the
  deterministic checks.
- `git-aware-repo-scans`: repository scans distinguish tracked/project files
  from gitignored local artifacts.
- `shared-test-cleanup-helper`: one resilient helper for temporary workspace
  cleanup in `innfo-mcp` tests.

### Modified Capabilities

- Local pre-push mirroring: `check-integrity` keeps innfo-mcp coverage and
  spec-URL resolution in the CI mirror, with residual nonequivalence
  documented.
- `nn-dev-release`: Console gains an explicit release option and a normative
  `-v` tag-shape rule.

## Approach

Reuse existing suites and runners instead of adding another harness. Keep the
deterministic checks local-first and non-blocking when git is unavailable.
Preserve the sibling change's process decisions and do not copy its
specification into this change.

Rejected: a separate quality workflow; broadening live release validation in
dev; rewriting full scanner walkers from scratch; changing coverage
thresholds; changing user-facing release pins or tags.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/verify.js` | Modified | Invoke the existing root manifest test suites deterministically |
| `scripts/manifest/generate-manifest.test.js` | Unchanged, exercised | Existing generator coverage |
| `scripts/manifest/validate-manifest.test.js` | Unchanged, exercised | Existing validator coverage |
| `scripts/manifest/check-parity.test.js` | Unchanged, exercised | Existing parity coverage |
| `scripts/guard-text-encoding.js` | Added | Tracked-text guard for replacement characters/undecodable bytes |
| `scripts/guard-text-encoding.test.js` | Added | Unit coverage for filtering and failure reporting |
| `iNNfo/scripts/check-spec-version.mjs` | Modified | Centralize git-visible file selection; apply it to repository scans |
| `scripts/check-integrity.js` | Modified | Preserve mcp coverage + spec URLs; document residual CI nonequivalence |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modified | Align the Group 5 prose with the maintained CLI behavior |
| `.agents/skills/nn-dev-release/SKILL.md` | Modified | Add Console release option and `-v` tag-shape requirement |
| `iNNfo/packages/innfo-mcp/src/tools/check-workspace.spec.ts` | Modified | Use the shared cleanup helper |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts` | Modified | Use the shared cleanup helper |
| `iNNfo/packages/innfo-mcp/test/helpers/fs-retry.ts` | Added | Retry transient Windows cleanup failures only |
| `openspec/changes/2026-09-11-dev-main-process-gaps/` | Added | This change |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wiring existing suites exposes a latent manifest-test failure | Low | They are the same suites the change is meant to surface; fix or record as a separate defect instead of skipping |
| The encoding guard flags a fixture or generated file | Med | Tracked-text categories and binary/generated exclusions are explicit; add allowlist entries only with a reviewer note |
| Git-aware filtering behaves differently outside a checkout | Low | Fall back to current filesystem behavior when git data is unavailable |
| Duplicated cleanup behavior drifts again | Low | Replace both copies with imports from the shared helper |

## Rollback Plan

Revert the implementation commits. No data, tags, pins, branches, user data, or
workspace caches are changed by this change.

## Dependencies

- Sibling context only: `openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening`.
- Root and `iNNfo` test runners already present in `package.json`.

## Success Criteria

- [ ] `node scripts/verify.js` executes all three root manifest suites and fails
  when any suite fails.
- [ ] An undecodable tracked text file or tracked `U+FFFD` fails the
  deterministic checks with file and reason.
- [ ] `check-integrity --pre-push` executes innfo-mcp coverage and spec-URL
  resolution, and documents any remaining deliberate CI nonequivalence.
- [ ] Repository scans exclude gitignored local artifacts when git metadata is
  available.
- [ ] `nn-dev-release` names the Console subsystem and refuses a non-`-v`
  stable tag.
- [ ] Both `innfo-mcp` specs use one shared cleanup helper with transient-only
  retries.
