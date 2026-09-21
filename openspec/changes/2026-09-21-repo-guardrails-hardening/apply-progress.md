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

### Remaining Tasks (Slices 2-5, not started this batch)

- [ ] Slice 2 — `native-pre-push-hook` (F1): `.githooks/pre-push`,
      `core.hooksPath` wiring, README note, 4-point manual falsification.
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
- Current work unit: Slice 1 — `ci-stable-manifest-on-dev`. Complete.
- Boundary: starts after `39b2af7` (pre-existing tip), ends at `ca1d267`.
  Fully isolated to `.github/workflows/ci.yml`'s new step; zero file overlap
  with slices 2-5.
- Estimated review budget impact: ~12 changed lines (design estimated ~8;
  actual diff is 12 insertions including the explanatory comment). Well
  under the 400-line budget; no chaining decision needed for this slice
  alone.

### Commits Landed This Batch

1. `b10af85` — `docs(openspec): add repo-guardrails-hardening planning artifacts`
2. `ca1d267` — `feat(ci): surface stable-manifest coherence on dev pushes`

### Foreign Working-Tree Paths (integrity check)

- Before this batch: `14 ??`, `56 D`, `2 M` (baseline established at start of
  this run).
- After this batch: `13 ??`, `56 D`, `2 M` (the `??` count dropped by 1
  because one previously-untracked path was one of this change's own 8
  planning files, now committed; `D` count and the 2 foreign `M` files are
  byte-identical to baseline). No foreign path was touched, staged, or
  altered by this batch.

### Status

1/5 slices complete (Slice 1 done). Ready for the next `sdd-apply` batch to
implement Slice 2 (`native-pre-push-hook`), or for a maintainer to review and
push `dev` to trigger the real Slice 1 falsification run before continuing.
