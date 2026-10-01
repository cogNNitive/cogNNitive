# Proposal: Single-developer development workflow

## Intent

The repo was architected like a multi-team open-source project — full OpenSpec ceremony, skills that assume **foreign collaborators** (the "yours or foreign?" gate, the WIP-orphan blocker, staging bans), and a single shared working tree. It is operated by **one developer** driving several AI agents (OpenCode, Antigravity, Claude Code). That mismatch is the root of the daily friction: the same process/concurrency/integrity hazard has recurred across ~20 archived changes, and `verify.js` surfaces reds one at a time (`process.exit` on the first failing suite), forcing whack-a-mole.

Two shipped decisions declared the concurrency hazard unsolvable (`repo-guardrails-hardening` F5; `safe-ff-merge-technique` "remains open and out of scope"). That is wrong: the hazard is mechanical (N processes, one directory) and is solved by **isolation**, not attribution.

## Scope

### In Scope
- Session isolation: a write-intended session works in its own `git worktree` of `dev`; the primary checkout becomes the integration tree.
- Commit-early invariant; the `wip:<session-id>:` checkpoint stays as durability, not as a first-write gate.
- Drop the "yours or foreign?" ceremony, the WIP-orphan blocker, and the staging bans (`add -A`/`add .`/`commit -a`); keep the five destructive-command bans.
- Complete-feedback gate: `verify.js` runs the full roster and reports every failure before exiting non-zero.
- Gates evaluate against committed `HEAD`, never a shared dirty tree.

### Out of Scope
- Consolidating committed derived artifacts (bundles/mirrors/registries) into one regen command — **separate follow-up change**.
- De-duplicating CLI/MCP/bundle contract copies — **separate follow-up change**.
- Any product/domain refactor (parsers, editor, iNNfo model). None.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `dev-skills`: session attribution → session isolation; add commit-early and gates-on-HEAD; remove the anonymous-dirty-tree blocker and the shared-tree claim.
- `quality-gates`: the manifest-suite requirement drops "immediately fail on first nonzero" in favor of full-roster, all-failures reporting.
- `safe-ff-merge-technique`: remove the "hazard remains open and out of scope" clause; the technique now composes with session isolation.

## Approach

Ship an **executable primitive** (`scripts/nn-session.mjs`) that a session start invokes to create/reuse its own worktree (sharing `node_modules` via a directory junction), because the failed precedent proved "a sixth document is not a control". The skill, hook, and gate changes ride on that primitive.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/nn-session.mjs` | New | session worktree create/reuse/list/stop helper |
| `scripts/verify.js` | Modified | run all suites, collect all failures |
| `.agents/skills/nn-dev-development/SKILL.md` | Modified | isolate first, drop foreign-WIP ceremony |
| `.claude/hooks/block-dangerous-git.mjs` (+ test) | Modified | allow staging; keep destructive bans |
| `AGENTS.md` | Modified | session-start mandate points at isolation |
| `openspec/specs/{dev-skills,quality-gates,safe-ff-merge-technique}` | Modified | delta specs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Per-worktree `node_modules` install cost | High | Junction the primary tree's install; `npm install` as documented fallback |
| Agents that skip the skill bypass isolation | Med | Keep the destructive-command hook; state the invariant in AGENTS.md |
| Session edits the primary tree by mistake | Med | Helper prints the worktree path; skill refuses writes outside it |

## Rollback Plan

Revert the change: specs return to the advisory model, the hook re-blocks staging, and `nn-session.mjs` is deleted. No persisted workspace format changes; rollback is inert for users.

## Dependencies

None external. Requires the parked worktree sketch (superseded) and the `dev` branch as the integration base.

## Success Criteria

- [ ] A session start produces/reuses its own worktree; two sessions never share a directory.
- [ ] `nn-dev-development` no longer asks "yours or foreign?" and no longer blocks on a dirty tree.
- [ ] `add -A`/`add .`/`commit -a` are permitted; the five destructive commands stay blocked.
- [ ] `verify.js` reports every failing suite in one run and exits non-zero only after the full roster.
- [ ] `openspec/specs/{dev-skills,quality-gates,safe-ff-merge-technique}` no longer declare the hazard out of scope.
