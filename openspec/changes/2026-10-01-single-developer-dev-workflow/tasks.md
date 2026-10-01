# Tasks: Single-developer development workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 (helper ~120 + tests ~180 + skill ~100 + hook/verify ~50) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | P1 helper+skill → P2 gate+hook |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `nn-session.mjs` + skill isolation | PR 1 | standalone, TDD |
| 2 | `verify.js` complete-feedback + hook + AGENTS.md | PR 2 | base PR 1 |

## Phase 1: Session isolation primitive

- [ ] 1.1 RED `scripts/nn-session.test.mjs`: temp repo — `start --id s1` creates `cogNNitive-s1` on `session/s1` from `dev`; second `start --id s1` reuses it (same path, no error); `list` names it; `stop --id s1` removes worktree + branch, leaves primary intact.
- [ ] 1.2 RED: junction — with primary `node_modules` present, `<target>/node_modules` exists; without it, prints a `WARNING` naming `npm install`.
- [ ] 1.3 GREEN `scripts/nn-session.mjs` (create/reuse/list/stop + junction). `[single-developer-dev-workflow:dev-skills:Session-attributed in-flight work]`
- [ ] 1.4 GREEN `.agents/skills/nn-dev-development/SKILL.md`: session start runs `node scripts/nn-session.mjs start`; remove the "yours or foreign?" gate and the stale-dirty-tree blocker; claim = worktree branch + id. `[dev-skills:Session-attributed in-flight work]`
- [ ] 1.5 Verify: `node scripts/nn-session.test.mjs`; skill-contract scan green.

## Phase 2: Gate feedback + hook + mandate

- [ ] 2.1 RED: verify.js — two injected failing suites → both named, exit non-zero once after the roster.
- [ ] 2.2 GREEN `scripts/verify.js`: collect failures, report all, exit once at end. `[quality-gates:Manifest suites in deterministic verification]`
- [ ] 2.3 GREEN `.claude/hooks/block-dangerous-git.mjs`: drop `add -A`/`add .`/`commit -a`; keep `reset --hard`/`clean`/`stash`/`branch -D`/`restore .`. Update `.test.mjs`. `[dev-skills]`
- [ ] 2.4 GREEN `AGENTS.md`: session-start mandate → `nn-session.mjs start`.
- [ ] 2.5 Verify: `node scripts/verify.js` green; `block-dangerous-git.test.mjs` green.

## Phase 3: Documentation

- [ ] 3.1 Update `openspec/specs/{dev-skills,quality-gates,safe-ff-merge-technique}` deltas are already written; reconcile with archive.
