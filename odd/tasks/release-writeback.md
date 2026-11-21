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
- S2 The regeneration and version write-back commit lands on `main` before `auto-tag` plans,
  because the release copies the tag's tree. It carries a fixed message; a run whose last commit
  has that message does nothing.
- S3 The planner ignores the generated files derived from the tags, so a bookkeeping commit cannot
  plan the release that produced it. Planning the same tree twice returns the same plan.
- S4 `nn-mcp` and `nn-console` versions derive from commits touching their release paths
  (breaking → major, `feat` → minor, else patch) and are written into `package.json` plus
  `sync:versions` before the tag, so `version-agreement` holds at publish time.
- S5 A change is never required to move a release version for its gate to pass.
- S6 The tag shape `<key>-v<major>.<minor>.<patch>` does not change.

## Tasks

- T1 S1 — `regen-gate` tolerant mode + `verify.js` passes `--tolerant`. Route: inline. Status: pending.
- T2 S1 — `.githooks/pre-commit` stops regenerating and staging; delete `scripts/pre-commit-regen.js` and its test. Route: inline. Status: pending.
- T3 S2 — CI `regen` job: `npm ci`, `npm run regen`, commit with the fixed message, push; idempotent guard. Route: inline. Status: pending.
- T4 S2/S3 — `auto-tag` plans after the regeneration commit, not from the merge SHA; `plan-auto-tags` test that the plan is idempotent across a bookkeeping commit. Route: inline. Status: pending.
- T5 S3/S4/S5 — derive `nn-mcp`/`nn-console` in `plan-auto-tags`; write-back in the lane; retire `check-authored-bump` and the `release-bump` job; update `version-agreement`. Route: inline. Status: pending.
- T6 S4/S5/S6 — skill §3 and §5: artifacts leave the branch, the version is not authored, the
  write-back precedes the tag. Route: inline. Status: pending.
- T7 S1–S6 — verification: `node scripts/verify.js` (not `--fast`, which skips the regen gate),
  `scripts/release/*.test.*`, and one real merge to observe the lane end to end (`release (<tag>)`
  job success plus an empty plan on the bookkeeping commit). Route: inline. Status: pending.

## Log

- L1 (2026-11-21): "Barre tus wordtrees y abre el ciclo de la lane" — after shipping PR #765
  (collision tooling, claims retired, `ignoredRepoPaths`), open this cycle rather than implement
  blind: the two hazards are a non-terminating release lane and a release cut from a tree
  regenerated after the tag.
- L2 (2026-11-21): design settled while opening the cycle. Ordering means `auto-tag` has to plan
  from the regenerated `main`: the regeneration job pushes, and planning runs on the commit that
  push produced, not on the merge SHA of the same workflow run. That is the piece to prototype
  carefully; everything else is contained.
