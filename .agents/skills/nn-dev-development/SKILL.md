---
name: nn-dev-development
version: "2.0.0"
description: Internal developer skill for cogNNitive maintainers. The whole development and release process for a single maintainer driving several AI agents - session worktrees cut from main, the light/heavy lane, PRs to main, and release by merging (CI tags and publishes). Trigger: any development session, session start, branch decision, worktree, release, version bump, UI feedback loop.
---

# nn-dev-development

One maintainer, several AI agents, no external users yet. The process exists to stop
agents from overwriting each other and to keep `main` releasable. Anything that does
not serve those two goals is friction: do not add it back.

## Greeting (once per conversation)

```
🔧 You're using skill: nn-dev-development (🌿)
```

## 1. Start a session

```powershell
node scripts/nn-session.mjs start --id <short-kebab-id>   # worktree ../cogNNitive-<id>, branch session/<id> from origin/main
node scripts/nn-session.mjs status                        # primary health + every worktree
```

- **The primary checkout is read-only.** A `PreToolUse` hook denies edits and
  `git add/commit/stash` there. Work in the worktree. When the tool cwd resets to the
  primary, use `git -C <literal absolute worktree path>`: the hook reads the `-C`
  argument as text, so a shell variable (`git -C "$W"`) is refused.
- **Another worktree may be live.** Look at it read-only; never revert, commit or stop a
  worktree you did not create.
- **`node_modules` is a junction to the primary's.** The workspace link
  `node_modules/@cognnitive/nn-core` points at whichever worktree built core last;
  repoint it before trusting nn-mcp tests:
  `cmd /c "rmdir node_modules\@cognnitive\nn-core"` then
  `cmd /c "mklink /J node_modules\@cognnitive\nn-core <worktree>\iNNfo\packages\nn-core"`.
  Never run `npm ci` from a worktree: it corrupts the primary's `node_modules`.
- **Commit early, push early.** `wip:<id>: <reason>` checkpoints are fine on the session
  branch; squash them before landing. Pushing `session/*` skips the heavy local gate:
  the PR's CI is the gate.

## 2. Pick the lane

**Heavy only for these four.** A change is heavy when it:

1. changes a public contract: MCP tool surface, exported API, skill frontmatter or
   trigger, a published spec URL, or a release-tag shape;
2. migrates stored data or an on-disk format;
3. touches security: permissions, secrets, the deny-list, remote execution;
4. bumps a **major** version.

Everything else is **light**: work, commit, PR, let CI verify. Touching several packages
does not make a change heavy.

**Heavy adds exactly one thing:** a delta spec at
`openspec/changes/<slug>/specs/<capability>/spec.md` with only the changed requirements
(`## ADDED|MODIFIED|REMOVED Requirements`, each normative sentence on one physical line,
checked by `npm run check:openspec`). No `proposal.md`, `design.md`, `tasks.md`,
`apply-progress.md`, `verifications.md` or handoff files: `check:openspec` (in CI)
rejects anything but `specs/` in an active change. When done, the change folder
moves to `openspec/changes/archive/`; `openspec/specs/` no longer exists.

**Size cap.** A change that needs more than ~5 capability deltas, or more than one
session to finish, is several changes. Split it before writing specs, and land each
part on `main` on its own.

## 3. Solo-maintainer profile for the agent workflow

Gentle-AI's ODD runs the agent; this repository narrows it:

- **One tracker per change, if any.** A small change has none (the diff is enough). A
  change that genuinely spans sessions keeps one `odd/tasks/<feature>.md`. Progress is
  recorded there and nowhere else: no parallel copy in `openspec/`, no handoff files.
- **No independent verifier, no review receipts.** RDD is off globally
  (`gentle-ai review mode status`). Verification is the focused test plus CI.
- **Inner loop:** `node --test <file>` for what you touched, or `npm run verify:fast`.
  The full `node scripts/verify.js` is CI's job.
- **Derived artifacts regenerate themselves.** The pre-commit hook reruns the fast
  generators when code or samples are staged and stages what changed. If a push or CI
  still reports a stale artifact, run `npm run regen` and commit.

## 4. Land on `main`

1. Push the session branch and open a PR to `main` without asking. That is the normal
   end of a unit.
2. **Merging the PR is the maintainer's call.** Ask, per PR. Merge with `--merge`, not
   `--squash`: a merge commit keeps the branch an ancestor of `main`, so `nn-session
   stop`/`sweep` can remove it.
3. A red `main` is fixed forward. A failure that also reproduces on the previous `main`
   is pre-existing: file an issue, do not fix it as a rider.

## 5. Release = merge to `main`

After every green push to `main`, CI's `auto-tag` job
(`scripts/release/plan-auto-tags.js`) tags each release key that changed and runs
`release.yml` once per tag, `blueprints` first:

| Key | Ships when | Version |
|---|---|---|
| `blueprints` (`iNNfo/specs`) | a commit touched it since its last tag | from commits: breaking → major, `feat` → minor, else patch |
| `skills` (`skills/`) | same | same |
| `nn-mcp` | `iNNfo/packages/nn-mcp/package.json` has an untagged version | that version |
| `nn-console` | `iNNfo/specs/bluepriNNts/console/package.json` has an untagged version | that version |

Consumers resolve these tag names (`nn-mcp` resolver, skills-manager, catalog), so the
tag shapes are a contract. Nobody tags by hand.

- **To release nn-mcp or the console:** bump its `package.json` version in the PR, then
  run `npm run sync:versions`, `npm install --package-lock-only` and `npm run regen`.
- **A failed release run:** fix forward on `main`, or re-run one tag with
  `gh workflow run release.yml --ref main -f tag=<tag> -f publish=true` (one at a time;
  concurrent dispatches cancel each other). Never delete or move a published tag.
- `vars.RELEASE_ENABLED` must be `true`, or every release is a dry run.

## 6. UI console feedback from screenshots

1. Summarize every change you read from the images and **wait for confirmation**.
2. Edit in the worktree, then `node scripts/build-console-bundle.mjs` and
   `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`
   (inline CSP hashes are regenerated, never hand-edited).
3. Commit the regenerated `test/fixtures/testlab/domaiNN_console.html` with the source,
   give the `file:///` link to the worktree copy, and wait for approval before the PR.

## 7. Clean up

`node scripts/nn-session.mjs sweep` removes every session worktree and local branch
already merged into `main`, skipping (and naming) any with uncommitted changes.
`stop --id <id>` removes one; it refuses unmerged or dirty worktrees. Never remove a
worktree with a bare `git worktree remove`: its `node_modules` junctions stop git
halfway and leave a half-deleted folder; `stop` unlinks them first. Remote branch deletion is the maintainer's.

## Git rules

- Blocked by `.claude/hooks/block-dangerous-git.mjs`: `reset --hard`, `clean`, `stash`,
  `branch -D`, `checkout`/`restore .`, and `checkout <ref> -- <path>`. To restore one
  file: `git show <ref>:<path> > <path>`. To drop a commit and keep the tree:
  `git reset --soft HEAD~1`.
- PowerShell `>` writes UTF-16. For a byte-exact patch: `cmd /c "git diff -- <path> > out.patch"`.
- Never guess git state: run `git status -sb` / `git fetch` right before reporting.
- Disposable scratch goes in `temp/` (gitignored) and is deleted after use.
