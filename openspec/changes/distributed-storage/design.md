# Design: Distributed storage

## 1. Context and constraints

The proposal (`proposal.md`) and the exploration (`exploration.md` section 7) fix seven decisions: storage is declared per concept in the L2 bluepriNNt; the scope chain does not change; placement is validated; versioning is option A; identity is hierarchical; there is one reference grammar; no backwards compatibility. This design settles every open point of exploration section 8. Each one has an ADR in section 4.

### 1.1 Facts verified against the code (worktree at `dev`, 2026-11-03)

| # | Fact | Evidence | Consequence |
|---|---|---|---|
| F1 | `lineage-as-changes` is **merged** into `dev` (merge commit `81837577`). No `templates-v*` tag has been cut for it yet | `openspec/changes/lineage-as-changes/apply-progress.md` (S7 Merge section) | The ordering risk is gone. This change builds on `nn-core/src/changelog/*`, `resolved_target` and strict replay as they exist on `dev` |
| F2 | Drift and history live in nn-core, not nn-mcp: `changelog/{fold,drift,units,order,load}.ts` and `changeset/history.ts` | Glob | The proposal's "nn-mcp `drift.ts`, `history.ts`" means these nn-core files |
| F3 | The `video` bluepriNNt is **retired**. Only `video-script` exists. It defines `Video`, `Scene`, `Layer`, `Series`, `Preset` and `Video Defaults` | `openspec/specs/video-blueprint/spec.md:5`; `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` | Only `video-script` gets a new version. The compact registries `*_video_NN.md` in `video_NN` pin a retired bluepriNNt. The later migration change handles them |
| F4 | Four id producers disagree. `listKnowledge` (`helpers.ts:116-135`) uses the stem, or the path when stems collide. `findKnowledgeFile` + `buildModelIndex` (`nn-mcp/tools/spec.ts:137`, `scope/model-index.ts`) uses the filename only, depth 8 or less, with a package-stem alias. The console `normalizeModelId` (`console/payload-builder.ts:156`) uses a `kNNowledge/x` path. `provenance-models.ts` uses `listKnowledge` | Read | Identity must come from one module |
| F5 | The console matches cell provenance by suffix, and the first live match across models wins | `payload-builder.ts:357-366` | This is a cross-model ambiguity bug. Exact hierarchical keys fix it |
| F6 | Duplicate model titles produce an error only inside `WorkspaceIndex.issues`. `collectWorkspaceDiagnostics` (`nn-mcp/tools/validate.ts:319-342`) never surfaces `index.issues`. A duplicate title shows up only at the point of use, as an "Ambiguous cross-model reference" | Read | **[unverified] resolved.** Title uniqueness is deleted, not fixed |
| F7 | No rule reports mixed bluepriNNt versions. `classifyAgainstCatalog` classifies each model on its own. No match for skew or mixed versions in `nn-core/src` or `nn-mcp/src` | Grep | **[unverified] resolved statically** (nothing was executed): a mixed-version domaiNN passes `check_domain` today |
| F8 | `resolve_effective` / `explain` take a document `path`. They fold the ancestor scope chain (`findScopeChain`) and, optionally, the element chain inside that one document (`loadElementChain(abs, target)`). Sibling files are never read | `nn-mcp/tools/resolve-effective.ts:165-188` | **[unverified] resolved.** This is correct under distributed storage: a Video inherits from its Series (an ancestor folder), never from a sibling Video. No semantic change |
| F9 | `scope_elements[].parent` resolves a `[[title]]` reference by title | `scope/elements.ts:94-115`; fixture `nn-core/tests/fixtures/programas-golden/kNNowledge/tutorias_NN.md` | The unified grammar reaches one scope-chain scenario (see A7) |
| F10 | Element graph identity is keyed by **name** (`IdentityRegistry.register(parent, el.name)`). A repeated name is dropped with an error issue | `identity.ts:26-38`; `recursiveParser/normalize.ts:248-291` | Decided in A6 |
| F11 | `checkProvenance` checks only models present in `models`. A touched model with no file entry is skipped silently | `changelog/drift.ts:176-187` | Failure point 2. Fixed in A10 |
| F12 | `rename_element` renames `assets/<slug-of-new-name>` even though slugs are immutable | `apply-change.ts:1439-1463` | Deleted (A10) |
| F13 | The provenance ban gate is an **equality** test: `if (!/V_0-6-0/i.test(scope)) return` | `validator/knowledge-checks.ts:360-361` | Any document whose bluepriNNt pins a later L1 (this change introduces `iNNfo_V_0-7-0`) would silently escape the ban. Fixed first (A17) |
| F14 | A typed reference value inside one document resolves by slug first, then by name | `validator/references.ts:62-117` | Name resolution is title-based addressing. Decided in A7 |
| F15 | Cross-model `[[Title :: Name]]` appears in no sample, only in the L1 specs. Typed `[[Name]]` references appear in 8 shipped samples (94 lines) and many fixtures | Grep | Corpus cost is known and placed in a mechanical slice (S7b) |
| F16 | `_NN.md` sidecars are legitimate heading-cited sources (`report.pdf_sidecar_NN.md@## Findings`). Models are also cited by path (`kNNowledge/Finance_business_NN.md@## Revenue Forecast`, `skills/nn-sources/citations.md:15`) | Grep | Only the **model** and **changeset** path citations are removed. Source citations stay |
| F17 | Element asset folders follow `{modelDir}/assets/{element-slug}/` | `normalize.ts:346-392` | The Video placement shares this namespace with the Series model's element assets (A2, risk R6) |
| F18 | L2-against-L1 checks report an unknown Concept Definition property as a **warning** | `schema/metaschema.ts:64-119` | The declaration needs an L1 version that declares the new properties (A1) |
| F19 | Changesets are sealed (`proposal_sha`). `resolved_target` is an execution fact written once at apply | lineage design A5/A6 | Recorded targets are never rewritten in place. Migration is a fold-time rekey (A10) |

### 1.2 Constraints

- Strict TDD is project policy: red first, per slice.
- No backwards-compatible parsing, aliases or fallbacks.
- Published `_V_x-y-z_` files are write-once. bluepriNNts are edited in place with a version bump. Samples are re-issued as new files.
- nn-core is NodeNext ESM: relative imports carry `.js`. Browser-safe modules stay pure (no `fs`).
- Writers run builds only, never `npm ci`. Worktree `node_modules` are junctions.
- PR budget is 400 changed lines, excluding generated and mechanical files.

## 2. Goals and non-goals

**Goals.**
- A per-concept storage declaration with a validated placement rule.
- One identity module that every id consumer uses. Ids are a pure function of a file's own path and its declarations.
- One address grammar shared by typed references, change targets, `resolved_target` and model citations.
- Layout-independent collections.
- Change support (create, move, extract) with drift and strict replay intact.
- `check_domain` layout and version-skew diagnostics, and an all-or-nothing `nn-upgrade`.

**Non-goals** (exploration section 9 and proposal):
- Migrating `video_NN` or `LC_programas`.
- Lazy or per-instance upgrades.
- Any scope-chain semantics.
- Splitting Scene or Layer into files.
- A lineage record.
- Prose wikilinks (`[[Name]]` inside descriptions or bodies) and L2 schema-level concept links (`* [[Scene]]`, `parent:: [[X]]`). These are display or schema text, not instance addressing, and are untouched.
- Detecting skew between *different* local bluepriNNts that compose one shared bluepriNNt at different versions (R7).

## 3. Architecture overview

Two new deep modules in nn-core carry the change. Everything else consumes them.

- **`nn-core/src/address/`**: `parseAddress` and `formatAddress`. This is the only grammar for model, element, field, body, cell, concept and matrix addresses. `sourceRef.ts` keeps the *source* branch (non-model files: `.md` headings including sidecars, `.csv` rows, `.json` pointers) and delegates to the model branch.
- **`nn-core/src/domain/`**: `buildDomainIndex(models, declarations)`. It is pure and browser-safe. It classifies each L3 model as compact or instance, derives every `ModelId`, matches placement rules, resolves addresses, builds collections, and emits layout diagnostics. It replaces the four id producers (F4), `stem-collision.ts`, `model-index.ts` and the title maps of `WorkspaceIndex`.

```
L2 bluepriNNt Concept Definition (storage/container/placement)
        │ extractBlueprintSchema → Concept.storage (schema/storage.ts validates the rule)
        ▼
discovery (collectModels: path, frontmatter, element (concept, slug) list)
        │ + StorageDeclarationsResolver port (spec cache, sync after warm-up)
        ▼
buildDomainIndex ──► IndexedModel{id, path, blueprint, storage}
        │                 │
        │                 ├─► identity: byId / byPath / resolve(address, from?)
        │                 ├─► collections: collection(Concept)
        │                 └─► diagnostics: PLACEMENT_*, INSTANCE_*, DUPLICATE_MODEL_ID,
        │                                  DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL, BLUEPRINT_VERSION_SKEW
        ▼
references (typed fields)  ── parseAddress ──► resolve ──► REF_* diagnostics
changes (targets)          ── parseAddress ──► resolve ──► apply: add_model / move_model / extract_instance
        │ resolved_target = formatAddress(canonical)
        ▼
changelog fold (+ rekey events) ──► checkProvenance (+ MODEL_WITHOUT_FILE) / strict replay (identity chain)
        ▼
check_domain.layout (placement + identity + skew) ──► nn-upgrade plan (one version per bluepriNNt group)
```

**Seams.** The index takes plain data and one resolver port. Node (nn-mcp, via the spec cache) and the browser (console export, through the embedded registry) are the two adapters, so the seam is real. Tests call `buildDomainIndex` with literal inputs.

## 4. Architecture decisions

### A1. Declaration surface: Concept Definition properties, plus a new L1

**Decision.** A distributed concept declares three properties on its `## NN Concept Definition:` element:
- `storage:: distributed`
- `container:: <ConceptName>` (optional)
- `placement:: "<template>"`

A missing `storage` means `compact`. A new write-once L1, `iNNfo_V_0-7-0_NN.md`, declares these three as Concept Definition properties. It also documents the unified address grammar (A7). `extractBlueprintSchema` reads them into `Concept.storage`. `schema/storage.ts` validates them when a bluepriNNt is composed.

Codes:
- `STORAGE_UNKNOWN_MODE`
- `PLACEMENT_REQUIRED` (distributed without a placement)
- `PLACEMENT_FORBIDDEN` (compact with a placement or container)
- `PLACEMENT_INVALID`
- `CONTAINER_NOT_DISTRIBUTED`
- `CONTAINER_CYCLE`
- `PLACEMENT_OVERLAP` (two expanded templates of one schema can match the same folder)

**Rationale.**
- The decision is per concept (decision 1), so it belongs on the concept.
- Concept definitions already merge through bluepriNNt composition. A local bluepriNNt that includes `video-script` inherits the declaration with no new merge logic.
- Frontmatter maps (`nature`, `validation`) do not compose per concept.

**Alternatives rejected.**
- A frontmatter map (`storage: {Video: {...}}`). It needs its own composition rules, it sits away from the concept, and it duplicates concept names as keys.
- A heading-level marker (`# NN Video [distributed]`). It is new syntax in L1 grammar for one feature.

**Consequences.**
- Adds one L1 file. Only the bluepriNNts bumped here (`video-script`, `changes`) repin to it, as `lineage-as-changes` A14 did.
- Requires A17 first.

### A2. Placement-rule template

**Decision.** The template is a POSIX path relative to the domaiNN root, ending in `/`.

- Segments are kebab-case literals (`[a-z0-9]+(-[a-z0-9]+)*`), exactly one `{slug}`, and optionally `{container}`.
- `{container}` is allowed only as the first segment, and only when `container::` is declared. It expands to the container instance's **instance root folder**.
- The instance root folder is the expanded path up to and including the `{slug}` segment. It is the unit that moves (A10).
- Rejected segments: `..`, `.`-prefixed, `archive`, `staging`, `specs`, `backups`, root `sources`, and `kNNowledge` (reserved for compact models).
- The instance file lives directly in the expanded folder.

`video-script`:
- `Series`: `placement:: "series/{slug}/"`
- `Video`: `container:: Series`, `placement:: "{container}/assets/{slug}/"`

**Rationale.**
- `{container}` forces physical nesting. Containment is therefore single-parent and visible in the tree, and moving a container moves its children.
- Allowing literals after `{slug}` covers the `LC_programas` shape (`proyectos/{slug}/models/`).

**Alternatives rejected.**
- Concept-named tokens (`{series}`). They allow a container that is not an ancestor, which breaks the move semantics.
- Globs. They are ambiguous, and they make the id non-derivable.
- A default placement. It is implicit, and decision 3 demands a declared rule.

**Consequences.**
- Keeping `assets/{slug}/` preserves today's folder contract (smaller later migration), but it shares `assets/` with the Series model's element asset folders (F17). The index reports `INSTANCE_SHADOWS_ELEMENT_ASSETS` (warning) when an element slug of the container model equals a contained instance slug.

### A3. Vocabulary

**Decision.** The canonical terms are:
- **compact storage**
- **distributed storage**
- **instance model**: the L3 model of one instance of a distributed concept
- **instance root**: the element of the distributed concept inside its instance model
- **element**
- **collection**: the layout-independent set of a concept's instances across the domaiNN
- **placement rule**
- **container**
- **model id**: hierarchical

"catalog" is not reused. "registry" is not introduced. The mixed case is described as "an instance model whose child concepts are elements". `vocabulary.json` gains these entries with `canonical-vocabulary` aliases: none.

**Rationale.** These are the exploration's working terms, and they proved unambiguous against the code. "instance root" names the thing the placement contract keys on.

**Alternatives rejected.** "Unit model" (clashes with knowledge unit). "Per-instance document" (not a noun phrase that scales).

### A4. Stem derivation and the `_<blueprint>` suffix

**Decision.**
- The instance file is `<slug>_<pinned-blueprint-name>_NN.md`, where `<slug>` is the folder's `{slug}` segment. The concept is **not** in the name.
- Several distributed concepts in one bluepriNNt need no extra suffix. The concept is derived from the instance root (A8), and `PLACEMENT_OVERLAP` (A1) guarantees one folder matches at most one template.
- The stem no longer defines identity for instance models. Two instance files with the same stem in different folders are legal.

Codes: `INSTANCE_NAME_MISMATCH` (expected name shown) and `INSTANCE_SLUG_MISMATCH` (root `slug::` differs from the folder slug).

Examples:
- `series/villabotijos-today/villabotijos-today_video-script_NN.md`
- `series/villabotijos-today/assets/intro/intro_video-script_NN.md`

**Rationale.**
- `checkNameInvariant` (`naming/contract.ts:336`) already requires `_<bp>`. Adding the concept would duplicate what the path and the root element already say.
- Today's `pepper-mapache_video-script_villabotijos-today` encodes the parent only to avoid stem collisions (exploration section 4, inferred). Hierarchical ids remove that motive by construction.

**Alternatives rejected.**
- `<slug>_<concept>_<bp>`. Redundant, and renaming a concept would rename every file.
- Keeping the parent in the stem. That is the workaround this change removes.

### A5. Hierarchical model id grammar

**Decision.**
- **Compact model id** = canonical stem without `_NN` (unchanged: `LC_programas_Tutorias`).
- **Instance model id** = `<container-id>/<slug>`, or `<slug>` when the concept has no container. The separator is `/`.
- Ids are derived only from the file's path and the declarations of its pinned bluepriNNt. Adding a file never changes another file's id.
- Repeated ids are an error, `DUPLICATE_MODEL_ID` (every path listed), and never a silent flip.
- The domain-relative path form, the collision flip (`helpers.ts:127-131`), `AMBIGUOUS_MODEL_ID` and the package-stem alias (`model-index.ts:44-56`) are **removed**.
- A tool argument that looks like a path (ends in `.md`, or contains `\`) where an id is expected is `MODEL_ADDRESSED_BY_PATH`.
- Ids compare case-sensitively. Instance segments are always lowercase slugs.

**Move.**
- Moving an instance to another container, or changing its slug, changes its id and the ids of every descendant instance (prefix rewrite).
- It is done only through `move_model` (A10).

**Worked examples** (`video-script`, one domaiNN):

| File | Kind | Id |
|---|---|---|
| `series/villabotijos-today/villabotijos-today_video-script_NN.md` | Series instance | `villabotijos-today` |
| `series/innteresante/innteresante_video-script_NN.md` | Series instance | `innteresante` |
| `series/villabotijos-today/assets/intro/intro_video-script_NN.md` | Video instance | `villabotijos-today/intro` |
| `series/innteresante/assets/intro/intro_video-script_NN.md` | Video instance | `innteresante/intro` |
| `kNNowledge/LC_programas_Tutorias_NN.md` | compact | `LC_programas_Tutorias` |

Two Videos with slug `intro` have distinct, stable ids. Their stems are equal and that is legal.

Moving `innteresante/intro` into `villabotijos-today` would make it `villabotijos-today/intro`. That collides, so `move_model` rejects it with `MODEL_EXISTS`.

**Rationale.**
- This is decision 5 literally.
- Compact ids keep the form that every existing `resolved_target` already carries, so no historical change log becomes unreadable.

**Alternatives rejected.**
- Path-based ids for everything. They leak the physical layout into every address and break on any folder rename.
- A UUID or other id stored in frontmatter. It is a second source of truth that drifts on move.
- Prefixing compact ids with a namespace. It churns every existing address for no gain, because the `DUPLICATE_MODEL_ID` check covers the rare stem/slug clash.

### A6. Element slug scoping and the duplicate-name drop

**Decision.**
- Element slugs stay unique **per model**, across all concepts (`parser/core.ts:26-53`, `knowledge-checks.ts`).
- The full element identity is `<model-id>@<slug>`, which is unique domain-wide by construction.
- Graph node ids become `<model-id>@<slug>`. `IdentityRegistry` keys on slug.
- Repeated element **names** are legal (display only). The name-keyed drop (`normalize.ts:252`) disappears.
- A repeated **slug** remains `DUPLICATE_SLUG` (error, document invalid).

**Rationale.**
- Names are display-only under decision 6.
- A slug-keyed graph matches the fold and `resolved_target`, which are already slug-keyed.

**Alternatives rejected.** Per-parent slug scoping (`@scene-1/presenter`). It needs element paths in the grammar, in fold keys, in matrix axes and in every consumer. The `00-gancho-presenter` prefix habit stays useful, but only inside one Video model.

### A7. Unified address grammar; title-based resolution removed

**Decision.** There is one grammar (section 6). It is used by:
- typed `reference` / `knowledge` field values
- change `target`
- `resolved_target`
- model citations in `evidence`
- `scope_elements[].parent` values
- MCP address arguments

Inside a model document, a same-model reference **must** be relative (`@<slug>`). An absolute self-reference is `ADDRESS_NOT_CANONICAL`, so internal references survive a move.

In a field that expects an element, an instance model id alone denotes its instance root (`villabotijos-today/intro` ≡ `villabotijos-today/intro@intro`). The canonical stored form is the short one.

**Removed:**
- `[[Title :: Name]]` (`QUALIFIED_REF_RE`, `parseQualifiedRef`, `collectQualifiedReferenceCandidates`)
- the title and filename ladders and separator normalization (`resolveTargetModel`)
- `titleToNodeIds`, `fileNameToNodeIds`, `nodeElementConcepts`, and the duplicate-title issue (`workspaceIndex.ts`)
- name fallback in typed references (`references.ts:81-115`)
- `[[title]]` parents in `scope/elements.ts`
- `MULTIVALUE_SYNTAX` (lists are the standard `[a, b]` field list)
- models cited by path (`kNNowledge/x_NN.md@...`) → `MODEL_CITED_BY_PATH`
- changesets cited by heading (`changes/x_changes_NN.md@## NN Change: c-09`) → `NN_DOCUMENT_CITED_BY_HEADING`

**Kept:** source citations (non-model files, including `_sidecar_NN.md` headings, CSV rows and JSON pointers).

**Rationale.**
- Decision 6 says one form and no second form. A typed `[[Name]]` is name-based addressing, so leaving it in place would keep a second form.
- The `[[Title :: Name]]` cost is near zero (F15). The typed `[[Name]]` corpus cost is bounded (8 samples plus fixtures) and is moved into a mechanical slice.
- The `@## NN Change:` form exists only as a generic markdown-heading citation (no parser of its own), and `lineage-as-changes` already bans `sources::` on L1 0-6-0+ documents.

**Alternatives rejected.**
- Cross-model only, keeping in-document `[[Name]]`. That is a second form.
- `[[<address>]]` brackets. They are delimiter noise inside typed fields, which already know their type.
- Rewriting prose wikilinks. That is out of scope (non-goals).

**Consequences.**
- One scope-chain scenario changes ("Parent given by a reference field": `[[Title of a1]]` → `@a1`). Chain semantics are unchanged (decision 2). This is listed as an explicit spec delta for maintainer acknowledgement (Q1).
- Cross-model references by title (`[[T :: N]]`) in the maintainer's domaiNNs fail until their migration.

### A8. Collection resolution: scan of declared placements

**Decision.**
- Collections come from the domain index built over discovery.
- `collection(C)` = the instance roots of C (if C is distributed) ∪ the elements of C in every model (if C is compact), ordered by id.
- Classification is by content:
  - A model that holds an element of a distributed concept C is an instance model of C.
  - Two distributed concepts in one model → `MIXED_INSTANCE_MODEL`.
  - Two or more elements of C, or C elements inside a model whose path matches no placement → `DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL`. This covers the double-storage registries.
  - A single C element at a path that does not match P_C → `PLACEMENT_MISMATCH` (expected folder shown).
  - A missing container instance → `CONTAINER_MISSING`.
- Compact-concept elements (for example a `Preset` inside a Video model) are legal in any model and join their concept's collection.

**Rationale.** Discovery already walks and parses every model. Collections are derived, so there is nothing to keep in sync.

**Alternatives rejected.** An anchor document listing instances. That is exactly the double storage being removed, and it needs sync and its own drift.

**Consequences.**
- Proposal question 3 is answered **no**: a distributed concept's container must itself be distributed, and a compact model may not hold elements of a distributed concept.
- Building the index needs each model's composed schema. An unresolvable bluepriNNt makes that model `MODEL_UNADDRESSABLE` (error). It gets no id, and tools refuse to address it. There is no fallback id.

### A9. `add_model` with placement, and its strict replay

**Decision.**
- `add_model` accepts `concept::` (today forbidden by `addModelProblems`).
- **Without `concept`**, or with a compact concept: the target is a plain id with no `/`. The file goes to `kNNowledge/<canonical-id>_NN.md`, as today.
- **With a distributed `concept`**:
  - The target must be a valid instance id. Its last segment is the slug. Its prefix must be an existing container id, or one created earlier in the same changeset (`ADD_MODEL_ORDER`).
  - Apply computes the path with `DomainIndex.placementFor(concept, id, blueprint)`.
  - It writes `<folder>/<slug>_<bp>_NN.md` with a skeleton that **includes the instance root element** (`## NN <Concept>: <name>`, `slug:: <slug>`). `name` is the title.
- `MODEL_EXISTS` keys on the id.
- `DOMAIN_LAYOUT_INVALID` applies only to the compact branch.
- The `modelIdAliases` / `canonicalizeTarget` stem aliasing applies only to compact targets.
- Strict replay (`provenance-strict.ts`) rebuilds the same skeleton through the **same** `scaffoldKnowledgeDocument({root})` call.

**Rationale.**
- One creation path, and replay is identical by construction.
- The root element is part of creation because the placement contract requires it (`INSTANCE_SLUG_MISMATCH`).

**Alternatives rejected.**
- A separate `add_instance` op. It duplicates the add_model checks.
- Creating the root with a following `add_element`. The model would be invalid between the two changes, and replay would need a special case.

### A10. `move_model`: rename or move of an instance; recorded-target migration by fold rekey

**Decision.** There is a new op, `move_model`:
- `target:: <old-id>` (an instance model)
- `to:: <new-id>`
- same concept

Apply:
1. **Checks**: `MOVE_REQUIRES_INSTANCE`, `MODEL_EXISTS` (new id taken), and `CONTAINER_MISSING`.
2. **Moves on disk**: renames the instance root folder (A2), which carries descendants and assets. Renames the file stem when the slug changes. Rewrites the root `slug::` when the slug changes. This is the only sanctioned slug change, because the instance slug *is* the id. All of it happens inside the existing atomic persistence and rollback (`apply-change.ts:1378-1420`).
3. **Versions**: bumps only the moved model if its body changed. Descendants are relocated without a version transition.
4. **Referrers**: rejects `MOVE_LEAVES_DANGLING_REFERENCES` unless every typed reference elsewhere that addresses `old-id` or `old-id/…` is retargeted by an `update_field` in the **same** changeset. `propose_changeset` runs the same check and returns the missing `update_field` changes as a ready-to-merge payload (the pattern of `lineage-as-changes` A9).

**Recorded targets are not rewritten** (F19). The fold handles them instead:
- `move_model` adds a `rekey(old → new, order)` event.
- Every live unit, element origin, tombstone and history entry keyed `old@…` or `old/…@…` re-keys to the new id from that order on. On a slug change, `old@old-slug…` maps to `new@new-slug…`.
- `ChangeLog.history(unit)` follows the identity chain, so pre-move history stays attached.
- `ChangeLog` gains `identities(id): readonly ModelId[]` (former ids, oldest first).
- `checkStaleTarget` (`changeset/history.ts`) maps through it.

`rename_element`'s asset-directory rename (F12) is **deleted**: slugs are immutable, so asset folders keyed by slug never move.

Changing a title is not a move. It stays `update_field …&title`, or `rename_element` on the root.

**Rationale.**
- Sealed changesets and write-once records forbid rewriting.
- A rekey event mirrors the existing relink event of `rename_element` (lineage A4), so the fold gains one rule.
- Proposal question 2 is answered: references are neither silently rewritten nor left broken. They must be retargeted, explicitly and atomically, so every edited unit has a record and no drift fires.

**Alternatives rejected.**
- Rewriting `resolved_target` in old changesets. It breaks the seal and write-once.
- Silently rewriting referrers at apply. Those would be unrecorded edits, which is drift.
- Reporting referrers as broken after the move. That leaves the domaiNN invalid between changesets.

**Failure point 2 is closed.** `checkProvenance` reports `MODEL_WITHOUT_FILE` for a touched model id with no file entry whose identity chain does not end in a live model. It is a warning in fold mode and an error in strict mode.

### A11. `extract_instance`: recorded compact-to-distributed migration

**Decision.** There is a new op, `extract_instance`:
- `target:: <compact-id>@<slug>` (an element of a concept that the instance's bluepriNNt declares distributed)
- `to:: <instance-id>`
- `blueprint_name` / `blueprint_url` as in `add_model`

Apply:
- creates the instance model at its placement with the extracted element as instance root
- moves the element's descendant elements (by `parentSlug`) into it
- removes them from the source model
- bumps both models

The fold records `rekey(compact-id@S → instance-id@S)` for the extracted slug set S, so no `UNIT_WITHOUT_RECORD` or `EDITED_WITHOUT_RECORD` fires on moved units.

Strict replay of an extracted instance:
1. replay the source model up to the extract change
2. cut subtree S into the skeleton
3. continue with the changes on the new id

`MODEL_EXISTS` applies when the instance already exists. That double-storage case is cleaned with `remove_element` on the registry, not with extraction.

**Rationale.**
- It is the tool the follow-up migration change needs.
- It reuses A9's skeleton and A10's rekey.

**Alternatives rejected.**
- `add_model` + `add_element` + `update_field` × N + `remove_element`. That re-records values as new origins and loses history.
- An unrecorded script. That fires drift (failure point 4).

### A12. Layout diagnostics in `check_domain`

**Decision.**
- The `check_domain` report replaces `collisions` (stem collisions; `model-collisions.ts`, `scope/stem-collision.ts` deleted) with `layout: { ok, diagnostics: LayoutDiagnostic[] }`.
- `validate_knowledge {workspace: true}` files layout diagnostics against the model they name.
- Every message names the path, the id (when there is one), and the expected value. The form is `<CODE>: <subject> — <what is wrong>; <fix>`.

| Code | Severity | Message shape |
|---|---|---|
| `PLACEMENT_MISMATCH` | error | `PLACEMENT_MISMATCH: series/x/videos/intro/intro_video-script_NN.md holds Video "intro" — Video instances live at series/x/assets/intro/; move the file there` |
| `INSTANCE_NAME_MISMATCH` / `INSTANCE_SLUG_MISMATCH` | error | expected file name / expected slug |
| `CONTAINER_MISSING` | error | names the container concept and the expected folder |
| `DUPLICATE_MODEL_ID` | error | `DUPLICATE_MODEL_ID: id "x" is carried by a.md, b.md — ids must be unique in a domaiNN` |
| `DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL` | error | names the concept, the element slugs and the instance ids they would have; fix: `extract_instance` or `remove_element` |
| `MIXED_INSTANCE_MODEL` | error | names both concepts |
| `MODEL_UNADDRESSABLE` | error | names the unresolvable bluepriNNt |
| `INSTANCE_SHADOWS_ELEMENT_ASSETS` | warning | names the folder both use |
| `BLUEPRINT_VERSION_SKEW` | error | see A14 |

`summaryOnly` caps `layout.diagnostics` at 25 and sets `layoutTruncated`.

**Rationale.** One report section per concern, matching `provenance`. Errors, because each one makes an address or a collection wrong.

**Alternative rejected.** Folding them into per-model `errors`. Skew and duplicates are domain-level facts with no single owner.

### A13. New key instead of extending `nature.structure`

**Decision.** `nature` (`schema/nature.ts`) is unchanged. Storage is the per-concept `storage::` of A1. The `changes-collection` spec is untouched.

**Rationale.**
- `nature` is per bluepriNNt and coupled to `ownership: authored | derived`.
- It drives console surfacing of core documents (`isConsoleModel`). Storage is per concept and about placement.
- Mixing them would make `members/authored` mean two things.

**Alternative rejected.** `nature.structure: members` with `ownership: authored`. Wrong granularity, and overloaded.

### A14. Version uniformity and `nn-upgrade`

**Decision.**
- `versionSkew(models)` (nn-core, pure, in the CJS mirror) groups every L3 model by `blueprintNameOf(parent_spec.name)` (lower-cased).
- A pin's version is its `_V_x-y-z` token. A bare name counts as the distinct value `unpinned`.
- A group with two or more distinct values → one `BLUEPRINT_VERSION_SKEW` error per bluepriNNt:
  ```
  BLUEPRINT_VERSION_SKEW: bluepriNNt "video-script" is pinned at 2 versions across 24 models: V_0-15-0 (20: <first 3 paths>…), unpinned (4: …) — a domaiNN uses one version per bluepriNNt; run nn-upgrade
  ```
  Structured `meta: { blueprint, versions: [{ version, count, paths (≤10) }] }`.
- Because a model pins one bluepriNNt as a whole, "one version per concept" means exactly "one version per bluepriNNt". The check covers compact models too.

`nn-upgrade` Flow B:
- B0 (nn-preflight `upgrade-check.js`) plans **per bluepriNNt group** using `versionSkew`.
- The `planHash` covers each group's member paths and current pins, so a model added after planning aborts the run.
- B4 repins every member of the group or none (the existing backup and restore).
- A skewed group's target is the adopted catalog version.

**Rationale.**
- This is decision 4 (option A).
- Severity is error because a collection spanning schemas breaks the layout-independence guarantee.

**Alternatives rejected.**
- A warning. Skew would persist silently, which is today's state (F7).
- Grouping by concept. A pin is per document, so the result would be the same with more machinery.

**Consequences.** Local bluepriNNts that compose a shared bluepriNNt at different versions are not compared (R7).

### A15. Tool and console impact

**Decision.**
- **`list_knowledge`** returns `{ id, path, version, blueprint, storage: 'compact' | {concept, container} }`, sorted by id, from the domain index.
- **`read_knowledge` and every id-taking tool** accept only ids.
- **`query_units`** keeps `path?filter` and adds a collection selector, `collection:<Concept>?filter[&projection]`. It runs `runQuery` over the member models' snapshots, and URIs are full addresses. This fixes failure point 6 (single-file only).
- **`resolve_effective` / `explain`**: no change (F8). The scope chain is path-based and orthogonal (decision 2).
- **`evaluateBatchDeleteImpact`** (`changeset/impact.ts`) keys models by `ModelId`, not `displayStem` (failure point 6).
- **Console**:
  - the payload `modelId` is the `ModelId` (replaces `normalizeModelId`)
  - cell provenance uses exact keys (F5)
  - a `collections` slot lists `collection(C)` members per concept
  - references render the target **title** and store the **address**
  - the reference editor is a title autocomplete over `collection(target_concepts)`: it shows `title — id` and inserts the address (relative when same-model)
  - validator messages show both title and address

**Rationale.** Every reader gets the same identity and collections from one module. Autocomplete keeps ids out of human typing (decision 6).

**Alternatives rejected.**
- A separate `list_collection` tool. `query_units` already carries filters and projection.
- Making `resolve_effective` id-based. It would mix placement with inheritance.

### A16. bluepriNNt versions

**Decision.**
- **`video-script`** → `blueprint_version: V_0-15-0`:
  - L1 pin `iNNfo_V_0-7-0`
  - `Series`: `storage:: distributed`, `placement:: "series/{slug}/"`
  - `Video`: `storage:: distributed`, `container:: Series`, `placement:: "{container}/assets/{slug}/"`
  - `Scene`, `Layer`, `Preset`, `Video Defaults` compact
  - Guidance: the Series instance model **is** the series scope document. It carries `scope: true`, and its root element's fields are the `series` cascade level (`fs-layers.ts` reads the first element). The engine already recognizes it by `scope: true`, not by file name (`series-root.test.mjs:4-7`).
  - Folder contract: `<s>_scope_NN.md` → `<s>_video-script_NN.md`, and `<slug>_video-script_<s>_NN.md` → `<slug>_video-script_NN.md`.
- **`changes`** → `V_0-7-0`: op options gain `move_model` and `extract_instance`; `add_model` allows `concept`.
- **`video`**: none (retired, F3).

**Rationale.** These declare the layout that already exists (exploration section 3.3) with the minimum rename.

**Alternative rejected.** A separate Series values document beside the instance model. Two files would carry the same series facts.

### A17. Prerequisite: the provenance ban gate

**Decision.** Replace the equality gate (F13) with an L1-version comparison: the ban applies when the pinned L1 is `V_0-6-0` **or later**. This lands first (S0).

**Rationale.** Without it, repinning `video-script` and `changes` to `V_0-7-0` disables the ban for them. That is a silent regression of `lineage-as-changes`.

**Alternative rejected.** Adding `V_0-7-0` to the regex. Every future L1 would repeat the bug.

## 5. Declaration surface (exact syntax)

`iNNfo/specs/bluepriNNts/video-script/spec_NN.md` (V_0-15-0, excerpt):

```markdown
## NN Concept Definition: Series
slug:: series
icon:: layers
type:: list
storage:: distributed
placement:: "series/{slug}/"

## NN Concept Definition: Video
slug:: video
icon:: clapperboard
type:: list
storage:: distributed
container:: Series
placement:: "{container}/assets/{slug}/"

## NN Concept Definition: Scene
slug:: scene
type:: list
```

`Scene` and `Layer` have no `storage` (compact). They are elements of the Video instance model (decision 1).

Resulting tree, with the ids from A5:

```
series/villabotijos-today/villabotijos-today_video-script_NN.md     scope: true; ## NN Series: Villabotijos Today (slug:: villabotijos-today)
series/villabotijos-today/assets/intro/intro_video-script_NN.md     scope_elements: [Video, Scene]; ## NN Video: Intro (slug:: intro)
  ## NN Scene: 00 Gancho                slug:: 00-gancho
  ### NN Layer: Gancho Presenter        slug:: 00-gancho-presenter
```

Addresses:
- `villabotijos-today/intro@00-gancho&voice` (a Scene field)
- `villabotijos-today/intro@00-gancho-presenter&asset` (a Layer field)
- `villabotijos-today/intro@00-gancho&#body` (narration)
- `villabotijos-today&voice_id` is invalid (no unit). The Series root field is `villabotijos-today@villabotijos-today&voice_id`.

**Compact example: `LC_programas` Tutorias.** The domain-local `tutorias` bluepriNNt declares no `storage` on `Programa`, `Tutor` or `Prestación de Servicios` (all compact). In `kNNowledge/LC_programas_Tutorias_NN.md` (id `LC_programas_Tutorias`):

```markdown
---
scope_elements:
  - concept: Programa
  - concept: "Prestación de Servicios"
    parent: programa_ref
---
## NN Programa: Programa Alfa
slug:: programa-alfa

## NN Prestación de Servicios: Pedido 001
slug:: pedido-001
programa_ref:: @programa-alfa
```

- Before: `programa_ref:: [[Programa Alfa]]` (F9).
- A per-project business model cites the program as `LC_programas_Tutorias@programa-alfa`.
- `collection(Programa)` = `LC_programas_Tutorias@programa-alfa`, `@programa-beta`.
- If a later change declares a project concept distributed with `placement:: "proyectos/{slug}/models/"`, the 7 files `proyectos/<x>/models/<x>_business_NN.md` become instance models with ids `<x>`, and the literal after `{slug}` is legal (A2).

## 6. Unified address grammar

```abnf
address      = model-id [ "@" unit ] / relative
relative     = "@" unit                         ; only inside a model document, same model
model-id     = head *( "/" slug )               ; head: compact stem or top-level instance slug
head         = 1*alnum *( ( "-" / "_" ) 1*alnum )
slug         = 1*lower-alnum *( "-" 1*lower-alnum )
unit         = element [ "&" ( field / "#body" ) ]
             / slug "&" slug "&" slug            ; matrix cell: matrix&row&col
             / "concept:" Name [ "&" field ]
             / "matrix:" slug
source-cit   = path "." ( "md" / "csv" / "json" ) [ "@" source-unit ]   ; non-model files only
```

**Parse rules**, in order (`address/parse.ts`):
1. Trim. Reject an empty value, a URL, an absolute path, `..`, or a line anchor.
2. If the part before the first `@` ends in `.md`, `.csv` or `.json`, it is a **source citation**, handled by the existing `sourceRef` branch. An `.md` whose role is `knowledge` → `MODEL_CITED_BY_PATH`. A role of `changeset` → `NN_DOCUMENT_CITED_BY_HEADING`.
3. Otherwise it is a **model address**. A leading `@` is relative (valid only where a containing model is known). Otherwise split on the first `@`, then the unit on `&`.
4. Two `&` parts after a slug make a cell. `#body` is a body unit.
5. Every segment is matched against the grammar above. Any mismatch → `ADDRESS_MALFORMED` with the offending segment.

**Formatting.** `formatAddress` is canonical and round-trips: `parse(format(parse(x))) == parse(x)`. `resolvedTarget.*` (`changeset/resolved-target.ts`) delegates to it. `canonicalUnitModelId` accepts `/`-separated ids.

**Resolution.** `DomainIndex.resolve(address, from?)` → `{model, element?, unit}` or one of:
- `REF_MODEL_NOT_FOUND`
- `REF_ELEMENT_NOT_FOUND`
- `REF_CONCEPT_MISMATCH` (warning, the existing check 3)
- `REF_BLUEPRINT_MISMATCH` (warning, the existing check 4)
- `ADDRESS_NOT_CANONICAL`

There is no ambiguity code: an id or slug is either unique or already a layout error.

**Editor.**
- Autocomplete input is the title text. Candidates are `collection(target_concepts)` filtered by title substring, shown as `title — address`.
- Selection inserts `formatAddress` (relative when the target is in the same model).
- Display resolves the stored address to the current title.

## 7. Change and lineage impact

| Topic | Design |
|---|---|
| Target parsing | `change-args.ts:parseTargetAddress` → `parseAddress`. `findKnowledgeFile` → `DomainIndex.byId` (one index per apply, built under the lock) |
| `add_model` | A9 |
| Rename/move | A10 (`move_model`, rekey, referrer requirement, asset-rename deletion) |
| Migration | A11 (`extract_instance`) |
| Per-file versions (failure point 5) | Unchanged by design: N instance models edited in one changeset give N `models` entries, each with its own `base_version`. `move_model` relocates descendants without transitions. `history.ts` keeps its 50-changeset window (R8) and maps identities |
| Drift (failure points 2, 4) | `MODEL_WITHOUT_FILE`. Rekey events make migration and move drift-free |
| Strict replay (failure point 1) | Instance skeleton via A9. The identity chain gathers changes recorded under former ids. Extraction is seeded per A11. The differential test (fold vs replay) gains move and extract cases |
| `query_units`, `list_knowledge`, `resolve_effective` | A15 |
| `produce_artifact` (failure point 7) | Unchanged: one record per artifact |
| Evidence | Model citations become addresses. `drift.ts:145` (`item.split('@')[0]` as a sha path) returns no sha for a model address, which is correct (models are not hashed evidence) |

## 8. Interfaces (nn-core, browser-safe)

```ts
// schema/storage.ts
export type StorageMode = 'compact' | 'distributed'
export type PlacementSegment =
  | { readonly kind: 'literal'; readonly value: string }
  | { readonly kind: 'slug' }
  | { readonly kind: 'container' }
export interface ConceptStorage {
  readonly mode: StorageMode
  readonly container?: string                       // distributed only
  readonly placement?: readonly PlacementSegment[]  // distributed only
}
// Concept gains: storage?: ConceptStorage

// address/index.ts
export type ModelId = string & { readonly __brand: 'ModelId' }
export type Unit =
  | { kind: 'element'; slug: string; field?: string }
  | { kind: 'body'; slug: string }
  | { kind: 'cell'; matrix: string; row: string; col: string }
  | { kind: 'concept'; concept: string; field?: string }
  | { kind: 'matrix'; matrix: string }
export type Address =
  | { kind: 'model'; model: ModelId }
  | { kind: 'unit'; model: ModelId | null; unit: Unit } // null = relative
export function parseAddress(input: string): Address | AddressError
export function formatAddress(a: Address): string

// domain/index.ts
export interface DomainModelInput {
  path: string                                   // domain-relative POSIX
  frontmatter: Record<string, unknown>
  elements: ReadonlyArray<{ concept: string; slug: string }>
}
export type StorageDeclarationsResolver =
  (parentSpec: { name: string; url?: string }) => ReadonlyMap<string, ConceptStorage> | null
export interface IndexedModel {
  id: ModelId; path: string; blueprint: { name: string; version: string | null }
  storage: { kind: 'compact' } | { kind: 'instance'; concept: string; container: ModelId | null; slug: string }
}
export interface DomainIndex {
  readonly models: readonly IndexedModel[]
  byId(id: string): IndexedModel | undefined
  byPath(path: string): IndexedModel | undefined
  resolve(address: string | Address, from?: ModelId): Resolution
  collection(concept: string): readonly CollectionMember[]
  placementFor(concept: string, id: string, blueprint: string): { folder: string; file: string } | LayoutDiagnostic
  readonly diagnostics: readonly LayoutDiagnostic[]
}
export function buildDomainIndex(models: readonly DomainModelInput[], declarations: StorageDeclarationsResolver): DomainIndex
export function versionSkew(models: readonly IndexedModel[]): LayoutDiagnostic[]

// changelog: ChangeLog gains identities(id: string): readonly string[]; fold handles move_model and extract_instance
```

MCP contracts:
- `check_domain` → `+ layout: { ok: boolean; diagnostics: LayoutDiagnostic[] }`; `collisions` removed.
- `list_knowledge` → items per A15.
- `query_units` → accepts `collection:<Concept>?…`.
- `propose_changeset` → may return `missing_referrer_updates: ChangeItem[]`.

## 9. File-level change plan

All paths were confirmed with Glob or Grep. C = create, M = modify, D = delete.

| Package / area | Files | Why |
|---|---|---|
| nn-core address | C `src/address/{index,parse,format}.ts`; M `src/sourceRef.ts` (model branch → address; `MODEL_ID` with `/`; path-cited models rejected), `src/changeset/resolved-target.ts`, `src/console/unit-address.ts`, `src/queryUnits.ts` | A7, section 6 |
| nn-core storage | C `src/schema/storage.ts`; M `src/schema/extract.ts`, `src/schema/compose.ts`, `src/schema/index.ts`, `src/types/index.ts` (`Concept.storage`) | A1, A2 |
| nn-core domain | C `src/domain/{index,classify,placement,skew}.ts`; M `src/helpers.ts` (listKnowledge → index), `src/workspace/discoverModels.ts`; D `src/scope/model-index.ts`, `src/scope/stem-collision.ts` (+ their `.spec.ts`) | A5, A8, A12, A14 |
| nn-core references | M `src/validator/workspaceReferences.ts` (address-based; title ladder deleted), `src/recursiveParser/workspaceIndex.ts` (title, filename and element-name maps deleted), `src/validator/references.ts` (name fallback deleted), `src/validator/content.ts`, `src/recursiveParser/knowledge.ts` (FR-005 note), `src/scope/elements.ts` (parent by address) | A7 |
| nn-core identity | M `src/identity.ts`, `src/recursiveParser/normalize.ts` (slug-keyed graph) | A6 |
| nn-core changes | M `src/changeset/{types,parser,serializer,history,impact,conflicts}.ts` (`move_model`, `extract_instance`, `add_model.concept`), `src/changelog/{fold,load,index,drift,units}.ts` (rekey, identities, `MODEL_WITHOUT_FILE`), `src/mutate.ts` (extract subtree), `src/scaffold/knowledge.ts` (root element) | A9-A11 |
| nn-core ban gate | M `src/validator/knowledge-checks.ts` | A17 |
| nn-core console | M `src/console/payload-builder.ts` (`modelId`, exact cell keys, collections slot) | A15 |
| nn-core exports | M `src/index.ts`, `src/browser.ts`, `src/trannsformPrimitives.ts` (CJS mirror: address, `versionSkew`) | consumers |
| nn-mcp | M `src/tools/{apply-change,change-args,spec,list-read,query-units,check-workspace,validate,propose-changeset,provenance-models,provenance-strict,read-lineage,resolve-sources,init-knowledge,mutate}.ts`, `src/server.ts`; D `src/tools/{model-collisions,model-id}.ts` | ids, layout, ops |
| L1 / L2 specs | C `iNNfo/specs/iNNfo_V_0-7-0_NN.md`; M `iNNfo/specs/bluepriNNts/{video-script,changes}/spec_NN.md`; M `iNNfo/specs/vocabulary.json`; M `manifest/source.yaml`; regenerated `src/schema/canonical-registry.ts` | A1, A3, A16 |
| Samples / fixtures | new sample versions for the 8 samples with typed `[[Name]]` (business ×3, documentation, projects, organization, metrics, procedures), old ones deleted (lineage A15 pattern); fixtures under `nn-core/tests/fixtures/**`, `test/fixtures/testlab/**`, `test/simulation/fixtures/**` | A7 |
| video engine | M `video-script/skills/nn-video-script/references/{folder-contract,series-template-convention,parameters}.md`, `scripts/{build-script-from-draft,finalize-video}.mjs`, `scripts/draft-template.html`, and the ~14 tests naming `_scope_NN` or `_video-script_<s>` | A16 |
| Skills / docs | M `skills/nn-innfo/SKILL.md`, `skills/nn-upgrade/SKILL.md`, `skills/nn-sources/{SKILL.md,citations.md}`, `skills/nn-preflight/scripts/upgrade-check.js`, `scripts/skill-shared-rules.md` + mirrors, `docs/documentation/content/vocabulary.md` | A3, A7, A14 |
| nn-sources (CJS) | M `impact-checker.js`, `gc.js`, `duplicate-guards.js` (model citations as addresses) | A7 |

## 10. Testing strategy (strict TDD)

The first failing test of each slice is written and seen red before any implementation:

| Slice | First red tests |
|---|---|
| S0 | `nn-core/tests/validator/knowledge-checks.test.ts`: "a document pinned to an L1 after V_0-6-0 still raises SOURCES_FIELD_BANNED" |
| S1a | C `nn-core/tests/address/parse.test.ts`: `villabotijos-today/intro@00-gancho&voice` → unit address with model `villabotijos-today/intro`; `@programa-alfa` relative; `kNNowledge/x_NN.md@## A` → `MODEL_CITED_BY_PATH`; property round-trip `parse∘format` over generated addresses |
| S1b | `tests/changeset/facts.test.ts`: `resolvedTarget.field('a/b','s','f') === 'a/b@s&f'`; `parseCitation` keeps sidecar heading citations |
| S2a | C `tests/schema/storage.test.ts`: placement grammar table (`{container}` not first, two `{slug}`, `..`, `kNNowledge`); `PLACEMENT_OVERLAP`; `CONTAINER_CYCLE`; inheritance through composition |
| S2b | C `tests/domain/index.test.ts`: two series × video `intro` → ids `villabotijos-today/intro`, `innteresante/intro`; adding a file leaves other ids unchanged; each A12 code |
| S3a | `nn-mcp/src/tools/list-read.spec.ts`: no path-form ids; `MODEL_ADDRESSED_BY_PATH` |
| S3b | `tests/workspaceReferences.test.ts`: `[[T :: N]]` is `ADDRESS_MALFORMED`; cross-model address resolves; absolute self-reference → `ADDRESS_NOT_CANONICAL`; `scope/elements.spec.ts`: `parent` by `@slug` |
| S3c | `tests/recursive-parser.test.ts`: two elements with the same name and distinct slugs are both in the graph |
| S4a | `check-workspace.spec.ts`: `layout.diagnostics` carries `BLUEPRINT_VERSION_SKEW` with meta for a two-version fixture; `collisions` absent |
| S4b | `skills/nn-preflight/scripts/upgrade-check.test.js`: the plan groups by bluepriNNt; a member added after planning changes `planHash` |
| S5a | `query-units.spec.ts`: `collection:Video?status=published` across two instance models and one compact model returns the same URI set shape |
| S5b | `tests/console-payload*.test.ts`: `modelId` is the hierarchical id; a cell key from another model with the same suffix is not matched |
| S6a | `apply-change-facts.spec.ts`: `add_model {concept: Video, target: villabotijos-today/intro}` writes `series/villabotijos-today/assets/intro/intro_video-script_NN.md`; `provenance-strict` replay is clean |
| S6b | `tests/changelog/fold.test.ts`: rekey keeps history under the new id; `apply-change` move with an unretargeted referrer → `MOVE_LEAVES_DANGLING_REFERENCES` |
| S6c | `tests/changelog/drift.test.ts`: `MODEL_WITHOUT_FILE`; the fold/replay differential with move |
| S6d | fold: extract yields no `UNIT_WITHOUT_RECORD`; strict replay seeds from the source |
| S7 | `scripts/*.test.mjs` gate: live code contains no `QUALIFIED_REF_RE`, `titleToNodeIds`, `AMBIGUOUS_MODEL_ID` or `findStemCollisions`; `verify.js --release` in a detached worktree |

Run preflight tests with empty `HOME` and `USERPROFILE`. Rebuild nn-core before trusting red nn-mcp tests.

## 11. Migration, rollout and the `lineage-as-changes` ordering

- **Ordering.** `lineage-as-changes` is merged (F1). This change rebases on `dev` at or after `81837577`. Real overlaps:
  1. `resolved_target` model part (lineage A6) becomes a `ModelId`, through `formatAddress`.
  2. The fold gains rekey next to relink (lineage A4).
  3. Strict replay gains the instance skeleton and identity chain (lineage A3).
  4. Evidence model citations follow the grammar. Source citations are unchanged.
  5. The ban gate (A17).

  The unified grammar owns syntax. `changelog/` owns semantics.
- **Release.** One release event at the tracker tip:
  - new `iNNfo_V_0-7-0`
  - `video-script` V_0-15-0 and `changes` V_0-7-0
  - re-issued samples
  - `manifest/source.yaml` version bumps
  - a `templates-v*` tag and `channels.stable.refs` repin
  - a detached-worktree rehearsal of `validate-manifest --channel stable`
  - a merge commit, not a squash

  The `lineage-as-changes` tag is still pending. If it has not been cut by then, both changes ship in one tag, with the maintainer's go.
- **Data.** No existing domaiNN is migrated. `video_NN` and `LC_programas` fail validation on this release (accepted, proposal question 4). `extract_instance` and `move_model` are the tools for the follow-up migration change.

## 12. Slicing (feature-branch-chain, ≤400 changed lines each, excluding generated and mechanical files)

| PR | Slice | Content | Est. LOC | Depends on |
|---|---|---|---|---|
| 1 | S0 | Ban gate ≥ V_0-6-0 | ~60 | — |
| 2 | S1a | `address/` parse/format (unwired) | ~350 | 1 |
| 3 | S1b | Wire into sourceRef, resolved-target, change-args; model-by-path citations rejected | ~380 | 2 |
| 4 | S2a | `schema/storage.ts`, extract/compose, `iNNfo_V_0-7-0_NN.md` (new spec file excluded; diff vs V_0-6-0 stated) | ~350 | 3 |
| 5 | S2b | `domain/` index: classify, placement, ids, diagnostics, skew | ~400 | 4 |
| 6 | S3a | Node adapter; replace id producers; delete model-index / stem-collision / model-collisions | ~380 | 5 |
| 7 | S3b | References: delete title resolution; relative refs; scope_elements parent | ~400 | 6 |
| 8 | S3c | Slug-keyed graph identity | ~250 | 7 |
| 9 | S4a | `check_domain.layout` | ~350 | 6 |
| 10 | S4b | nn-upgrade / nn-preflight grouped plan | ~350 | 9 |
| 11 | S5a | Collections + `query_units` selector + `list_knowledge` | ~300 | 6 |
| 12 | S5b | Console: modelId, exact cell keys, collections, title autocomplete | ~400 | 11 |
| 13 | S6a | `add_model` with placement + replay skeleton | ~380 | 6 |
| 14 | S6b | Rekey + `move_model` + referrer check + asset-rename deletion | ~400 | 13 |
| 15 | S6c | `MODEL_WITHOUT_FILE`, identity-chain replay, history/impact keyed by id | ~350 | 14 |
| 16 | S6d | `extract_instance` | ~400 | 15 |
| 17 | S7a | `changes` V_0-7-0, `video-script` V_0-15-0, video engine docs and tests | ~400 | 16 |
| 18 | S7b | Corpus: new samples, fixtures (mechanical, excluded) | ~100 + corpora | 17 |
| 19 | S7c | vocabulary, skills, shared rules, mirrors, docs, gate test | ~400 | 18 |
| 20 | S7d | Release commit (maintainer stop) | ~60 + generated | 19 |

S4 and S5 can run in parallel with S6 after PR 6, but the chain is linear for review.

- Chained PRs recommended: Yes (feature-branch-chain)
- 400-line budget risk: High
- Decision needed before apply: Yes

## 13. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Removing in-document `[[Name]]` (A7) widens the corpus cost beyond the proposal's explicit list | Isolated in S7b. Maintainer acknowledgement Q2 |
| R2 | The scope-chain scenario change (A7) touches a spec the proposal says is unchanged | Semantics unchanged. Explicit delta, Q1 |
| R3 | `MODEL_UNADDRESSABLE` when the spec cache is cold or offline | Core bluepriNNts are in the embedded registry. Domain-local bluepriNNts are files. The diagnostic names the bluepriNNt |
| R4 | A folder rename during `move_model` on Windows with open handles | Inside the existing atomic persistence and rollback. A test with a locked file asserts rollback |
| R5 | Fold rekey and strict replay diverge | The differential test gains move and extract sequences |
| R6 | Video placement shares `assets/` with the Series model's element assets | `INSTANCE_SHADOWS_ELEMENT_ASSETS` warning. Revisit in the migration change |
| R7 | Skew between local bluepriNNts composing a shared one at different versions is undetected | Documented limitation; a follow-up if composition exposes provenance |
| R8 | `history.ts` scans only the newest 50 changesets, so a stale `base_version` older than that window is missed (pre-existing) | Out of scope; recorded |
| R9 | Many chained PRs (20) | The feature-branch-chain discipline proven by `lineage-as-changes`. Each slice is green on `verify:fast` |

## 14. Open questions (need maintainer acknowledgement before apply, not blocking design)

- [ ] Q1. Accept the narrow scope-chain spec delta (`parent` references become `@slug`) as consistent with decision 2?
- [ ] Q2. Confirm that decision 6 covers in-document typed references (`[[Name]]` → `@slug`), with the S7b corpus cost.
- [ ] Q3. Is cutting the pending `lineage-as-changes` tag together with this release acceptable?
