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

- [ ] Phase 1 — Canonical filenames & frontmatter
- [ ] Phase 2 — Resolver & full-package hydration
- [ ] Phase 3 — Modernize CI immutability guard
- [ ] Phase 4 — Manifest paths (NO stable-ref bump)
- [ ] Phase 5 — OpenSpec specs
- [ ] Phase 6 — Integration verification (best effort)
