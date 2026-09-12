# Exploration: vocabulary-simplification (backlog #3 — canonical term dictionary + `template` → `app`)

## Current State

**"template" is 4 distinct senses, not one term.** A blind find-and-replace is impossible:

1. **iNNfo Level-2 schema** (`_spec_NN.md`, pinned by `parent_spec.url`) — the rename target.
2. **nn-trannsform transformation templates** (`traNNsformations/` dir, CLI `--apply <name>`) — a *different* concept that must NOT become "app".
3. **Vue SFC `<template>` blocks** — syntax, untouchable (dozens in `innfo-editor/src`).
4. **Generic English** ("use `docs/index.html` as a template") — not the concept.

**L2 schema inventory** (`iNNfo/specs/templates/`): 13 active (`analysis, blank, business, business-model, documentation, innovation, metrics, organization, procedures, projects, repository, video-generator, workspace_spec_NN.md`) + 2 frozen (`base`, `cogNNitive`) + `console/` runtime seam + `assets/` seam. User-facing title lives in each spec's frontmatter `title: "X Template"` → propagated to `catalog.json` by `scripts/template-catalog.mjs` → staged to `docs/innfo/templates/catalog.json` by `build-docs.mjs`.

**Identifier surface that breaks resolution if renamed** (the backlog's "high-risk mechanical" list, confirmed): `iNNfo/specs/templates/<name>/` paths + `spec_url` (pinned by every `parent_spec.url`, every `includes[].url`, catalog URLs); frontmatter keys `template_version`/`template_name` (validator, `guard-template-immutability.js`, `spec-versioning` R-SV-08 "pin a versioned filename — never a mutable alias"); MCP tool names `get_template`/`validate_template`/`list_templates`/`hydrate_template`/`list_template_procedures`/`list_template_skills`; manifest protocol `templates:`/`frozen_templates:` + `ref_key: templates` + git tag `ref: templates-v0.7.0`; editor `SHIPPED_TEMPLATE_VERSIONS`, `templateName`, `?createTemplate=`; skill frontmatter `bundled_templates: []`; hydration path `./specs/templates/<name>/<version>/` + `~/.agents/templates/` cache.

**Precedents (all in-repo, all read):**

- `conversations/2026-09-06_workspace-models-rename.md` (ModelRef→Models, Models→ModelRecords): composition-collision + provenance guards, historical versions left untouched, skill copy synced, tests updated.
- `openspec/specs/provenance-vocabulary/spec.md` — the exact pattern this change needs: collapse onto canonical nouns + explicit deprecated alias (`references:` read-only for one release, then removed). Matches iNNfo/AGENTS.md policy "No silent fallbacks or aliases… terminology transitions MUST be explicit and transparent."
- Archived `2026-09-06-workspace-template-consolidation/design.md`: weighed moving versioned template files; rejected because it breaks every pinned raw URL and violates write-once; chose canonical unversioned paths instead.

**Glossary homes today**: no `UBIQUITOUS_LANGUAGE.md` exists. The de-facto glossary is the `iNNfo/AGENTS.md` "Ubiquitous Language & Domain Terminology" block (8 terms: Workspace/Model/Template/Concept/Element/Block/Pill-Sheet). Backlog leaves location open: doc vs machine-readable map vs both.

## Affected Areas

- `iNNfo/specs/templates/{13+2}/spec_NN.md` — frontmatter `title: "…Template"` + prose; dirty (sibling).
- `iNNfo/specs/templates/catalog.json` — generated; `templates:` key, `versions[].template_version`, titles; dirty (sibling).
- `manifest/source.yaml` + `manifest/body.md` — `templates:`/`frozen_templates:` sections, `ref_key: templates`, tag `templates-v0.7.0`, 4-tier hydration copy; dirty (sibling).
- `scripts/template-catalog.mjs`, `scripts/build-docs.mjs` (staging), `scripts/guard-template-immutability.js`, `scripts/manifest/validate-manifest.js` (+ tests) — generator/guard surface.
- `iNNfo/apps/innfo-editor/src` — user-facing labels: `HomeView.vue` ("Creating Models from Templates", sample cards), `SampleBanner.vue` ("…template. Changes you make won't be saved"), `ValidationReport.vue` ("Template:"), `WorkspaceIntegrityNotice.vue`, `WorkspaceView.vue`; identifiers `config/samples.ts` `SHIPPED_TEMPLATE_VERSIONS`, `?createTemplate=` query.
- `actioNN/skills/nn-innfo/SKILL.md` (~70 hits — wizard phases, `bundled_templates`), `nn-trannsform/SKILL.md` (mixed: L2 sense + its own `traNNsformations/` sense), `.agents/skills/nn-template-audit/SKILL.md` + `AUDIT_LOG.md` (audit copy; AUDIT_LOG dirty (sibling)), `nn-upgrade`, `nn-router`, `nn-workspace-git`.
- `docs/` — `use/manifest.md`, `use/manifest-next.md`, `actionn/documentation/skills/*.md`, `innfo/documentation/{ecosystem,citations-provenance,console-needs-and-visuals,innfo-editor,innfo-mcp,innfo-core,specifications,discipline-overlaps}.md`, `innfo/template-package-spec.md`, `innfo/app/starter/*.md`, `actionn/templates/workflow/…`.
- `iNNfo/AGENTS.md` — glossary block to extend; `iNNfo/USE_AI.md` — clean (0 hits).
- `openspec/specs/template-*` (15+ spec folders) — internal SDD identifiers; low user value, defer.
- MCP contract: `packages/innfo-mcp` tool names + `iNNfo/openspec/specs/innfo-mcp/spec.md`.

## Approaches

1. **Vocabulary-first, identifiers-stable** — Part 1 dictionary (machine-readable map + docs page) pins `app` as canonical with `template` as explicit deprecated alias; Part 2 renames only user-facing vocabulary (catalog titles, editor labels/navigation, docs prose, skill copy); ALL identifiers (dirs, URLs, `template_version`, MCP tool names, manifest keys/tags) stay stable and are recorded in the dictionary as deprecated-but-resolvable. Part 3 = scoped element-name audit.
   - Pros: zero resolution breaks; respects R-SV-08 + "no silent aliases" (alias is explicit, dictionary-published); mirrors provenance-vocabulary deprecation precedent; small review surface; matches backlog's "keep identifiers stable where renaming breaks resolution".
   - Cons: identifiers keep saying "template" (dictionary becomes the bridge); catalog titles require regenerating `catalog.json` (touches sibling-dirty files — needs sequencing).
   - Effort: **Low–Medium**

2. **Full mechanical identifier migration + alias/version bump** — rename `templates/` → `apps/` paths, MCP tools, manifest keys, git tags (`apps-v0.1.0`), frontmatter keys, with a resolver alias layer and coordinated manifest version bump.
   - Pros: fully consistent vocabulary; the "real" fix.
   - Cons: breaks every pinned `parent_spec.url`/`spec_url` in the wild (violates write-once immutability — the archived consolidation change already rejected this tradeoff); conflicts with R-SV-08 (versioned-filename pins) and the no-silent-alias policy; touches all 13+2 specs, resolver, MCP bundle, editor, preflight, upgrade, manifest validator + tests; large; backlog explicitly says "do not attempt as one change".
   - Effort: **High**

3. **Hybrid: A now + deferred identifier migration** — execute Approach 1 in this change; the dictionary gains a "planned migrations" section documenting each identifier's future deprecation; schedule the mechanical migration as a separate future SDD change tied to a coordinated release (tag bump), never here.
   - Pros: delivers user-facing value now; explicit, announced migration path (policy-compliant); keeps this change reviewable.
   - Cons: migration may never happen without a forcing function (dictionary entry is the forcing function).
   - Effort: **Medium**

## Recommendation

**Approach 1 (structured as Approach 3's spine)** — vocabulary-first with identifiers stable, dictionary as both a machine-readable map (drives editor labels + skill copy, e.g. a `vocabulary.json`/frontmatter block) and a docs page under `docs/innfo/documentation/` (with the `iNNfo/AGENTS.md` block updated to match). Follow `provenance-vocabulary` deprecation semantics verbatim: `app` canonical, `template` accepted as documented deprecated alias for one release, then removed from copy. Do NOT rename any identifier that breaks resolution; record every such identifier in the dictionary's alias table. The mechanical migration is explicitly out of scope and documented as a future change.

## Risks

- **Sibling collision (active)**: `catalog.json`, `manifest/source.yaml`, all domain `spec_NN.md`, `AUDIT_LOG.md` are dirty under `2026-09-12-templates-consoles-and-procedures-ecosystem` (all tasks `[x]`, uncommitted). Any apply touching those files collides — sequence apply after the sibling archives, and even the low-risk title rename touches `spec_NN.md` frontmatter.
- **"app" term collision**: `docs/innfo/app/` already means the editor distribution; dictionary must disambiguate App (L2 schema) vs Editor/Console (tool) to avoid new drift.
- **nn-trannsform's own "template"** (`traNNsformations/`, `--apply`): different concept; must be excluded or the rename corrupts the CLI vocabulary.
- **Vue SFC `<template>` + generic English usage**: excluded senses; any scripted pass must be sense-scoped, never regex-blind.
- **Generated artifacts**: catalog titles are derived — change `title:` in specs, regenerate via `template-catalog.mjs`, re-stage via `build-docs.mjs`; `SHIPPED_TEMPLATE_VERSIONS` stays keyed by slug (unaffected).
- **Frozen/historical files**: `base`, `cogNNitive`, and versioned files stay byte-identical (models-rename precedent).
- **Part 3 scope creep**: "audit remaining element vocabulary" is unbounded unless pinned (L2 concept names vs `## NN` sample elements vs MCP tool names) — needs explicit scope in proposal.

## Ready for Proposal

**Yes** — with two orchestrator notes: (1) the dictionary location decision is open per the backlog (doc vs machine-readable vs both — recommended both, machine-readable map doubles as UI/skill copy driver); (2) apply MUST be sequenced after `2026-09-12-templates-consoles-and-procedures-ecosystem` archives, since even the low-risk pass touches sibling-dirty files (`catalog.json`, `manifest/source.yaml`, `spec_NN.md` titles). Deliverable structure: proposal → spec (dictionary schema + rename scope + sense exclusions) → tasks split low-risk (vocabulary) / deferred (identifiers).