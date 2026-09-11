# Apply Progress: Dev→Main Process Gaps

## Status

**COMPLETE** — all Phase 0–5 tasks implemented and verified. No merge, tag,
pin, manifest regeneration, or user-facing behavior change was performed.

## Environment / baseline (Phase 0)

- Branch: `dev` @ `97bdef0` (in sync with `origin/dev`; 0 ahead/behind)
- `origin/main`: `918e43a` — dev is 2 commits ahead of main; no merge performed.
- Stashes: none · worktrees: single · foreign uncommitted edits present
  (`iNNfo/apps/innfo-editor/**`, `manifest/source.yaml`, `_NN/**`, `actioNN/**`,
  `.gitignore`, `docs/use/manifest.md`, `openspec/backlog.md`) — **never staged**.
- Baseline gates: `node scripts/verify.js` → exit 0; `npm --prefix iNNfo run
  check:spec-urls` → exit 0.
- Gaps reproduced:
  1. `scripts/verify.js` had no reference to the three root manifest suites.
  2. No tracked-text encoding guard existed.
  3. Git-aware selection already present in `check-spec-version.mjs` (commit
     `8de0252` on `main`) but neither shared nor tested.
  4. `check-integrity --pre-push` already ran coverage + spec URLs (commit
     `918e43a` on `main`); Group 5 prose did not document residual nonequivalence.
  5. Duplicated `rmWithRetry` in `check-workspace.spec.ts` and
     `resolver-node.spec.ts`.

## Implemented

### Phase 1 — Manifest suites in deterministic verification

- RED: `Select-String` over `scripts/verify.js` for the three suite names →
  no matches (gap reproduced).
- GREEN: wired `generate-manifest.test.js`, `validate-manifest.test.js`, and
  `check-parity.test.js` as step 0b of `runVerification`; assertions are invoked,
  not duplicated.
- `scripts/verify.js`.

### Phase 2 — Generated-file and repository-scan guards

- RED: `scripts/guard-text-encoding.test.js` failed `MODULE_NOT_FOUND` before
  implementation; `scripts/lib/git-visible.test.js` likewise.
- GREEN:
  - `scripts/lib/git-visible.js` — shared `collectGitVisible(repoRoot, { runGit })`,
    returns tracked + nonignored untracked paths, `null` when git is unavailable.
  - `scripts/lib/git-visible.test.js` — disposable `git init` fixture: tracked +
    nonignored untracked included, gitignored excluded; injected-throw fallback
    returns `null`.
  - `scripts/guard-text-encoding.js` — fails on literal `U+FFFD` and on
    undecodable UTF-8. Binary (NUL byte) and `*.bundle.js` generated bundles are
    skipped by documented rule; explicit allowlist carries a reviewer note.
  - `scripts/guard-text-encoding.test.js` — classification, report naming
    file+reason, binary/generated skip, allowlist exception.
  - `iNNfo/scripts/check-spec-version.mjs` now imports the shared helper (via a
    CJS default import from ESM); the local copy and the now-unused `execSync`
    import were removed.
  - `scripts/verify.js` gained step 13 invoking the guard.

### Phase 3 — Local CI mirror

- 3.1: no code change needed — `scripts/check-integrity.js` already runs
  `innfo-core test`, `innfo-mcp run test:coverage`, `innfo-editor test`, and
  `check:spec-urls` in Group 5 (landed in `918e43a`). Verified by running it.
- 3.2: `.agents/skills/nn-dev-check-integrity/SKILL.md` Group 5 prose now states
  what `--pre-push` automates and documents the **deliberate** unmirrored steps:
  `innfo-core run build`, `innfo-editor run build`, and `npm run build:docs`
  (each with its reason), plus the informational-only `check:spec-version
  --inventory`.

### Phase 4 — Release docs and test-helper cleanup

- 4.1: `nn-dev-release` Option [c] now names a `Console`
  (`innfo-console-v<C.D.E>`) release scope, with bundle rebuild
  (`scripts/build-console-bundle.mjs`) and manifest `console-assets` bump.
- 4.2: added the **normative** stable tag shape (`<subsystem>-v<x.y.z>`), citing
  `TAG_SHAPE_RE`; a non-`-v` tag stops the release flow. Added the
  `innfo-console-v<C.D.E>` tag/push block.
- 4.3: new shared helper `iNNfo/packages/innfo-mcp/test/helpers/fs-retry.ts`
  (injectable remover + delay; retries only `EBUSY`/`EPERM`/`ENOTEMPTY`, rethrows
  anything else unmasked). Both specs now import it and their local loops are
  deleted; `rm` imports were dropped. Added
  `test/helpers/fs-retry.test.ts` (transient retry, multiple transient codes,
  nontransient rethrow).
- `iNNfo/packages/innfo-mcp/tsconfig.json` was adjusted (`rootDir: "."`,
  `include: ["src", "test/helpers/fs-retry.ts"]`) so the mandated `test/helpers`
  location does not trip `TS6059` under the CI `typecheck` step. This is plumbing
  required by the file location chosen in the design, not a behavior change.

### Phase 5 — Close-out

- 5.1: diff reviewed file-by-file; no overlap with the sibling change
  (session attribution / merge-gate enforcement / deploy-DoD / CI-on-`dev`).
- 5.2: total changed lines ≈ **575** (520 added, 55 removed), including tests.
  Changed/added files: `scripts/verify.js`, `scripts/guard-text-encoding.js`,
  `scripts/guard-text-encoding.test.js`, `scripts/lib/git-visible.js`,
  `scripts/lib/git-visible.test.js`, `iNNfo/scripts/check-spec-version.mjs`,
  `.agents/skills/nn-dev-check-integrity/SKILL.md`,
  `.agents/skills/nn-dev-release/SKILL.md`,
  `iNNfo/packages/innfo-mcp/test/helpers/fs-retry.ts`,
  `iNNfo/packages/innfo-mcp/test/helpers/fs-retry.test.ts`,
  `iNNfo/packages/innfo-mcp/src/tools/check-workspace.spec.ts`,
  `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts`,
  `iNNfo/packages/innfo-mcp/tsconfig.json`.
  Well under the 800-line budget → single PR, no chaining.
- 5.3: no merge, tag, pin, manifest regeneration, or user-facing behavior change.

## Verification commands and results

| Command | Result |
|---|---|
| `node scripts/lib/git-visible.test.js` | PASS (2 tests) |
| `node scripts/guard-text-encoding.test.js` | PASS (3 tests) |
| `node scripts/guard-text-encoding.js` | PASS — 1478 text files valid UTF-8 |
| `npm --prefix iNNfo/packages/innfo-core run build` | PASS (precondition for mcp typecheck/tests) |
| `npm run typecheck` (in `iNNfo/packages/innfo-mcp`) | PASS |
| `npx vitest run src/tools/check-workspace.spec.ts src/tools/resolver-node.spec.ts test/helpers/fs-retry.test.ts` | PASS (52 tests) |
| `npm --prefix iNNfo run lint` | PASS (0 errors, 501 pre-existing warnings) |
| `npx tsc --noEmit -p tsconfig.scripts.json` | PASS |
| `npm --prefix iNNfo run check:spec-urls` | PASS |
| `node scripts/verify.js` | PASS — all deterministic pre-checks |
| `node scripts/check-integrity.js --pre-push` | PASS — ALL INTEGRITY GATES PASSED |

## Defects recorded (not silently skipped)

1. **Pre-existing `U+FFFD` in a tracked doc.** `iNNfo/USE_AI.md` contains two
   replacement characters (e.g. line ~49: `MCP <U+FFFD> never hand-rolls`, and one
   more). The file is outside this change's area, so the guard carries an explicit
   allowlist entry with a reviewer note instead of editing it. **Separate defect
   to fix**: repair the two U+FFFD occurrences, then drop the allowlist entry.
2. **Stale `innfo-core/dist` on the local tree.** `npm run typecheck` in
   `innfo-mcp` initially failed with `TS2307: Cannot find module
   '@cognnitive/innfo-core'` until `innfo-core` was built. This is the documented
   `innfo-core-dist-staleness-breaks-mcp-tests.md` condition; CI builds core
   first. Not a regression from this change.

## Boundaries respected

- No foreign file staged, reverted, or committed. No `git add .` / `git add -A`.
- No commit created (not requested).
- Sibling change dir `openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening/`
  untouched.

## Post-verify review follow-ups

`sdd-verify` returned **PASS WITH WARNINGS** with 3 SUGGESTIONs. Resolution:

- **S1 — design traceability drift (resolved).** `design.md` listed
  `scripts/check-integrity.js` as `Modify` although no edit occurred. The row now
  reads `Unchanged, verified`, noting the coverage/spec-URL behavior was already
  present (commit `918e43a`).
- **S2 — understated line count (resolved).** Phase 5.2 now reports the verified
  ≈**575** changed lines (520 added / 55 removed), and the changed/added file list
  now includes `scripts/lib/git-visible.js`.
- **S3 — glyph mojibake scope limitation (resolved, doc-only).** Added a
  `Known limitation` note to the `scripts/guard-text-encoding.js` header docblock:
  glyph-level mojibake (valid UTF-8 that decodes to wrong characters, e.g. `â€"`
  for `—` at `iNNfo/scripts/check-spec-version.mjs:3`) is out of scope and a future
  extension candidate. No behavior change; `check-spec-version.mjs` was not
  rewritten or re-encoded.
