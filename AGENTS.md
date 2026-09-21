<!-- gentle-ai:session-start-skill -->
## Session Start: Load nn-dev-development (MANDATORY)

At the very start of every session in this repository, before any repository
operation, load the `nn-dev-development` skill via the `skill` tool and follow it:

- Skill name: `nn-dev-development`
- Path: `.agents/skills/nn-dev-development/SKILL.md`

It runs the concurrency scan against the shared working tree and enforces the
branch-first consent gate before any repo write. Do not skip it, even for
read-only or "quick" work — it also detects concurrent agents holding the tree.
<!-- /gentle-ai:session-start-skill -->

`.atl/skill-registry.md` is machine-generated and untracked (each machine
regenerates it with different absolute paths). If it is missing locally, run
`gentle-ai skill-registry refresh --force` to regenerate it.

## Blocked git commands

`.claude/settings.json` registers a PreToolUse hook
(`.claude/hooks/block-dangerous-git.mjs`) that refuses git commands whose blast
radius is the whole working tree: `reset --hard`, `clean`, `stash`,
`branch -D`, `checkout`/`restore` of `.`, `add -A`, `add .` and `commit -a`.

This checkout is routinely shared by concurrent agent sessions, so it may hold
uncommitted work the current session did not author. None of those commands can
be scoped to a pathspec, which makes "only touch your own files" impossible to
honour once they run — one of them destroyed 58 uncommitted foreign changes on
2026-09-21.

Safe substitutes: `git reset --soft HEAD~1` to drop a commit while keeping the
tree, `git checkout HEAD -- <explicit/path>` to revert one file, and
`git worktree add --detach <tmp> <sha>` when you need a clean tree for a build
or a release rehearsal. `git push` is deliberately NOT blocked — it carries its
own pre-push typecheck hook.

The hook matches on the command text, so a command that merely quotes one of
those patterns is refused too. Verify the rules with
`node .claude/hooks/block-dangerous-git.test.mjs`.