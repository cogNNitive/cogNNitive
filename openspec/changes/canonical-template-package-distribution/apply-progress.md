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
- [ ] Phase 5 — OpenSpec specs  ← next
- [ ] Phase 2 — Resolver & full-package hydration + retire `prune_orphaned_specs`
- [~] Phase 4 — Manifest paths done (Phase 1 commit); `channels.stable.refs` NOT bumped by design
- [ ] Phase 6 — Integration verification (best effort)

## Known-blocked (by design, per agreed cut)

- `verify.js` step "Validate Stable Manifest" (`validate-manifest.js --channel stable`) 404s on
  canonical `spec_NN.md` paths — they are not yet on remote `main` and `templates-v0.3.0` is not cut.
  Goes green only after: this branch merges → `templates-v0.3.0` tag → stable-ref bump merge-commit PR.
