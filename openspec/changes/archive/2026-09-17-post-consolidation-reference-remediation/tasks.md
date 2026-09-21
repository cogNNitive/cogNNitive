# Tasks: Post-Consolidation Reference Remediation

- [x] 1. Fix the three live dangling `actioNN/` references (test-first: each
      fix is verified by running the suite/module it repairs)
  - [x] 1.1 `skills/nn-workspace-git/test/skill-contract.test.js`: fix
        `REPO_ROOT` (3 levels, not 4) and `SKILL_PATH` (`skills/`, not
        `actioNN/skills/`); fix the two stale header-comment paths in the
        same file. Verify: `node skills/nn-workspace-git/test/skill-contract.test.js`
        passes all 5 contract checks.
  - [x] 1.2 `iNNfo/apps/innfo-editor/e2e/16-innfo-console.spec.ts:38`: fix the
        `require()` path to `../../../../skills/nn-trannsform/scripts/lib/scanner-converters.js`.
        Verify: the module resolves and exports its 13 symbols.
  - [x] 1.3 `skills/nn-innfo/SKILL.md:686`: fix the agent-executable command
        to `node skills/nn-trannsform/scripts/index.js --scan-external --check-impact`.

- [x] 2. Fix stale doc-comment paths (comments/docs only — no logic changes)
  - [x] 2.1 `scripts/build-preflight-primitives.mjs:14`
  - [x] 2.2 `scripts/build-trannsform-slug-mirror.mjs:16`
  - [x] 2.3 `scripts/preflight-check.js:4`
  - [x] 2.4 `scripts/template-catalog.mjs:8`
  - [x] 2.5 `iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.ts:5`
  - [x] 2.6 `iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.spec.ts:13`
  - [x] 2.7 `iNNfo/packages/innfo-core/src/sourceRef.ts:157`
  - [x] 2.8 `skills/nn-trannsform/TESTING.md:59`

- [x] 3. Close the gate gap: wire the two ungated skill suites into
      `scripts/verify.js` (test-first: both suites already pass standalone;
      wiring them is the change under test — verify by re-running
      `scripts/verify.js` end to end in task 7)
  - [x] 3.1 Add `run('node skills/nn-trannsform/test/run.js', 'Test nn-trannsform Skill Suite')`
        immediately after the existing `skills/nn-preflight` line.
  - [x] 3.2 Add `run('node skills/nn-workspace-git/test/skill-contract.test.js', 'Test nn-workspace-git Skill Contract')`
        immediately after 3.1.
  - [x] 3.3 Document the "why gated here, why now" rationale in a code
        comment at the insertion point.
  - [x] 3.4 Confirm `scripts/verify.js` stays out of the `ORCHESTRATORS`
        line-count list and no file on that list was touched.

- [x] 4. Restore spec-URL coverage over skill markdown, silently lost in the
      same consolidation (test-first: confirm the URLs go unchecked before the
      fix, then confirm they are checked after)
  - [x] 4.1 `scripts/check-spec-version.mjs:isUrlResolutionTarget` matched
        `actioNN/skills/` only, so after the move no `skills/**/SKILL.md` was
        URL-validated — 8 canonical `raw.githubusercontent.com` URLs dropped
        out of `check:spec-urls` scope with the gate still green. Match
        repo-local `skills/` as well, keeping the legacy sibling match for
        `--with-skills`.
  - [x] 4.2 Apply the same repo-local match in `classifyFile`, so skill
        markdown is classified as `skill` rather than falling through.
  - [x] 4.3 Verify: `npm run check:spec-urls` passes with the skill URLs now
        in scope.

- [x] 5. Realign the canonical vocabulary with the shipped layout (product
      decision taken 2026-09-17: the planned `actioNN/` -> `ageNNt/` rename was
      abandoned in favor of a flat root `skills/`)
  - [x] 5.1 `iNNfo/specs/vocabulary.json`: `ageNNt.stable_identifiers` becomes
        `skills/` and `scripts/skills-manager.js`; `planned_migrations` records
        that the consolidation shipped and that the `ageNNt/` rename was
        dropped. `actioNN` stays a deprecated alias.
  - [x] 5.2 `iNNfo/specs/scripts/test-vocabulary.js`: assert the new
        identifiers, and add an on-disk existence assertion for every stable
        identifier so a future move cannot leave the dictionary lying.
  - [x] 5.3 Gate it: `iNNfo/specs/scripts/test-vocabulary.js` was run by
        nothing. Wire it into `scripts/verify.js` alongside the skill suites.
  - [x] 5.4 Verify: `node iNNfo/specs/scripts/test-vocabulary.js` — 36 passed,
        0 failed.

- [x] 6. OpenSpec artifacts
  - [x] 6.1 `proposal.md`, `design.md`, `tasks.md` (this file).
  - [x] 6.2 `specs/quality-gates/spec.md` delta: skill suites in the
        deterministic gate, no-dangling-references requirement, documented
        Playwright residual gap.
  - [x] 6.3 Append a one-line note under the completed-but-incomplete Phase 3
        task in `openspec/changes/2026-09-16-workspace-consolidation-and-skill-migration/tasks.md`,
        without unchecking it.

- [x] 7. Full verification pass (report actual output, not assumed success)
  - [x] 7.1 `node skills/nn-trannsform/test/run.js` — 451 passed, 0 failed.
  - [x] 7.2 `node skills/nn-workspace-git/test/skill-contract.test.js` — all 5 contract checks passed.
  - [x] 7.3 `node scripts/verify.js` — all deterministic pre-checks passed.
  - [x] 7.4 `npm run lint` — 0 errors, 513 warnings (matches accepted baseline).
  - [x] 7.5 `npm --workspace=@cognnitive/innfo-core run build && npm --workspace=@cognnitive/innfo-core test` — build clean; 67 test files, 819 passed / 1 skipped.
  - [x] 7.6 `npm run typecheck:scripts` — clean, no errors.
  - [x] 7.7 `node iNNfo/specs/scripts/test-vocabulary.js` — 36 passed, 0 failed.
  - [x] 7.8 `npm run check:spec-urls` — all hardcoded raw URLs resolve, with
        skill markdown now in scope.
