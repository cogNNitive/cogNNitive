# Exploration: site-domain-dogfooding

All paths are relative to the repository root. Read-only exploration.

## Corrections to the brief

1. **`compile-model-viewer` no longer exists.**
   - `iNNfo/specs/bluepriNNts/business/spec_NN.md:177-183` says V_0-2-6 dropped it; its successor `compile_model_console` is also gone.
   - `openspec/specs/console-payload-builder/spec.md:172` forbids that procedure and its shell.
   - Consoles are now built only by `scripts/export-console.mjs`, which fills `artifact_shell.html` through JSON slots `innfo-config`, `innfo-schema`, `innfo-model` (shell lines 374-390).
   - The shell is a heavy interactive viewer (preact, uplot), not a content renderer; `compile-site` cannot reuse it. Only the idea survives: a procedure document plus a script that fills a shell with data.
2. **A procedure is not executable code.** It is an iNNfo document of `Work` steps an agent follows as a state machine, delegating to a `tool::` script (`skills/nn-innfo/SKILL.md:825-866`). `compile-site` therefore means a procedure document in the bluepriNNt plus a Node script it names.
3. **A `documentation` bluepriNNt already exists.**
   - `iNNfo/specs/bluepriNNts/documentation/spec_NN.md` defines `DocSite`, `Section`, `Page`, `NavbarItem`, `Asset` and procedure `generate-docsify-suite` (lines 21-35).
   - Live instances: `docs/innfo/documentation/documentation_NN.md`, `docs/skills/documentation/documentation_NN.md`.
   - Compiled by `scripts/generate-docsify-suite.mjs` with a hand-written parser `parseNNModel` (line 70), not nn-core.
   - It has no `kind` and no citations; page prose lives in separate `.md` files (`source:: README.md`); output needs the Docsify runtime.
   - The new `site` bluepriNNt is a deliberate replacement, not a first attempt.

## Current State

### Q1. BluepriNNt authoring, versioning, registration

- Layout: `iNNfo/specs/bluepriNNts/<name>/spec_NN.md` with optional `procedures/`, `assets/`, `samples/`. Version is frontmatter `blueprint_version: "V_x-y-z"` (`scripts/blueprint-catalog.mjs:12-18`).
- `guard-template-immutability.js:3-30`: modified spec must raise `blueprint_version`; new spec must carry a valid one; `procedures/`, `assets/`, `samples/` exempt.
- Tags are `blueprints-v*` (`release.yml:5-9`), not `templates-v*`.
- Core blueprints listed in `manifest/source.yaml:56-87`; optional verticals governed by generated `catalog.json` (`documentation` is a free vertical, `catalog.json:123-138`). `CORE_NAMES` hard-coded in `blueprint-catalog.mjs:60`.
- Inventory guard `verify.js:66-94, 486-508`: every folder under `bluepriNNts/` must appear in `source.yaml` or `catalog.json`; catalog freshness enforced by `roFresh('blueprint-catalog')`.
- `SHIPPED_TEMPLATE_VERSIONS` belonged to the retired Vue editor; it no longer exists.
- `check-usage-procedure.mjs:6-14`: a blueprint with `procedures/` must ship `procedures/usage_procedures_NN.md`. `check-procedures-version.mjs` requires procedures to track the `procedures` blueprint version.
- `iNNfo/specs` is in `DISTRIBUTION_PATHS` (`release-keys.js:38-44`): shipping there means public sync and a `blueprints-v*` tag.
- **Domain-local alternative:** a domaiNN root can declare `blueprints_dir::` (`domaiNN/spec_NN.md:72-110`; `ecosystem_NN/domaiNN_NN.md`). The resolver reads local specs first, then cache, then network (`nn-mcp/src/tools/resolver-node.ts:558-563, 720-735`). Plausible but unproven that nn-core/MCP validation accept a local `parent_spec.url`.
- Guards: `nn-name-invariant-guard.js:5-9, 147-153` — every `*_NN.md` stem must equal the blueprint name or end with `_<blueprint>` (site documents: `Pages_site_NN.md`). `legacy-write-guard.js:28-39` bans retired keys (`template_version`, `models_dir`, `type:: model`).

### Q2. Procedure execution and reuse

- Closest live precedent: `generate-docsify-suite`, whose `tool::` is `scripts/generate-docsify-suite.mjs`, wired into `build-docs.mjs:85-92`.
- `export-console.mjs` deliberately avoids a runtime nn-core dependency. The `nn-core.generated.cjs` mirror under `skills/nn-sources/scripts/lib/` exposes lineage and citation helpers; whether it exposes a general model parser is unknown.
- No markdown-to-HTML library exists in the repo.

### Q3. Sources, sidecars, citations, impact checker

- Citation grammar: `sources:: [<path>@## Heading]`, `@RowID&col`, `@/json/pointer`. `validateCitations` (`nn-core/src/validator/workspaceSources.ts:60`) checks file and unit, with codes `KU_UNKNOWN_SLUG`, `KU_UNKNOWN_ROW` (597), `KU_UNKNOWN_POINTER` (467). Row/pointer units look validated now (newer than the memory note); confirm with a test.
- `source` and `sources` are reserved citation fields (`sourceRef.ts:92`). The `site` blueprint must reserve `sources` for citations only.
- Sidecar `<file>_sidecar_NN.md` records `sha256`, `size_bytes`, `source_format`, `normalized_at` (`nn-core/src/cognitivize/sidecar.ts:21-33`).
- Two distinct "changed" mechanisms:
  1. **Hash guard** — `findStaleSources` (`impact-checker.js:60-76`) warns when bytes no longer match the sidecar. An in-place refresh rewrites the sidecar and the signal disappears.
  2. **Family evolution** — `detectSourceFamilyEvolution` / `checkScanImpact` (`impact-checker.js:383-476`) report citations to an older write-once family member: `superseded` (unit still resolves in newest) or `unresolved_in_latest` (warning).
- Gaps: `--check-impact` (`index.js:202-221`) runs only `auditModelCitations`, not family evolution. Family evolution is printed only after `--scan` / `--normalize-file` / `--scan-external`, console-only, no `--json`, never affects exit code.
- Consequences:
  - Staleness is only flagged if the import step writes a **new write-once family member**.
  - One big snapshot flags every citing Page on any change; split into small groups.
  - `checkScanImpact(projectDir)` is exported and pure; a check script can call it directly.
  - Pointer citations by array index are brittle; prefer markdown snapshots with one heading per skill/tool, cited as `@## <name>`.
- Import options: external watch roots (`nn-sources/SKILL.md:251-275`) use absolute machine paths — unsuitable for a committed domaiNN. A small script calling `importRaw`/`writeOnce` from `nn-core.generated.cjs` (used in `external-scanner.js:10`, `impact-checker.js:19`) is more direct (unverified).
- Precedent: `scripts/generate-docs-facts.mjs` + `scripts/lib/docs-facts.mjs` derive `mcp-tools` (from nn-mcp `dist/server.js`) and `skills-catalog` (from `manifest/source.yaml`) regions, guarded by a CI drift check. Extractors `loadToolDefinitions`, `parseSourceYaml` are reusable.

### Q4. Build and deploy

- `build-docs.mjs`: builds nn-core/nn-mcp, copies `catalog.json` to `docs/innfo/blueprints/` (52-60), runs docs-facts, copies `docs/use/manifest-next.md` to `docs/update/` (75-81), generates two Docsify suites.
- CI job `site` (`ci.yml:70-109`) uploads `docs/` as `pages-docs` on main; `publish-web` (`ci.yml:177-207`) pushes it to the separate repo `cogNNitive-web`, which owns Pages and `cognnitive.com`.
- `publish-web.js:80-91`, `publish-web-tree.js:88-117` replace the whole `docs/` subtree, preserving only `.nojekyll`, `CNAME` and release-owned paths (`innfo/cdn/nn-mcp-v*.bundle.js`, `innfo/cdn/manifest.json`, `use/manifest.md`, `update/manifest.md`, `use/manifests/*.md`; `release-keys.js:54-61`). `assertNoReleaseOwnedInArtifact` throws if the artifact contains them.
- Role (c) files living in monorepo `docs/` that must survive: `docs/use/manifest-next.md`, `docs/update/`, `docs/innfo/blueprints/catalog.json`, `docs/use/freshness.json`, `docs/use/index.html`, `docs/update/index.html`.
- Smallest publish path: anything committed under `docs/<new-dir>/` is published with no pipeline change. `assertNoSource` (`publish-web-guard.js:14-23, 64-91`) only forbids `node_modules`, `.env*`, root `src`/`packages`/`apps`, stray `package.json`.

### Q5. Folder location and guards

- Precedent: `ecosystem_NN/` is a root-level dogfooding domaiNN (`domaiNN_NN.md`, `kNNowledge/`, `sources/`, `procedures/`, `artifacts/`). A sibling `site_NN/` follows the convention.

| Guard | Effect on `site_NN/` |
|---|---|
| nn-name-invariant | Documents must be named `<x>_site_NN.md`. |
| text-encoding | Valid UTF-8, no U+FFFD (Windows risk when generating). |
| brand-purge | Fails only if retired product names appear. |
| nn-name-regex | Covers `scripts/`, `skills/*/scripts`, package `src` only. |
| `check:spec-urls` | Specs linked, never duplicated; `docs/**` non-`_NN.md` skipped (`check-spec-version.mjs:315`). |
| verify.js discovery | `*.test.*` auto-discovered only under `scripts/`, `skills/`, `test/`, `iNNfo/specs/bluepriNNts` (`verify.js:464-471`). |
| eslint / tsconfig.scripts | Cover `iNNfo/` and `scripts/` only. |

### Q6. Existing content (inventory only; migration is a non-goal)

- Commercial: `docs/index.html`, `use-cases.html`/`.md`, `contact.html`, `legal.html`, `privacy.html`, `404.html`, `docs/actionn/index.html`, `docs/innfo/index.html`, `docs/innfo/about.html`.
- Docs: ~22 pages in `docs/innfo/documentation/*.md`, ~12 under `docs/skills/documentation/`; install pages `docs/use/index.html`, `docs/skills/setup/index.html` (the `docs-install-guide` spec requires a stable install-guide URL).
- Pitch/tutorial material: use-case domaiNNs in `docs/cognitive_nn/use-cases/*`; `ecosystem_NN/kNNowledge/Capabilities_Catalog_capabilities_NN.md`, `UseCases_Catalog_use-cases_NN.md`; `_samples_nn/`.
- AI-readiness conventions present: `llms.txt`, `ai-index.yaml`, `.well-known/ai-catalog.json`, `sitemap.xml`, `robots.txt`, markdown twins.

### Q7. Reuse or ignore

- `nn-site-generator`: agent-driven HTML generation, no model or compiler — ignore for this change.
- `scripts/publish-web*`: reuse unchanged.
- `docs-facts` libraries: reuse extractors for the code-snapshot generator.
- `nn-design-presets` / `design-presets`: optional; one hand-written CSS file is simpler.
- `documentation` bluepriNNt + `generate-docsify-suite`: leave untouched during the trial, retire at cutover.

## Challenging the proposed model

- `Section` and `Navigation` are unnecessary: `kind` already groups; navigation derives from `kind` in a fixed order plus `Page.order`.
- Minimal model: `Site` (singleton: title, tagline, base path, repository URL) and `Page` (`title`, `kind`, `slug`, `order`, `summary`, `sources` citations only, prose as body).
- Legal/privacy/contact do not fit the five kinds: add `kind: legal` or treat as `pitch` — decide explicitly.
- Prose-in-body hazards: `key:: value` lines inside a body parse as fields; repeated element names in one document are silently dropped; one large document is a big diff surface — prefer one document per `kind`.

## Approaches

| | A. Local blueprint, output in `docs/next/` (recommended) | B. Shipped blueprint, separate output | C. Evolve `documentation` |
|---|---|---|---|
| What | `site_NN/` holds domaiNN, local `site` blueprint, compiler, snapshots; writes committed HTML to `docs/next/`. | Blueprint in `iNNfo/specs/bluepriNNts/site/`; output in `site_NN/public/` plus copy step in `build-docs.mjs`. | Add `kind`, citations, static renderer to `documentation`. |
| Shared files touched | None | catalog, source.yaml, usage procedure, release tag, build-docs | Existing blueprint + instances |
| Isolation | Complete | Weak | Weak |
| Role (c) risk | None | Low | Low |
| Fit with intent | High | Medium | Contradicts "new, purpose-built" |
| Effort | Low-medium | Medium-high | Low, wrong direction |

## Recommendation

Approach A.

- Layout: `site_NN/domaiNN_NN.md`; `site_NN/kNNowledge/*_site_NN.md`; `site_NN/specs/bluepriNNts/site/spec_NN.md` + `procedures/compile_site_procedures_NN.md` + `usage_procedures_NN.md`; `site_NN/sources/import/code-facts/`; `site_NN/compile-site.mjs` + shell + CSS; output `docs/next/` (committed).
- Compiler reads only the domaiNN; tiny in-house markdown-subset renderer that fails on unsupported constructs (no dependency); emits `llms.txt` and `sitemap.xml`.
- Reference Pages: generator reuses docs-facts extractors, writes one markdown snapshot per fact group (one heading per skill/tool) as a new write-once family member plus sidecar via `importRaw`/`writeOnce`; Pages cite header units; a small check calls `checkScanImpact` and exits non-zero on `unresolved_in_latest`; `compile-site` warns or refuses on that report.
- Promotion: move the blueprint to `iNNfo/specs/bluepriNNts/site/` once ≥10 Pages compile cleanly and the family-evolution check runs in CI.

## Risks

1. Silent loss of staleness signal if snapshots are overwritten in place.
2. Noisy flags from one big snapshot.
3. Prose mangled by `::` lines or duplicate element names.
4. Field-name clash on `source`.
5. Local blueprint resolution unproven (fallback: approach B).
6. Tests under `site_NN/` not auto-discovered; a build-freshness guard needs deterministic output.
7. Encoding of generated HTML on Windows.
8. Role (c) coupling at cutover (`docs/use/`, `docs/update/`, `docs/innfo/blueprints/`, `CNAME`, `.nojekyll`, stable install-guide URL).
9. Engram notes about `templates-v*`, `compile-model-viewer` and unvalidated CSV `@` citations are stale.
10. Two documentation systems coexist until cutover.

## Open questions

1. Snapshot granularity: per fact group (~3 files) or per fact (~40)?
2. Legal/privacy/contact: sixth `kind` or `pitch`?
3. Is `docs/next/` the trial URL; what is the cutover plan?
4. Import via watch root or direct `importRaw`?
5. Parser: nn-core mirror or a small hand parser?
6. Markdown twins and `llms.txt` from day one?
