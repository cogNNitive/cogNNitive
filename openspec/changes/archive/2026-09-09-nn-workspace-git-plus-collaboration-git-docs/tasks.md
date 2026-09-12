# Tasks: nn-workspace-git plus collaboration-git docs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 320–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR to dev |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Standalone skill + Guides page + manifest entry | PR 1 | Base dev; tests/docs included; single reviewable unit |

## Phase 1: Skill foundation (`nn-workspace-git`)

- [x] 1.1 RED: add failing fixture check for `actioNN/skills/nn-workspace-git/SKILL.md` frontmatter (`disable-model-invocation: true`, version `V_0-1-0`)
- [x] 1.2 GREEN: create `actioNN/skills/nn-workspace-git/SKILL.md` with gate, menu `[a] init [b] branch+PR [c] map [d] backup`, map row, backup + `.gitignore` template
- [x] 1.3 RED: add failing fixture check for `.gitignore` patterns (`staging/`, heavy `original/`, `specs/` cache, `*.env`/tokens) and map format `| V_x-y-z | <sha> | <date> |`
- [x] 1.4 GREEN: fix skill body so gate aborts with zero side effects without git/auth and double-confirm guards remote/destructive ops

## Phase 2: Docs guide (Guides page + model + sidebar)

- [x] 2.1 RED: add failing check that `docs/innfo/documentation/collaboration-git.md` exists and covers Overview, Prerequisites, Private+`.gitignore`, Branch/PR gates, Map, Backup, Boundary
- [x] 2.2 GREEN: create `docs/innfo/documentation/collaboration-git.md` in English only per design contracts
- [x] 2.3 GREEN: append `## NN Page: Collaboration with Git` to `docs/innfo/documentation/documentation_NN.md` (`source:: collaboration-git.md`, `route:: collaboration-git`, `order:: 50`, `parent:: [[Guides]]`)
- [x] 2.4 GREEN: add Guides line `Collaboration with Git` to `docs/innfo/documentation/_sidebar.md` after file 2.2 lands on disk

## Phase 3: Manifest registration (`source.yaml`) — DEFERRED TO RELEASE

> 2026-09-09 correction: entry appended then REVERTED. Precedent `73cbc64`
> (nn-upgrade registered in `chore(release)`, not in feature `8834b69`):
> registering pre-release breaks `Validate Stable Manifest` (404 at pinned
> tag) while omitting it breaks `Doc Fresh` — both cannot pass before the
> release tags exist. `check-parity.js` only walks `source.yaml` entries, so
> an unregistered skill dir stays green. Registration + regen belong to the
> release commit. `check-parity` 8 skills OK, `Doc Fresh` OK, stable OK.

- [x] 3.1 RED: add failing YAML check for `manifest/source.yaml` skills entry `nn-workspace-git` (`repo`, `path: actioNN/skills/nn-workspace-git`, `ref_key: skills`)
- [x] 3.2 GREEN then REVERT: entry appended, verified the pre-release dilemma live (regen OK after rate-limit retry, then stable-validate 404), reverted to keep all manifest gates green; registration moves to `chore(release)`

## Phase 4: Verification and boundary

- [x] 4.1 Verify frontmatter/YAML: parse skill frontmatter and `manifest/source.yaml`; run `node scripts/verify.js`
- [x] 4.2 Verify docs: run `node scripts/generate-docsify-sidebar.mjs --sidebar-only` (exit 0 + entry); confirm missing-source aborts nonzero
- [x] 4.3 Verify boundary + language: `git diff --stat actioNN/skills/nn-innfo/SKILL.md` is empty; English-only scan of new/edited Markdown
