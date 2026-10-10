# Design: Canonicalize `domaiNN` roots (direction B)

## Technical Approach

Three slices. S1 is a folder rename. S2 adds the one missing concept
(`bluepriNNts`) to the `domaiNN` blueprint. S3 re-authors the five roots that pin
`domaiNN` (the dogfooding root + four docs use-cases) onto the blueprint's real
concepts. No runtime code, no new test files: the work is blueprint + content, and
the existing gates (`validate_knowledge`, `scripts/verify.js`,
`check-integrity`) cover it.

**Deviation (recorded):** `openspec/config.yaml` sets `strict_tdd: true`. The
maintainer opted for agile delivery on this change — no new tests; verification is
batched with other work. This is a conscious override, not an oversight.

## S2 — `domaiNN` blueprint gains `bluepriNNts`

File: `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md`. The concept mirrors the frozen
`workspace` blueprint's `Templates` concept (`type:: model`, fields `path` +
`category`) under the canonical name the migrator already emits.

Add to the `# NN index` block: `* [[bluepriNNts]]`.

Add concept definition (after `kNNowledge`):

```
## NN Concept Definition: bluepriNNts
icon:: copy
type:: model
color:: grey
weight:: 90
```

Add field definitions (after the `kNNowledge` fields):

```
## NN Field Definition: path
concept:: bluepriNNts
type:: model
description:: domaiNN-relative path to a local bluepriNNt spec (spec_NN.md).

## NN Field Definition: category
concept:: bluepriNNts
type:: string
description:: Domain classification or strategic focus of the local bluepriNNt.
```

Add the row to the `### Concepts` table. Bump `blueprint_version` `V_0-2-0` →
`V_0-3-0` (MINOR, additive). Leave `spec_version` at `V_0-3-0` (parent iNNfo
unchanged).

**Why the bump is safe:** the change is additive (a root that omits `bluepriNNts`
still validates), and every root pins the blueprint by the **versionless**
`parent_spec.url`, so nothing needs repinning. Regenerate derived artifacts:
`blueprint-catalog.mjs` → `iNNfo/specs/bluepriNNts/catalog.json`, `sync-versions.mjs`
→ `SHIPPED_BLUEPRINT_VERSIONS`, the docs blueprint catalog.

## S3 — Root shape

### Concept mapping (old → canonical)

| `workspace` concept | `domaiNN` target |
|---|---|
| `Workspace` | `domaiNN` |
| `Models` | `kNNowledge` |
| `Templates` | `bluepriNNts` |
| `Sources` / `Procedures` / `Artifacts` | `kNNowledge` entries (they are L3 catalog models) |
| `Specs` | dropped |
| `Skills` / `Tools` | dropped (inventory lives in `Capabilities_Catalog` / `UseCases_Catalog` / the repository model) |
| `Tags` | `Tags` |

### The `domaiNN` element carries only its real fields

The current root also uses `sources_dir`, `skills_dir` and `environment`, which
the `domaiNN` blueprint does not declare, and its `knowledge_dir:: models/` is
stale (models live in `kNNowledge/`). The canonical `# NN domaiNN` element uses
**only** `name`, `knowledge_dir`, `blueprints_dir` + prose.

### Dogfooding root — target (`ecosystem_NN/domaiNN_NN.md`)

```markdown
---
level: 3
parent_spec:
  name: "domaiNN"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "cogNNitive Monorepo Workspace"
---

# NN domaiNN
knowledge_dir:: kNNowledge/
blueprints_dir:: ../iNNfo/specs/bluepriNNts/

Self-hosted root workspace for the cogNNitive monorepo, governing specifications,
domain bluepriNNts, project models, procedures, AI agent skills, and maintenance
tools under one dogfooding architecture.

# NN bluepriNNts

## NN bluepriNNts: business
path:: ../iNNfo/specs/bluepriNNts/business/spec_NN.md
category:: Strategy

## NN bluepriNNts: analysis
path:: ../iNNfo/specs/bluepriNNts/analysis/spec_NN.md
category:: Diagnostics

  … one element per local blueprint (business, business-model, analysis,
    organization, procedures, projects, metrics, innovation, documentation,
    repository, sources, artifacts) …

# NN kNNowledge

## NN kNNowledge: cogNNitive Repository Model
path:: kNNowledge/cognnitive_repository_NN.md
blueprint:: repository
status:: active

## NN kNNowledge: Platform Capabilities
path:: kNNowledge/Capabilities_Catalog_capabilities_NN.md
blueprint:: capabilities
status:: active

## NN kNNowledge: Use Cases Catalog
path:: kNNowledge/UseCases_Catalog_use-cases_NN.md
blueprint:: use-cases
status:: active

## NN kNNowledge: Master Sources Catalog
path:: sources/sources_NN.md
blueprint:: sources
status:: active

## NN kNNowledge: Master Procedures Catalog
path:: procedures/procedures_NN.md
blueprint:: procedures
status:: active

## NN kNNowledge: Master Artifacts Catalog
path:: artifacts/artifacts_NN.md
blueprint:: artifacts
status:: active

# NN Tags

## NN Tags: architecture
color:: #3b82f6
icon:: layers
description:: Core semantic architecture, specs, and metamodels.
```

The four `docs/cognitive_nn/use-cases/*` roots are the same pattern minus
`bluepriNNts` (they do not enumerate local blueprints): `# NN domaiNN` +
`# NN kNNowledge` (their one business/procedures model + the three catalogs) +
`# NN Tags`. Their current `# NN Sources/Procedures/Artifacts` sections become
`kNNowledge` entries; the `# NN Models` entry is renamed to `kNNowledge`.

## S1 — Rename

```
git mv workspace_NN ecosystem_NN
```

Update the single code reference `eslint.config.mjs:29` (`'workspace_NN/**'` →
`'ecosystem_NN/**'`). Grep the literal `workspace_NN/` for any remaining code,
config, or `manifest/` reference. Prose references in docs/specs are updated with
the other docs touchpoints.

## Out of scope (do not touch here)

- The frozen-`workspace` roots (`_samples_nn/`, `simulation/fixtures/acme/`,
  `test/fixtures/testlab/`).
- The legacy blueprint files (`workspace_spec_NN.md`, `bluepriNNts/workspace/`,
  `bluepriNNts/base/`).
- A pre-existing separate defect: `Capabilities_Catalog` / `UseCases_Catalog`
  declare `parent_spec` blueprints (`capabilities`, `use-cases`) that do not
  resolve in this repo. Fixing that is its own change.

## Minimum verification (lean)

1. `validate_knowledge` on the five roots → zero `CONCEPT_DRIFT_WARNING`.
2. `node scripts/verify.js` + `npm run check:integrity` once, at the end.
3. `rg "workspace_NN/"` → no code/config hits.

No new test files.

## Rollback

S1: `git mv` back. S2: revert the blueprint file + regenerate the catalog. S3:
revert the five `domaiNN_NN.md` files.
