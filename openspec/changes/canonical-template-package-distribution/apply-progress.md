# Apply Progress: Canonical Template Package Distribution

Scope for this run (agreed with user): **Phases 1, 2, 3, 5 complete; Phase 4 without the
`channels.stable.refs` bump** (leaving `templates` ref at the real, merged `templates-v0.2.4`).
Phase 6 verification runs what it can; a fully green `verify.js` is blocked until the
`templates-v0.3.0` tag is cut and merged in a follow-up PR.

## Deviations from tasks.md (recorded)

- **tasks.md 1.3 picks lower versions for `analysis`, `business-model`, `documentation`.**
  Those pointers mirror the pre-existing (inconsistent) `manifest/source.yaml` paths, which
  reference the `_V_0-1-0` file while declaring `version: "V_0-2-0"`. The change's own intent
  ("canonical unversioned filename = evolving source of truth", `catalog.adopted`) requires the
  canonical `spec_NN.md` to carry the **highest / adopted** version's content. This run uses:
  - `analysis/spec_NN.md`      ← `analysis_V_0-2-0_NN.md`  (adopted V_0-2-0)
  - `business-model/spec_NN.md` ← `business-model_V_0-2-0_NN.md` (adopted V_0-2-0)
  - `documentation/spec_NN.md`  ← `documentation/V_0-2-0/spec_NN.md` (adopted V_0-2-0)
- **`template_version` frontmatter format kept as `V_x-y-z`** (not migrated to quoted dotted
  `"0.2.1"`). Every template already declares it authoritatively in that form; migrating the
  literal ripples into `template-catalog.mjs`, the resolver, and the guard for no functional
  gain. `normalizeVersion` in the guard already maps `V_0-2-0` → `0.2.0` for semver compare.

## Phase status

- [x] Phase 1 — Canonical filenames & frontmatter — commit `8fe698c`
  - 25 template files renamed to canonical / historical versions removed
  - `template-catalog.mjs` discovery rewritten (frontmatter `template_version`), `catalog.json` regenerated, unit test updated
  - internal cross-refs + `nn-innfo` bundle repointed
  - innfo-core + innfo-editor test suites realigned to canonical paths & composition-era shapes
    (1 skip: `base` composite predates workspace V_0-3-0)
  - `manifest/source.yaml` template paths canonical; `business-model`/`analysis` declared version → `spec_version`; `docs/use/manifest.md` regenerated
  - GREEN locally: innfo-core (414), innfo-mcp (184), iNNfo workspace (630), template-catalog, check-parity, verify-inventory, preflight, tsc scripts
- [x] Phase 3 — Modernize CI immutability guard — commit `fc67ede` (cherry-picked to feat branch)
  - `guard-template-immutability.js` rewritten: frontmatter `template_version` bump validation
    vs base ref (`git show <base>:<path>`), A/M/R/D handling, legacy→canonical migration-rename
    exemption, `--diff-file` + `--base-root` for git-free tests
  - test suite rewritten (11 cases); passes; guard passes against real repo state vs `origin/main`
  - `verify.js` needs no change — guard runs bare in its pipeline
- [x] Phase 5 — OpenSpec specs — commit `37d6764`
  - new living spec `openspec/specs/template-release-tagging/spec.md` (CI-safe: no `cogNNitive/iNNfo` literal)
  - `template-package-structure`: canonical source layout vs versioned hydrated layout
  - `template-version-pruning` + `template-immutability-guard`: RETIRED banners
  - 3 stale `documentation/V_0-2-0/spec_NN.md` raw URLs repointed → `check:spec-urls` clean on clean checkout
- [x] Phase 2 — Resolver & full-package hydration + retire `prune_orphaned_specs` — commit `27997f6`
  - `hydrateTemplatePackageAtomically(payload: string | TemplatePackagePayload)` — spec + alias + procedures/ + samples/ + assets/ into write-once staging→rename
  - new `fetchTemplatePackageFromRemote` (raw spec + GitHub contents-API subdir enumeration at a tag ref); wired best-effort into the resolver network branch — NETWORK-UNTESTED here
  - `findSpecInPackageDir` already canonical-first — unchanged
  - `prune_orphaned_specs` MCP tool removed (def/case/handler/import/spec/README); `reachability.ts` lib fn kept
  - new payload-form hydration unit test; mcp bundle rebuilt
- [~] Phase 4 — Manifest **paths** done in Phase 1 commit; `channels.stable.refs` NOT bumped (by agreed cut)
- [~] Phase 6 — Local verification GREEN (see below); network `validate-manifest --channel stable` blocked (see Known-blocked)

## Final local verification (all GREEN)

- `npm --prefix iNNfo/packages/innfo-core test` → 414 pass, 1 skip
- `npm --prefix iNNfo/packages/innfo-mcp test` → 185 pass
- `npm --prefix iNNfo run test` (workspace) → 630 pass, 2 skip
- `node scripts/template-catalog.test.mjs`, `node scripts/guard-template-immutability.test.js` → pass
- `node scripts/guard-template-immutability.js` (vs origin/main) → pass
- `node scripts/manifest/check-parity.js` → pass
- `node scripts/verify-inventory.test.js`, preflight/upgrade-check tests → pass
- `npx tsc --noEmit -p tsconfig.scripts.json` → pass
- `npm --prefix iNNfo run check:spec-urls` / `check:spec-version --inventory` → pass on clean checkout
  (local run also flags `.worktrees/` — gitignored, not seen by CI)

## Commits on `feat/canonical-template-package-distribution`

`8fe698c` P1 · `d47f7bf` P3 · `37d6764` P5 · `27997f6` P2  (base `0148b61`)

## Concurrency incident

A parallel session checked out `chore/landing-hero-copy-update` from this branch's tip mid-run
and my P3 commit initially landed there. Recovered: P3 cherry-picked onto the feat branch
(`d47f7bf`), `chore/landing-hero-copy-update` reset back to its own commit `0a96166`.
That branch still has P1 (`8fe698c`) as an ancestor — its owner branched from the wrong base;
not rebased here.

## Known-blocked (by design, per agreed cut)

- `verify.js` step "Validate Stable Manifest" (`validate-manifest.js --channel stable`) 404s on
  canonical `spec_NN.md` paths — they are not yet on remote `main` and `templates-v0.3.0` is not cut.
  Goes green only after: this branch merges → `templates-v0.3.0` tag → stable-ref bump merge-commit PR.
