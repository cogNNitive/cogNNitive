# Exploration: Deploy Pain vs Concurrent Sessions

## Question

Are the recurring deployment headaches caused by overlapping agents/sessions
stepping on each other, and do the `nn-dev-*` skills need changes to handle it?

## Evidence (verified, not assumed)

### Engram history (project `cognnitive`, session #1117, 2026-09-10)

- Batched `dev → main` merge landed RED; 3 fix-forward commits to `93b79f3`.
  Batch had never run on CI (dev has no CI); `main` was ALREADY red
  (spec-integrity) before the batch.
- Local pre-push gate blind spots (later hardened in `a84a204`, `8de0252`,
  `918e43a`): gitignored build artifacts masked the version square, group 5 ran
  `npm test` instead of `test:coverage`, never ran `check:spec-urls`,
  Windows-only EBUSY flake in innfo-mcp specs.
- Dev-gate/release coupling (backlog #17, fixed `38df579`): the live
  stable-manifest check ran on dev and blocked every release-shaped change
  (merge → tag → pin is circular without `--release` split).
- Concurrency incidents: HEAD moved mid-session (`49c5b08 → 918e43a`) by a
  sibling agent; FOREIGN uncommitted WIP left in the shared tree ("confirm
  whose session before committing"); uncommitted 0.5.0 bump leaked into
  `manifest/source.yaml` pin (2026-09-08); PR #83 dev → main nearly duplicated.

### Repo verification (this session)

- `.github/workflows/ci.yml` triggers ONLY on `push` / `pull_request` to
  `main` (lines 4-7). `dev` has zero CI. CONFIRMED via `Select-String`.
- `nn-dev-development` SKILL.md already documents the concurrency failure
  catalog: branch switched mid-task, `main` advanced, foreign stashes,
  half-applied fixes by sibling session (2026-09-06/07).
- `nn-dev-check-integrity` Group 1 covers commit/push/merge/deploy sync but
  the Pages/CDN leg is WARNING-level; a tag alone does not deploy
  (`mcp-two-distribution-channels.md`: CDN frozen at v0.2.1, repo at v0.2.4).
- `nn-dev-release` documents merge → tag → pin order and the dirty-tree pin
  contamination expediente.

## Verdict

Three distinct root families, not one:

| # | Family | Root | Status |
|---|--------|------|--------|
| A | Concurrency | Shared tree, anonymous dirty WIP, stolen branches | Partially mitigated (detect/report only) |
| B | Verification gap | No CI on `dev`; batches land unverified; red `main` unnoticed | Open (retrospective #1 item) |
| C | Release coupling | Tag ≠ deploy; Pages/CDN are separate channels; pin order fragile | Partially fixed (#17, TAG_SHAPE_RE) |

## Implication for the skills

Detection without enforcement is not holding. The skills need:
prescriptive attribution rules (A), a merge gate tied to real verification (B),
and a complete definition of "deployed" (C). Proposed as change
`2026-09-10-dev-skills-concurrency-deploy-hardening`.
