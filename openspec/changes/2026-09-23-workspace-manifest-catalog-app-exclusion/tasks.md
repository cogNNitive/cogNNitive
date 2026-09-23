# Tasks: Exclude Catalog Apps from `## NN Models` Reconciliation

- [x] 1. Tests — add predicate + regression coverage:
  - `reconcile-manifest.test.ts`: predicate excludes `procedures`/`sources`/`artifacts` (any version); regression — a workspace with `procedures/procedures_NN.md` and `procedures/*_procedures_NN.md` produces zero `## NN Models` entries.
  - `workspace-sync.spec.ts`: dry-run over a workspace with procedure/sources catalogs reports zero changes.
  Verify (green): `npm --workspace=@cognnitive/innfo-core test`, `npm --workspace=@cognnitive/innfo-mcp test`
- [x] 2. GREEN — `discoverModels.ts`: extend the non-model-spec matcher to `procedures|sources|artifacts`.
- [x] 3. Verify — core tests green (20/20), MCP `workspace-sync` tests green (10/10).
- [x] 4. Regenerate — `npm --workspace=@cognnitive/innfo-mcp run build` (bundle + dist).
- [ ] 5. Commit — `fix(innfo-core): exclude catalog apps from manifest reconciliation`.
