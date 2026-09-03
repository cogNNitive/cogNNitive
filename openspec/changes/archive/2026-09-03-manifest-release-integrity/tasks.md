# Tasks: Manifest Release Integrity

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | eNNvironment PR: ~900-1400 (new generator + tests + validator rewrite + regenerated manifest); actioNN PR: ~40-80 |
| 400-line budget risk | eNNvironment: High. actioNN: Low |
| Chained PRs recommended | No — split is by repo (structural), not by budget-chaining |
| Suggested split | One PR per repo: eNNvironment PR, actioNN PR. iNNfo: tag-only, no PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Maintainer accepted `size:exception` for the eNNvironment PR per explicit instruction to deliver the whole change in one pass; actioNN PR is within budget.

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|-----|-------|
| 1 | eNNvironment: auth + validator hardening + generator + regenerated manifests + workflow | PR 1 (eNNvironment) | size:exception recorded; work-unit commits per phase below |
| 2 | actioNN: consumer regression test + docs | PR 2 (actioNN) | independent of PR 1; can start immediately |
| — | iNNfo, actioNN: cut tags | User's act | Blocking precondition for Phase 6 only, not a repo task |

## Phase 0: Blocking Precondition Gate (external, non-code)

- [x] 0.1 GATE: confirm iNNfo `feat/business-template-decomposition` merged to `main`.
- [x] 0.2 GATE: confirm iNNfo tags `templates-v0.2.0` and `innfo-mcp-v0.2.1` cut on `main`.
- [x] 0.3 GATE: confirm actioNN `feat/innfo-v0-2-0-adoption` merged to `main`.
- [x] 0.4 GATE: confirm actioNN tag `skills-v1.0.0` cut on `main`.

Only Phase 6 (stable regeneration) blocks on 0.1-0.4. All other phases proceed without it.

## Phase 1: CI Authentication — eNNvironment (do FIRST, before validator adds more per-entry calls)

- [x] 1.1 RED `validate-manifest.test.js`: assert `apiRequest`/`fetchString` send `Authorization: Bearer` when `GITHUB_TOKEN` is set (stub `https.get`, inspect headers).
- [x] 1.2 GREEN `validate-manifest.js`: read `GITHUB_TOKEN`/`GH_TOKEN`; add `Authorization: Bearer` header to both helpers; on 403/429 exit non-zero with `set GITHUB_TOKEN to raise the rate limit`.
- [x] 1.3 `.github/workflows/manifest-validate.yml`: add `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to the test step and the validate step.
- [x] 1.4 Verify: `node eNNvironment/scripts/validate-manifest.test.js` green.

## Phase 2: Validator — `ref` becomes mandatory

- [x] 2.1 RED+fixture (same commit): add `ref: skills-v1.0.0` to test case 1's legacy fixture; add a new case with `ref` omitted that MUST fail.
- [x] 2.2 GREEN `validate-manifest.js`: add `ref` to `structuralViolations` required fields.
- [x] 2.3 Verify: suite green.

## Phase 3: Validator — repo-scoped existence (422 handling)

- [x] 3.1 RED: wrong-repo SHA (`GET /repos/{repo}/commits/{sha}` → 422) fails with a distinguishable message; correct repo (200) passes.
- [x] 3.2 GREEN: rewrite `checkCommitExists` — 422 = "wrong repo", 200 = pass, 403/429 = rate limit, other = generic existence failure.
- [x] 3.3 Verify: suite green.

## Phase 4: Validator — channel policy, reachability, mcp pinning

- [x] 4.1 RED: `CHANNELS` table selects file/rules by channel; `resolveRef` via `compare/main...{sha}` (`ahead` = orphan tip, fails stable; `identical`/`behind` = passes); tag peel via `git/tags/{sha}` when `object.type === 'tag'`.
- [x] 4.2 GREEN: implement `CHANNELS` table, `resolveRef(repo, ref)`, `ref-resolves-in-declared-repo`, `ref-kind`, `tag-shape` (`^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$`), release-provenance (stable only).
- [x] 4.3 RED+GREEN: `mcp-url-pinned` — url embeds 40-hex commit, rejects `/main/`.
- [x] 4.4 GREEN: CLI `--channel stable|preview` flag; no flag validates every channel file present.
- [x] 4.5 Verify: `node eNNvironment/scripts/validate-manifest.test.js` green.

## Phase 5: Generator (new files, injectable resolver — no network in unit tests)

- [x] 5.1 RED, create `generate-manifest.test.js`: determinism (byte-identical re-render), `--check` drift (exit 1 + diff), `note:` rendering, all-or-nothing on resolution failure (exit 2, no partial write), LF + single trailing newline.
- [x] 5.2 Create `manifest/source.yaml` (SHA-free: entries, `ref_key`, per-channel refs, optional `note`), `manifest/body.md` (prose extracted verbatim from current `manifest.md`), `manifest/body.preview-banner.md`.
- [x] 5.3 GREEN, create `scripts/generate-manifest.js`: deterministic emitter, `resolveRef` via GitHub API (reuse Phase 1 auth), `--channel`, `--check`, `--out`, exit 0/1/2.
- [x] 5.4 Verify: `node eNNvironment/scripts/generate-manifest.test.js` green.

## Phase 6: Regenerate stable manifest [BLOCKED by Phase 0]

- [x] 6.1 Run `generate-manifest.js --channel stable` against pre-Phase-0 refs; commit the reformat alone as a separate normalization commit (no pin changes).
- [x] 6.2 After Phase 0 confirms tags: re-run generator; commit the resulting pin changes (`ref`, corrected `commit`, commit-pinned `mcp[].url`) as its own commit.
- [x] 6.3 Run `generate-manifest.js --channel preview` from branch tips; commit `docs/use/manifest-next.md` (no tag required, unblocked).

## Phase 7: Preview plumbing + repo hygiene (parallel with 6.3)

- [x] 7.1 `docs/use/index.html`: add prose on preview usage; keep `rel=alternate` stable-only.
- [x] 7.2 Create `.gitattributes`: `docs/use/manifest*.md text eol=lf`.

## Phase 8: Workflow wiring

- [x] 8.1 `.github/workflows/manifest-validate.yml`: add `generate --check` step for both channels; validate both channels; add `schedule:` cron.
- [x] 8.2 Verify: workflow review (actionlint if available, else manual read).

## Phase 9: actioNN (independent PR, parallel with Phases 2-8)

- [x] 9.1 RED `skills-manager.test.js`: manifest carrying `ref` parses without error; `version`-only change does not mark outdated.
- [x] 9.2 GREEN: confirm `skills-manager.js` passes `ref` through untouched; patch only if 9.1 is red. (Test 9.1 was not red — no production code change needed.)
- [x] 9.3 `docs/documentation/skills/skills-manager.md`: document `SM_MANIFEST_URL` preview opt-in. Done: the blocking uncommitted work was committed separately (actioNN c518008) and the task landed in 32e1a02.
- [x] 9.4 `AGENTS.md`: note stable URL is canonical; preview is explicit opt-in. Done: landed in actioNN 32e1a02.
- [x] 9.5 Verify: `node actioNN/scripts/skills-manager.test.js` green.

## Phase 10: Final verification

- [x] 10.1 eNNvironment (post Phase 0): `node scripts/validate-manifest.test.js && node scripts/generate-manifest.test.js && node scripts/validate-manifest.js --channel stable && node scripts/validate-manifest.js --channel preview`.
- [x] 10.2 Confirm every checkbox in `proposal.md` Success Criteria is satisfied. Validation is green and automated via GitHub Actions workflow on main in the unified cogNNitive monorepo.
