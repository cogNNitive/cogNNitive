<!-- gentle-ai:session-start-skill -->
## Session Start: Load nn-dev-development (MANDATORY)

At the very start of every session in this repository, before any repository
operation, load the `nn-dev-development` skill via the `skill` tool and follow it:

- Skill name: `nn-dev-development`
- Path: `.agents/skills/nn-dev-development/SKILL.md`

It enters a per-session `git worktree` (via `scripts/nn-session.mjs start`),
runs the informational concurrency scan, and enforces commit-early on `dev`.
Do not skip it, even for read-only work. Never write to the primary checkout —
it is read-only (integration/release only) and guarded by a `PreToolUse` hook.
<!-- /gentle-ai:session-start-skill -->

`.atl/skill-registry.md` is machine-generated and untracked (each machine
regenerates it with different absolute paths). If it is missing locally, run
`gentle-ai skill-registry refresh --force` to regenerate it.

**Two-tier skill resolution.** The canonical content for `nn-dev-development`,
`nn-dev-release`, `nn-dev-check-integrity`, `nn-dev-issue-tracking` and `nn-dev-backlog` lives only under
`.agents/skills/<name>/SKILL.md` — that convention belongs to the
"Agent Teams Lite" / gentle-ai orchestrator layer, not to Claude Code's native
`Skill` tool. Claude Code's native `Skill` tool only resolves skills placed
under `.claude/skills/<name>/SKILL.md` (project-scoped) or the user's global
`~/.claude/skills/<name>/SKILL.md`. To make these maintainer-only skills
resolvable by name there too, thin pointer stubs exist at
`.claude/skills/<name>/SKILL.md` for all five — each one just tells the
agent to go read the real file under `.agents/skills/`. If the `Skill` tool
ever again reports "Unknown skill" for one of the `nn-dev-*` skills, do not
block the session on it: read `.agents/skills/<name>/SKILL.md` directly with
Read/Glob as a fallback and proceed.

## Blocked git commands

`.claude/settings.json` registers two PreToolUse hooks:

- `.claude/hooks/block-dangerous-git.mjs` refuses the destructive git commands
  whose blast radius is the whole working tree: `reset --hard`, `clean`, `stash`,
  `branch -D`, and `checkout`/`restore` of `.`. They can erase your own
  uncommitted work in one stroke. Staging (`add -A`, `add .`, `commit -a`) is
  allowed — a session worktree only holds your own files.
- `.claude/hooks/guard-primary-tree.mjs` (mirrored by `.agents/hooks.json` for
  Antigravity) denies file edits and `git add`/`commit`/`stash` in the PRIMARY
  checkout, which is read-only (integration/release). Work in a session worktree.

Safe substitutes: `git reset --soft HEAD~1` to drop a commit while keeping the
tree, `git checkout HEAD -- <explicit/path>` to revert one file, and
`git worktree add --detach <tmp> <sha>` when you need a clean tree for a build
or a release rehearsal. `git push` is deliberately NOT blocked — it carries its
own pre-push typecheck hook.

The hooks match on the command text, so a command that merely quotes one of
those patterns is refused too. Verify the rules with
`node .claude/hooks/block-dangerous-git.test.mjs` and
`node .claude/hooks/guard-primary-tree.test.mjs`.

## Canonical Vocabulary & Ubiquitous Language

All agents MUST adhere to the canonical iNNfo level nomenclature and vocabulary:
- **Level 0**: `defiNNition` (meta-specification language)
- **Level 1**: `iNNfo` (concrete specification meta-template) & `meta-bluepriNNt`
- **Level 2**: `bluepriNNt` (domain schema; `template` and `app` are deprecated aliases)
- **Level 3**: `kNNowledge` (domain data model; uncountable noun, e.g. "N kNNowledge documents")
- **Container**: `domaiNN` (workspace container; a domaiNN is itself a kNNowledge document)

Authoritative sources:
- Machine-readable dictionary: [`iNNfo/specs/vocabulary.json`](iNNfo/specs/vocabulary.json)
- Rendered vocabulary & alias guide: [`docs/documentation/content/vocabulary.md`](docs/documentation/content/vocabulary.md)
