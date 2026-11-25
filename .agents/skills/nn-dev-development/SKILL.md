---
name: nn-dev-development
version: "3.0.0"
description: Internal developer skill for cogNNitive maintainers. The whole development and release process for a single maintainer driving several AI agents - session worktrees cut from main, collision checks against open PRs, the light/heavy lane, PRs to main, and release by merging (CI tags and publishes). Trigger: any development session, session start, branch decision, worktree, parallel sessions, release, version bump, UI feedback loop.
---

# nn-dev-development

One maintainer, several AI agents, no external users yet. The process exists to stop
agents from overwriting each other and to keep `main` releasable. Anything that does
not serve those two goals is friction: do not add it back.

## What actually collided (measured 2026-11-19/20, keep this before changing the rules)

Thirty PRs landed in 34 hours, +22.5k/-9.9k authored lines, up to **five open at once**.
89 files were touched by two or more of them, and the eight most shared were *all*
generated or metadata: `catalog.json` in 17 PRs, the mcp bundle and the console export in
15, `package.json` 14/14/13. Only a handful of hand-written files were shared —
`canonical-registry.ts` (6), `procedure-runner.test.ts`, `nn-runtime.js`,
`render-procedure-stepper.js` (5 each).

The conclusion is not "agents were careless". **Nobody collided on a decision; they
collided on build output.** A per-PR version bump drags three `package.json` files and the
lock into every branch, and the pre-commit hook stages the regenerated artifacts into every
diff, so any two live branches overlap by construction. The rules below follow from that:

- a collision is only a coordination problem when the file is hand-written (§1a);
- everything else is regenerated after the rebase, never negotiated (§3);
- what was *invisible* is now printed by `status` and `pr-overlap` (§1, §1a).

`openspec/claims/` was the previous answer: a file an agent had to remember to write before
its first edit, checked by nothing. It got 2 adoptions in 30 PRs and was deleted on
2026-11-21 with `claim-audit`, `claim-check` and the CI job that watched them.

## Greeting (once per conversation)

```
🔧 You're using skill: nn-dev-development (🌿)
```

## 1. Start a session

```powershell
node scripts/nn-session.mjs start --id <short-kebab-id>   # worktree ../cogNNitive-<id>, branch session/<id> from origin/main
gh pr list --state open --json number,headRefName,files > temp/prs.json
node scripts/nn-session.mjs status --prs temp/prs.json    # every worktree: dirtiness, last write, its PR, links
```

- **`status` is the map of who else is working.** Per worktree it prints the HEAD, the
  branch, how many files are dirty, how long ago somebody last wrote in it, and — with
  `--prs` — the open PR of that branch. Three clean worktrees and one with `4 dirty ·
  last write just now` is a live neighbour; that line is the answer to "is anyone else
  here". Without `--prs` it stays offline.
- **The worktree is the thread's, not the script's.** Under T3 Code open the thread with
  **New worktree** (or launch it with `workspaceStrategy`), so the thread's own working
  directory *is* the worktree; `nn-session start` is for a harness with no worktree entry
  point. Two live threads in one checkout share files, the git index and the current
  branch: on 2026-11-16 five console threads read `main` while that tree was checked out
  on `fix/conntent-avatar-narration` and being rebased under them. One writer per
  worktree. Before the first write, compare Git's absolute worktree path and
  branch with the harness thread's workspace. If another live writer owns that
  path, do not edit, rebase, regenerate, or push from it.
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
- **Dependencies are shared per entry; `@cognnitive` is not.** `status` prints where each
  `@cognnitive/*` link resolves and whether the target exists, because that link is the
  `Cannot find module '@cognnitive/nn-core'` trap: it points at whichever worktree built
  core last, and it dangles when that worktree was swept. It must point at the copy you
  are testing.
  **`node scripts/nn-session.mjs relink` is the whole repair** — idempotent, repairs
  every checkout of this repository, and prints what it changed. Do not repair it by hand.
  Neither `rmdir` + `New-Item` from inside a worktree nor editing the import is allowed:
  a hand-repointed link is how five checkouts ended up running one worktree's core
  (measured 2026-11-22), and it silently dragged every other session with it.
  For core/MCP work, use an isolated install (`nn-session start --full-install` in the
  script-managed lane). Never run `npm ci` through a junction.
  `node_modules/.bin` is thin here (only `tsc`/`tsup`): run the tools by module path,
  `node node_modules/vitest/vitest.mjs run <file>` and
  `node node_modules/prettier/bin/prettier.cjs`.
- **Commit early, push early.** `wip:<id>: <reason>` checkpoints are fine on the session
  branch; squash them before landing. Pushing `session/*` skips the heavy local gate:
  the PR's CI is the gate.
- **A conflicting PR gets no CI at all.** GitHub creates no `pull_request` run when it
  cannot build the test merge commit, so a push to a branch that drifted into a conflict is
  silent: no run, no checks, nothing red. `ci.yml` is not at fault and there is nothing to
  fix in it. The tell is `mergeable_state: dirty` on the PR while `refs/pull/<n>/merge`
  still points at the last head that merged cleanly, or is missing entirely
  (`gh api repos/<o>/<r>/git/ref/pull/<n>/merge`). The usual cause here is a generated
  artifact: the branch regenerated `nn-mcp.bundle.js`, `nn-console.bundle.js` or the TestLab
  fixture from a base `main` had already moved past, so two regenerations of the same file
  diverge. Measured 2026-11-23 on #818: three pushes in a row, zero runs, while
  `workflow_dispatch` started within seconds — which is exactly what makes it read as a
  GitHub outage. Fix: merge `origin/main` in and rebuild the gated artifacts, never
  hand-resolve a bundle. Until the merge is buildable, `gh workflow run "CI & Verify"
  --ref <branch>` is the only way to test the head, and it does test the real commit.
- **A PR whose push GitHub did not process is recreated, not repaired.** Measured 2026-11-25 on
  #873: the branch ref moved to `76640048` while `pulls/873` still reported `head=34453ab`, the
  pushed sha got **no** CI run at all, `mergeable` stayed `unknown`, every merge attempt was
  refused with `Head branch is out of date`, and `gh pr reopen` failed with `Could not open the
  pull request` because the old head commits are unreachable after the rebase. Nothing in git is
  broken. Save the body (`gh pr view <n> --json body | Out-File -Encoding utf8 temp/pr.md`),
  recreate from the same branch (`gh pr create --base main --head <branch> --title <same>
  --body-file temp/pr.md`), and let the old one stay closed. The mirror case needs no action at
  all: a PR whose commits land through another branch is marked **merged** automatically, so
  nothing is closed by hand (#874 landed through #876 that way).

## 1a. Before the first write: read the open PRs

A worktree isolates files, not decisions. What you are about to touch may be in a branch
that is open right now, and the only source of truth for that is the open PRs themselves:

```powershell
gh pr list --state open --json number,headRefName,files > temp/prs.json
node scripts/pr-overlap.mjs --prs temp/prs.json        # this branch vs every other open PR
```

- **Exit 0, `MECHANICAL`:** the shared paths are generated or metadata (`catalog.json`,
  `*.bundle.js`, the console export, `package.json`, the lock). Nobody is stepping on a
  decision: land in either order and `npm run regen` after the rebase. Do not open a
  conversation about it.
- **Exit 1, `BLOCKING`:** another live branch edits the same hand-written file. Land one
  of them first, or add your work to that branch instead of opening a second PR. Two PRs
  on `canonical-registry.ts` is two people rewriting one decision.
- **Exit 2:** the PR list could not be read, so nothing was verified. Not the same as
  clean. Fix the command, not the conclusion.

Run it again before you push and before you ask for a merge: the answer changes as other
branches land. On `session/*` the pre-push hook is a fast path, so this one is on you.

**A hot hand-written file is serial by construction.** Console sources, the TestLab
sources, `canonical-registry.ts`, `server.ts`, `apply-change.ts`: one session at a time.
Two threads on a hot file is a rebase you scheduled yourself, and the collision shows up
as a conflict in the most load-bearing file of the change.

## 2. Pick the lane

**Heavy only for these four.** A change is heavy when it:

1. changes a public contract: MCP tool surface, exported API, skill frontmatter or
   trigger, a published spec URL, or a release-tag shape;
2. migrates stored data or an on-disk format;
3. touches security: permissions, secrets, the deny-list, remote execution;
4. bumps a **major** version.

Everything else is **light**: work, commit, PR, let CI verify. Touching several packages
does not make a change heavy. A maintainer-only skill under `.agents/skills/` is not a
release key: editing it is light.

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

### A lock in the product is a contract, not a file

A filesystem lock in `nn-mcp` (`changes/.lock`, `changes/.lock.procedure-<run>`) is the
whole single-writer guarantee of a read-decide-write window, and both halves were got
wrong by copy-paste in the procedure runner:

- the payload carries an owner token and release compares it before unlinking. Unlinking
  by path lets a holder that was robbed while still running delete its successor's lock,
  and a third caller then walks in on a run nobody is serializing;
- every caller-supplied timeout is bounded below the window the lock calls stale. With an
  unbounded `timeout_ms` (and `0`, which means "no timeout"), a legitimate slow step is
  indistinguishable from a crash, so it gets robbed mid-write.

Age is not liveness. Probe the holder, and treat a payload that cannot name its holder as
broken rather than as a permanent `RUN_BUSY`.

## 3. Solo-maintainer profile for the agent workflow

Gentle-AI's ODD runs the agent; this repository narrows it:

- **One tracker per change, if any.** A small change has none (the diff is enough). A
  change that genuinely spans sessions keeps one `odd/tasks/<feature>.md`. Progress is
  recorded there and nowhere else: no parallel copy in `openspec/`, no handoff files.
  **The tracker is a single-writer surface, like the backlog:** only the PR that closes a
  slice edits it, and it edits it last. Four PRs editing `odd/tasks/procedure-runner.md`
  is the same conflict as four PRs editing one source file, with none of the value.
- **No independent verifier, no review receipts.** RDD is off globally
  (`gentle-ai review mode status`). Verification is the focused test plus CI.
- **Inner loop:** `node --test <file>` for what you touched, or `npm run verify:fast`.
  The full `node scripts/verify.js` is CI's job. The PR's format gate checks a file when
  it was prettier-clean on the base branch or when the PR adds it, and the repo is not
  prettier-clean as a whole, so run prettier on the files you touched before pushing:
  one unformatted file reds the PR, and the fix lands as a second PR (#759 → #760).
- **A known flake is not a failure.** Three nn-mcp suites (`check-workspace`, `layout`)
  run under 30s timeouts and flake when workers compete for the machine; re-run with
  `--no-file-parallelism` before you report the change red.
- **One thread, one area, 3–5 items.** Fifteen threads for one work area is not parallelism,
  it is fifteen rebases queued in advance. When two sides of the work must agree on a
  contract, land the contract first and start both from that commit.
- **Derived artifacts belong to `main`, not to your branch.** The pre-commit hook no longer
  regenerates and stages them, and the gate accepts the ones your change moves
  (`regen.js --check --tolerant`); after the merge the `regen` job regenerates them plus the
  derived version and proposes them as a pull request on `chore/regen`, which `auto-tag` waits
  for. So do not commit a catalog, manifest render or
  derived version into a PR: it collides with every other live branch by construction.
  **Exception: three artifacts are gated by tests, not by the regen gate, and a PR that moves
  them must commit them.** `scripts/lib/console-bundle.test.js` fails on a stale
  `nn-console.bundle.js` (`npm run build:console`), `test/console-export.test.mjs` fails on a
  stale `test/fixtures/testlab/domaiNN_console.html`
  (`node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`), and
  `scripts/build-skills-manager-bundle.test.mjs` fails on a stale
  `skills/nn-skills-lifecycle/scripts/skills-manager.js`
  (`node scripts/build-skills-manager-bundle.mjs`). #797 went red on the first two until they
  were committed. Rebuild them last, after the rebase, so the bytes match `main` plus your
  change. A change under
  `iNNfo/packages/nn-core` still needs `node scripts/build-core-mirrors.mjs` and
  `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open` to see its effect
  locally — the fixture embeds a CSP hash of the bundle — but the lane is what commits them.
  A conflicted generated artifact is resolved with `node scripts/regen.js`, never by hand: the
  CC hooks refuse `checkout --theirs` and `restore --worktree` on it. **Regenerating needs a real
  install in that worktree.** Measured 2026-11-25 on #875: a directory junction to the primary's
  `node_modules` made `tsup --config tsup.dist.config.ts` die (a socket error, then a missing
  `dist/server.js`), and the pre-push hook blocked on `typecheck failed` and `generated docs facts
  are stale` — two messages that name the wrong cause. Remove the junction, run `npm ci` in the
  worktree (41s, 327 packages; its `prepare` re-points `core.hooksPath`), then
  `node scripts/build-mcp-bundle.mjs` rewrites the bundle from that tree and the conflict is
  resolved by the generator. A checkout with no install at all is still fine to push from: the
  gate #877 added reports each guard as "could not start" / "not installed", prints
  `the push continues; CI runs them on the pull request`, and exits 0.

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
- **Merge with `gh pr merge --merge ...`** only after CI is green on the exact
  remote head SHA. Recheck that the candidate's release versions are still
  untagged. If the candidate changes, recheck the new head. Use
  `--match-head-commit <sha>` to guard against a moved head.
  Not `--squash`: the merge commit
  keeps the session branch an ancestor of `main`, so `nn-session stop`/`sweep` can remove it.
  Two assertions make "green" mean something: every check is `SUCCESS` in `gh pr checks <n>`
  — the ruleset has required all five since 2026-11-25, so a red `quality` is `BLOCKED` rather
  than `MERGEABLE`, and #759 only merged because the old ruleset required none — and
  `git rev-list --count origin/<branch>..origin/main` is `0` (a green head four commits behind
  is not ready either).
- **The backlog is a single-writer surface.** Only the PR that lands a batch edits its row, and
  it edits it last, so a conflict is one line and not a rebase of the whole file.
- **A conflicted generated artifact means rebase + `npm run regen`**, never a hand-resolved
  bundle.

**The ruleset is five checks and a pull request.** Measured 2026-11-25, because this section
described the opposite until then: repo ruleset 27391067 ("main: protected (pr + required
checks)") carries `non_fast_forward`, `deletion` and `required_status_checks` for `verify`,
`quality`, `site`, `spec-integrity` and `ui-smoke` with
`strict_required_status_checks_policy: false`; ruleset 27889992 ("main: pull requests only")
carries the `pull_request` rule with `allowed_merge_methods: ["merge"]`. `bypass_actors` is `[]`,
so `gh pr merge --admin` is refused as well (`Repository rule violations found`) — do not reach
for it. `allow_update_branch` is `false`, so a behind branch is synced by merging `origin/main`
in its own worktree and pushing, one PR at a time: each landing moves the base under the next.
`ci.yml` still carries the `merge_group` trigger, so re-enabling a queue stays a ruleset change
and not a PR.

**The write-back PR cannot be merged by checks, and it must be pushed, not dispatched.** `regen`
opens it with `GITHUB_TOKEN`, so no `pull_request` run exists and all five required checks are
simply absent: `gh pr merge` answers `5 of 5 required status checks are expected`. Dispatching
does not help — `gh workflow run "CI & Verify" --ref chore/regen` goes green and satisfies
nothing, because a `workflow_dispatch` run's check runs are not counted as the PR's checks
(measured on #878, where the dispatch completed `success` and the PR stayed `BLOCKED`). Push a
commit to the branch instead: `git commit --allow-empty -m "ci: run the pull request checks on
the write-back"`, then merge on the real `pull_request` run. Work on a detached worktree at
`origin/chore/regen` (`git worktree add --detach <tmp> origin/chore/regen`) and push
`HEAD:refs/heads/chore/regen`: a local `chore/regen` left from an earlier attempt is usually
stale and the push is rejected as a non-fast-forward. `ci:` is a conventional type the release
plan accepts and it touches no `changePath`, so the commit cannot plan the release it rides on.

1. Push the session branch and open a PR to `main` without asking. That is the normal
   end of a unit. Run `node scripts/pr-overlap.mjs --prs temp/prs.json` first: a `BLOCKING`
   line means this PR should wait or join the other branch.
2. **Merging the PR is the maintainer's call.** Ask, per PR.
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

After every green push to `main`, a `regen` job regenerates the derived artifacts and the derived
version. When it produced a diff it does **not** push to `main`: it rebuilds the branch
`chore/regen` from that tip and opens (or refreshes) one pull request, and reports
`pending=true`. CI's `auto-tag` job (`scripts/release/plan-auto-tags.js`) is skipped while
`pending` is true, because a tag has to point at the tree that carries the versions. Merging that
pull request is what releases: its merge is a push to `main`, `regen` then finds nothing left to
write (`pending=false`), and `auto-tag` tags each key that changed and runs `release.yml` once per
tag, `blueprints` first:

| Key | Ships when a commit touched | Version |
|---|---|---|
| `blueprints` | `iNNfo/specs` | from commits: breaking → major, `feat` → minor, else patch |
| `skills` | `skills/` | same |
| `nn-mcp` | `iNNfo/packages/nn-mcp/src` and `test` | same |
| `nn-console` | `iNNfo/specs/bluepriNNts/console`, `scripts/export-console.mjs`, `scripts/console-views.mjs` | same |

**The write-back pull request arrives with no checks.** It is pushed and opened with
`GITHUB_TOKEN`, and GitHub suppresses workflow runs caused by that token, so `pull_request` CI
never fires on it. While the ruleset requires nothing it merges like any other. Once required
checks exist it has to be merged with an admin bypass — that is the accepted cost of having no
bypass actor for Actions. It carries nothing hand-written: it is the output of the generators the
gate already ran on its parent, and the `regen` job's own `node scripts/regen.js --check` step
proves the next pass reproduces it byte for byte.

`repoPaths` and `changePaths` are different on purpose: `repoPaths` is what gets copied into the
distribution repo, `changePaths` is what counts as a change. For `nn-mcp` the only repo path is
the generated bundle, so deriving from it would mean the key never ships.

Generated files and version mirrors are never a trigger: `plan-auto-tags` excludes every tracked
file its `changePaths` contains that `scripts/lib/shared-artifacts.js` calls generated, so a
regeneration or version write-back commit cannot plan the release that produced it.

**A subject the bump cannot be read from fails the plan.** `scripts/release/conventional-commit.js`
refuses any commit that touched a key whose subject is not `type(scope)?!?: description` over
`feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert`, and `plan-auto-tags`
exits 1 naming the SHA, the subject and the accepted types. It used to fall through to `patch`,
which published a version nobody chose and left a tag nothing explained. Two consequences to know
before they bite: a `wip:` commit must be squashed before it lands, and `git revert`'s default
`Revert "..."` subject is refused — reword it to `revert: ...`.

Consumers resolve these tag names (`nn-mcp` resolver, skills-manager, catalog), so the
tag shapes are a contract. Nobody tags by hand.

- **A tag is not a release.** `auto-tag` invokes `release.yml` once per planned tag in
  fixed order (blueprints first) and stops at the first failure, so every later tag stays
  pushed and never published — `blueprints-v0.83.2`, `skills-v4.2.1` and `nn-mcp-v0.49.2`
  are exactly that. Read the push run's jobs named `release (<tag>)`, not the tag list,
  and re-run a missing leg one at a time. Consumers follow the manifest, which advertises
  the newest tag, so an orphan tag is inert — right up until you cite it as a release.
- **`catalog.json` is stamped at publish time**, not by the PR: `run-release.js`
  (`stampBlueprintCatalog`) writes the tag it is publishing into both copies. The value
  committed in the repo is cosmetic, and CI cannot judge it (`blueprint-catalog --check`
  normalises the field away on purpose). Do not "fix" it with a PR: touching
  `iNNfo/specs/` for a generated file cuts a blueprints release for nothing.
- **Bookkeeping is not a release trigger.** `release-keys.js` excludes
  `iNNfo/specs/bluepriNNts/catalog.json` from the `blueprints` change set for exactly that
  reason: its bytes come from the tags, so a commit that only restamps it would cut the
  release that restamps it again, forever. The same rule has to hold for anything a future
  automatic post-merge commit would touch (`package.json`, `package-lock.json`, the
  bundles, the console export): an excluded generated file cannot cut its own release, and
  a non-excluded one loops. And the regeneration must land **before** the tag, because the
  release copies the tag's tree — a commit that regenerates after `auto-tag` publishes the
  stale bundle. Both are why moving artifacts out of PRs is a release-contract change, not
  a hook tweak.
- **You do not bump a release version.** The `regen` job derives it from the commits and writes
  it into the key's `package.json` (`scripts/release/write-pending-versions.js`), then
  `npm run sync:versions` propagates it and the regeneration rebuilds what embeds it, all in the
  write-back pull request — so before the tag exists, because that pull request has to land
  first. `release-bump` and `check-authored-bump` were retired with the authored model:
  a hand bump travelled in 14 of 30 branches and was the only thing that could make a merge
  release nothing (#650, #670, #683).
- **Close with evidence:** record the PR, exact head SHA, and observed checks.
  Report merged, tagged, and published as separate states; verify publication at
  the destination when it is in scope. For locking or rollback changes, include
  a contention or injected-failure test, not just a successful write.
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
Before either removal command, confirm that no thread expected to resume is
bound to the path. If unsure, keep the worktree. A missing `.git` does not make
ignored files in a leftover directory disposable.
`stop --id <id>` removes one; it refuses unmerged or dirty worktrees. Never remove a
worktree with a bare `git worktree remove`: its `node_modules` junctions stop git
halfway and leave a half-deleted folder; `stop` unlinks them first. Remote branch deletion is the maintainer's, and with
`deleteBranchOnMerge: true` GitHub already deletes every head branch on merge — do not hand
out a list of `git push --delete` commands for branches that landed.

### 7a. Sweep gate: "nothing committed yet" reads as "already merged"

`sweep` decides a session is finished with `git merge-base --is-ancestor session/<id> main`
(or `origin/main`). A session that has **not committed yet** points at the same commit as
the base, so it is trivially an ancestor, and `sweep` classifies a live session as a merged
worktree worth removing — while its agent is still writing files in it. The only guard
between that session and deletion is `git status --porcelain` inside the worktree, and it
stops protecting the moment the tree is momentarily clean: a commit in flight, a stash, a
rebase that already applied its edits, a generated artifact not yet staged.

Observed 2026-11-16: `session/episode-layout` sat exactly on `main`'s tip with 12
uncommitted files while its agent ran `node scripts/verify.js --fast` in that worktree.
`sweep` printed `sweeping merged session worktree: session/episode-layout`, refused only
because the tree was dirty, and the same session committed three commits minutes later.
One clean instant earlier and that work was gone, with no branch ahead of `main` and no PR
to recover it from.

**The script now refuses that case itself.** `stop` and `sweep` read the branch's reflog;
when no entry is a commit (only its creation, or fast-forwards from `main`), the session
has never committed: `sweep` skips it (`skipped session/<id>: refusing: ... has no commits
yet`) and `stop` refuses it unless you pass `--force`. Pass `--force` only to abandon a
session you know is empty and unused. Do not test this with `rev-list --count main..HEAD`:
a session that landed is also `0` ahead of `main`, so that count cannot tell "landed" from
"not started".

**The script cannot see the rest, so run this gate before you run `sweep`, and before you
even propose it to the maintainer. Report the verdict per worktree, never a bare "ok".**

| Signal | How | Reads as active |
|---|---|---|
| No commits yet | `git reflog show --format=%gs refs/heads/session/<id>` | no `commit` entry |
| Uncommitted work | `nn-session status --prs temp/prs.json` → the worktree's own `N dirty` | anything |
| Recent writes | the same line → `last write <age>` | within ~15 minutes |
| A running command | `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`, matching `verify.js`, `--test`, a test filename or `npm` | present |

`nn-session status` now answers three of those four per worktree, so start there and quote
its line. It still cannot see a running process: Windows does not expose a process's
working directory cheaply, so correlate the command line with the modified-file mtime of
the worktree you are about to delete. Whole-tree mtimes are noise (a checkout or an
install touches every file); the `last write` column reads only the files that worktree
has actually modified.

**Stop** — do not sweep, do not propose it — while any worktree has no commit yet,
a dirty tree, a modified file from the last ~15 minutes, or a running verify/test/node
process. Name the worktree, name the signal, and hand the decision back. Never "save what
matters and revert the rest" on work you did not write: recovering another session's edits
is its owner's call, and a worktree you did not create is not yours to clean up.

Sweeping a genuinely finished set stays a one-liner. The rule is only that git saying
"merged" is not evidence that nobody is using the worktree.

## Git rules

- Blocked by `.claude/hooks/block-dangerous-git.mjs`: `reset --hard`, `clean`, `stash`,
  `branch -D`, and `checkout`/`restore` of the whole tree (`.`). This applies under Claude
  Code and Antigravity only; OpenCode reads neither hook config, so there the list is a
  rule you follow, not a guard that stops you.
- **A second hook, `CC Safety Net`, refuses more than the first and matches on text.**
  `git checkout HEAD -- <path>` and `git restore --worktree` are refused even for one
  named file, so reverting a single file is `cmd /c "git show HEAD:<path> > <path>"`
  (byte-exact; PowerShell `>` writes UTF-16 and corrupts a JSON or a patch).
  To drop a commit and keep the tree: `git reset --soft HEAD~1`.
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
