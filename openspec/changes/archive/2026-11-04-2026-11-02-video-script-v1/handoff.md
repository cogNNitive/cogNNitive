# Handoff: implement the coNNtent bluepriNNt redesign (change `2026-11-02-video-script-v1`)

You are the implementing agent for a planned, fully specified change in the cogNNitive monorepo.
Planning is finished and approved. Your job is to apply it slice by slice as a chain of pull requests,
using strict TDD, without reopening product decisions.

## 1. Where things are

- Repository: `D:\Users\lucas\Documents\GitHub\cogNNitive` (GitHub `cogNNitive/cogNNitive`). Integration branch `dev`; `main` only receives batched merges.
- Planning branch: `origin/session/video-redesign`. It contains the change folder `openspec/changes/2026-11-02-video-script-v1/`.
- Read these files in this order before writing anything:
  1. `tasks.md`. Read the "Maintainer decisions (resolved 2026-11-02)" table first: it overrides every other artifact.
  2. `exploration.md`, for the audit and the settled decisions D1–D13.
  3. `proposal.md`.
  4. `design.md`.
  5. `specs/*/spec.md` (20 files).
- The real user domaiNN `D:\Users\lucas\Documents\_NN\video_NN` is the source of the audit. It is **read-only for you**. Slice 11 (the pilot port) belongs to the maintainer.

## 2. Session protocol (mandatory)

1. Load and follow `.agents/skills/nn-dev-development/SKILL.md`. It defines worktree isolation, commit-early, the blocked git commands and the guarded primary checkout.
2. Never write in the primary checkout. Create your own worktree from the primary:
   `node scripts/nn-session.mjs start --id conntent-v1`
   Then work in `D:\Users\lucas\Documents\GitHub\cogNNitive-conntent-v1`. Use literal paths with `git -C <path>`: the guard hook resolves the `-C` argument and cannot expand shell variables.
3. Never run `npm ci` / `npm install` inside a worktree. Its `node_modules` is a junction to the primary, and a reinstall corrupts the primary. If dependencies are missing, stop and ask the maintainer.
4. These commands are blocked by hooks; do not attempt them or prescribe them: `reset --hard`, `clean`, `stash`, `branch -D`, `checkout/restore .`, `checkout <ref> -- <path>`. To revert one file, use `git show <ref>:<path> > <path>`.
5. Load these skills before coding. Resolve the paths from `.atl/skill-registry.md`, or run `gentle-ai skill-registry refresh --force` if it is missing:
   - `chained-pr`
   - `work-unit-commits`
   - `tdd`
   - `pre-commit-hygiene-gate`
   - `nn-console-kit` (Slices 8–9)
   - `nn-innfo` (Slices 2a, 3a, 4, 10)

## 3. Branching: feature-branch-chain

- Create the tracker `feature/conntent-v1` from `origin/dev`. Merge `origin/session/video-redesign` into it first, so the change folder is present. Push it.
- One branch per slice: `feature/conntent-v1-<slice>` (for example `feature/conntent-v1-0a`).
- PR targets:
  - the first slice PR (Slice D) targets `feature/conntent-v1`;
  - every later slice PR targets the previous slice's branch, so each review diff shows only that slice.
- Every PR body carries a Chain Context: start, end, prior dependency, follow-up, out-of-scope, and a diagram marking the current PR. Follow the `chained-pr` skill.
- Merge a slice into its base only after its CI is green.
- Never merge the tracker into `dev` or `main`. Never tag and never release. Those steps are the maintainer's.

## 4. Slice order

`D → 0a → 0b → 1 → R → 2a → 2b → 3a → 3b → 4 → 5 → 6 → 7a → 7b → 8 → 9 → 10`

`tasks.md` holds the tasks, dependencies and verification commands for each slice. Notes:

- **D** is docs-only. It aligns proposal, design and specs with the resolved decisions:
  - 4 layer types: `avatar | media | text | animation`, with appearance in Presets;
  - `avatar` as the only name;
  - no bluepriNNt defaults for `budget` or `language`;
  - `series/<s>/assets/` for series media, and episodes only under `series/<s>/episodes/`;
  - `<slug>_coNNtent_<s>_NN.md`;
  - facts gitignored;
  - chapters written between markers in `description.md`;
  - `infinitetalk` allowed;
  - the rename to coNNtent.
- **0a / 0b** are quick wins on the current engine (V_0-14-x), under the old paths.
- **R** renames `coNNtent` to `coNNtent` (folder and catalog id) and `nn-conntent` to `nn-conntent` (skill). It leaves no alias or redirect. OpenSpec capability names stay `video-*`. It is mechanical and carries `size:exception`.
- **2a** is spec text and also carries `size:exception`. The other slices aim at ≤ 400 changed lines.
- **5** contains a spike: hardlink-mode and copy-mode renders must produce byte-identical masters. If they do not, stop and report before continuing.
- **11** is not yours.

## 5. Engineering rules

- **Strict TDD.** For every task: RED (a failing test, run it and see it fail) → GREEN → REFACTOR. Run the affected suite directly (`node --test <file>`), then `npm run verify:fast`. Run the full `node scripts/verify.js` before opening each PR.
- **No backwards compatibility.** Delete retired paths, keys, aliases and fallbacks. Retired keys must fail loudly and name their replacement.
- **Language and commits.** Artifacts are in English: code, comments, UI strings, docs, commits, PR text. Use conventional commits. NEVER add `Co-Authored-By` or any AI attribution to commits or PRs.
- **Canonical vocabulary:** defiNNition, iNNfo, bluepriNNt, kNNowledge, domaiNN (see `iNNfo/specs/vocabulary.json`).
- **nn-core.** It is NodeNext, so every new relative import carries `.js`. Rebuild nn-core before trusting failing nn-mcp tests after a merge.
- **bluepriNNt spec edits.**
  - `spec_NN.md` is edited in place with a frontmatter `template_version` bump.
  - Register the new version in the editor's `SHIPPED_TEMPLATE_VERSIONS`.
  - `manifest/source.yaml` `version:` is the spec axis, not `template_version`.
  - Never edit a published `_V_x-y-z_` file.
  - Keep `iNNfo/specs/bluepriNNts/catalog.json` and `docs/innfo/blueprints/catalog.json` in sync.
- **Console work.** After changing `nn-ui.css`, `ui-kit.js`, `nn-runtime.js`, `review.js`, `artifact_shell.html` or views:
  1. Run `node scripts/build-console-bundle.mjs`.
  2. Run `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`.
  3. Commit the regenerated fixture.
  4. Never hand-edit CSP hashes.
- **Derived artifacts.** Run `npm run regen` when the pre-push hook reports stale mirrors or bundles, and commit the output. Never commit a local build artifact you did not mean to change: restore it with `git show HEAD:<path> > <path>`.
- **Preflight tests can leak the real home directory.** Before trusting a green run, re-run suspicious ones with empty `USERPROFILE` and `HOME`.
- **Pre-push hook.** `--no-verify` is acceptable only on slice branches, and only when the failure is environmental (for example missing build tools). Say so in the PR body. CI is authoritative.

## 6. Progress tracking

- Tick checkboxes in `tasks.md` as tasks finish, inside the slice's own PR.
- Keep `openspec/changes/2026-11-02-video-script-v1/apply-progress.md` up to date. Merge into it; never overwrite it. Record per slice: branch, PR URL, commits, verification output summary, deviations, open issues.
- If Engram tools are available, also save to topic `sdd/2026-11-02-video-script-v1/apply-progress` (project `cogNNitive`) with `capture_prompt: false`.

## 7. Stop and ask the maintainer when

- A spec or design statement contradicts the resolved decisions table, or a needed decision is missing. Never guess a product decision.
- The Slice 5 link-vs-copy spike fails, the Slice 1 core mirror bundle is unreasonably large, or a console bundle exceeds the size budget in `console-view-registry`.
- CI is red for a reason that also fails on the base branch (pre-existing red). Do not fix it as a rider.
- Anything would touch `D:\Users\lucas\Documents\_NN\video_NN`, delete data outside the repo, push to `dev`/`main`, tag, or release.

## 8. Reporting

The maintainer reads replies in Spanish. Keep replies short. After each slice, report:
- the slice;
- the PR link;
- what changed;
- the verification result, with the failing output if any;
- deviations;
- the next slice.

Artifacts stay in English.
