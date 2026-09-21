# Design: Workspace Consolidation, Root Dogfooding Catalogs, and Skill Migration

## Architecture Overview

```
Repository Root (Target Architecture):
├── models/
│   └── cognnitive_repository_NN.md
├── sources/
│   └── sources_NN.md             <-- Ingestion & specification sources catalog
├── procedures/
│   └── procedures_NN.md          <-- Operational procedures catalog
├── artifacts/
│   └── artifacts_NN.md           <-- Release bundles & docs catalog
├── skills/                       <-- Public AI agent skills
│   ├── nn-design-presets/
│   ├── nn-innfo/
│   ├── nn-preflight/
│   ├── nn-router/
│   ├── nn-site-generator/
│   ├── nn-skills-lifecycle/
│   ├── nn-trannsform/
│   ├── nn-upgrade/
│   └── nn-workspace-git/
├── .agents/
│   └── skills/                   <-- Maintainer skills (integrity, release, dev guard)
├── scripts/
│   ├── skills-manager.js         <-- Relocated from actioNN/scripts/
│   ├── lib/
│   ├── check-integrity.js
│   └── verify.js
├── _samples_nn/                  <-- Canonical Ghostbusters Reference & Test Universe
│   ├── workspace_NN.md
│   ├── models/
│   ├── sources/
│   ├── procedures/
│   └── artifacts/
└── workspace_NN.md               <-- Self-Hosted Dogfooding Manifest
```

## Key Decisions

1. **Root Catalogs**:
   - `sources/sources_NN.md`: Captures specifications, grammar documents, and upstream references for cogNNitive.
   - `procedures/procedures_NN.md`: Captures engineering operations (deterministic integrity check, release tagging, template version sync).
   - `artifacts/artifacts_NN.md`: Captures compiled deliverables (`innfo-mcp.bundle.js`, `innfo-console.bundle.js`, docs site).

2. **Skills Directory**:
   - Public skills live under `skills/`.
   - Maintainer-only development skills live under `.agents/skills/`.
   - The workspace manifest defines `skills_dir:: skills/`.

3. **Removal of `actioNN/` and `cogNNitive_nn/`**:
   - Legacy directories removed to prevent path confusion.

4. **Zero-Drift Manifest**:
   - `manifest/source.yaml` updated to reflect `path: skills/<name>`.
   - `scripts/verify.js` line-count guards and preflight paths updated.
