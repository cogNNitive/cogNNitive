# Exploration: Spec Foundation Hardening

Turning the iNNfo/defiNNe specs into solid reference specs. This document captures
the current-state analysis, cross-checked against the real parser/validator code,
and the proposed direction for each axis. It is a living document — later phases
will refine it.

Sources cross-checked:
- `specs/latest/level0/defiNNe_NN.md`, `specs/latest/level1/iNNfo_NN.md`
- `specs/latest/level2/{business,procedures}/*_NN.md`
- `packages/innfo-core/src/{types,identity,recursiveParser}.ts`
- `packages/innfo-core/src/parser/{taxonomy,core,graph}.ts`
- `packages/innfo-core/src/validator/{content,model}.ts`
- `docs/antigravityanalysis.md`, `docs/spec_consolidation.md`

---

## 1. Entity taxonomy & glossary (the root problem)

The spec names three entities (Concept / Element / Field) but the vocabulary is
scattered, and the code collapses them into a single `ModelNode` with a
`kind: 'root' | 'concept' | 'element'` discriminator (`types.ts:335`). `Field` is
not a first-class entity in code — it is a `Record<string, FieldValue>`.

Synonym drift observed for the same entity:

| Canonical entity | Synonyms found in specs | Code term |
|---|---|---|
| Concept | concept, concept block, section, type, group | `kind: 'concept'` |
| Element | element, instance, element node, index-block instance | `kind: 'element'` |
| Field | field, property, YAML key | `Record<string, FieldValue>` |

### Proposed model: a containment spine + cross-cutting entities

Two axes, not one flat list. The user's instinct (workspace → model → concept →
element → field) is the **containment spine**; the rest are **cross-cutting**.

**Containment spine (generic → concrete):**

1. **Workspace** — a directory with an `index.md`; contains Models.
2. **Model** — one level-3 document conforming to a Template; contains Concepts and Elements.
3. **Concept** — a named type declared by the Template; groups Elements of one kind.
4. **Element** — a single instance of a Concept.
5. **Field** — a typed key-value property on an Element (schema declared on the Concept).

**Cross-cutting entities (annotate or connect the spine):**

6. **Marker** — a named evaluative dimension (weight, certainty, priority) scored per Element/Concept.
7. **Relationship** — a typed connection between Elements. Subtypes = **Relationship Types**: `hierarchy`, `evaluable_matrix`, `graph_edge`, `sequence`.
8. **Matrix** — the tabular *representation* of certain Relationship Types (syntax, not a distinct semantic entity).

**Definitional layer (the specs themselves):**

9. **Specification** — defiNNe (L0), iNNfo (L1). **Template** — L2. **Model** — L3.

### Terminology governance (banned synonyms)

- "Node" / "ModelNode" is an **implementation term** only (the normalized runtime
  graph representation). It MUST NOT appear in normative spec text. The spec speaks
  Concept/Element/Field; the code's `ModelNode.kind` already maps to concept/element.
- Banned in normative text: "block", "section", "instance", "item", "node",
  "property", "attribute" as substitutes for the canonical terms above.

### The `Elements` / `markers` pseudo-concepts (point 4.5)

`docs/antigravityanalysis.md:44-47` already flags this: matrix declarations use
`source: "elements"` / `target: "markers"` as magic strings that are NOT declared
concepts. The parser hardcodes them (`core.ts:72` special-cases `item-markers matrix`).

**Decision (confirmed):** `Concepts`, `Elements`, and `Markers` are **reserved
built-in pseudo-concepts**. `Concepts` = the set of all Concepts in the Model;
`Elements` = the set of all Elements across every Concept; `Markers` = the set of
all declared Markers. These names are RESERVED — a Template MUST NOT declare a
Concept with one of these names. Documenting them turns today's hardcoded hack
(`core.ts` special-casing `elements`/`markers`) into spec-sanctioned behavior and
gives cross-cutting actions (e.g. an all-concepts or all-elements matrix) a defined
target.

---

## 2. Matrices — investigation results (point 2.4)

Verified against `types.ts:48`, `parser/core.ts`, `parser/graph.ts`.

- `RelationshipType = 'hierarchy' | 'evaluable_matrix' | 'graph_edge' | 'sequence'`.
- **There is no "metamatrix".** No occurrence in code or specs. The reserved-name
  matrix the user was remembering is the **marker matrix**.
- Three matrix behaviors exist in code:
  1. **Evaluable matrix** (a.k.a. "Relational Matrix" in prose — naming to unify):
     normal source/target/params matrix declared in the template.
  2. **`item-markers matrix`** — RESERVED name (`core.ts:72`). Assigns Marker scores
     to Elements. This is the marker matrix; `source: "elements"`, `target: "markers"`.
  3. **Hierarchy matrix** — matrices named `{src}-{tgt} hierarchy matrix`
     (`graph.ts:13,53`; also matches Spanish `jerarqu`). `X` cells create parent→child.

### Index vs hierarchy matrix — overlap (user's redundancy question)

Confirmed partial redundancy. `graph.ts:12` builds the tree from **both** the
`# _NN index` taxonomy **and** hierarchy matrices. They are not identical:

- **Index** = single-parent tree (each child one parent). Also defines display order.
- **Hierarchy matrix** = N-to-M (a child can have multiple parents).

Neither business nor procedures templates use hierarchy matrices (procedures sets
`hierarchy.enabled: false`). **Decision (confirmed): the Hierarchy Matrix is
removed.** The `# _NN index` taxonomy is the single, canonical hierarchy mechanism.
The spec drops the hierarchy-matrix concept; `graph.ts` hierarchy-matrix handling
(`{src}-{tgt} hierarchy matrix` / `jerarqu`) becomes dead code to retire in a
follow-up. Net effect: one hierarchy mechanism, no overlap.

---

## 3. Identity & naming (point 5) — deep analysis

### Current state (verified)

- **Model identity** = filename minus `_NN.md` (`recursiveParser.ts:18`,
  `deriveModelName`). The filename ALSO encodes template + version
  (`Ghostbusters_V_0-1-2_business_NN.md`). There is **no logical "model name"**
  decoupled from the physical filename.
- **Element/Concept identity** = the NAME text, derived from **multiple sources**:
  - Element: the `* _NN Concept: Name` marker (`el.name`).
  - Concept: the `# _NN Concept` heading AND the index reference (`[[Name]]` / `_NN index: Name`).
  - Legacy FOLDER mode: folder / `_F.md` filename.
  - Optional `slug`: from element YAML `slug` or derived from name.
- **Uniqueness** is only enforced among **siblings** (`identity.ts`). Collisions get
  a silent `#2` suffix appended to the qualifiedId — not model-unique, not workspace-unique.
- **qualifiedId** = ancestor name path `Model/Concept/Element`, built from names, so
  any rename breaks it and every reference to it.

This is why renaming is fragile and why name derivation feels inconsistent: there is
no single source of truth and no stable identifier independent of the name.

### How other tools solve it

- **Dendron**: stable opaque `id` (23-char) in frontmatter; every field except `id`
  is mutable; hierarchy from dotted filename; a **refactor command** updates all
  references. → stable id + mutable name + refactor tooling.
- **Obsidian**: filename IS the identity; no id; rename works ONLY in-app (updates
  links by text); external rename breaks all links. Has alias/display-text separation.
- **Notion**: opaque block IDs; name is a mutable property (robust but unreadable).
- **Wikipedia/wikis**: the title is the unique key within a namespace; rename = "move"
  that leaves a redirect; single unique title enforced.

iNNfo today is Obsidian-shaped (name = identity, fragile). The user prefers the
Wikipedia model (one unique name per model).

### Proposed identity model (name as single source of truth) — confirmed

**The name is the single source of truth. No persisted slug or opaque id in the
model file.** Rationale: iNNfo's core values are Git-diffable, self-describing,
human-readable plain Markdown. A mandatory opaque id (Notion-style) fights all
three, and a *derived* slug provides no rename safety anyway (it changes with the
name). Robustness lives in the application, not in duplicated data.

**Uniqueness (confirmed):**
- Element name MUST be unique within the **whole Model** — across all Concepts, not
  just within one Concept. If a name repeats, the app MUST NOT save it; it prompts
  the user to disambiguate (e.g. qualify with the Concept or a number).
- Concept name MUST be unique within the Model.
- Model name MUST be unique within the Workspace; the app detects duplicates on
  workspace load and emits a warning/error.
- Today's silent sibling `#2` suffix (`identity.ts`) becomes a validation ERROR.

**Model name decoupling:** the logical model name is frontmatter `title`, NOT the
filename. The filename stays as the physical artifact (version + template for the
resolver). The app MAY warn on mismatch between filename and `title`.

**Qualified path is runtime-only.** The workspace-qualified id
(`code-review-process/roles/developer`, or `Model::Concept::Name`) is built ON THE
FLY by the app for the workspace in which the model is opened. It is NEVER persisted
in the model file, so the same file stays portable across workspaces.

**Slug is a derived function, not data.** When a URL/anchor/filename-safe form is
needed, the app computes `slugify(name)` with a fixed convention (see below). It is
never stored and never a source of truth.

**Single-source-of-truth rule per entity name:**
- Model name ← frontmatter `title` (NOT filename).
- Concept name ← the `# _NN Concept` heading (canonical); index references MUST match.
- Element name ← the `* _NN Concept: Name` marker (canonical); index/matrix refs MUST match by name.

### Slug convention (derived, app-level)

Normalize name → slug with a github-slugger-style convention: lowercase; trim;
collapse whitespace and `_` to `-`; strip punctuation; collapse repeated `-`; on
in-document collision append `-1`, `-2`. Unicode decision (OPEN): keep Unicode
(github-slugger keeps `你好`, `привет`) OR transliterate diacritics via NFKD
(`é`→`e`, `ñ`→`n`, as `slugify`/`slug` do). Since names are already unique per Model,
collision suffixes should be rare — a collision usually signals a name that should be
disambiguated at the name level instead.

### Rename — references that break and must move atomically

A rename of an Element/Concept/Model must update, in one transaction:
- The declaring heading/marker.
- Index/taxonomy entries.
- Every matrix row/column label referencing it.
- `reference`-typed field values (`target_concepts` / element refs) in other elements.
- Graph edges (frontmatter `graph_edges`).
- Cross-model references (workspace index links, cross-file relationships).
- The qualifiedId path and any cached/derived ids.

**Recommendation (confirmed):** rename is an application operation, name-based, and
MUST be transactional — find every reference to the old name and rewrite them
atomically, then re-validate. A **reference-integrity validator** (detecting dangling
references) is the safety net for references introduced outside the app (manual
edits, git merges) — the residual weakness of a name-only model, accepted
deliberately in favor of clean, duplication-free files. No slug/id anchor is stored.

---

## 3a. Worked naming example (hybrid model)

Scenario — Workspace `acme-org/` with `index.md` linking two models, both built on
the `procedures` template:

- File `CodeReviewProcess_V_1-0-0_procedures_NN.md` → `title: "Code Review Process"`, `slug: code-review-process`
- File `Onboarding_V_1-0-0_procedures_NN.md` → `title: "Onboarding"`, `slug: onboarding`

Model name is the frontmatter `title`/`slug`, NOT the filename (the filename keeps
version + template only for the resolver).

Inside "Code Review Process":

| Concept | Elements (name → slug) |
|---|---|
| Work | Open PR → `open-pr`, Review → `review`, Merge → `merge` |
| Roles | Developer → `developer`, Reviewer → `reviewer` |
| Artifact | PR Notes → `pr-notes` |

### Reference forms (generic → specific)

| Form | Example | Resolves when |
|---|---|---|
| Bare name | `Reviewer` | unique within the Model |
| Concept-qualified | `Work::Review` | disambiguates same name across concepts |
| Model-qualified | `Code Review Process::Reviewer` | cross-model, workspace scope |
| Fully-qualified | `Code Review Process::Roles::Developer` | always unambiguous |
| Qualified path (runtime) | `code-review-process/roles/developer` | app builds it per workspace; never stored in the file |

### Conflict cases

1. **Same name, different concepts, same model** (hypothetical: an author tries to
   add `Artifact::Review` while `Work::Review` exists) — **NOT allowed.** Element
   names MUST be unique within the whole Model; the app refuses to save the duplicate
   and prompts to disambiguate (e.g. rename to `Review Report`). Bare `Review`
   therefore always resolves — no cross-concept ambiguity ever exists.
2. **Same name across models** — both models have `Developer`. Fine per model; at
   workspace scope reference as `Code Review Process::Developer` /
   `Onboarding::Developer`. Model name is unique in the Workspace (the namespace key).
3. **True duplicate (today's silent `#2`)** — two Elements named `Review` under the
   SAME `Work`. Today: silent `Work/Review` + `Work/Review#2`. Proposed: validation
   **ERROR** — author must rename one.

### Rename walkthrough

Rename Element `Open PR` → `Create Pull Request` in Work. A matrix references it:

```
| Work \ Roles | Reviewer |
| Open PR      | Responsible |
```

The app performs a **transactional, name-based rename**:
1. Find every reference to `Open PR`: the `* _NN Work: Open PR` marker, the index
   entry, every matrix row/column labeled `Open PR`, `reference`-typed field values,
   graph edges, and cross-model references.
2. Rewrite them all to `Create Pull Request` atomically, then re-validate.

Residual risk: a reference added by hand or via a git merge outside the app. The
**reference-integrity validator** flags those as dangling references. Nothing is
stored to make this safer — the file stays clean; robustness is in the operation.
The runtime qualified path (`code-review-process/work/create-pull-request`) is
re-derived by the app after the rename; nothing about it is persisted.

---

## 4. Additional issues found proactively (beyond the user's list)

P1. **Model index parser ignores the "preferred" Markdown-link syntax.** iNNfo §4.2
    calls `[Name](./path.md)` "preferred" for index blocks, but `parseIndexBlock`
    (`taxonomy.ts`) only matches `[[wikilink]]` and `_NN index:`. Markdown links in a
    model index are silently dropped. Spec-vs-code contradiction.

P2. **`_NN` vs `_F` / FOLDER mode — code already removed it, spec hasn't caught up.**
    Verified: `parser/core.ts` warns and `validator/{content,model}.ts` REJECT with an
    error ("FOLDER mode is removed in V_0-1-3", FR-007; tests cover it). But the
    published spec (v0.1.0) never mentions the removal, and vestigial remnants
    contradict the validator: the app still ships a `mode: 'FOLDER'` KB starter
    (`apps/innfo-editor/src/views/HomeView.vue`) that would be rejected, and the MCP
    still probes `_F.md` candidates (`packages/innfo-mcp/src/tools/{list-read,spec}.ts`).
    **Decision (confirmed): the spec formally removes FOLDER mode / `_F`; only `_NN`
    + single-file models on an `index.md` workspace remain.** Cleanup: remove the
    FOLDER KB starter, the MCP `_F.md` probing, and the vestigial `mode: 'FOLDER'`
    type in `helpers.ts`. No functional risk — the core already rejects FOLDER.

P3. **Inconsistent diagnostic policy.** Numbered lists as elements are silently
    ignored; unresolvable index refs "SHOULD be flagged"; sibling collisions get a
    silent `#2`. Three different failure behaviors. Define one diagnostic policy
    (error / warning / silent) and apply it uniformly.

P4. **`type` field has two meanings.** On a Concept, `type` = structural type
    (`text`/`list`/`sequence`...). In §5.1.2 OKF frontmatter, `type` = the Concept
    NAME ("Topic"). Same key, different semantics.

P5. **Matrix `params` is an undocumented stringly-typed DSL.**
    `params: "Responsible;Accountable;Consulted;Informed"` — semicolon-delimited, no
    schema, not bound to `MatrixDecl.widgetType`. Needs a defined grammar.

P6. **Version sprawl / manual sync.** `models/specs/` and `specs/v0.1.0/level1/` each
    hold iNNfo_V_0-1-0 AND V_0-1-1; `latest/` is "manually synced" (INDEX.md admits
    it). Already caused stale versions inside Examples. (User decision: move old
    versions to an `archived/` folder, keep only latest live.)

P7. **`specification_url` is overloaded.** For L0-L2 it points to the document itself;
    for L3 models defiNNe §5.4 says it points to the level-1 spec (a different doc).
    Same field, two meanings.

P8. **Mutation invariants are NOT in the shared core — UI and MCP will drift.**
    Both the app and the MCP share `@cognnitive/innfo-core` for `parseModel` /
    `serializeModel` / `validateModel` — good foundation. But the *mutation* engine
    (`applyChange` in `packages/innfo-mcp/src/tools/mutate.ts`) lives in the MCP, and
    the Vue app edits through its own store/component logic (it does NOT import
    `applyChange`). So identity/uniqueness/rename rules are implemented twice and can
    diverge. Verified gaps in the MCP path today:
    - `add_element` / `rename_element` enforce uniqueness **per concept only**, not
      per whole Model (our decided rule).
    - `rename_element` updates name + slug + `nodeMarkers`, but does NOT propagate to
      matrix row/column labels, `reference`-typed fields, graph edges, or cross-model
      references — it is not the transactional rename we specified.
    - `rename_concept` updates frontmatter + elements + taxonomy + rawSections, but
      not matrix declarations/sections that reference the concept.
    **Direction:** the identity/uniqueness/rename invariants MUST be implemented once,
    in `innfo-core`, as the single enforcement engine. The UI and the MCP become thin
    clients that call it. Only then is "the AI agent obeys the same rules as the UI"
    structurally guaranteed instead of hoped for. (Manual hand-edits stay the user's
    responsibility, but the reference-integrity validator surfaces the breakage on
    load rather than corrupting silently.)

P9. **Assets: three conflicting storage conventions + declared/discovered duplication.**
    The core resolver (`recursiveParser.ts` `resolveElementAssets`), the UI scanner
    (`useMediaScanner.ts`), and the markdown editor (`MarkdownFieldEditor.vue`) each use
    a DIFFERENT path convention for centralized assets (`assets/{file}` vs
    `assets/{slug}_{file}` vs a 3-way fallback), so a path resolved by the core is not
    found by the scanner. Separately, file-fields are handled two ways: declared
    (schema + YAML value → path) and discovered (scan the folder for any file).
    **Decision:** a single storage convention `{modelDir}/assets/{element-slug}/{filename}`;
    the `asset_mode` field and per-element-at-root storage are removed; one path function
    in `innfo-core` is shared by resolver, scanner, and editor; declared fields are typed,
    undeclared files under the element folder are attachments; rename relocates the
    element's asset folder. This consolidates the FOLDER-mode file-field capability into
    the single FILE model (it does NOT reinstate FOLDER *mode* / model-as-directory-tree).

---

## 5. Decisions already made by the user

- 2.1 — `_FORMAT.md` is deprecated. Only `_NN.md` exists. Remove all `_FORMAT`
  references from specs and align naming convention to `_NN.md`.
- 2.2 — Level-3 frontmatter: `model_version`/`title` at top level (fix iNNfo §2
  indentation bug so it matches defiNNe §5.4 and the templates).
- 2.3 — Unify `relationship_types` / `relationship_declarations` → **Relationship Types**.
- 2.4 — No stale versions live; move superseded versions to an `archived/` folder.
- 3 — Fix spec↔code divergences; prefer NOT numbering sections (use stable heading
  names instead of `§N`, which drift).
- 4.1 — Fix section ordering (`## Versioning` must not precede the required summary).
- 4.2 — `Summary` must be a short sentence, distinct from `Description`; generate
  proper Summary/Description for the templates.
- 4.3 — The `Work` fields (`step_type`, `next`, `condition`, `input`, `output`,
  `output_status`, `tool`) belong to `Work` only, not to other concepts.
- 4.5 — Formalize `Concepts`, `Elements`, and `Markers` as reserved pseudo-concepts.
- Hierarchy Matrix removed — the index is the only hierarchy mechanism.
- Identity: the **name is the single source of truth**. No persisted slug/id in the
  model file. Element name unique within the whole Model; Model name unique within
  the Workspace. Slug is a derived, app-level function (never stored). Rename is a
  transactional app operation + a reference-integrity validator as safety net.
- Model logical name = frontmatter `title`; the workspace-qualified path is a runtime
  construct, never persisted (keeps the model portable across workspaces).
- No persisted content hash in the format. Manual-edit / corruption detection relies
  on Git (already tracks every change) + the reference-integrity validator, which
  surfaces broken references with human-friendly diagnostics regardless of who edited.
  A hash would fight Git-diffability (noise on every edit), duplicate Git, and answer
  "was it touched?" instead of the actionable "is it valid?".
- FOLDER mode / `_F` formally removed in the spec (code already rejects it — P2).
  Only `_NN` + single-file models on an `index.md` workspace remain.
- Model index block syntax: `[[wikilink]]` is canonical. Drop the spec's "Markdown
  link preferred" claim for model index blocks. The workspace root `index.md` keeps
  Markdown links for OKF conformance (§5.1.1). `_NN index:` retired as a redundant alias.
- Matrix `params` → structured YAML array `values: [...]` (renamed from `params` for
  self-descriptiveness), with an OPTIONAL `widget` only when the cell interaction
  cannot be inferred from the values. Drops the undocumented `;`-delimited DSL. This
  is the most compliant, spirit-aligned form: native YAML, human-readable,
  Git-diffable, validatable, no custom string parsing, no over-engineering.
- Assets: one storage convention `{modelDir}/assets/{element-slug}/{filename}`. The
  `asset_mode` field and per-element-at-root storage are removed. File-backed fields
  (`markdown_file`, `image`, `file`, `video`, `audio`) share one path function in
  `innfo-core` used by resolver, scanner, and editor. Undeclared files under an element's
  asset folder are attachments, not typed fields. Rename relocates the element's asset
  folder. FOLDER *mode* (model-as-directory-tree) stays removed; only the file-field
  capability is consolidated into the FILE model.
- Guidance stays INLINE in each template (Option A); the companion-file split is
  rejected. Verified: the app parses guidance ONCE and caches it in `metamodelStore`
  (`documentation.value`), so subsequent access is an O(1) lookup — no runtime cost
  (disk/memory/compute are non-issues for plain text). Inline keeps templates
  self-describing (a core iNNfo value). business's rich guidance stays intact;
  procedures' placeholder guidance is cleaned. Field-level placeholder entries are
  removed — a Field lives in its Concept's `fields` schema, not as a guidance entry.
- 6 — Spec linter (11 checks) deferred to a later change.

## 6. Open questions for the design phase

1. Taxonomy shape: confirm the two-axis model (containment spine + cross-cutting).
2. Identity: model-level unique names + optional stable slug — is opaque `id` also
   wanted, or is slug enough?
3. Hierarchy matrix: keep for N-to-M only, or drop in favor of the index alone?
4. Rename tooling: in-scope for this change or a follow-up?
5. `_F`/FOLDER mode: deprecate now or keep supported?
