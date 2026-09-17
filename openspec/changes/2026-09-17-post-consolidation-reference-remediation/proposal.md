# Proposal: Post-Consolidation Reference Remediation

## Intent
Commit `6ad8eb8` ("refactor: consolidate skills layer to root") moved
`actioNN/skills/` -> `skills/` and `actioNN/scripts/` -> `scripts/`, and
`actioNN/` no longer exists. The consolidation's own Phase 3 task ("Update any
test files or scripts referencing `actioNN/`") was checked off in
`openspec/changes/2026-09-16-workspace-consolidation-and-skill-migration/tasks.md`,
but three live references survived it and were only caught by a manual audit
on 2026-09-17:
1. `skills/nn-workspace-git/test/skill-contract.test.js` resolved `REPO_ROOT`
   one directory level short and still built `SKILL_PATH` against `actioNN/`,
   so the suite crashed with `ENOENT`.
2. `iNNfo/apps/innfo-editor/e2e/16-innfo-console.spec.ts:38` `require()`d
   `../../../../actioNN/skills/nn-trannsform/scripts/lib/scanner-converters.js`,
   a path that no longer resolves.
3. `skills/nn-innfo/SKILL.md:686` told the agent to execute
   `node actioNN/skills/nn-trannsform/scripts/index.js ...`, a command that no
   longer exists on disk.

The consolidation ran through a full green CI cycle with these three broken.
That is not a fluke: `.github/workflows/ci.yml` has no job that touches
`skills/`, and `scripts/verify.js` — the deterministic gate CI and pre-push
both rely on — runs exactly one skill test suite
(`skills/nn-preflight/scripts/preflight-check.test.js`). Two other
self-contained Node suites under `skills/` exist, pass today, and were never
wired to anything:
- `skills/nn-trannsform/test/run.js` (451 assertions)
- `skills/nn-workspace-git/test/skill-contract.test.js`

Fixing only the three dangling references would leave the root cause in
place — the next directory move would reproduce the same failure mode
unnoticed. This change fixes both the symptoms and the gate.

## Scope
1. **Reference fixes**: correct the three executable references above (already
   applied and verified working in the tree) and eight stale doc-comment paths
   that still say `actioNN/skills/...` in header comments across `scripts/`
   and `iNNfo/packages/innfo-core/`.
2. **Gate fix**: wire `skills/nn-trannsform/test/run.js` and
   `skills/nn-workspace-git/test/skill-contract.test.js` into
   `scripts/verify.js`, immediately after the existing
   `skills/nn-preflight` suite, so a crashing skill suite fails deterministic
   verification instead of passing silently.
3. **Coverage fix**: restore spec-URL validation over skill markdown. The
   `isUrlResolutionTarget` predicate in `scripts/check-spec-version.mjs`
   selected files by the hardcoded prefix `actioNN/skills/`, so once skills
   moved to `skills/` it stopped matching any of them — eight canonical
   `raw.githubusercontent.com` URLs silently left `check:spec-urls` scope
   while the gate stayed green. The same narrowing applied to
   `classifyFile`.
4. **Vocabulary realignment**: `iNNfo/specs/vocabulary.json` still declared
   `actioNN/`, `actioNN/skills/` and `actioNN/scripts/` as the stable
   identifiers for `ageNNt`, with a planned migration to `ageNNt/` that never
   happened. Point them at the shipped layout (`skills/`,
   `scripts/skills-manager.js`), record that the `ageNNt/` rename was dropped
   in favor of a flat root `skills/`, and gate the guard — which nothing ran —
   with an added on-disk existence assertion.
5. **Traceability**: append a note to the 2026-09-16 change's `tasks.md`
   pointing at this change, without unchecking the shipped task.

Out of scope: `openspec/config.yaml` (handled separately),
`skills/nn-trannsform/README.md` / `SKILL.md` (reference the real external
`cogNNitive/actioNN` GitHub repo, not a local path), `skills/nn-design-presets/SKILL.md`
(dead absolute link, separate cleanup), `skills/nn-skills-lifecycle/SKILL.md`
(`source: actioNN` is a provenance label, not a path), and wiring Playwright
e2e into CI (documented as a residual gap, not fixed here).

## Capabilities

### Modified Capabilities
- `quality-gates`: `scripts/verify.js` now executes every self-contained
  Node test suite under `skills/`, not only the preflight one, plus the
  canonical vocabulary guard; `check-spec-version.mjs` again resolves spec
  URLs inside skill markdown; and every `ageNNt` stable identifier must exist
  on disk.

## Approach
- **Phase 1**: Confirm the three already-applied reference fixes (contract
  test path, e2e require path, SKILL.md command) are in the working tree and
  passing.
- **Phase 2**: Fix the eight stale doc-comment paths (comments only, no logic
  changes).
- **Phase 3**: Wire the two ungated skill suites into `scripts/verify.js`.
- **Phase 4**: Widen the `check-spec-version.mjs` predicates to match
  repo-local `skills/`, restoring spec-URL coverage over skill markdown.
- **Phase 5**: Realign `ageNNt` in `iNNfo/specs/vocabulary.json` with the
  shipped layout, add an on-disk existence assertion to its guard, and gate
  that guard in `scripts/verify.js`.
- **Phase 6**: Add a delta to `quality-gates` and note the completed-but-
  incomplete task in the 2026-09-16 change.
- **Phase 7**: Run the full verification chain and record real output.

## Rollback Plan
Revert the change on branch `dev` via `git checkout` to the pre-change commit.
No schema, data, or generated-artifact migration is involved — every edit is a
source-level path correction or an additive `run()` call in `verify.js`.
