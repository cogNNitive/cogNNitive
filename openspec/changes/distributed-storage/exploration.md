# Exploration: distributed storage for model concepts

Date: 2026-11-03. Origin: a maintainer conversation plus four read-only code audits.
Status: exploration only. Every statement marked **[maintainer]** was confirmed by the maintainer in chat;
**[audit]** comes from reading code or files (nothing was executed); **[proposal]** is a design suggestion
that the downstream phases must still turn into requirements; **[unverified]** was not confirmed.

## 1. Problem

A domaiNN stores knowledge in L3 documents that follow an L2 bluepriNNt. Today there is one
first-class storage form (a *compact* model: one `*_NN.md` file that holds concepts and elements) and
one that exists only by convention (information spread over one model file per instance, in
per-instance folders). The second form is what the maintainer calls **distributed**. It is the natural
shape for some information (a Video and a Series are independent units with their own folder, assets
and lifecycle), yet the system has no way to *declare* it. The result is a pile of workarounds:

- **[audit]** `video_NN` keeps 24 episode models under `series/*/assets/<slug>/`, and also lists the
  same videos as `## NN Video:` elements in compact registries (`INNteresante_video_NN.md`,
  `VillabotijosToday_video_NN.md`, `Cosicah_V_0-1-0_video_NN.md`). The same video lives in two places.
- **[audit]** Blueprints are split to emulate a per-level storage choice: `video`, `video-script`, and
  per-series local specs (`series/villabotijos-today/spec_NN.md`). **[unverified]** that this split was
  made for that reason; it is the exploration's reading.
- **[audit]** Stems carry the parent in their name (`pepper-mapache_video-script_villabotijos-today_NN.md`),
  which looks like a manual guard against id collisions (inference, **[unverified]**).
- **[audit]** Blueprint versions are mixed across the 24 episodes (`villabotijos-today_V_0-1-0`,
  `villabotijos-today_V_0-2-0`, `innteresante_V_0-1-0`, bare `video-script`, a local unparseable url).

**[maintainer]** The logical result must be independent of the physical layout: the domain exposes one
collection of Series, one of Videos, one of Scenes, whether a concept is stored compact or distributed.
**[maintainer]** The word "catalog" is already taken in the repo (see 3.2); do not reuse it for this.

## 2. Vocabulary used in this change

- **compact storage**: all instances of a concept live in one model file, as elements.
- **distributed storage**: each instance of a concept is the root of its own model file, in its own folder.
- **instance model**: the model file of one instance of a distributed concept.
- **element**: a node inside a model, nested by heading depth (Scene and Layer inside a Video model).
- **collection**: the domain-wide set of instances of a concept; layout-independent.
- **placement rule**: the blueprint-declared path template that says where an instance of a distributed
  concept must live.

## 3. Current state (audit)

### 3.1 Storage forms found

| Form | Evidence | Used in |
|---|---|---|
| Compact L3 model | `iNNfo_V_0-6-0_NN.md:390-417` | `LC_programas/kNNowledge/LC_programas_Tutorias_NN.md`; `video_NN/series/*/Noticias*_noticias_NN.md` |
| Compact + `scope_elements` | `openspec/specs/scope-chain/spec.md` (last requirement) | Tutorias (Programa -> Prestacion de Servicios); every `*_video-script_*` file (Video -> Scene) |
| One model per instance folder (unnamed) | scope-chain spec; `video-folder-contract` | `video_NN` episodes; `LC_programas/proyectos/<x>/models/<x>_business_NN.md` (7 files) |
| Folder scope ("values") document | `scope: true`, `fills:` | `series/*/*_scope_NN.md`; `LC_programas_settings_NN.md` |
| Domain entrypoint `domaiNN_NN.md` | `naming/contract.ts:13` | both domains |
| Catalog documents `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md` | `CORE_BLUEPRINT_ROLE`, `contract.ts:123-129` | role `catalog` |
| Sources + `<file>_sidecar_NN.md` | `contract.ts:20,77` | `sources/import/**` |
| Changesets `changes/*_changes_NN.md` | `contract.ts:207` | both domains |
| Lineage record | `<domain>_cogNNitive_NN.md` | both domains (its removal is owned by `lineage-as-changes`) |
| Asset folders per element | `normalize.ts:349-391` | file-backed fields |

### 3.2 What the code and specs already offer

- **Discovery is path-agnostic and recursive** (`isModelCandidate`, `contract.ts:286-293`;
  `collectModels`, `helpers.ts:63-103`). A model needs `*_NN.md`, `level: 3`, `parent_spec`, role
  `knowledge`; excluded: `specs`, `archive`, `staging`, dot-dirs, root `sources/`. It does not require a
  `kNNowledge/` folder, and it skips a subtree that has its own `domaiNN_NN.md`.
- **No formal meaning** exists today for "distributed", "compact" or "per-instance". The only hit is an
  OKF comment (`validator/content.ts:443`). `vocabulary.json` has no entry.
- **Scope chain** (`openspec/specs/scope-chain/spec.md`): `findScopeChain` locates the root (nearest
  `domaiNN_NN.md`) and every enclosing sub-scope (a folder holding a document with `scope: true`).
  `isolate: true` cuts the chain; a nested `domaiNN_NN.md` is a new root. `scope_elements` turns the
  elements of listed concepts into scope nodes inside one file. The chain answers "from whom do I inherit
  values"; it does not say where an instance must live.
- **`nature:` declaration** (`schema/nature.ts:18`): `structure: catalog | members | projection` and
  `ownership: authored | derived`, declared only by the core blueprints `sources`, `artifacts`,
  `procedures` (catalog) and `changes` (members), all `derived`. `structure` is documented as "where a
  collection's elements come from", which is the closest existing concept, but it is coupled to
  `ownership` and is not available to domain blueprints such as `video`.
- **Prior art in the archive**: `2026-10-26-changes-as-collection`, `2026-10-27-video-series-extension-points`,
  `2026-10-27-blueprint-dependency-lifecycle`, `2026-10-30-2026-10-27-video-script-episode-fields`.

### 3.3 Real examples (read from the maintainer's domains)

`video_NN/series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_villabotijos-today_NN.md`:

```
parent_spec.name: villabotijos-today_V_0-1-0     title: "El mapache fuera de la ley"
scope_elements: [Video, Scene]
# NN Video  -> ## NN Video: ...        slug:: pepper-mapache
# NN Scene  -> ## NN Scene: 00 Gancho  slug:: 00-gancho   template:: [[Villabotijos Today :: Celedonio Full]]
### NN Layer: Gancho Presenter         slug:: 00-gancho-presenter
```

`series/villabotijos-today/villabotijos-today_scope_NN.md`: `scope: true`, `title: "Villabotijos Today"`,
fills for procedures, and the series values (`voice_id`, `music`, `fps`, `resolution`, `output_formats`)
that every episode inherits. `LC_programas_settings_NN.md`: root `scope: true`, `precio_hora_tutoria: 84`.
`LC_programas_Tutorias_NN.md`: compact, `scope_elements: [Programa, Prestacion de Servicios]`.

Observation: the folder slug (`assets/pepper-mapache/`) and the Video element slug (`pepper-mapache`)
already coincide by convention. The layout the maintainer wants to formalize exists in `video_NN`; only
the declaration is missing.

## 4. Identity audit

- **Model id** is the filename stem (including `_NN`); when two stems collide **both** ids switch to the
  domain-relative path without `.md` (`helpers.ts:116-135`). The id of a file therefore depends on which
  other files exist. Bare-stem lookup of a colliding id throws `AMBIGUOUS_MODEL_ID`
  (`openspec/specs/scope-chain/spec.md`, requirement "Model Id Collision Resolves via Domain-Relative Path").
- The stem must equal or end with `_<blueprint>` and carry no `_V_` token (`contract.ts:336-351`).
- **Element slug** uniqueness is per document across all concepts (`parser/core.ts:26-53`,
  `knowledge-checks.ts:55-84`). `slugExplicit` records whether `slug::` was authored; the serializer
  writes `slug::` only when explicit (`serializer.ts:323`); `freeze_slugs` assigns missing slugs
  (`mutate.ts:169-194`); `UNFROZEN_MODEL` is a warning.
- **Cross-model reference** syntax is `[[Model Title :: Element Name]]`, resolved by frontmatter `title`,
  then by filename stem (`validator/workspaceReferences.ts:9-15,206-224`). The element side matches the
  lowercased **name**, not the slug (`workspaceIndex.ts:114-118`). Duplicate model titles are an error
  (`workspaceIndex.ts:142-152`); a reference matching several models is an error
  (`workspaceReferences.ts:279-287`).
- The series scope document is titled "Villabotijos Today" (verified). The audit reports two more
  documents in the series with the same title; whether that is flagged today is **[unverified]**.
- **Three address syntaxes coexist**: `[[Title :: Name]]` (references); `<model>@<slug>&<field>` (change
  targets, `change-args.ts:13-26`); `<path>@## NN Change: c-09` (source citations, seen in
  `LC_programas_Tutorias_NN.md`).
- **Intra-document bug**: a repeated element name under the same parent is dropped from the graph
  (`recursiveParser/normalize.ts:252,282-291`, `identity.ts:26-38`); whether any host surfaces the
  resulting issue is **[unverified]**. The corpus works around it by prefixing layer slugs with the scene
  slug (`00-gancho-presenter`).

## 5. Changes / lineage audit

- A change targets `<model_id>@<element_slug>&<field>` (also `@concept:<c>&<f>`, matrix forms, bare
  `<model>` for `add_element` / `add_model` / `add_matrix`, a workspace path for `produce_artifact`).
  Never a file path. Resolution: `findKnowledgeFile` -> `buildModelIndex` -> `resolveModelId`
  (`apply-change.ts:1025`, `scope/model-index.ts:111-172`).
- One changeset may span many models, with one in-memory pass, atomic renames, snapshot and rollback
  (`apply-change.ts:1378-1420`). The comment at `:468-476` still says non-atomic (stale).
- Domain-wide reads already work across files: lineage snapshot, change log, `read_lineage`,
  `check_domain` drift, provenance models.
- **Failure points for a distributed layout:**
  1. `add_model` cannot create a distributed model: the target may not contain `/` (`apply-change.ts:803`)
     and the file is always written to `kNNowledge/<id>_NN.md` (`:1003`); strict replay starts from
     `add_model` (`provenance-strict.ts:107-122`), so such models are skipped by it.
  2. A stem collision flips ids; stamped targets orphan; `checkProvenance` skips a touched model with no
     file entry without a diagnostic (`drift.ts:176-188`).
  3. `rename_element` renames the `assets/<slug>` directory but not the child model's stem
     (`apply-change.ts:1446-1457`).
  4. Compact -> distributed migration yields false drift (`EDITED_WITHOUT_RECORD`,
     `UNIT_WITHOUT_RECORD`) unless recorded (`drift.ts:190-249`).
  5. Versions are per file: a domain-wide edit across N instance models is N version transitions, and
     `base_version` conflicts are per file (`history.ts`, scans only the newest 50 changesets).
  6. `query_units` is single-file (`query-units.ts:54-72`); `evaluateBatchDeleteImpact` keys workspace
     models by `displayStem`, so same-stem models collapse.
  7. Every per-video artifact needs its own `produce_artifact` (`ARTIFACT_WITHOUT_RECORD`); that
     obligation already exists with today's layout.
- **Already works**: multi-model changesets with cross-model rollback; domain-wide lineage reads; path-form
  ids; unit-level `produce_artifact`.
- **[unverified]**: `resolve_effective` / `explain` across sibling files; the `changes-collection` and
  `lineage-single-edge` specs were not read; whether `sync_lineage` is fully gone from live code.

## 6. Versioning audit

- The blueprint pin is `parent_spec.name` (`<bp>_V_x-y-z`) plus `parent_spec.url`; `knowledge_version` is the
  model's own version (`knowledge-checks.ts:33-36`). A versioned name selects that exact version; a bare
  name selects the highest (`resolver.ts:456-501`).
- `classifyAgainstCatalog` classifies per model (`versionStatus.ts:153-293`: current, upgrade-available,
  ahead, unlisted, unpinned, unknown) and parses `parent_spec.url` only; a local url falls to `unlisted`.
- No rule treats mixed versions of one blueprint as a warning or an error. That a mixed-version domain
  validates cleanly is inferred, **[unverified]** (no validator was run).
- `nn-upgrade` Flow B is per domain, consent-gated, backed up outside the workspace, with a `planHash` and
  "never half-upgrade" (`skills/nn-upgrade/SKILL.md:60-81,108-109`). No per-subtree or lazy mode.
- Scope documents resolve their floor from the innermost values document's `parent_spec.name`, with no
  version argument (`mcp/src/tools/floor-doc.ts:64-84`).
- Candidate strategies studied: **A** one version per concept across the domain, checked by `check_domain`,
  migrated all-or-nothing by `nn-upgrade`; **B** per-instance pin with a minimum; **C** the scope document
  pins its subtree; **D** lazy upgrade on edit.

## 7. Decisions confirmed by the maintainer

1. **Storage is declared per concept** in the L2 blueprint, not per blueprint. A distributed concept is
   promoted to model root: one L3 model per instance in its own folder. Child concepts of a distributed
   concept (Scene, Layer under Video) are elements of the instance model.
2. **Scope chain stays as it is** and is orthogonal to storage (inheritance of values vs placement).
3. **Placement validation** is accepted: an instance must sit where the placement rule says, its name must
   satisfy the naming contract, its identity must be unique, and it must not also appear in a compact
   registry.
4. **Versioning = option A**: one blueprint version per concept across the domain, checked by
   `check_domain`, migrated all-or-nothing by `nn-upgrade`.
5. **Identity is hierarchical**: the id carries the container (for example `villabotijos-today/intro`),
   not a globally unique slug. Moving an instance to another container changes its id.
6. **Reference grammar is unified**: one syntax `<hierarchical-id>[@<slug>[&<field>]]` for references,
   change targets and citations; the title is for display only; the editor autocompletes by title so nobody
   types ids by hand. No second form is kept.
7. **No backwards compatibility**: existing content is migrated later; the design optimizes for being
   solid and simple from now on.

## 8. Open points to resolve in design

- Exact surface of the declaration (frontmatter key names, placement-rule template syntax, how a concept
  names its container, whether the declaration lives on the concept heading or in frontmatter).
- Final name of the mixed case in prose and in the vocabulary (working terms: *instance model*, *element*).
- Stem derivation from the folder slug, and the `_<blueprint>` suffix rule when several concepts are
  distributed in one blueprint.
- Hierarchical id grammar: separator, how the model-id form relates to the domain-relative path form that
  exists today, behaviour on move, and how element slugs scope under it.
- Fate of the intra-document duplicate-name drop in the context of unified identity.
- How a distributed collection is resolved for reads: scan of declared placements vs an anchor document.
- `add_model` for placement rules (target without `/`, destination path) and strict replay of such models.
- `rename_element` / rename of an instance (rename of folder, stem and id, with a migration of recorded
  targets).
- A migration operation (compact -> distributed) that records the move so drift does not fire.
- `check_domain` messages for version skew, placement errors and duplicate identity.
- Whether `nature.structure` is extended (`members` with authored ownership) or a new key is introduced.
- Impact on `nn-upgrade`, `nn-mcp` tools (`query_units`, `list_knowledge`, `resolve_effective`), the console,
  and the `video` / `video-script` blueprints.

## 9. Non-goals

- Backwards-compatible parsing of the old forms.
- Lazy or per-instance blueprint upgrades.
- Changing the scope chain.
- Splitting an element (Scene, Layer) into its own file.
- Reintroducing a lineage record (owned by `lineage-as-changes`).
