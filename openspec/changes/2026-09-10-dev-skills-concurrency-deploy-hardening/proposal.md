# Proposal: Harden nn-dev Skills Against Concurrent-Session Deploy Pain

## Intent

Turn the `nn-dev-*` maintainer skills from detect-and-report into
detect-and-enforce for the three recurring deploy-pain families: anonymous
concurrent-session writes (A), unverified `dev → main` batches (B), and
incomplete "deployed" definitions (C). Goal: no more red landings on `main`,
no more foreign-WIP ambiguity, no more "tagged but not deployed".

## Scope

### In Scope

- `nn-dev-development`: session-attributed `wip:` commits, dirty-tree age rule,
  session-claim convention for the shared tree.
- `nn-dev-check-integrity`: Group 1 escalation (Pages/CDN/deploy legs become
  blockers for release-shaped changes), merge-gate rule (forbid `dev → main`
  on red/ahead `origin/main`).
- `nn-dev-release`: deploy definition of done (tag + CI-on-tip + Pages +
  CDN/manifest), merge → tag → pin order restated as a gate.
- `.github/workflows/ci.yml`: run CI on `dev` pushes (retrospective item #1),
  keeping `--release` semantics push-to-main-only.

### Out of Scope

- Git worktrees per agent (evaluated, rejected: same repo reality, doubles
  Pages/CDN pin confusion; see Approach).
- Auto-merging, auto-tagging, or any skill that writes/deletes without consent.
- Changing the single-branch (`dev`) model itself.
- MCP, templates, editor, or user-facing skills.

## Capabilities

### New Capabilities

- `session-attributed-wip`: every session's in-flight work is attributable via
  `wip:<session-id>` commits on `dev`; anonymous dirty trees expire.
- `merge-gate`: a mechanical pre-merge checklist that blocks `dev → main`
  unless the batch is CI-verified and `origin/main` is green and stationary.
- `deployed-definition-of-done`: release Checklist with all four legs
  (tag, CI-on-tip, Pages, CDN/manifest) verified, not assumed.

### Modified Capabilities

- `monorepo-release-manifest`: release flow gains the merge-gate and the
  deploy-DoD (no requirement text changes in `openspec/specs/`, additive only).
- `workspace-git-collaboration`: single-branch discipline gains attribution
  and claim rules.

## Approach

Enforce-at-the-gate (RECOMMENDED): keep the skills read-only by default, but
promote the concurrency/deploy checks from warnings to hard blockers exactly
where they already exist (Group 0/1, consent gate, release flow), and give CI
to `dev` so the merge gate has real evidence. Rejected: per-agent worktrees
(operational cost, pin confusion across checkouts), fully automatic merging
(violates the consent-first convention the maintainer chose).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.agents/skills/nn-dev-development/SKILL.md` | Modified | §1e + new §1f: `wip:<session-id>` rule, dirty-tree age ❌, session-claim convention |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modified | Group 1: deploy legs ❌ for release changes; new merge-gate rule |
| `.agents/skills/nn-dev-release/SKILL.md` | Modified | Deploy-DoD checklist; merge → tag → pin as gate |
| `.github/workflows/ci.yml` | Modified | Add `dev` to push branches (verify job only; `--release` stays main-only) |
| `openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening/` | Added | This change (exploration, proposal, spec, design, tasks) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CI-on-dev doubles runner minutes / noise | Med | Verify-only job on dev, no Pages deploy, no `--release`; revert trigger in one line |
| Stricter gates slow solo sessions | Low | Gates fire only on release-shaped changes and merges, not day-to-day `dev` work |
| Session-id convention ignored by foreign agents | Med | Claim is advisory for others; OUR sessions obey it, and anonymous WIP is never staged |
| `main` red blocks all merges (gate too strict) | Low | Gate distinguishes "red caused by this batch" (fix-forward first) from pre-existing red (record exception) |

## Rollback Plan

All skill edits are prose in versioned files: `git revert` the batch. CI
trigger change reverts in one line. No data, no tags, no pins touched by this
change itself (planning + skill prose only).

## Dependencies

- None on other open changes. Evidence: Engram #1117, `ci.yml` lines 4-7,
  skill files read 2026-09-10.

## Success Criteria

- [ ] A foreign anonymous dirty tree is a ❌ with a named owner question, never
  a silent ambiguity.
- [ ] `dev → main` cannot land without a green CI signal on the exact batch
  (dev CI or documented rehearsal) and a green, stationary `origin/main`.
- [ ] "Deployed" is checkable in one Group 1 run: tag + CI-on-tip + Pages +
  CDN/manifest, all green.
- [ ] Full `node scripts/check-integrity.js` passes after the skill edits.
