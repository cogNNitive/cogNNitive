# Tasks: Dev Process and Tooling Gaps

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

Total estimated changed lines: ~35 lines in Partition A (<10% of 400-line budget). Slices land as self-contained work-unit commits on `dev` (ADR-010). Partition B tasks are external global agent configurations applied interactively after explicit user confirmation.

---

## Phase 1: Partition A — In-Repo Deliverables

- [x] 1.1 `sync-versions-covers-catalog` (A1)
  - [x] 1.1.1 In [`package.json`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/package.json), append `&& node scripts/template-catalog.mjs` to `sync:versions`.
  - [x] 1.1.2 In [`package.json`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/package.json), append `&& node scripts/template-catalog.mjs --check` to `check:versions`.
  - [x] 1.1.3 Stage and commit `package.json` with message `fix(scripts): append template catalog generation and verification to version scripts`.

- [x] 1.2 `correct-stale-dev-procedures` (A4)
  - [x] 1.2.1 In [`.agents/skills/nn-dev-development/SKILL.md`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/.agents/skills/nn-dev-development/SKILL.md) §4e step 1, correct catalog guard reference to run `npm run check:versions` (or `node scripts/verify.js`), removing false assertion that `check-integrity.js` validates catalog staleness.
  - [x] 1.2.2 In [`.agents/skills/nn-dev-development/SKILL.md`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/.agents/skills/nn-dev-development/SKILL.md) §4b, document rule to compare remote tracking refs `origin/main..origin/dev` and add pre-merge template check `git diff --name-only origin/main..origin/dev | grep '^iNNfo/specs/templates/'`.
  - [x] 1.2.3 In [`.agents/skills/nn-dev-development/SKILL.md`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/.agents/skills/nn-dev-development/SKILL.md) §3a/§6c, document `git worktree add --detach <tmp> <sha>` rehearsal flow over `git stash`.
  - [x] 1.2.4 Check `.agents/skills/nn-dev-release/SKILL.md` and harmonize references if catalog staleness is cited.
  - [x] 1.2.5 Stage and commit maintainer skill files with message `docs(dev): correct catalog integrity commands and diff refs in dev skills`.

- [x] 1.3 `version-agnostic-ignore-rules` (A3)
  - [x] 1.3.1 Perform evidence-gated pass on [`.gitignore`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/.gitignore) to rewrite any target-moved version-pinned or path-pinned rules into shape-based patterns.
  - [x] 1.3.2 Stage and commit `.gitignore` with message `chore(git): rewrite version-pinned ignore rules to shape-based patterns`.

---

## Phase 2: Partition A Verification

- [x] 2.1 Complete falsification and regression suite
  - [x] 2.1.1 Delete or corrupt `iNNfo/specs/templates/catalog.json`.
  - [x] 2.1.2 Run `npm run check:versions` and verify non-zero failure citing `catalog.json`.
  - [x] 2.1.3 Run `npm run sync:versions` and verify clean restoration of `catalog.json`.
  - [x] 2.1.4 Run `npm run check:versions` and verify exit code 0.
  - [x] 2.1.5 Run full repository suite `node scripts/verify.js` and verify all 13 gates pass.

---

## Phase 3: Partition B — Global Agent Configuration Tracking

*Note: Partition B tasks modify global files outside this repository. Each task MUST obtain explicit user confirmation before applying and carries its own inline rollback.*

- [ ] 3.1 B-1: Reconcile `sdd-archive` tool permissions `[requires-user-confirmation]`
  - [ ] 3.1.1 Add `Bash` (and `Grep`) to `tools:` frontmatter in `C:\Users\lucas\.claude\agents\sdd-archive.md`.
  - [ ] 3.1.2 Verify unattended SDD archive execution capability.
  - [ ] 3.1.3 *Rollback*: Remove `Bash, Grep` from `sdd-archive.md` frontmatter.

- [ ] 3.2 B-2: Neutralize failing-open git guardrail hook `[requires-user-confirmation]`
  - [ ] 3.2.1 Verify working in-repo hook `.claude/hooks/block-dangerous-git.mjs` is active.
  - [ ] 3.2.2 Deactivate/remove failing-open skill at `C:\Users\lucas\.claude\skills\git-guardrails-claude-code\`.
  - [ ] 3.2.3 *Rollback*: Restore skill directory from backup.

- [ ] 3.3 B-3: Sequence Spec/Design graph ordering `[requires-user-confirmation]`
  - [ ] 3.3.1 In global orchestrator configuration, set `spec` dependency on `design` to prevent spec factual drift.
  - [ ] 3.3.2 *Rollback*: Restore parallel `spec` / `design` dispatch edge.

- [ ] 3.4 B-4: PR skill injection condition `[requires-user-confirmation]`
  - [ ] 3.4.1 Update orchestrator template to gate `branch-pr` / `chained-pr` injection on repository delivery model.
  - [ ] 3.4.2 *Rollback*: Revert condition in orchestrator prompt.

- [ ] 3.5 B-5: Engram mandate reconciliation `[requires-user-confirmation]`
  - [ ] 3.5.1 Present user options: (1) configure project engram MCP, or (2) remove mandatory engram save clause.
  - [ ] 3.5.2 Apply decided reconciliation to agent instructions.
  - [ ] 3.5.3 *Rollback*: Revert instruction edits.
