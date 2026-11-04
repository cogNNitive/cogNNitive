# Handoff prompt: implement `lineage-as-changes`

Copy everything below the line into the implementing agent.

---

You are implementing the SDD change `lineage-as-changes` in the cogNNitive repository (`D:\Users\lucas\Documents\GitHub\cogNNitive`). Planning is complete and approved. Your job is the `sdd-apply` phase, slice by slice, as a chain of pull requests. Do not re-plan, re-open settled decisions, or widen scope.

## 1. What this change does (one paragraph)

The change becomes the only provenance in a domaiNN. A kNNowledge unit (element field, matrix cell, element prose, concept text) carries no provenance of its own: its current value, its origin and its full timeline are derived by folding the applied changes whose `resolved_target` points at it. The persisted lineage record `<project>_cogNNitive_NN.md` is deleted; lineage becomes a computed view (filesystem inventory + edges from the change log) exposed by the read-only MCP tool `read_lineage` and the console. `sources::` and `type:: citation` fields are banned in kNNowledge; `citation` survives only as a change's `evidence` (which now accepts a list `[A, B]`). Artifacts are recorded with a new `produce_artifact` change. Drift (`EDITED_WITHOUT_RECORD`, `UNIT_WITHOUT_RECORD`) runs in `validate_knowledge` and `check_domain`.

## 2. Read first, in this order

All under `openspec/changes/lineage-as-changes/` on branch `session/lineage-as-changes`:

1. `proposal.md` — why and the capability guarantee table (every lineage-record capability and where it lands).
2. `design.md` — ADRs, the `changelog/` deep module interface, fold side-effect rules, apply-time execution facts, per-slice file map.
3. `tasks.md` — the 30-PR chain (`## PR chain`), every task, verification command and rollback boundary per PR. This is your work order.
4. `specs/**/spec.md` — the requirements and scenarios your tests must encode.
5. `exploration.md` — file:line evidence; consult when a task references a location.

Also read the repo's `AGENTS.md` and load the skill `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`) before any repository operation.

## 3. Non-negotiable rules

- **Isolation.** Work only in a session worktree created with `node scripts/nn-session.mjs start --id <id>` (or reuse `D:\Users\lucas\Documents\GitHub\cogNNitive-lineage-as-changes`). The primary checkout is read-only and guarded by a hook. When you run git from the primary as cwd, use `git -C "<literal absolute worktree path>"` — the guard parses the literal path; a shell variable is blocked.
- **Never run `npm ci` / `npm install` in a worktree.** Worktree `node_modules` are junctions to the primary; installing corrupts it. Builds and tests only.
- **Strict TDD is active.** Every behavior task is a `[RED]` failing test, then `[GREEN]`, then optional `[REFACTOR]`. Run the RED test and see it fail for the right reason before writing the implementation. Never split a RED from its GREEN across PRs.
- **No backwards-compat code.** No aliases, fallbacks, redirects or legacy migration. Legacy domains are out of scope.
- **Published spec files are write-once.** Never edit a published `_V_x-y-z_` file. New versions are new files; superseded samples are deleted only where `tasks.md` says so.
- **nn-core is NodeNext ESM.** Every new relative import carries the `.js` extension.
- **Commits:** conventional commits, small work units. Never add `Co-Authored-By` or any AI attribution.
- **Artifacts in English** (code, comments, specs, docs, commit and PR text).
- **Tool preferences:** use `rg`, `fd`, `bat`, `eza`, `sd` instead of grep/find/cat/ls/sed.

## 4. The PR chain (feature-branch-chain)

- Create the tracker branch `feature/lineage-as-changes` from `origin/dev` and push it.
- PR 1 (`lac/s0`) targets the tracker. Every later PR targets the previous PR's branch, in the exact order of the `## PR chain` section of `tasks.md`.
- Only the tracker merges into `dev`, at the end, with a **merge commit** (not squash) — the `templates-v*` pin validation depends on it.
- Load the `chained-pr` and `work-unit-commits` skills before opening the first PR.
- Each PR must be ≤400 changed lines excluding the generated/mechanical files `tasks.md` names for that PR (core mirrors `*.generated.cjs`, regenerated `catalog.json`/`canonical-registry.ts`, the S5b.4 corpora rewrite, pure deletions). State the excluded counts in the PR description.

## 5. Per-PR loop

For each PR in chain order:

1. Branch from the previous PR's branch.
2. Execute its tasks in order (RED → GREEN → REFACTOR). Regenerate mirrors with `build-core-mirrors` and versions with `npm run sync:versions` when the task says so.
3. Run the PR's verification command from `tasks.md`, then `npm run verify:fast`. Both must be green. Note that the pre-push typecheck needs `node_modules/.bin`; if it is missing, report it instead of pushing with `--no-verify` silently.
4. Mark the completed tasks `[x]` in `tasks.md` and append the PR's outcome to `openspec/changes/lineage-as-changes/apply-progress.md` (merge with existing content, never overwrite): tasks done, files touched, test results, deviations.
5. Commit, push, open the PR against its base, then move on.

Before trusting a red nn-mcp test after a rebase, rebuild nn-core (`dist` staleness is a known false failure). Before trusting a green preflight test, re-run it with empty `USERPROFILE`/`HOME`.

## 6. Stop and ask the maintainer (do not proceed on your own)

- **S5b.5 — release.** Cutting any `templates-v*` tag or re-pinning is a release event. Rehearse it in a detached worktree (`git worktree add --detach <tmp> <sha>`) and ask before tagging.
- **S5a.3 — validator ban.** If the ban turns `verify:fast` red because samples/corpora still carry `sources::`, apply the fallback written in the task (exclude `samples/` and test fixtures until S5b.4) and say so in the PR. If the fallback does not make it green, stop and ask.
- **Between S4 and S5b**, `verify.js --release` may be red by design; record it in each affected PR. Ask before merging anything to `main`.
- Any task whose referenced file or line no longer matches reality, any spec contradiction, or any PR you cannot keep ≤400 lines: stop and report with evidence; do not improvise a redesign.
- The open design questions carried into S7.9: leave them for the archive phase; do not decide them.

## 7. Finish

After the last PR, run S7 (final verify): the full `node scripts/verify.js`, the success criteria in `proposal.md` (e.g. no live reference to the `lineage-record` role; a domain built only through changes has no `sources::`; every field and matrix cell has an origin derivable from changes; a hand edit raises `EDITED_WITHOUT_RECORD`). Then report: PRs opened (links), what is verified, what is not, and anything you deviated from. Do not merge the tracker into `dev` and do not run `sdd-archive` without the maintainer's go-ahead.
