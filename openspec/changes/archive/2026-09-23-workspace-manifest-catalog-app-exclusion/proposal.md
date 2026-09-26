# Proposal: Exclude Catalog Apps from `## NN Models` Reconciliation

## Context & Motivation

`sync_workspace_manifest` (and the editor save path) reconcile `## NN Models` by
discovering every `*_NN.md` Level-3 file with a resolvable `parent_spec` outside
`{backups, archive, specs}`, excluding only the manifest itself and
`cogNNitive`/`workspace` lineage records
(`iNNfo/packages/innfo-core/src/workspace/discoverModels.ts`).

Catalog apps that own their own workspace-manifest section are not excluded. A
dry run against the real workspace (`workspace_NN/workspace_NN.md`) proposes:

```
added: procedures/procedures_NN.md   → ## NN Models: cogNNitive Monorepo Procedures Catalog
added: sources/sources_NN.md         → ## NN Models: cogNNitive Monorepo Sources Catalog
added: artifacts/artifacts_NN.md     → ## NN Models: cogNNitive Monorepo Artifacts Catalog
```

Each of those files already has a hand-authored entry in its own section
(`# NN Procedures`, `# NN Sources`, `# NN Artifacts`). Running the sync without
`dry_run` indexes the same file **twice** — once correctly in its section, once
as a spurious `## NN Models` entry.

## Proposed Solution

Extend the reconciliation-only exclusion matcher to the catalog apps:
`procedures`, `sources`, `artifacts` (any version/suffix), alongside
`cogNNitive`/`workspace`:

```ts
const NON_MODEL_SPEC_RE = /^(cognnitive|workspace|procedures|sources|artifacts)(_|$)/i
```

The exclusion stays in `isReconcilableModel` — NOT in the shared
`isDiscoverableModel` — so `list_models` keeps listing these files (H6: the two
predicates are deliberately separated).

## Impact

- `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts` — `NON_MODEL_SPEC_RE`.
- `iNNfo/packages/innfo-core/tests/reconcile-manifest.test.ts` — predicate + regression tests.
- `iNNfo/packages/innfo-mcp/src/tools/workspace-sync.spec.ts` — end-to-end regression.
- Spec `workspace-manifest-reconciliation` — one MODIFIED requirement.
- Regenerated MCP bundle (`iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`).

## Out of Scope

Managing the `# NN Procedures` / `# NN Sources` / `# NN Artifacts` sections
themselves, and the `models_dir` directory convention — see the companion
proposal `2026-09-23-workspace-manifest-section-ownership`.
