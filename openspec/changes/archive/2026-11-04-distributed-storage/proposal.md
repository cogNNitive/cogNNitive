# Proposal: Distributed storage — declare per concept where kNNowledge instances live

## Intent

A domaiNN stores kNNowledge in L3 documents that follow an L2 bluepriNNt. There is one first-class storage form (compact: one `*_NN.md` model holding every instance of a concept as elements) and one that exists only by convention (one model file per instance, in per-instance folders). The second form, here called distributed, is the natural shape for independent units such as a Video or a Series, but the system has no way to declare it (exploration §1, §3.2: no formal meaning for "distributed" exists in code, specs or `vocabulary.json`).

Concrete evidence (exploration §1, §3.3):

- `video_NN` keeps 24 episode models under `series/*/assets/<slug>/` and also lists the same videos as `## NN Video:` elements in three compact registries (`INNteresante_video_NN.md`, `VillabotijosToday_video_NN.md`, `Cosicah_V_0-1-0_video_NN.md`). The same video lives in two places.
- Those 24 episodes pin mixed bluepriNNt versions (`villabotijos-today_V_0-1-0`, `_V_0-2-0`, `innteresante_V_0-1-0`, bare `video-script`, a local unparseable url). No rule flags it; that it validates cleanly is [unverified].
- Stems carry the parent in their name (`pepper-mapache_video-script_villabotijos-today_NN.md`), apparently to avoid id collisions ([unverified] inference). A stem collision flips both ids to path form, which orphans stamped change targets (exploration §4, §5 point 2).
- `LC_programas` keeps 7 per-project models under `proyectos/<x>/models/<x>_business_NN.md` with the same unnamed convention, next to a compact `LC_programas_Tutorias_NN.md`.
- Three address syntaxes coexist: `[[Title :: Name]]`, `<model>@<slug>&<field>`, `<path>@## NN Change: c-09` (exploration §4).
- `add_model` cannot create a model outside `kNNowledge/` (exploration §5 point 1), so distributed models cannot be produced through changes at all.

Goal: the domaiNN exposes one collection per concept (all Series, all Videos, all Scenes) independent of physical layout; the layout is declared in the bluepriNNt and validated.

## Scope

### In Scope

- Per-concept storage declaration (`compact` or `distributed`) in the L2 bluepriNNt, with a placement rule for distributed concepts.
- Hierarchical identity for models and elements; one reference grammar for references, change targets and citations.
- Placement, naming, identity-uniqueness and no-double-storage validation.
- One bluepriNNt version per concept across the domaiNN, checked by `check_domain`, upgraded all-or-nothing by `nn-upgrade`.
- Layout-independent collection reads in nn-core, nn-mcp and the console.
- Change support for instance models: create at the placement path, rename/move with recorded-target migration, drift and strict replay.
- A recorded compact-to-distributed migration operation.
- New versions of the `video` / `video-script` bluepriNNts declaring their storage.

### Out of Scope (exploration §9)

- Backwards-compatible parsing of old forms. Old forms (title-based `[[Title :: Name]]` resolution, flat stem ids that switch to path form on collision, the `<path>@## NN Change:` citation form, undeclared per-instance folders) are removed, not tolerated.
- Migrating existing domaiNNs (`video_NN`, `LC_programas`) to the new forms. That is a separate, later change.
- Lazy or per-instance bluepriNNt upgrades.
- Any change to the scope chain.
- Splitting an element (Scene, Layer) into its own file.
- Reintroducing a lineage record (owned by `lineage-as-changes`).

## Capabilities

### New Capabilities

- `concept-storage-declaration`: an L2 concept declares `compact` or `distributed` storage and, when distributed, a placement rule and container; a distributed concept is a model root, its child concepts are elements of the instance model.
- `hierarchical-identity`: model and element ids carry their container (for example `villabotijos-today/intro`); ids do not depend on which other files exist; moving an instance changes its id.
- `unified-reference-grammar`: one syntax `<hierarchical-id>[@<slug>[&<field>]]` for references, change targets and citations; titles are display-only; editor autocomplete resolves by title to id.
- `placement-validation`: an instance sits where its placement rule says, its name satisfies the naming contract, its identity is unique, and it does not also appear in a compact registry.
- `version-uniformity-check`: `check_domain` reports bluepriNNt version skew per concept across the domaiNN.
- `distributed-collection-resolution`: reads (`list_knowledge`, `query_units`, `resolve_effective`, console collections) see one collection per concept regardless of layout.
- `change-addressing-for-instance-models`: change targets, `resolved_target`, drift (`checkProvenance`) and strict replay work for instance models; no silent skip of a touched model without a file entry.
- `instance-model-lifecycle`: `add_model` writes to the placement path; rename or move of an instance renames folder, stem and id and migrates recorded targets.
- `instance-model-migration`: a recorded compact-to-distributed operation so drift does not fire on moved units.

### Modified Capabilities

- `nn-naming-contract`: stem derivation from the folder slug; `_<blueprint>` suffix rule when several concepts are distributed in one bluepriNNt.
- `model-discovery-predicate`: discovery classifies instance models against declared placements.
- `stable-element-identity`: slug scoping under hierarchical ids; fate of the intra-document duplicate-name drop (design decides).
- `cross-model-reference-validation`: title resolution and workspace-wide title uniqueness as an addressing rule are removed.
- `knowledge-unit-address`, `citation-parser-resolver`, `typed-source-references`, `model-mutation-references`: replaced by the unified grammar.
- `changeset-document-model`, `changeset-apply-engine`: target grammar; `add_model` with a placement path; instance rename.
- `delete-impact-and-lifecycle`: impact keyed by hierarchical id, not `displayStem`.
- `workspace-template-upgrade`: `nn-upgrade` migrates every instance of a concept or none.
- `video-folder-contract`, `video-blueprint`, `video-script-model`: layout becomes a declaration, not a convention.
- `canonical-vocabulary`: new terms (compact storage, distributed storage, instance model, collection, placement rule); "catalog" is not reused.
- `changes-collection`: only if design extends `nature.structure` instead of adding a new key.

`scope-chain` is explicitly unchanged.

## Approach

Declaration first, then identity, then everything that consumes identity. The declaration and placement rule live in the bluepriNNt; discovery stays path-agnostic and checks found models against declared placements. Identity is derived from container plus slug, so collisions become impossible by construction rather than resolved after the fact. All three address syntaxes collapse into one parser. Changes reuse the existing multi-model atomic apply (exploration §5, "already works"); the new work is creation, rename and migration of instance models. Versioning follows option A (exploration §6).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/nn-core/src/{schema,naming,parser,recursiveParser,validator,scope,mutate.ts,serializer.ts}` | Modified | Declaration schema, identity, unified grammar, placement and version checks |
| `iNNfo/packages/nn-mcp/src/tools/{apply-change,query-units,check-workspace,floor-doc}.ts`, `provenance-strict.ts`, `drift.ts`, `history.ts` | Modified | Instance-model creation, rename, drift, strict replay, skew diagnostics, collection reads |
| `iNNfo/specs/bluepriNNts/{video,video-script}`, L1 spec, `manifest/source.yaml` | New version | Storage declaration; templates re-pin |
| Console runtime and payload builder | Modified | Collections built from declarations; references rendered by title, stored by id |
| `skills/{nn-innfo,nn-upgrade,nn-video-script}`, `scripts/skill-shared-rules.md`, mirrors | Modified | Rules, upgrade flow, authoring guidance |
| `iNNfo/specs/vocabulary.json`, `docs/documentation/**` | Modified | New terms |
| Samples and fixtures using old address forms | New versions | Write-once files are re-issued, not edited |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing domaiNNs (`video_NN`, `LC_programas`) stop validating once old forms are removed | High | Accepted by decision 7; the separate migration change is scheduled right after; `instance-model-migration` ships here as its tool |
| Overlap with active `lineage-as-changes` (citation grammar, `resolved_target`, drift) | High | Land after `lineage-as-changes` merges, or rebase onto its tracker; unified grammar owns syntax, lineage owns semantics |
| Hierarchical id grammar chosen wrong is expensive to change | Med | Design settles separator, move behaviour and slug scoping before any slice |
| Write-once samples and L1/L2 specs turn red | High | New versions cut with a `templates-v*` release; rehearse `verify.js --release` |
| Title-only editor UX hides ids and confuses hand authors | Low | Autocomplete is part of scope; validator messages show both title and id |
| [unverified] items (`resolve_effective` across sibling files, duplicate-title flagging, mixed-version validation) behave differently than assumed | Med | Spec phase verifies each before writing requirements against it |

## Rollback Plan

Each slice is a separate PR on a feature branch, landing replacement-before-removal. Before the tracker merges to `main`: revert the offending slice PR. After merge: revert the tracker merge commit and re-pin the previous `templates-v*` tag. No existing domaiNN is migrated by this change, so a revert leaves user content untouched.

## Dependencies

- `lineage-as-changes` merged (or a coordinated rebase).
- A `templates-v*` release for the new `video` / `video-script` versions.

## Success Criteria

- [ ] A bluepriNNt can declare a concept `distributed` with a placement rule, and `validate_knowledge` accepts an instance model at that path and rejects one elsewhere.
- [ ] A Video stored both as an instance model and as a compact element produces a placement error.
- [ ] Two instances with the same slug in different containers have distinct, stable ids; adding a file never changes another file's id.
- [ ] One grammar parses references, change targets and citations; `rg` finds no title-based resolution or `@## NN Change:` citation parsing in live code.
- [ ] `check_domain` reports version skew for a concept pinned to two versions; `nn-upgrade` upgrades all instances or none.
- [ ] `add_model` creates an instance model at its placement path, strict replay reproduces it, and renaming it migrates recorded targets without drift.
- [ ] `list_knowledge` and the console return the same collection whether a concept is stored compact or distributed.
- [ ] `node scripts/verify.js --release` and CI are green after the templates re-pin.

## Decisions already taken (exploration §7)

1. Storage is declared per concept in the L2 bluepriNNt, not per bluepriNNt. A distributed concept is a model root: one L3 model per instance in its own folder. Its child concepts are elements of the instance model.
2. The scope chain stays as it is and is orthogonal to storage (value inheritance vs placement).
3. Placement validation is accepted: placement path, naming contract, unique identity, no double storage in a compact registry.
4. Versioning is option A: one bluepriNNt version per concept across the domaiNN, checked by `check_domain`, migrated all-or-nothing by `nn-upgrade`.
5. Identity is hierarchical: the id carries the container; moving an instance changes its id.
6. One reference grammar `<hierarchical-id>[@<slug>[&<field>]]` for references, change targets and citations; titles are display-only; the editor autocompletes by title; no second form is kept.
7. No backwards compatibility: old forms are removed; existing content is migrated by a later, separate change.

## Open points handed to design (exploration §8)

- Declaration surface: frontmatter keys, placement-rule template syntax, how a concept names its container, heading vs frontmatter.
- Final prose and vocabulary names for the mixed case (working terms: instance model, element).
- Stem derivation from the folder slug and the `_<blueprint>` suffix rule with several distributed concepts per bluepriNNt.
- Hierarchical id grammar: separator, relation to today's domain-relative path form, behaviour on move, element slug scoping.
- Fate of the intra-document duplicate-name drop under unified identity.
- Collection resolution: scan of declared placements vs an anchor document.
- `add_model` for placement rules (target without `/`, destination path) and strict replay of such models.
- Rename of an instance: folder, stem and id, with recorded-target migration.
- The compact-to-distributed migration operation and how it is recorded.
- `check_domain` messages for version skew, placement errors and duplicate identity.
- Extend `nature.structure` (`members` with authored ownership) or introduce a new key.
- Impact on `nn-upgrade`, nn-mcp tools (`query_units`, `list_knowledge`, `resolve_effective`), the console, and the `video` / `video-script` bluepriNNts.

## Proposal question round

Not asked directly (executor context). Questions for the maintainer to review before specs:

1. Should the `LC_programas` per-project business models be in the first validated example, or is `video_NN` the only reference shape for this change?
2. When an instance is moved and its id changes, should references from other models be rewritten automatically by the move, or reported as broken until fixed through changes?
3. Is a compact concept allowed to hold elements whose child concept is distributed (for example a compact Series registry with distributed Videos), or must a distributed concept's ancestors also be distributed?
4. While `video_NN` and `LC_programas` wait for their migration change, is it acceptable that they fail validation on the new release, or must that change ship in the same release window?

Assumptions pending review: questions 2 and 3 are left to design; question 4 is assumed "acceptable, migration follows immediately".

## Review Workload Forecast

| Slice | Content | Est. changed lines (excluding generated) |
|---|---|---|
| S1 | Declaration schema + vocabulary | ~500 |
| S2 | Hierarchical identity + unified grammar | ~1,200 |
| S3 | Placement validation + version uniformity | ~600 |
| S4 | Collection resolution (nn-core, nn-mcp, console) | ~700 |
| S5 | Instance-model lifecycle + change addressing | ~900 |
| S6 | Migration operation + `nn-upgrade` | ~600 |
| S7 | `video` / `video-script` versions, samples, living specs, skills, docs | ~900 + mechanical corpora |

- Chained PRs recommended: Yes (feature-branch-chain).
- 400-line budget risk: High
- Decision needed before apply: Yes. Every slice except possibly S1 exceeds 400 lines and needs sub-slicing or `size:exception`.
