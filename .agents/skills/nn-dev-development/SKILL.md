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

- **The worktree is the thread's, not the script's.** Under T3 Code open the thread with
  **New worktree** (or launch it with `workspaceStrategy`), so the thread's own working
  directory *is* the worktree; `nn-session start` is for a harness with no worktree entry
  point. Two live threads in one checkout share files, the git index and the current
  branch: on 2026-11-16 five console threads read `main` while that tree was checked out
  on `fix/conntent-avatar-narration` and being rebased under them. One writer per
  worktree.
- **The primary checkout is read-only.** A `PreToolUse` hook denies edits and
  `git add/commit/stash` there. Work in the worktree. When the tool cwd resets to the
  primary, use `git -C <literal absolute worktree path>`: the hook reads the `-C`
  argument as text, so a shell variable (`git -C "$W"`) is refused.
  - **Which checkouts those hooks cover.** The hooks are registered in
    `.claude/settings.json` (Claude Code) and mirrored in `.agents/hooks.json`
    (Antigravity). Both decide "primary" by one rule: `.git` is a **directory** for the
    primary and a **file** for a linked worktree.
  - **OpenCode reads neither config file**, so the dangerous-git list stays **convention,
    not enforcement** there: nothing blocks it. Treat it as a rule, not a safety net, and
    do not assume a delegate is sandboxed because a sibling provider was. The read-only
    primary is enforced anyway, one layer lower: `.githooks/pre-commit`,
    `pre-merge-commit` and `pre-rebase` call `scripts/guard-primary-checkout.mjs`, and a
    git hook sits below every harness — `core.hooksPath` is already `.githooks`.
  - **`nn-session status` asks git which checkout is primary** (`git worktree list` lists
    the main worktree first), so it reports the truth from any worktree. Do not derive it
    from where `scripts/nn-session.mjs` itself lives: every session worktree has its own
    copy, which is exactly how a worktree once got labelled "primary".
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

## 1a. Claim the area before the first write

A worktree isolates files, not decisions. Two sessions can cut independent worktrees and
still write the same file or the same generated artifact; the collision then surfaces as
a merge conflict, or worse, as one PR regenerating a bundle over the other one's change.

Before the first edit, write `openspec/claims/<id>.md` with the paths you are about to
touch, then check it against every other claim and open PR:

```powershell
gh pr list --state open --json number,headRefName,files > prs.json
node scripts/claim-check.mjs --self openspec/claims/<id>.md --prs prs.json `
  --area scripts/foo.mjs --area "iNNfo/specs/**"
```

- **Exit 0:** nobody else is writing there.
- **Exit 1:** a claim or an open PR already covers the path. Do not start as planned. Hand
  the area over, wait for it, or record the accepted overlap in your claim and say why.
- A claim whose PR is merged or closed is released; its file gets deleted, not kept as a
  tombstone.

Declare **literal paths and narrow globs**, never a topic name: `"the console"` claims
nothing, `iNNfo/specs/bluepriNNts/console/ui-kit.js` claims something. Generated
artifacts (`*.bundle.js`, `catalog.json`, exported console HTML) belong to whoever owns
the source and are regenerated after the rebase, never resolved by hand.

A claim reserves **paths, not time**. It says who else is writing today; it does not stop
the same hot file from being rewritten again the moment the first session lands, which is
what 23 PRs touching `openspec/backlog_NN.md` in one day looked like. Who lands first is
decided by the integration lane (§4), never by the lock.

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
- **One thread, one area, 3–5 items.** Fifteen threads for one work area is not parallelism,
  it is fifteen rebases queued in advance. When two sides of the work must agree on a
  contract, land the contract first and start both from that commit.
- **Derived artifacts regenerate themselves.** The pre-commit hook reruns the fast
  generators when code or samples are staged and stages what changed. If a push or CI
  still reports a stale artifact, run `npm run regen` and commit.

## 4. Land on `main`

### One developer, so land in batches

The cost of concurrency is paid per landing, and it is quadratic: every merge moves the base
under every open branch. That is why 28 PRs in one day invalidated each other, and why a merge
queue looked like the answer. It is not, for one person: it buys "`main` is never red on a
combination of concurrent landings" — a team invariant — and charges ~3.5 minutes of serialized
gate on every PR to provide it. The cheap fix is arithmetic, not machinery.

- **One thread, one area, 3-5 items, one PR.** Twenty-eight landings became five, and the pairs
  that can collide fall from 378 to 10, with no waiting added anywhere.
- **A hot area is serial by construction.** Console sources, `nn-console.bundle.js`,
  `catalog.json` and the TestLab fixture: one session at a time. Two threads on a hot file is a
  rebase you scheduled yourself.
- **Never merge, rebase or amend in the primary checkout.** The git hooks refuse it, under every
  harness (`scripts/guard-primary-checkout.mjs`). A branch that fell behind rebases inside its
  own worktree.
- **Merge with `gh pr merge --merge ...`** once CI is green. Not `--squash`: the merge commit
  keeps the session branch an ancestor of `main`, so `nn-session stop`/`sweep` can remove it.
- **The backlog is a single-writer surface.** Only the PR that lands a batch edits its row, and
  it edits it last, so a conflict is one line and not a rebase of the whole file.
- **A conflicted generated artifact means rebase + `npm run regen`**, never a hand-resolved
  bundle.

**The ruleset is two rules.** `main` (repo ruleset 27391067) forbids force-push and deletion and
nothing else: no required checks, no pull request rule, no merge queue. `ci.yml` still carries
the `merge_group` trigger and the `claims` gate (`release-claim.mjs --check`) so re-enabling a
queue is a ruleset change and not a PR; today they never fire because nothing creates a
`merge_group` event.

**Claims are a convention again.** The PR that lands the work deletes `openspec/claims/<id>.md`
in its last commit. Nothing enforces that without a queue, so `npm run check:claims -- --prs
<open PRs>` is the net: it names every claim whose PR is no longer open.

1. Push the session branch and open a PR to `main` without asking. That is the normal
   end of a unit.
2. **Merging the PR is the maintainer's call.** Ask, per PR. The last commit before merging
   deletes `openspec/claims/<id>.md` — a claim is a live lock, not a tombstone, and merging
   deletes the branch but never the file.
3. **A chained PR must be retargeted before its parent merges.** The repo has
   `deleteBranchOnMerge: true`, so merging a PR deletes its head branch. If another open PR
   had that branch as its **base**, GitHub does not retarget the child: it **closes** it, and
   a closed PR cannot be reopened or have its base changed while its base ref is missing.
   Before merging the parent run `gh pr edit <child> --base main`. If it closed anyway:
   recreate the base ref at its merged tip (`git push origin <tip-sha>:refs/heads/<base>`),
   `gh pr reopen <child>`, then `gh pr edit <child> --base main`.
4. A red `main` is fixed forward. A failure that also reproduces on the previous `main`
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
halfway and leave a half-deleted folder; `stop` unlinks them first. Remote branch deletion is the maintainer's, and with
`deleteBranchOnMerge: true` GitHub already deletes every head branch on merge — do not hand
out a list of `git push --delete` commands for branches that landed.

## Git rules

- Blocked by `.claude/hooks/block-dangerous-git.mjs`: `reset --hard`, `clean`, `stash`,
  `branch -D`, `checkout`/`restore .`, and `checkout <ref> -- <path>`. This applies under
  Claude Code and Antigravity only; OpenCode reads neither hook config, so there the list
  is a rule you follow, not a guard that stops you. To restore one
  file: `git show <ref>:<path> > <path>`. To drop a commit and keep the tree:
  `git reset --soft HEAD~1`.
- PowerShell `>` writes UTF-16. For a byte-exact patch: `cmd /c "git diff -- <path> > out.patch"`.
- In PowerShell, quote any `@{...}` ref: `git stash show "stash@{0}"`, `git stash drop "stash@{2}"`.
  Bare `stash@{0}` is parsed as a hashtable literal and reaches git mangled
  (`Too many revisions specified: 'stash@' 'MAA=' ...`). Drop stashes from the highest index
  down, because each drop renumbers the rest.
- Paste one command per line. A block pasted at once that contains an unclosed construct
  keeps swallowing the following lines as continuations, so a `git push --delete` you never
  meant to run executes anyway. Never delete a branch that is the base or the head of an open
  PR — see step 4.3.
- Never guess git state: run `git status -sb` / `git fetch` right before reporting.
- Disposable scratch goes in `temp/` (gitignored) and is deleted after use.
