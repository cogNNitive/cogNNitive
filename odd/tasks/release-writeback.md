# release-writeback

Objective: stop generated artifacts and authored versions from travelling in a change branch, by
committing them on `main` after the merge and before any tag is planned.
Branch: `session/release-writeback`. Delivery: one PR (heavy lane, delta spec at
`openspec/changes/release-writeback/specs/release-writeback/spec.md`).
Test runner: `node --test <file>`, `node scripts/verify.js --fast`, `npm run check:openspec`.

## Specs

- S1 The derived-artifact gate accepts a shared artifact that moves with the change's source, and
  fails when a moved path is not a shared artifact. The list lives in
  `scripts/lib/shared-artifacts.js` and nowhere else. A branch is never required to commit a
  regenerated artifact. The gate still runs the generators.
- S2 The regeneration and version write-back reaches `main` before `auto-tag` plans, because the
  release copies the tag's tree. It reaches it through one pull request on `chore/regen`, never as
  a push to `main`: `regen` opens that pull request when it has something to write, refreshes the
  same one on later pushes, and reports `pending`, which `auto-tag` reads. A write-back pull
  request that lands leaves nothing to write, so the next pass proposes nothing and the lane
  reaches a fixed point.
- S7 Nothing in CI pushes to `main` directly. The write-back is proposed, not applied, so `main`
  can require checks and a pull request rule without an automation bypass — which cannot exist
  here, because the GitHub Actions integration is not accepted as a ruleset bypass actor.
- S3 The planner ignores the generated files derived from the tags, so a bookkeeping commit cannot
  plan the release that produced it. Planning the same tree twice returns the same plan.
- S4 `nn-mcp` and `nn-console` versions derive from commits touching their release paths
  (breaking → major, `feat` → minor, else patch) and are written into `package.json` plus
  `sync:versions` before the tag, so `version-agreement` holds at publish time.
- S5 A change is never required to move a release version for its gate to pass.
- S6 The tag shape `<key>-v<major>.<minor>.<patch>` does not change.

## Tasks

- T1 S1 — `regen-gate` tolerant mode + `verify.js` passes `--tolerant`. Route: inline. Status: done —
  `checkRegen({ tolerant })` splits the moved paths by `sharedArtifactLabel`; 14/14 in
  `scripts/lib/regen-gate.test.js`, including "a shared artifact belongs to the lane" and "a path
  the generator may not own still fails".
- T2 S1 — `.githooks/pre-commit` stops regenerating and staging; delete `scripts/pre-commit-regen.js` and its test. Route: inline. Status: done — the hook keeps only the primary guard; `pre-push-check` (14/14) still consumes `FRESHNESS_GUARDS`, so the push path is unchanged.
- T3 S2 — CI `regen` job: `npm ci`, `npm run regen`, commit with the fixed message, push; idempotent guard. Route: inline. Status: done — the job runs after `verify`/`quality`/`spec-integrity`, pushes `chore(regen): …` and no-ops when the last commit already has it. `release.yml` also checks out `inputs.tag`, because the release stages the key paths and diffs them against the tag's tree.
- T4 S2/S3 — `auto-tag` plans after the regeneration commit, not from the merge SHA; `plan-auto-tags` test that the plan is idempotent across a bookkeeping commit. Route: inline. Status: done — `auto-tag` fetches `origin/main`, checks out `FETCH_HEAD`, emits that SHA and passes it to `push-release-tags`; `generatedUnder` derives the exclusions from `shared-artifacts.js` over `git ls-files`, so a new generator under `skills/` or `iNNfo/specs/` is excluded the moment it is tracked. 11/11 in `plan-auto-tags.test.js`, including "a commit that only rewrites generated files plans nothing for any content key".
- T5 S3/S4/S5 — derive `nn-mcp`/`nn-console` in `plan-auto-tags`; write-back in the lane; retire `check-authored-bump` and the `release-bump` job; update `version-agreement`. Route: inline. Status: done —
  `release-keys.js` gains `changePaths` (what triggers) next to `repoPaths` (what ships), because
  `nn-mcp`'s only repo path is the generated bundle and deriving from it would never release;
  `planAutoTags` derives every key from commits; `scripts/release/write-pending-versions.js`
  materializes the version into each `package.json` before the tag; `release-bump` and
  `check-authored-bump` are deleted (the gate silently stopped firing once artifacts left the PR,
  because its trigger paths were the generated bundle). 11/11 plan-auto-tags, 3/3 write-back
  (including "a commit that only rewrites generated files writes nothing" and idempotency).
- T6 S4/S5/S6 — skill §3 and §5: artifacts leave the branch, the version is not authored, the
  write-back precedes the tag. Route: inline. Status: done — §3's derived-artifact bullet now says
  they belong to `main`; §5 carries `repoPaths` vs `changePaths`, the derived-version table and the
  removal of the hand bump.
- T7 S1–S6 — verification: `node scripts/verify.js` (not `--fast`, which skips the regen gate),
  `scripts/release/*.test.*`, and one real merge to observe the lane end to end (`release (<tag>)`
  job success plus an empty plan on the bookkeeping commit). Route: inline. Status: **observed** on
  2026-11-21, twice:
  - merge `787849c6` (#766): the lane regenerated and the commit was refused by
    `guard-primary-checkout` (a runner's only checkout is a primary), so `regen` failed and
    `auto-tag` was skipped. Fixed forward in #767.
  - merge `27f49345` (#767): `regen` committed `79165ff88` (the two catalogs, stamped
    `blueprints-v0.85.1`), `auto-tag` planned `[]`, `release` skipped, tags unchanged, and no
    follow-up run exists at all because a push made with `GITHUB_TOKEN` does not trigger
    workflows. `node scripts/release/plan-auto-tags.js` on `79165ff88` returns `[]`, so the
    lane cannot re-enter even with a token that does trigger.
- T8 S2/S7 — the write-back stops being a push to `main`: `scripts/lib/regen-writeback.js` pushes
  `chore/regen` under a lease, verifies its parent is still `main` after the push, and decides
  create/reuse/skip for the pull request; `scripts/regen-writeback.js` reports `pending` and
  `branch`; `ci.yml` grants `pull-requests: write` and gates `auto-tag` on
  `needs.regen.outputs.pending != 'true'`; the skill's §3/§4/§5 describe the pull request.
  Route: inline. Status: done — 14/14 in `scripts/lib/regen-writeback.test.js`, including "the
  write-back lands on its branch, and main never receives it", "a merge landing while the
  artifacts are generated is re-derived, not proposed stale", "a second pass over the tree the
  write-back already landed in pushes nothing", and a `ci.yml` contract case that fails if any
  step pushes to `main` again. Dry run: the first pass writes the derived version, the second
  pass on the resulting tree writes nothing.
- L3 (2026-11-21): T5 changed shape while implementing it. `repoPaths` is what ships and
  `changePaths` is what triggers, and they are not the same for `nn-mcp`: its only repo path is
  the generated bundle, so deriving from it would mean the key never releases. Worse, that was
  already true of the retired `check-authored-bump`: its trigger list was the same generated
  bundle, so with artifacts out of the PR it would have gone silent and packages would have
  stopped releasing with a green run. That finding is what turned T5 from "nice to have" into
  required.

## Log

- L1 (2026-11-21): "Barre tus wordtrees y abre el ciclo de la lane" — after shipping PR #765
  (collision tooling, claims retired, `ignoredRepoPaths`), open this cycle rather than implement
  blind: the two hazards are a non-terminating release lane and a release cut from a tree
  regenerated after the tag.
- L2 (2026-11-21): design settled while opening the cycle. Ordering means `auto-tag` has to plan
  from the regenerated `main`: the regeneration job pushes, and planning runs on the commit that
  push produced, not on the merge SHA of the same workflow run. That is the piece to prototype
  carefully; everything else is contained.
- L4 (2026-11-23): "Make `main` fully protectable by removing the only automated direct push to
  it." The push L2 designed is now the blocker: it is the only automated direct write to `main`,
  and it cannot be excepted — the GitHub Actions integration is not accepted as a ruleset bypass
  actor on this repository (Dependabot is; verified), so `main` cannot require checks while the
  lane keeps writing to it. The push therefore becomes a pull request on `chore/regen`, and the
  ordering L2 established moves one step out: `regen` reports `pending`, and `auto-tag` waits for
  that pull request to land. This supersedes the "a run whose last commit already has that
  message does nothing" guard in S2 — the merge commit never carries the write-back subject, so
  the idempotence guard is now the pass itself: the second run regenerates and finds no diff.
  Loop evidence: the `regen` PR's merge is a push to `main`, that run's `regen` steps must all
  report "fresh", and `node scripts/regen.js --check` in the same job asserts it.
