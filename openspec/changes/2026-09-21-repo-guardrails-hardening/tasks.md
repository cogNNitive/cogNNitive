# Tasks: Repo Guardrails Hardening

## How to read this file

Five independent slices, landing in dependency order **F2 → F1 → F4 → F3 → F5** (design §7,
value ordering — the file sets are pairwise disjoint, so nothing here is a true dependency
chain; this is landing order, not blocking order).

**Chain mapping (design ADR-010, binding on `sdd-apply`):** `chain_strategy` is
`stacked-to-main`, but this repo's documented workflow (`nn-dev-development` §4e,
`single-dev-branch-workflow.md`) has no per-change PRs — commits land on `dev`, and `dev`
batches to `main`. Each slice below is therefore **one self-contained, independently
revertible work-unit commit on `dev`**, not a feature branch. "PR boundary" in each group
means "commit boundary" — what one `git log -1 <sha>` would show a reviewer. If a maintainer
later wants review-sized PRs, any single slice's commit can be cherry-picked onto a branch
without touching the others, guaranteed by zero file overlap across slices (design §7, §4).

**Staging discipline (mandatory, every slice):** the working tree carries 71 uncommitted
paths from a concurrent session (in-flight OpenSpec archive move + unrelated template/spec
edits). `sdd-apply` MUST stage each slice with explicit pathspecs
(`git add <exact-path> <exact-path>`) and MUST NOT run `git add -A` or `git add .` at any
point in this change. `F3`'s `git rm --cached .atl/skill-registry.md` is the only
index-mutating operation outside normal `git add`, and it names a single path.

**Strict TDD scope:** only slice 3 (`normalize-frontmatter-level`) contains testable logic.
Slices 1, 2, 4, 5 are wiring/config/docs; design §6 states plainly that a test asserting a
YAML/shell/doc file contains the text it was just written to contain is tautological (passes
on save, fails only on unrelated rename) and is deliberately not written. Each of those four
slices instead carries a named manual falsification procedure, carried here verbatim as a
checkable task item — not invented, not skipped.

---

## Slice 1 — `ci-stable-manifest-on-dev` (F2)

**Satisfies:** delta spec `specs/ci-stable-manifest-on-dev/spec.md`, both requirements
("Stable-manifest coherence check runs on `dev` pushes", "Drift is detected after merge, not
prevented before it").

**Commit boundary.** Contains: one new step in `.github/workflows/ci.yml`'s `verify` job,
guarded by `if: github.event_name == 'push' && github.ref == 'refs/heads/dev'`, with
`continue-on-error: true`, invoking the existing
`node scripts/manifest/validate-manifest.js --channel stable` with `GITHUB_TOKEN` — plus a
one-line workflow comment stating the step is detection, not pre-merge prevention (design
ADR-004, delta spec scenario "The workflow does not claim pre-merge prevention"). Does not
touch: `scripts/verify.js`, the existing `--release`-gated `main` step, any other CI job.

- [x] Add the `dev`-conditioned step to `.github/workflows/ci.yml`, positioned after the
      existing `main`-only stable-manifest step, calling the identical script/channel
      argument (`node scripts/manifest/validate-manifest.js --channel stable`).
- [x] Set `continue-on-error: true` on the new step so job conclusion stays green while the
      step itself renders red with an annotation when it fails (design ADR-004 — this is the
      chosen semantics, not a placeholder to tighten later).
- [x] Add the one-line workflow comment stating the check evaluates state already merged to
      `main`, not an unmerged PR's prospective effect (delta spec scenario, design §2 ADR-004
      "Why non-blocking is the correct semantics").
- [x] Confirm no change to `scripts/verify.js` and no widening of the existing `--release`
      condition at `ci.yml:47` (design §8, cut items 4-5).
- [~] Manual falsification (design §6, row 1 — no automated test, by design): push to `dev`
      and confirm the step appears, executes `validate-manifest.js --channel stable`, and
      passes given the currently-coherent pin state (`OK: [stable] 8 skills, 15 templates, 1
      mcp bundles, 1 console assets validated`, confirmed this session). Record the run URL
      in the commit body. **Partially done**: local dry-run of the exact command executed and
      passed this session (see commit `ca1d267` body and `apply-progress.md`); the actual
      push-triggered `dev` Actions run was not performed in this batch (see apply-progress
      Deviations) — run URL still pending on the next real push to `dev`.
- [x] Commit: `feat(ci): surface stable-manifest coherence on dev pushes` (or equivalent
      Conventional Commit), staged with `git add .github/workflows/ci.yml` only.

**Verification.** `npm run verify` unaffected locally (no `--release`, this step doesn't run
outside CI). The falsification step above is the actual proof.

**Rollback.** Revert the single commit; the `.github/workflows/ci.yml` diff is fully isolated
to this step (design Rollback section).

**Est. changed lines:** ~8 (design §7).

---

## Slice 2 — `native-pre-push-hook` (F1)

**Satisfies:** delta spec `specs/native-pre-push-hook/spec.md`, all four requirements (hook
tracked and native, blocks on failure, passes on success, `--no-verify` unpoliced, no
`pre-commit` added).

**Commit boundary.** Contains: new `.githooks/pre-push` (mode `100755`, LF line endings, runs
`npm run typecheck`, prints the `--no-verify` bypass on failure, carries the `ponytail:`
comment recording the deferred stdin/tag-push optimization per ADR-001), one `prepare` line
in the root `package.json`, one README note (hook exists, what it runs, bypass, uninstall).
Does not touch: any other workspace's `package.json`, `scripts/verify.js`, lint/format/commit
tooling (design non-goals, confirmed §8 cut list).

- [x] Write `.githooks/pre-push`: `#!/bin/sh`, runs `npm run typecheck` from repo root (git
      guarantees `cwd` = repo root for hooks), on non-zero exit prints the compiler output
      and one line naming `git push --no-verify` as the documented bypass, exits with the
      underlying command's status.
- [x] Add the `ponytail:` comment in the hook recording the known ceiling: it ignores stdin
      and therefore also runs on tag pushes/ref deletions; upgrade path is reading
      `$remote_ref` and skipping non-`refs/heads/*` refs; not shipped now (design ADR-001).
- [x] **Mechanical hazard — executable bit (design §10, "Medium-high" residual risk, the
      single most likely silent-failure mode):** after creating the file, run
      `git update-index --chmod=+x .githooks/pre-push` before committing. Confirm with
      `git ls-files -s .githooks/pre-push` showing mode `100755`, not `100644`.
- [x] **Mechanical hazard — line endings:** confirm the file is LF-terminated (no CRLF), since
      Git for Windows runs hooks through its bundled `sh` and a CRLF shebang line breaks
      silently. Verify with `file .githooks/pre-push` or an editor's line-ending indicator
      before commit; do not rely on repo-wide `.gitattributes` defaults without checking this
      file specifically.
- [x] Add `"prepare": "git config core.hooksPath .githooks"` to root `package.json` `scripts`
      (ADR-002 — automatic, no opt-in alternative; do not also add a `hooks:install` script).
- [x] Add the README note: hook exists, runs `npm run typecheck` on push, bypass via
      `git push --no-verify`, uninstall via `git config --unset core.hooksPath`.
- [x] Manual falsification (design §6, row 2 — no automated test, by design; run once at
      implementation, record the four outcomes in the commit body):
  - [x] (a) Fresh `npm install` at root → `git config core.hooksPath` prints `.githooks`.
  - [x] (b) Introduce a deliberate type error → `git push` is **blocked**, compiler output
        visible. This is the step that matters: the only proof the hook is wired,
        executable, and non-vacuous.
  - [x] (c) Same broken state → `git push --no-verify` **succeeds**.
  - [x] (d) Revert the deliberate error → `git push` succeeds normally.
- [x] Commit: `feat(git): add native pre-push typecheck gate via core.hooksPath`, staged with
      `git add .githooks/pre-push package.json README.md` only.

**Verification.** The four-step manual falsification above is the verification; there is no
automated test for a hook whose subject is a real `git push` against a real remote (design
§6 explicitly rejects spawning one as heavier and flakier than the thing it tests).

**Rollback.** Delete `.githooks/`, remove the `prepare` line; git falls back to
`.git/hooks/` (design Rollback section).

**Est. changed lines:** ~20 (design §7).

---

## Slice 3 — `normalize-frontmatter-level` (F4)

**Satisfies:** delta spec `specs/normalize-frontmatter-level/spec.md`, with one binding
amendment carried forward per design §9 (see below) — **the spec's own
"`preflight-check.js` no longer re-checks `level`'s type" scenario is corrected, not
implemented as written.**

### Spec amendment carried into this slice (design §9, ADR-007 — read before touching `preflight-check.js`)

- The delta spec instructs deleting the `=== 1 || === '1'` / `=== 2 || === '2'` comparisons
  wholesale. **This is wrong and MUST NOT be done.** `preflight-check.js:34` imports
  `./lib/yaml-lite`, a separate hand-rolled parser whose `parseScalar` never produces a
  number — `fm.level` is *always* a string there. The numeric halves (`=== 1`, `=== 2`) are
  provably dead; the string halves (`=== '1'`, `=== '2'`) are the live branches.
- **Corrected instruction:** delete only the dead numeric sub-expressions
  (`fm.level === 1 ||` and `fm.level === 2 ||`) at lines 546-547. Keep the string
  comparisons. Deleting the strings would silently stop preflight from skipping Level-1
  files and collecting Level-2 templates.
- The proposal's success criterion ("`grep` for `level === '1'`/`'2'`/`'3'` and
  `typeof fm.level` returns zero hits outside the single normalizer") is amended to: zero
  hits inside **innfo-core / innfo-mcp / innfo-editor**; the two `preflight-check.js` string
  comparisons are expected, correct, and belong to a separate parser (design §9 item 2).

### Strict TDD — RED first (design §6 "Slice 3 — the TDD cycle")

- [x] **RED**, `iNNfo/packages/innfo-core/tests/parser-standard.test.ts` — add, in one
      commit-worthy batch, before any implementation change:
  1. `level: "2"` → `parseFrontmatter(...).level` is the number `2`. *(must fail today —
     confirms the bug exists.)*
  2. `level: 2` → number `2`. *(must already pass — no-op regression guard for the 200+
     corpus form; confirms the test isn't accidentally trivially green.)*
  3. `level: "abc"` → unchanged string `"abc"`, does not throw.
  4. `level: ""` → unchanged `""`, **not** coerced to `0`.
  5. `level: "2.5"` → unchanged string `"2.5"`.
  6. no `level` key → `'level' in fm` is `false`.
- [x] **RED (second file)**, `skills/nn-preflight/scripts/preflight-check.test.js` — add a
      case asserting a `level: 1` file is skipped by the template walk. Run it **before** the
      ADR-007 deletion and confirm it is already green (this pre-existing green is the proof
      the numeric deletion below is genuinely dead code, not an assumption).
- [x] Run both suites, confirm the exact RED/GREEN split above (test 1 fails, tests 2-6 and
      the preflight case pass) before writing any implementation.

### GREEN

- [x] Add `normalizeLevel` to `iNNfo/packages/innfo-core/src/parser/yaml.ts`'s `NORMALIZERS`
      array (appended last — order-independent, no other normalizer reads/writes `level`,
      design §4). Contract (design ADR-005, binding):
      - string, trims, `Number.isInteger(Number(trimmed))` → coerce to `Number(trimmed)`.
      - empty/whitespace-only string → left unmodified (do NOT let `Number('')` produce `0`).
      - non-string, non-coercible-string, or absent → left unmodified. Never throws, never
        deletes the key, never substitutes a default.
- [x] Apply ADR-006 to `iNNfo/packages/innfo-core/src/recursiveParser/model.ts:53`: replace
      `const hasLevel = typeof fm.level === 'number'` with
      `const hasLevel = fm.level !== undefined` (presence check, not type check — the OR'd
      heuristic answers "does this file have iNNfo frontmatter", not "is level well-typed").
- [x] Apply the corrected ADR-007 edit to `skills/nn-preflight/scripts/preflight-check.js`:
      delete only `fm.level === 1 ||` and `fm.level === 2 ||` at lines 546-547, keep
      `fm.level === '1'` / `fm.level === '2'` intact.
- [x] Confirm all six `parser-standard.test.ts` cases and the preflight case are green.

### REFACTOR / regression surface

- [x] Run `npm run verify`, with specific attention to:
      - `tests/roundtrip-fidelity.test.ts` (corpus byte-fidelity — ADR-005 claims coercion
        cannot alter serialized output for any existing file; this is the standing guard).
      - `tests/recursive-parser.test.ts` (ADR-006 — behaviour delta only for a `level` that
        is neither number nor integer string, zero corpus instances).
      - `node scripts/verify.js`'s preflight step (ADR-007 — `preflight-check.test.js` runs
        inside `verify.js`, confirmed at `scripts/verify.js:163`).
- [x] Commit as ONE work unit (test + code + the corrected preflight deletion travel
      together — do not split RED into a separate commit from GREEN, per work-unit-commits
      discipline: a commit that only adds tests for code landing later is prohibited):
      `fix(parser): normalize level to number at frontmatter boundary` (or equivalent),
      staged explicitly with
      `git add iNNfo/packages/innfo-core/src/parser/yaml.ts iNNfo/packages/innfo-core/src/recursiveParser/model.ts iNNfo/packages/innfo-core/tests/parser-standard.test.ts skills/nn-preflight/scripts/preflight-check.js skills/nn-preflight/scripts/preflight-check.test.js`
      — no wildcard staging.

**Verification.** `npm run verify` green, full RED→GREEN cycle documented above.

**Rollback.** Revert the single commit; `rawFrontmatter` capture means no serialized corpus
file changes as a side effect to unwind (design ADR-005 round-trip safety note).

**Est. changed lines:** net ≈ +30, mostly test (design §7).

---

## Slice 4 — `untrack-skill-registry` (F3)

**Satisfies:** delta spec `specs/untrack-skill-registry/spec.md`, requirements "file removed
from git tracking" and "regeneration documented" — **with the "gitignored going forward"
scenario's implementation step corrected** per design §9 item 3 / ADR-008.

### Spec amendment carried into this slice (design §9, ADR-008)

- The delta spec's scenario "The file is gitignored going forward" implies adding a
  `.gitignore` entry. **`.gitignore:62` already contains `.atl/` — verified.** No
  `.gitignore` edit ships; adding a narrower duplicate rule would be redundant noise. The
  scenario's *assertion* (file never appears in a diff again) still holds and is still
  verified below — only its implied implementation step is dropped.
- This shrinks the slice to two operations: a git index removal and one doc line.

- [x] `git rm --cached .atl/skill-registry.md`. Confirm the file remains on disk, byte-for-
      byte unchanged (`git rm --cached` never touches the working-tree copy).
- [x] Add one line to `AGENTS.md` (not a new document — it already carries the
      `<!-- gentle-ai:session-start-skill -->` block and is the file delegating agents read
      at session start) giving the regeneration command
      (`gentle-ai skill-registry refresh --force`, already self-documented at
      `.atl/skill-registry.md:3` for the case where the file already exists — the AGENTS.md
      line exists for the fresh-clone case where it doesn't).
- [x] Confirm no change to `.gitignore`, the skill-resolution protocol (engram primary, local
      file fallback), or the registry's own content/contract (design §4 "Untracked").
- [x] Manual falsification (design §6, row 4 — no automated test, one-shot git index
      operation, nothing to unit-test):
  - [x] `git ls-files .atl/` returns empty.
  - [x] `Test-Path .atl/skill-registry.md` (or `test -f`) returns true — file still present
        on disk.
  - [x] The path is absent from `git status` output after the commit.
- [x] Commit: `chore(git): untrack machine-generated skill registry`, staged with
      `git add AGENTS.md` plus the `git rm --cached` above (both are part of the same commit
      — the index removal itself stages the path; do not additionally `git add
      .atl/skill-registry.md`).

**Verification.** The three-point manual check above; no logic exists to unit-test (design
§6, row 4).

**Rollback.** `git add .atl/skill-registry.md` re-adds it to tracking; content is unaffected
throughout (design Rollback section).

**Est. changed lines:** 1 line + 1 index operation (design §7).

---

## Slice 5 — `safe-ff-merge-technique` (F5 residue)

**Satisfies:** delta spec `specs/safe-ff-merge-technique/spec.md`, all three requirements
(technique documented, dirty-tree case covered, old dance removed/superseded, tag/pin
compatibility stated, no new hazard-detection mechanism).

**Commit boundary.** Contains: prose edits to `.agents/skills/nn-dev-release/SKILL.md` and
`.agents/skills/nn-dev-development/SKILL.md` only. No code, no new document, no hook, no
tree-inspection script (design non-goal, confirmed §8).

- [x] In `.agents/skills/nn-dev-release/SKILL.md`, replace or mark-superseded the
      `switch main → pull → merge --ff-only → push → switch dev` dance with
      `git push origin dev:main` as the documented technique, stating explicitly:
      - it is a server-side fast-forward push and never checks out `main` locally;
      - the dirty working tree (this repo's normal state) is left untouched because no
        checkout occurs.
- [x] Add the two ADR-009 constraints verbatim, not as an aside:
      1. **Tag immediately after the `dev:main` push, before any further commit on `dev`.**
         If `dev` has advanced, tag the exact merged commit explicitly:
         `git tag <name> $(git rev-parse origin/main)`. Otherwise the tag lands on a
         `dev`-only commit and `validate-manifest.js` rejects the diverged tip.
      2. **`main` must be an ancestor of `dev`.** `git push origin dev:main` is a
         fast-forward push; if a sibling agent advanced `main` independently, the server
         rejects it non-destructively (no partial state). Recovery is
         `git fetch origin && git merge origin/main` **on `dev`** — still no checkout of
         `main`.
- [x] State the limitation: if branch protection requiring PRs/status checks is ever enabled
      on `main`, `dev:main` is rejected; not enabled today, but recorded so the failure is
      legible if it ever occurs (design ADR-009).
- [x] Mirror the same technique + constraints in
      `.agents/skills/nn-dev-development/SKILL.md` §4e (the existing single-branch-workflow
      section), so the two skill files do not disagree.
- [x] Explicitly do NOT add: any new skill file, any hook or script classifying
      working-tree paths as foreign/stale, or any resolution of the concurrent session's
      in-flight OpenSpec archive move (design non-goals, §8 — "not ours to touch").
- [x] Manual falsification (design §6, row 5 — documentation-only, no automated test): a
      reviewer executes `git push origin dev:main` on the next real batch and confirms the
      documented behavior (tree untouched, no checkout, fast-forward semantics, tag-order
      constraint holds). **Not performed this batch** — no push to `origin/main` was made
      (out of this apply run's boundary, that push is the maintainer's call); the
      documentation is verified for internal consistency (both skill files state the same
      technique and constraints) but the real-execution falsification is still pending on
      the next actual `dev → main` batch.
- [x] Commit: `docs(release): document dev:main fast-forward as the safe merge technique`,
      staged with
      `git add .agents/skills/nn-dev-release/SKILL.md .agents/skills/nn-dev-development/SKILL.md`
      only.

**Verification.** The manual falsification above, per the delta spec's own verification
note ("its verification is a reviewer confirming the documented command against a real
execution, not an automated test").

**Rollback.** Revert the single commit; prose-only, no data or build-artifact change (design
Rollback section).

**Est. changed lines:** ~10 (design §7).

---

## Cut from this tasks plan (ponytail)

Per the design's own §8 cut list, the following were considered while writing tasks and
excluded because they exist only to satisfy process, not to change behaviour:

- **A task to write a test asserting `ci.yml` contains its new step's text, or that
  `.githooks/pre-push` contains its own shebang/command.** Tautological — passes on save,
  fails only on an unrelated rename. The manual falsification procedures above are the real
  check; a text-match test would add ritual without catching anything they don't.
- **A task to split slices 1, 2, 4, 5 into RED/GREEN commits.** They carry no testable logic
  (design §6); a mandated red-before-green structure for a YAML/shell/doc change would
  invent a test to satisfy the ritual, which the brief explicitly forbids.
- **A separate "install husky" or "install lint-staged" evaluation task.** Already decided
  and rejected in the proposal and design (ADR §8); re-litigating it here would be
  restating a closed decision as an open task.
- **A task to resolve the concurrent session's 71 uncommitted paths.** Explicitly not this
  change's scope (design §4, §8); the only task-level obligation is the staging discipline
  stated once at the top of this file, not a cleanup task.

---

## Review Workload Forecast

Per `chain_strategy: stacked-to-main` (mapped to sequential work-unit commits on `dev` per
design ADR-010) and `delivery_strategy: auto-chain`, already resolved — this section is
informational, not a decision point.

| Slice | Est. changed lines | Independently shippable | Automated test |
| :-- | :-- | :-- | :-- |
| 1 — `ci-stable-manifest-on-dev` | ~8 | Yes | No (falsification procedure) |
| 2 — `native-pre-push-hook` | ~20 | Yes | No (falsification procedure) |
| 3 — `normalize-frontmatter-level` | ~30 (net, mostly test) | Yes | Yes (full RED→GREEN) |
| 4 — `untrack-skill-registry` | ~1 + 1 index op | Yes | No (3-point manual check) |
| 5 — `safe-ff-merge-technique` | ~10 | Yes | No (falsification procedure) |
| **Total** | **~69 lines** | — | — |

- **Chained PRs recommended:** No — but the change is already delivered as 5 independent,
  ordered work-unit commits per ADR-010, which gives the same review-isolation benefit
  chained PRs exist for, without inventing branches the repo's workflow doesn't use.
- **400-line budget risk:** None. ~69 total changed lines is roughly 17% of the 400-line
  single-PR budget; each individual slice is under 30 lines.
- **Estimated changed lines:** ~69 across all five slices combined (design §7 totals,
  independently re-summed here).
- **Decision needed before apply:** No. Delivery strategy, chain strategy, and landing order
  are all resolved in configuration and design ADR-010; `sdd-apply` proceeds without pausing
  for a chained-PR decision.
