# Design: Repository Structure Encapsulation, Simulation Renaming, and Cleanup

## Structural Architecture Before vs. After

### Before
```text
cogNNitive/
├── .agents/                      <-- Maintainer skills
├── .atl/                         <-- Agent Teams Lite state
├── .claude/                      <-- Agent configurations
├── .cogNNitive/                  <-- Project configurations
├── .github/                      <-- CI/CD workflows
├── _samples_nn/                  <-- Canonical Ghostbusters Reference & Test Universe
├── artifacts/                    <-- Root workspace artifacts catalog
├── conversations/                <-- Unmanaged dev notes / transcripts (ephemeral)
├── dev/                          <-- Dev audit notes (ephemeral)
├── docs/                         <-- Public documentation & web showcases
├── iNNfo/                        <-- Monorepo core packages, apps, and specs
├── manifest/                     <-- Distribution source.yaml and manifests
├── marketing/                    <-- Marketing copy & assets
├── models/                       <-- Root workspace models catalog
├── node_modules/                 <-- Dependencies
├── openspec/                     <-- SDD changes and specifications
├── procedures/                   <-- Root workspace procedures catalog
├── scripts/                      <-- Maintainer and build scripts
├── simulacro/                    <-- E2E integration test suite (Spanish name)
├── skills/                       <-- Public agent skills
├── sources/                      <-- Root workspace sources catalog
├── specs/                        <-- Legacy spec resolution cache (obsolete)
├── temp/                         <-- Disposable scratchpad & scattered test fixtures
└── workspace_NN.md               <-- Root dogfooding workspace manifest
```

### After
```text
cogNNitive/
├── .agents/                      <-- Maintainer skills
├── .atl/                         <-- Agent Teams Lite state
├── .claude/                      <-- Agent configurations
├── .cogNNitive/                  <-- Project configurations
├── .github/                      <-- CI/CD workflows
├── _samples_nn/                  <-- Canonical Ghostbusters Reference & Test Universe (SSOT)
├── docs/                         <-- Public documentation & web showcases
├── iNNfo/                        <-- Monorepo core packages, apps, and specs
│   └── packages/innfo-core/tests/fixtures/simulacro-refactorizacion/ <-- Permanent test fixture
├── manifest/                     <-- Distribution source.yaml and manifests
├── marketing/                    <-- Marketing copy & assets
├── node_modules/                 <-- Dependencies
├── openspec/                     <-- SDD changes and specifications
├── scripts/                      <-- Maintainer and build scripts
├── simulation/                   <-- E2E integration test suite (100% English)
│   ├── fixtures/
│   ├── lib/
│   ├── results/
│   ├── scenarios/
│   ├── package.json
│   ├── README.md
│   └── run-all.mjs
├── skills/                       <-- Public agent skills
├── workspace_NN/                 <-- Encapsulated cogNNitive Self-Hosted Dogfooding Workspace
│   ├── artifacts/
│   │   └── artifacts_NN.md
│   ├── models/
│   │   ├── cognnitive_repository_NN.md
│   │   ├── cogNNitive_backlog_V_0-1-6_backlog_NN.md
│   │   └── UseCases_Catalog_V_1-0-0_use-cases_NN.md
│   ├── procedures/
│   │   └── procedures_NN.md
│   ├── sources/
│   │   └── sources_NN.md
│   └── workspace_NN.md           <-- Encapsulated workspace entrypoint
└── temp/                         <-- Clean disposable scratchpad (gitignored)
```

## Migration & Path Normalization Details

### 1. `simulation/` (formerly `simulacro/`)
- `simulation/lib/harness.mjs`: `export const SIM = join(ROOT, 'simulation')`
- `simulation/package.json`: `"name": "cognnitive-simulation"`
- `simulation/README.md`: `node simulation/run-all.mjs`
- `scripts/perf-workspace-kb.mjs`: updated comment references.

### 2. `workspace_NN/workspace_NN.md`
- Updates `templates_dir:: ../iNNfo/specs/templates/`
- Updates `skills_dir:: ../skills/`
- Updates `path:: ../iNNfo/specs/...`
- Updates `path:: ../skills/...`
- Updates `path:: ../scripts/...`
- Keeps internal workspace relative paths `models/cognnitive_repository_NN.md`, `sources/sources_NN.md`, `procedures/procedures_NN.md`, `artifacts/artifacts_NN.md`.

### 3. Test Fixture Relocation
- Moving `temp/simulacro-refactorizacion` to `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion` so that `iNNfo/packages/innfo-core/tests/simulacro-user-workspace.test.ts` references a committed test fixture rather than an ephemeral gitignored `temp/` folder.
