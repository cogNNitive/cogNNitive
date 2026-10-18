# Proposal: Commercial Web Domain Dogfooding & Static Site Projection

## Intent

A technical evaluation of the commercial website (`docs/index.html`, `docs/use-cases.html`) and technical documentation revealed significant architectural drift from the active codebase:
1. **Outdated Ingestion Concepts**: The commercial web continuously advertises retired paths (`sources/normalized/`, `sources/nn/`) and legacy hash-slug citations (`sources:: [source.md#slug]`), whereas the actual framework operates on **cognitivize-in-place with sidecars** (`sources/import/<file>.<ext>_sidecar_NN.md`) and `@## Heading` grammar.
2. **Retired Artifact Paths & Interfaces**: Promotional copy references `export/html` and `export/docx` (retired in favor of `artifacts/` with write-once UTC timestamps) and promotes a deprecated "Web App" instead of the offline **Domain Console** (`domaiNN_console.html`).
3. **Disconnection Between Source Markdown and Deployed HTML**: Manual edits in `docs/index.md` are not reflected in `docs/index.html`, and `docs/workspace_NN.md` still uses legacy nomenclature (`workspace_NN.md`, `model_version`, `parent_spec: workspace`, `# NN Models`).
4. **Lack of Dogfooding in Web Delivery**: While `docs/innfo/documentation/` and `docs/skills/documentation/` derive Docsify navigation from Level-3 `documentation_NN.md` models, the commercial web itself is maintained as unstructured, hand-written HTML with no semantic backing in iNNfo.

To eliminate marketing-to-code drift and eat our own dog food, this change defines a canonical domain model for the product and compiles the public commercial web as a deterministic artifact projection from that living knowledge base.

## Scope

### In Scope

- **Domain Model Design (Level 2 & Level 3)**:
  - Define the `product-site` Level-2 blueprint (`iNNfo/specs/bluepriNNts/product-site/spec_NN.md`) capturing pure business domain concepts:
    - `ValueProposition` / `Benefit`: Key value drivers (Speed, Total Sovereignty, Ground Truth, Cascade Updates, Access Freedom, MIT Open Source).
    - `ArchitecturePillar`: The 3 core phases of the $A \leftrightarrow K$ lifecycle (Import & Cognitivize, Manage SSOT, Export & Feedback).
    - `TargetAudience` / `UseCase`: Archetypes (Startup Founder, Sales Director, Freelance Designer, YouTube Creator) with real quantified ROI metrics.
    - `Boundary`: Explicit design non-goals (Not a database, Not a SaaS silo, Declarative data without macro execution, Reversible lifecycle).
  - Migrate `docs/workspace_NN.md` to a canonical container `docs/domaiNN_NN.md` conforming to the `domaiNN` Level-2 blueprint.
  - Create the Level-3 kNNowledge document `docs/kNNowledge/cognnitive_product_NN.md` holding the authoritative copy, claims, and citations.
- **Static Artifact Projection (`scripts/build-commercial-web.mjs`)**:
  - Implement a deterministic build script that reads `docs/kNNowledge/cognnitive_product_NN.md`, resolves citations against sources, and compiles semantic elements into modern, compliant HTML artifacts:
    - `docs/index.html` (main landing page).
    - `docs/use-cases.html` (detailed use case showcase).
  - Integrate `build-commercial-web.mjs` into `npm run build:docs` and `scripts/verify.js` with an automated drift guard.
- **Repository Hygiene in `docs/`**:
  - Remove obsolete redirect artifact `docs/actionn/index.html`.
  - Clean up lingering references to `sources/nn/` and legacy paths in `docs/` fixtures.

### Out of Scope

- Deleting `docs/innfo/` or `docs/skills/` (these host active Docsify documentation suites and public distribution endpoints like `catalog.json` and CDN assets).
- Introducing heavy runtime JavaScript frameworks (React, Vue, Svelte) to the static web build.
- Altering Level 0 `defiNNition` or Level 1 `iNNfo` specifications.

## Capabilities

### New Capabilities
- `product-site-blueprint`: Level-2 domain specification defining the schema for product value propositions, pillars, target audiences, and design boundaries.
- `commercial-web-projection`: Deterministic artifact generator compiling iNNfo product kNNowledge into public static HTML pages.
- `commercial-web-drift-guard`: Automated verification check in `verify.js` ensuring deployed web pages match the underlying domain model.

### Modified Capabilities
- `docs-workspace`: Upgrades root documentation workspace from legacy `workspace_NN.md` to canonical `domaiNN_NN.md`.
- `build:docs`: Orchestrates `build-commercial-web.mjs` alongside Docsify suite generation.

## Approach

1. **Blueprint Authoring**:
   - Create `iNNfo/specs/bluepriNNts/product-site/spec_NN.md` defining concepts (`Benefit`, `ArchitecturePillar`, `TargetAudience`, `Boundary`) and typed fields (`claim`, `summary`, `metric_before`, `metric_after`, `sources`).
   - Register `product-site` in `manifest/source.yaml` and regenerate the blueprint catalog.
2. **Domain & Model Authoring**:
   - Refactor `docs/workspace_NN.md` into `docs/domaiNN_NN.md` referencing `parent_spec: domaiNN`.
   - Author `docs/kNNowledge/cognnitive_product_NN.md` using the new `product-site` blueprint, populating the 6 benefits, 3 lifecycle pillars, 4 archetypes, and boundaries.
3. **Template & Generator**:
   - Create HTML templates in `scripts/templates/web/` for `index.html` and `use-cases.html`.
   - Implement `scripts/build-commercial-web.mjs` using `@cognnitive/innfo-core` parser to extract elements and populate template placeholders.
4. **Integration & Verification**:
   - Add drift guard to `scripts/verify.js` comparing committed `docs/index.html` and `docs/use-cases.html` with a clean projection.
   - Run full `verify.js` and remove dead `docs/actionn/` folder.

## Risk & Impact

- **Zero Runtime Risk**: The generated output is pure static HTML/CSS served via GitHub Pages (`cogNNitive-web`).
- **High Consistency & Traceability**: Marketing claims and ROI metrics will directly cite source benchmarks or case studies.
- **Backward Compatibility**: Existing documentation paths (`/innfo/documentation/`, `/skills/documentation/`) and catalog endpoints remain unaffected.
