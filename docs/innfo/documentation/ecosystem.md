# Ecosystem Architecture

The cogNNitive ecosystem is organized in four specification levels.

## Level 0: defiNNition

The meta-specification. Defines the structure, versioning conventions (SemVer with `V_MAJOR-MINOR-PATCH` format), RFC 2119 normative language, and the level/parent chain system. The root of the hierarchy.

## Level 1: iNNfo and the meta-bluepriNNt

The central specification (currently `iNNfo_V_0-5-0`). Every kNNowledge document is a single `_NN.md` file containing concepts, elements, and fields, with optional structural children. There are three root primitives: **Concept**, **Element**, and **Field**. The former `Marker` primitive was removed in `iNNfo_V_0-5-0` — flag markers became values of the built-in `tags` Field, valued markers became ordinary Fields, and matrix scales/cycles live on `# NN Matrix Definition`. Documents that still declare markers are rejected with `MARKERS_REMOVED`.

## Level 2: bluepriNNts

Domain-specific bluepriNNts declare which concepts, fields, and relationship types apply. Each carries a `blueprint_version` and is listed in [`iNNfo/specs/bluepriNNts/catalog.json`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/catalog.json):

| bluepriNNt | Description |
|----------|-------------|
| business | Business strategy modeling |
| procedures | Workflows, SOPs, processes |
| organization | Organizational structure modeling |
| domaiNN | The container bluepriNNt for a domaiNN (`domaiNN_NN.md`) |
| sources, sidecar, artifacts, changes | Source ingestion, `_sidecar_NN.md` records, exported artifacts, and changesets |

See [Blueprints Overview](templates) for the full, current list with versions.

## Level 3: kNNowledge

Concrete instances of a bluepriNNt. Lightweight — just data and a `parent_spec` pointer to the bluepriNNt. Files are named `<Name>_<blueprint>_NN.md` and carry `knowledge_version` in their frontmatter (never a `_V_` token in the filename).

## Open Knowledge Format Alignment

cogNNitive takes **conceptual inspiration** from [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (Open Knowledge Format) by Google Cloud Platform, and its architecture is aligned with several of OKF's ideas. It is **not** natively OKF-compliant today: it does not claim formal OKF v0.1 conformance, and a domaiNN is not an OKF knowledge bundle as-is. Full OKF compatibility is planned for the future through a **dedicated export mechanism** that will translate a domaiNN into an OKF bundle.

### Conceptual alignment

| OKF idea | cogNNitive counterpart |
|---|---|
| Knowledge bundle | A directory of `_NN.md` documents — a domaiNN |
| Concept | A concept section within a `_NN.md` document |
| Frontmatter metadata | iNNfo frontmatter (`level`, `parent_spec`, `knowledge_version` / `blueprint_version`, `title`) |
| Body (Markdown) | Body (Markdown + `# NN` / `## NN` structural headings) |
| Cross-linking | Wikilinks (`[[target]]`) and standard Markdown links |
| `index.md` progressive disclosure | The `# NN kNNowledge` block inside `domaiNN_NN.md` |
| Citations | `@` locators resolved through sidecars and lineage |

### Known gaps

The formats differ in granularity (iNNfo documents hold many concepts and elements per file), in the `type` frontmatter convention, and in the absence of a literal `index.md`. These differences are exactly what the planned export mechanism is meant to bridge; until it exists, treat OKF as a design reference rather than a supported interchange format.

## Resolver Protocol

When a kNNowledge document is loaded, its `parent_spec` chain is resolved up to level 0. For each spec the resolver tries, in order:

1. The domaiNN's own local tiers (the domaiNN tree and project-local bluepriNNt directories)
2. `~/.agents/bluepriNNts/` and installed skill packages
3. The OS temp cache (`<tmpdir>/innfo-specs`, overridable with `INNFO_CACHE_DIR`)
4. The network, using the `parent_spec.url`; fetched specs are cached in the OS temp directory, and only written into the domaiNN's `specs/` folder when `in_place: true` is requested
5. The built-in canonical fallback registry

The default run therefore leaves no cache artifacts inside the domaiNN or repository tree. On version mismatch the spec is fetched again.
