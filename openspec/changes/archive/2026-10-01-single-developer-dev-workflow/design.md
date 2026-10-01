# Design: Single-developer development workflow

## Technical Approach

Replace advisory guards (attribution, prohibition) with one structural primitive: **directory isolation**. A session start runs `scripts/nn-session.mjs start`, which creates/reuses a `git worktree` of `dev` and shares `node_modules` via a junction. Everything else (skill, hook, gate) rides on that primitive.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Isolation mechanism | `git worktree` per session | a lock file, more tree-inspection hooks | isolation makes the hazard impossible; locks/add-detection are advisory and already failed |
| `node_modules` | directory junction to primary tree | per-worktree `npm install` | a 474-dir monorepo install per session is prohibitive |
| Gate feedback | run all suites, report all failures | keep abort-on-first | one red must not hide the rest (whack-a-mole) |
| Staging bans | drop `add -A`/`add .`/`commit -a` | keep all bans | staging bans protect against foreign paths that no longer exist; destructive bans still erase own-session work |
| Gate input | committed `HEAD` / detached clean worktree | dirty shared tree | dirty WIP of one session must not redden another's gate |
| Enforcement | `PreToolUse` hook denies writes to the primary checkout (`.claude/` + `.agents/hooks.json`) | advisory AGENTS.md mandate | advisory failed twice; isolation must be enforced, not hoped |
| Primary tree role | read-only for editing; allows read + integration (merge `dev`→`main`, push, tag, fetch) + gate runs | full workspace | primary is the integration/release point, never a session workspace |
| Worktree lifecycle | ephemeral with safe `stop` | unconditional cleanup | refuse to delete a session branch with unmerged commits; list abandoned, never auto-delete |

## The session helper — `scripts/nn-session.mjs`

```
node scripts/nn-session.mjs start [--id <id>]   # create/reuse, print path (last stdout line)
node scripts/nn-session.mjs list
node scripts/nn-session.mjs stop --id <id>
```

`start`: resolve id (`--id` > `NN_SESSION_ID` > `hostname+pid`) → target `<repo-parent>/cogNNitive-<id>` → if exists print path; else `git worktree add -b session/<id> <path> dev` → junction `<target>/node_modules` to primary (`mklink /J` on Windows, `symlinkSync(...,'dir')` elsewhere) → print path. Never a daemon, lock, or detector.

`stop`: remove the worktree and its `session/<id>` branch **only if** the branch is merged or fully pushed; otherwise refuse and list the unique commits. `list` shows session worktrees and flags abandoned ones; nothing is auto-deleted.

## Data Flow

```
session start ──▶ nn-session.mjs start ──▶ worktree (session/<id>)
                                                │ (junction)
                                                └── node_modules ── primary tree
session work ──▶ commit-early on session/<id> ──▶ dev (integration) ──▶ git push origin dev:main
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/nn-session.mjs` | Create | worktree helper |
| `scripts/nn-session.test.mjs` | Create | TDD tests (create/reuse/junction/stop) |
| `scripts/verify.js` | Modify | collect all suite failures; exit non-zero after full roster |
| `scripts/verify.test.js` or inline | Modify | assert complete-feedback behavior |
| `.agents/skills/nn-dev-development/SKILL.md` | Modify | isolate first; remove foreign-WIP ceremony |
| `.claude/hooks/block-dangerous-git.mjs` | Modify | remove staging bans, keep destructive bans |
| `.claude/hooks/block-dangerous-git.test.mjs` | Modify | assert new boundary |
| `.claude/hooks/guard-primary-tree.mjs` | Create | `PreToolUse` guard: deny file writes + `git add`/`commit`/`stash` in the primary checkout; allow read + integration + gate |
| `.agents/hooks.json` | Create | Antigravity `PreToolUse` equivalent of the primary-tree guard |
| `AGENTS.md` | Modify | session-start points at `nn-session.mjs start` |

## Interfaces / Contracts

`verify.js` internal: replace per-suite `process.exit(1)` in the roster loop with a `failures[]` collector; exit once after all suites. `run()` returns a boolean instead of terminating.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `nn-session.mjs` create/reuse/junction/stop | node:test, temp repo, RED first |
| Unit | `verify.js` reports all failures | inject two failing suites, assert both named, exit non-zero |
| Contract | skill no longer has `yours or foreign` / has `nn-session.mjs start` | repo-scan test |
| Contract | hook allows `add -A`, blocks `reset --hard` | `block-dangerous-git.test.mjs` |

## Migration / Rollout

No data migration. Rollout is additive: the helper is opt-in per session until the skill mandates it. Rollback = revert.

## Open Questions

- [ ] Junction on a non-NTFS Windows volume or a filesystem without symlink support — confirm `mklink /J` fallback message is clear.

Resolved: Antigravity auto-discovers `AGENTS.md` (always-on) and supports `hooks.json` `PreToolUse`, so the mandate and the guard work across OpenCode, Claude Code, and Antigravity.
