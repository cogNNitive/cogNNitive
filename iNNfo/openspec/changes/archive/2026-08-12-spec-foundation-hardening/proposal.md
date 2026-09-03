# Proposal: Spec Foundation Hardening

**Status:** Registered (planning only — NOT implemented yet).
This change records the agreed direction to turn the iNNfo/defiNNe specifications
into solid reference specs. No spec files or code are modified by this change yet;
implementation is staged for a follow-up. Full analysis in `exploration.md`.

## Intent
Make the iNNfo/defiNNe specs internally consistent and authoritative: one canonical
entity taxonomy/glossary, a name-based identity & rename model with single-point
enforcement, unified terminology, and removal of spec-vs-spec and spec-vs-code
divergences.

## Decisions (agreed)

### Taxonomy & glossary
- **Containment spine (generic → concrete):** Workspace → Model → Concept → Element → Field.
- **Cross-cutting entities:** Marker; Relationship (types: `hierarchy`,
  `evaluable_matrix`, `graph_edge`, `sequence`); Matrix (the tabular *representation*
  of certain relationship types, not a separate semantic entity).
- **Definitional layer:** Specification (defiNNe L0, iNNfo L1), Template (L2), Model (L3).
- **"Node" is an implementation-only term** (the runtime graph). Banned in normative
  text, along with block / section / instance / item / property / attribute as
  substitutes for the canonical terms.
- **Reserved pseudo-concepts:** `Concepts`, `Elements`, `Markers` — reserved names a
  Template MUST NOT declare; they denote "all concepts / all elements / all markers"
  for cross-cutting actions (formalizes today's hardcoded `elements`/`markers` magic).

### Identity & rename
- **The name is the single source of truth.** No persisted slug or opaque id in the
  model file (a derived slug adds no rename safety; an opaque id fights the format's
  Git-diffable / human-readable / self-describing values).
- **Uniqueness:** Element name unique within the **whole Model**; Concept name unique
  within the Model; Model name unique within the Workspace. Collisions are a
  validation **ERROR** — the silent `#2` sibling suffix is removed.
- **Model logical name = frontmatter `title`**, decoupled from the filename (which
  keeps version + template only for the resolver). App MAY warn on filename/`title` mismatch.
- **Qualified path is runtime-only** (`Model::Concept::Name` / slugged path) — built
  on the fly per workspace, never persisted, so models stay portable across workspaces.
- **Slug is a derived function** (`slugify(name)`, github-slugger-style), never stored.
- **Rename = transactional application operation:** find and rewrite every reference
  (marker, index, matrix labels, `reference` fields, graph edges, cross-model refs)
  atomically, then re-validate. A **reference-integrity validator** surfaces dangling
  references (manual edits, git merges) with human-friendly diagnostics.
- **No content hash in the format** — Git already tracks changes; the validator
  answers the actionable "is it valid?" instead of "was it touched?".

### Enforcement architecture
- Identity/uniqueness/rename invariants are implemented **once, in `innfo-core`**, as
  the single enforcement engine. The app UI and the MCP become thin clients that call
  it — so "the AI agent obeys the same rules as the UI" is structurally guaranteed
  (today mutation logic is duplicated between the MCP `applyChange` and the Vue app —
  see `exploration.md` P8).

### Format & terminology fixes
- `_FORMAT.md` deprecated → **`_NN.md` only** everywhere.
- **FOLDER mode / `_F` formally removed** (the core already rejects it via FR-007;
  the spec must say so, and vestigial remnants get cleaned: the app KB starter, the
  MCP `_F.md` probing, the `helpers.ts` `mode: 'FOLDER'` type).
- L3 frontmatter: `model_version`/`title` at **top level** (fix the iNNfo indentation
  bug so it matches defiNNe and the templates).
- `relationship_types` / `relationship_declarations` → unified as **Relationship Types**.
- **Hierarchy Matrix removed** — the `# _NN index` taxonomy is the only hierarchy
  mechanism. Retire the `graph.ts` hierarchy-matrix handling in the follow-up.
- Matrices: document reserved names (`item-markers matrix`); unify "Relational" /
  "evaluable" naming; replace `params: "a;b;c"` with **`values: [a, b, c]`** (YAML
  array) + an OPTIONAL `widget` only when interaction can't be inferred from values.
- Model index block: **`[[wikilink]]` canonical**; drop the "Markdown link preferred"
  claim; retire `_NN index:`. Workspace root `index.md` keeps Markdown links (OKF).
- Replace `§N` section references with **stable heading-name references** (they drift).
- Fix required-section ordering (`## Versioning` must not precede the summary).
- `Summary` must be a short sentence, **distinct from `Description`**; regenerate the
  template Summary/Description.
- Scope the `Work` fields (`step_type`, `next`, `condition`, `input`, `output`,
  `output_status`, `tool`) to `Work` only in the guidance docs.

### Proposed defaults (flag if you disagree)
- **P3 — diagnostic policy:** ERROR for structural violations (duplicates, dangling
  refs), WARNING for recoverable issues, nothing silent.
- **P4 — `type` double meaning:** rename the Concept's structural `type` (e.g.
  `concept_type`/`kind`); keep element-frontmatter `type` as the OKF concept-name
  (do not break OKF conformance).
- **P7 — `specification_url` overload:** give L3 models a dedicated own-URL field and
  leave the parent chain to resolve the spec, instead of overloading one field.

## Scope

### In scope (this change)
- Register this proposal and the exploration analysis as SDD planning artifacts.

### Staged (follow-up implementation — NOT in this change)
- Rewrite defiNNe / iNNfo / templates per the decisions above (new spec version).
- Move superseded spec versions into an `archived/` location; keep only latest live.
- Clean vestigial FOLDER/`_F` remnants in the app and MCP.
- Refactor identity/uniqueness/rename enforcement into `innfo-core`; make UI + MCP thin clients.
- Reference-integrity validator + transactional rename operation.
- Spec linter (the 11 automated checks) — deferred (user point 6).

## Affected Areas (when implemented)

| Area | Impact | Description |
|------|--------|-------------|
| `specs/latest/level0/defiNNe_NN.md` | Modified | Naming, section refs, taxonomy anchor |
| `specs/latest/level1/iNNfo_NN.md` | Modified | Frontmatter fix, Relationship Types, ordering, reserved pseudo-concepts, index syntax, FOLDER removal |
| `specs/latest/level2/{business,procedures}/*_NN.md` | Modified | Terminology, Summary/Description, `values`, Work-field scoping |
| `specs/v0.1.0/**` → new version + `archived/` | Modified | Publish new version; freeze/relocate superseded |
| `packages/innfo-core/src/**` | Modified | Enforcement engine, validator, rename, retire hierarchy-matrix |
| `packages/innfo-mcp/src/**` | Modified | Thin client on core; remove `_F.md` probing |
| `apps/innfo-editor/src/**` | Modified | Thin client on core; remove FOLDER KB starter |

## Resolved Questions
1. **Version:** published as **`V_0-2-0`** (structural/semantic change).
2. **Slug Unicode:** **transliterate** diacritics via NFKD (`ñ`→`n`, `é`→`e`) →
   ASCII-safe slugs. App-level, derived, never persisted.
3. **P3 / P4 / P7 defaults: CONFIRMED** (diagnostic policy, `type` disambiguation,
   `specification_url` split).

## Success Criteria (for the implementation phase)
- [ ] One glossary section defines every entity; no banned synonym in normative text.
- [ ] Zero `_FORMAT.md` references; FOLDER/`_F` removed from spec and remnants cleaned.
- [ ] L3 frontmatter structure consistent across defiNNe, iNNfo, templates.
- [ ] One term ("Relationship Types"); Hierarchy Matrix gone; matrices use `values: [...]`.
- [ ] Name-based identity + model-wide uniqueness enforced; silent `#2` removed.
- [ ] Identity/rename enforcement lives once in `innfo-core`; UI + MCP call it.
- [ ] No `§N` references; stable heading names instead.
- [ ] Templates have short, distinct Summary and Description; Work fields scoped to Work.
- [ ] No stale versions in Examples; superseded specs under `archived/`.
