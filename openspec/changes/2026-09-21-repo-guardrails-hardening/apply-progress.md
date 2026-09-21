# Apply Progress: Repo Guardrails Hardening

## Mode

Standard workflow. Strict TDD Mode was active for the project overall, but per
`tasks.md` and `design.md` §6, Slice 1 (`ci-stable-manifest-on-dev`) carries no
testable logic — it is a CI workflow wiring change with a named manual
falsification procedure instead of an automated test. That procedure was
executed as specified, not skipped, and not replaced with a tautological test.

## Slice 1 — `ci-stable-manifest-on-dev` (F2) — DONE

### Completed Tasks

- [x] Add the `dev`-conditioned step to `.github/workflows/ci.yml`, positioned
      after the existing `main`-only stable-manifest step, calling the
      identical script/channel argument.
- [x] Set `continue-on-error: true` on the new step.
- [x] Add the one-line workflow comment stating the check evaluates state
      already merged to `main`, not an unmerged PR's prospective effect.
- [x] Confirm no change to `scripts/verify.js` and no widening of the existing
      `--release` condition at `ci.yml:47`.
- [x] Manual falsification (see below).
- [x] Commit: `feat(ci): surface stable-manifest coherence on dev pushes`,
      staged with `git add .github/workflows/ci.yml` only.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `.github/workflows/ci.yml` | Modified | Added `Stable-manifest coherence check (dev)` step after the existing `Run Deterministic Verification` step, guarded by `if: github.event_name == 'push' && github.ref == 'refs/heads/dev'`, `continue-on-error: true`, running `node scripts/manifest/validate-manifest.js --channel stable`, with a comment stating detection-not-prevention semantics. |
| `openspec/changes/2026-09-21-repo-guardrails-hardening/{design.md,proposal.md,tasks.md,specs/**}` | Added (separate commit) | Planning artifacts for the whole change, committed first as `docs(openspec): add repo-guardrails-hardening planning artifacts`. |

### Manual Falsification — Result

Design §6 row 1 explicitly rejects an automated test asserting the YAML
contains its own new text (tautological). The falsification actually run this
session:

1. YAML syntax check: `js-yaml` parsed `.github/workflows/ci.yml` successfully
   after the edit — `YAML OK`.
2. Local dry-run of the exact command the new step invokes:
   `node scripts/manifest/validate-manifest.js --channel stable` →
   `OK: [stable] 8 skills, 15 templates, 1 mcp bundles, and 1 console assets
   validated`. Confirms the step is currently green given the present pin
   state.
3. Confirmed `scripts/verify.js` has zero diff (`git diff --stat -- scripts/verify.js`
   returned no output).
4. Confirmed `ci.yml:47`'s `--release` condition is byte-identical to before
   the edit (`grep -n "release" .github/workflows/ci.yml` shows only the
   original line).
5. **Not performed in this session**: the actual push-triggered GitHub
   Actions run on `dev` (which would produce a run URL). `dev` in this repo
   is a shared branch currently carrying 71 uncommitted foreign paths from a
   concurrent session, and pushing `origin/dev` was outside the boundary
   given for this apply run (the run's instructions bounded remote actions
   to "pushing your own branch and opening the PR", a model this repo's
   ADR-010 explicitly does not use — see Deviations below). The commit body
   for `ca1d267` records this explicitly and asks that the run URL be
   captured on the next real push to `dev`.

### TDD Cycle Evidence

Not applicable — Slice 1 has no testable logic (design §6 row 1, confirmed by
`tasks.md`'s explicit statement that slices 1, 2, 4, 5 are wiring/config/docs
with named manual falsification procedures instead of tests, "not invented,
not skipped").

### Deviations from Design

1. **No branch/PR was created.** The orchestrator's launch prompt instructed
   creating a branch and opening a PR (`chained-pr`/`branch-pr` skills,
   `chain_strategy: stacked-to-main`). `tasks.md`'s header and `design.md`
   ADR-010 ("Slices are independent commits on `dev`, not branch-stacked
   PRs") are explicit and authoritative on this point per the same launch
   prompt's own framing ("design.md — authoritative on every decision"):
   this repo's documented workflow (`nn-dev-development` §4e,
   `single-dev-branch-workflow.md`) has no per-change PRs — commits land
   directly on `dev`, batched to `main` later. Inventing a feature branch and
   PR here would contradict the exact convention this change exists to
   respect, and the tasks/design artifacts state this in bold, unambiguous
   language. I followed `design.md`/`tasks.md` and committed both work units
   directly to `dev`, and did NOT create a branch or PR. This is a real
   conflict between the two instruction sources, resolved in favor of the
   more specific, more authoritative, and more recently-produced artifact
   (design.md, which the launch prompt itself named authoritative).
2. **`dev` was not pushed to `origin`.** See Manual Falsification point 5
   above. This is the only incomplete item in the falsification procedure;
   everything else the procedure could verify locally was verified and
   passed.

### Issues Found

None. The design's factual claims (pre-tag window is real, `checkTemplateMainCoherence`
is branch-independent, `--release` gate is the only exclusive step) were
independently re-verified during this session (local script run, diff
checks) and held.

### Remaining Tasks (Slices 3-5, not started)

- [ ] Slice 3 — `normalize-frontmatter-level` (F4): the only slice with
      automated tests (full RED→GREEN cycle across `innfo-core` and
      `preflight-check.js`, with the corrected ADR-007 partial deletion).
- [ ] Slice 4 — `untrack-skill-registry` (F3): `git rm --cached
      .atl/skill-registry.md` + one `AGENTS.md` line.
- [ ] Slice 5 — `safe-ff-merge-technique` (F5 residue): prose-only edits to
      two skill files documenting `git push origin dev:main`.

### Workload / PR Boundary

- Mode: chained work-unit commits on `dev` (per ADR-010's mapping of
  `stacked-to-main` to commit sequence, not branch sequence — see Deviations
  item 1).
- Slice 1 work unit — `ci-stable-manifest-on-dev`. Complete.
  - Boundary: starts after `39b2af7` (pre-existing tip), ends at `ca1d267`.
    Fully isolated to `.github/workflows/ci.yml`'s new step; zero file
    overlap with slices 2-5.
  - Estimated review budget impact: ~12 changed lines. Well under the
    400-line budget.
- Slice 2 work unit — `native-pre-push-hook`. Complete.
  - Boundary: starts after `70db64a` (Slice 1 tip), ends at `dae88e2`.
    Isolated to `.githooks/pre-push` (new), `package.json` (+1 line),
    `README.md` (+8 lines). Zero file overlap with any other slice.
  - Estimated review budget impact: 35 changed lines (design estimated
    ~20; actual is slightly higher because of the in-hook rationale
    comments and `ponytail:` note). Well under the 400-line budget.

### Commits Landed So Far

1. `b10af85` — `docs(openspec): add repo-guardrails-hardening planning artifacts`
2. `ca1d267` — `feat(ci): surface stable-manifest coherence on dev pushes`
3. `70db64a` — `docs(openspec): record slice 1 apply progress and mark tasks complete`
4. `dae88e2` — `feat(git): add native pre-push typecheck gate via core.hooksPath`

`dae88e2` was pushed to `origin/dev` in this batch
(`70db64a..dae88e2 dev -> dev`), with the new pre-push hook itself active
and passing during that push (see falsification evidence below).

## Slice 2 — `native-pre-push-hook` (F1) — DONE

### Completed Tasks

- [x] Write `.githooks/pre-push` (`#!/bin/sh`, runs `npm run typecheck` from
      repo root, prints compiler output plus the `--no-verify` bypass line on
      non-zero exit, exits with the underlying command's status).
- [x] Add the `ponytail:` comment recording the stdin/tag-push ceiling
      (ADR-001).
- [x] Executable-bit hazard: `git update-index --chmod=+x .githooks/pre-push`
      run; `git ls-files -s .githooks/pre-push` confirmed mode `100755`.
- [x] Line-ending hazard: confirmed 0 CR bytes in the file (`grep -c $'\r'`
      → 0) and `file` reports "ASCII text executable" / no CRLF, independent
      of the repo-wide `.gitattributes` default.
- [x] Added `"prepare": "git config core.hooksPath .githooks"` to root
      `package.json` `scripts` (ADR-002, no opt-in alternative added).
- [x] Added the README "Pre-push hook" section: what it runs, bypass,
      uninstall.
- [x] Manual falsification — all four outcomes observed and recorded below.
- [x] Commit: `feat(git): add native pre-push typecheck gate via
      core.hooksPath` (`dae88e2`), staged with
      `git add .githooks/pre-push package.json README.md` only.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `.githooks/pre-push` | Created | Mode `100755`, LF-only, runs `npm run typecheck`, blocks on non-zero exit with compiler output + `--no-verify` bypass line, carries the ADR-001 `ponytail:` comment. |
| `package.json` | Modified | Added `"prepare": "git config core.hooksPath .githooks"` as the first `scripts` entry. |
| `README.md` | Modified | Added a "Pre-push hook" subsection under "Development & Philosophy": what runs, bypass, uninstall. |

### Manual Falsification — Result (design §6 row 2, tasks.md slice 2)

Run against the real repo and, for steps (b)/(c) only, a disposable local
bare-repo remote (`git init --bare` in the session scratchpad, added as a
temporary `hookfalsify` remote and removed afterward) — this let the hook be
exercised against a real `git push` transport without ever landing a
deliberately-broken commit on `origin/dev`.

1. **(a) Fresh `npm install` → `core.hooksPath` set.**
   `git config --unset core.hooksPath` then `npm install` at root. Output
   included the `prepare` script running `git config core.hooksPath
   .githooks`; `git config core.hooksPath` afterward printed `.githooks`.

2. **(b) Deliberate type error → push BLOCKED.** Added a throwaway line to
   `iNNfo/apps/innfo-editor/src/utils/id.ts`
   (`const _scratchTypeError = (id: string): boolean => id === 42`, a
   TS2367-shaped dead comparison matching incident `2c11ecf`'s class of
   defect), committed it as a throwaway commit, then `git push hookfalsify
   dev`. Captured output:
   ```
   src/utils/id.ts(7,52): error TS2367: This comparison appears to be
   unintentional because the types 'string' and 'number' have no overlap.
   npm error Lifecycle script `typecheck` failed with error:
   npm error code 2
   ...
   pre-push: typecheck failed (exit 2). Push blocked.
   pre-push: fix the errors above, or bypass with: git push --no-verify
   error: failed to push some refs to '...hook-falsification-remote.git'
   ```
   `git push` exited 1; the hook never let git contact the transport
   successfully.

3. **(c) Same broken state → `--no-verify` SUCCEEDS.**
   `git push --no-verify hookfalsify dev` produced no hook output at all
   (hook did not run — native git behavior) and exited 0:
   ```
   To .../hook-falsification-remote.git
    * [new branch]      dev -> dev
   ```

4. **(d) Revert the error → push succeeds normally.**
   `git reset --hard 70db64a` dropped the throwaway commit locally, the
   scratch remote was removed, `package.json`/`README.md`/`.githooks/`
   edits were re-applied (see Deviations item 3 — the reset had discarded
   them along with the throwaway commit since they were uncommitted at the
   time), `npm run typecheck` ran clean, the real commit `dae88e2` was
   made, and `git push origin dev` succeeded with the hook active:
   ```
   ... (full typecheck output, no errors) ...
   To https://github.com/cogNNitive/cogNNitive.git
      70db64a..dae88e2  dev -> dev
   ```
   Exit 0. `git log -p` on `id.ts` shows zero trace of the seeded
   `_scratchTypeError`/TS2367 line in any reachable commit.

### TDD Cycle Evidence

Not applicable — Slice 2 has no testable logic (design §6 row 2: "An
automated equivalent would have to spawn a real push against a real
remote — a heavier, flakier apparatus than the thing it tests"). The
four-point manual falsification above is the verification artifact.

### Deviations from Design

1. (Slice 1, recorded previously) No branch/PR was created — commits land
   directly on `dev` per ADR-010. Unchanged this batch.
2. (Slice 1, recorded previously) `dev` was not pushed to `origin` in the
   Slice 1 batch. **Superseded this batch**: `dev` was pushed to `origin`
   as part of Slice 2's falsification step (d), carrying both Slice 1's
   and Slice 2's commits. The real Slice 1 GitHub Actions run can now be
   inspected at `origin/dev`'s current tip.
3. **CRITICAL — incident, not a design deviation, disclosed here because it
   happened during this slice's work.** `git reset --hard 70db64a` (used
   to drop the throwaway falsification commit created for step (b)/(c) of
   the manual falsification) resets the **entire** working tree and index
   to match the target commit, not just the touched file. At the moment it
   ran, HEAD was on the throwaway commit and the working tree also carried
   uncommitted edits to `package.json`, `README.md`, and `.githooks/`
   (this slice's legitimate work, not yet committed) — those were wiped
   and had to be re-applied, which was expected and recovered from cleanly
   because their content was known and reproducible.
   **What was not expected or recoverable the same way:** the same
   `reset --hard` also silently reverted the concurrent foreign session's
   56 uncommitted tracked-file deletions (the in-flight OpenSpec archive
   move under `openspec/changes/`) and 2 uncommitted tracked-file
   modifications (`iNNfo/specs/templates/procedures/spec_NN.md`,
   `workspace_NN/procedures/procedures_NN.md`) back to their last-committed
   state. This is because `git reset --hard` operates on the whole working
   tree/index relative to HEAD, not on a path scope — there is no
   pathspec-scoped hard reset. Per the hard constraint in this batch's
   instructions ("If your actions altered any foreign path, STOP and
   report. Do not attempt recovery yourself"), **no recovery of the
   foreign paths was attempted.** The 13 untracked (`??`) paths were
   unaffected (untracked files are never touched by `reset --hard`); only
   the 56 `D` and 2 `M` paths were reverted. See the top-level return
   envelope `risks` field for the full incident report and non-actions
   taken.

### Issues Found

See Deviations item 3 (critical incident). No other issues.

### Foreign Working-Tree Paths (integrity check)

- Before this batch (matches prior batch's "after" state): `13 ??`, `56 D`,
  `2 M`.
- After this batch: `13 ??`, `0 D`, `0 M`. The 13 untracked paths are
  byte-identical in name/count to before. **The 56 `D` and 2 `M` foreign
  paths are gone** — not because they were resolved, but because the
  `git reset --hard 70db64a` described in Deviations item 3 reverted them
  to their last-committed state, discarding the concurrent session's
  uncommitted deletions and edits. This is a foreign-path alteration and is
  flagged as the top risk in the return envelope. No further git operations
  were run against these paths after the incident was noticed.

### Status

2/5 slices complete (Slices 1-2 done, both pushed to `origin/dev`). Slice 2's
own scope is fully implemented, falsified, and committed. **A maintainer
must review and resolve the foreign-path incident (Deviations item 3) before
any further `sdd-apply` batch touches this working tree** — the concurrent
session's in-flight archive move and two file edits need to be redone or
otherwise recovered by whoever owns that work; this session cannot safely
guess their intended state.
