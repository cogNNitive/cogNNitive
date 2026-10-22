# Specifications

The cogNNitive ecosystem defines four specification levels. Each level builds on the one below it.

## Level 0 — Meta-specification

The root of the chain. Defines structure, versioning (SemVer), and RFC 2119 key words for the entire ecosystem.

Every spec artifact under `specs/` is immutable and filename-encoded — there is no
mutable "latest" alias. A version bump always creates a new file; the table below
lists the current file for each spec.

| Spec | Source |
|------|--------|
| **defiNNition** V 0.1.0 | [`specs/defiNNition_V_0-1-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/defiNNition_V_0-1-0_NN.md) |
| defiNNe V 0.1.0 | Superseded — frozen predecessor (`specs/defiNNe_V_0-1-0_NN.md`) |

## Level 1 — Central specification

The **iNNfo** specification (and the meta-bluepriNNt). Every kNNowledge document is a single `_NN.md` file with optional structural children — concepts, elements, and fields. There are three root primitives: Concept, Element, and Field. The former `Marker` primitive was removed in `iNNfo_V_0-5-0` (rejected with `MARKERS_REMOVED`): flag markers became values of the built-in `tags` Field, valued markers became normal Fields, and matrix scales/cycles live on `# NN Matrix Definition`.

The `status` frontmatter field on a spec file uses the `defiNNition` vocabulary
`Draft | Stable | Deprecated`. `iNNfo_V_0-5-0` is the current L1 (published as `status: "Draft"`; `iNNfo_V_0-3-0` is the latest version published as `Stable`).
The **current** version is the highest published spec in `specs/`, not a mutation of older spec files:
every earlier `iNNfo_V_*_NN.md` file is immutable and keeps whatever
`status` it was published with; they are simply no longer the default, and stay
resolvable forever for kNNowledge authored against them.

| Spec | Role | Source |
|------|------|--------|
| **iNNfo** V 0.5.0 | Current (`Marker` removed) | [`specs/iNNfo_V_0-5-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md) |
| iNNfo V 0.4.0 | Superseded — frozen, still resolvable | [`specs/iNNfo_V_0-4-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-4-0_NN.md) |
| iNNfo V 0.3.0 | Superseded — frozen, still resolvable (`status: "Stable"`) | [`specs/iNNfo_V_0-3-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-3-0_NN.md) |
| iNNfo V 0.2.2 | Superseded — frozen, still resolvable | [`specs/iNNfo_V_0-2-2_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-2-2_NN.md) |
| iNNfo V 0.2.1 | Superseded — frozen, still resolvable | [`specs/iNNfo_V_0-2-1_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md) |
| iNNfo V 0.2.0 | Superseded — frozen, still resolvable | [`specs/iNNfo_V_0-2-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md) |
| iNNfo V 0.1.0 | Superseded — frozen, still resolvable | [`specs/iNNfo_V_0-1-0_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/iNNfo_V_0-1-0_NN.md) |

## Level 2 — bluepriNNts

Domain-specific bluepriNNts. Each declares concepts, fields, matrices, and relationship types for a specific domain, and its own `blueprint_version` (independent of `spec_version`, which tracks L1 compliance). The authoritative list is [`catalog.json`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/catalog.json); the table below mirrors the current adopted version of each active bluepriNNt. `business` is a composite that `includes` `business-model` + `analysis`.

| bluepriNNt | `blueprint_version` | Source |
|----------|--------------------|--------|
| **Analysis** | V_0-4-0 | [`specs/bluepriNNts/analysis/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/analysis/spec_NN.md) |
| **Artifacts** | V_0-5-0 | [`specs/bluepriNNts/artifacts/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/artifacts/spec_NN.md) |
| **Blank** | V_0-4-0 | [`specs/bluepriNNts/blank/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/blank/spec_NN.md) |
| **Business** (composite) | V_0-5-0 | [`specs/bluepriNNts/business/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/business/spec_NN.md) |
| **Business Model** | V_0-4-0 | [`specs/bluepriNNts/business-model/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/business-model/spec_NN.md) |
| **Changes** | V_0-5-2 | [`specs/bluepriNNts/changes/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md) |
| **Design Presets** | V_0-4-0 | [`specs/bluepriNNts/design-presets/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/design-presets/spec_NN.md) |
| **Documentation** | V_0-4-0 | [`specs/bluepriNNts/documentation/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/documentation/spec_NN.md) |
| **domaiNN** | V_0-4-0 | [`specs/bluepriNNts/domaiNN/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md) |
| **Innovation** | V_0-4-0 | [`specs/bluepriNNts/innovation/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/innovation/spec_NN.md) |
| **Metrics** | V_0-5-0 | [`specs/bluepriNNts/metrics/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/metrics/spec_NN.md) |
| **Organization** | V_0-4-0 | [`specs/bluepriNNts/organization/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/organization/spec_NN.md) |
| **Procedures** | V_0-5-0 | [`specs/bluepriNNts/procedures/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md) |
| **Projects** | V_0-4-0 | [`specs/bluepriNNts/projects/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/projects/spec_NN.md) |
| **Repository** | V_0-3-0 | [`specs/bluepriNNts/repository/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/repository/spec_NN.md) |
| **Sidecar** | V_0-1-1 | [`specs/bluepriNNts/sidecar/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/sidecar/spec_NN.md) |
| **Sources** | V_0-3-0 | [`specs/bluepriNNts/sources/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/sources/spec_NN.md) |
| **Video Script** | V_0-2-2 | [`specs/bluepriNNts/video-script/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/video-script/spec_NN.md) |
| **Visual Catalog** | V_0-3-0 | [`specs/bluepriNNts/visual-catalog/spec_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md) |

The legacy `cogNNitive` (V_0-5-0) and `workspace` (V_0-9-0) entries remain in the catalog as **frozen** records only; they are not active bluepriNNts. Each bluepriNNt's earlier versions stay frozen and resolvable for kNNowledge still pinned to them.

## Level 3 — Sample kNNowledge

Concrete data instances. Lightweight — just data and a parent pointer to their bluepriNNt. L3 documents carry `knowledge_version` in frontmatter and `type:: knowledge` for kNNowledge references. Each sample stays pinned to the bluepriNNt version it was authored against and remains valid after later adoptions. Samples live under `specs/bluepriNNts/<name>/samples/`; some older sample files still carry a version token in the filename, which is a legacy convention — the frontmatter `knowledge_version` is authoritative.

| kNNowledge | bluepriNNt | Source |
|-------|----------|--------|
| **Ghostbusters** | business | [`specs/bluepriNNts/business/samples/Ghostbusters_V_0-5-0_business_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/business/samples/Ghostbusters_V_0-5-0_business_NN.md) |
| **Ghostbusters** | business-model | [`specs/bluepriNNts/business-model/samples/Ghostbusters_V_0-4-0_business-model_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/business-model/samples/Ghostbusters_V_0-4-0_business-model_NN.md) |
| **Ghostbusters** | analysis | [`specs/bluepriNNts/analysis/samples/Ghostbusters_V_0-4-0_analysis_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/analysis/samples/Ghostbusters_V_0-4-0_analysis_NN.md) |
| **Ghostbusters** | innovation | [`specs/bluepriNNts/innovation/samples/Ghostbusters_V_0-4-0_innovation_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/innovation/samples/Ghostbusters_V_0-4-0_innovation_NN.md) |
| **Ghostbusters** | organization | [`specs/bluepriNNts/organization/samples/Ghostbusters_V_0-4-0_organization_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/organization/samples/Ghostbusters_V_0-4-0_organization_NN.md) |
| **Ghostbusters** | procedures | [`specs/bluepriNNts/procedures/samples/Ghostbusters_V_0-5-0_procedures_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/procedures/samples/Ghostbusters_V_0-5-0_procedures_NN.md) |
| **Ghostbusters** | projects | [`specs/bluepriNNts/projects/samples/Ghostbusters_V_0-4-0_projects_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/projects/samples/Ghostbusters_V_0-4-0_projects_NN.md) |
| **Ghostbusters** | metrics | [`specs/bluepriNNts/metrics/samples/Ghostbusters_V_0-5-0_metrics_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/metrics/samples/Ghostbusters_V_0-5-0_metrics_NN.md) |
| **Ghostbusters** | repository | [`specs/bluepriNNts/repository/samples/Ghostbusters_V_0-3-0_repository_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/repository/samples/Ghostbusters_V_0-3-0_repository_NN.md) |
| **Ghostbusters** | design-presets | [`specs/bluepriNNts/design-presets/samples/Ghostbusters_V_0-4-0_design-presets_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/design-presets/samples/Ghostbusters_V_0-4-0_design-presets_NN.md) |
| **Ghostbusters** | documentation | [`specs/bluepriNNts/documentation/samples/Ghostbusters_V_0-4-0_documentation_NN.md`](https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/specs/bluepriNNts/documentation/samples/Ghostbusters_V_0-4-0_documentation_NN.md) |

## Traceability & change propagation

The format spec (L0 `defiNNition` → L1 `iNNfo` → L2 bluepriNNts) is consumed by every other
part of the project. What reads it, and how a change flows through:

| Consumer | How it reads the spec | Source |
|---|---|---|
| `@cognnitive/nn-core` | Parses the parent chain, extracts bluepriNNt schema, validates kNNowledge (`validateKnowledge`, `validateBlueprint`) | `iNNfo/packages/nn-core/src/` |
| `nn-mcp` (MCP server) | Wraps core. Resolves local tiers first, then the OS temp cache, then network `fetch`, then the built-in canonical fallback registry; fetched specs are cached in the OS temp directory unless `in_place: true` | `iNNfo/packages/nn-mcp/src/tools/spec.ts`, `resolver-node.ts` |
| Domain console (UI) | Reads the schema and kNNowledge embedded by `export-console.mjs` at generation time | `scripts/export-console.mjs`, `iNNfo/specs/bluepriNNts/console/` |
| Skills (`skills/nn-innfo`) | Delegates all resolution/validation to `nn-mcp` | `skills/nn-innfo/` |
| Bootstrap manifest | Pins skills and bluepriNNts by `repo` + `path` + `version` + `commit`; CI validates | `docs/use/manifest.md` |
| Docs | Describe the resolver protocol and level system | `docs/innfo/documentation/ecosystem.md`, this page |

### Invariants

- **Immutable, filename-encoded.** Every file under `specs/` carries its version in the
  filename (or, for bluepriNNt `spec_NN.md` files, in frontmatter and the catalog). A bump
  always creates a new version record; a published version is never edited in place
  or deleted while kNNowledge still references it (`spec-versioning` R-SV-01/R-SV-02).
- **Single source of the version string.** The spec file itself (frontmatter `spec_version`
  and `blueprint_version`); no code file hardcodes it elsewhere.
- **`parent_spec.url` pins a versioned location** — never a mutable alias (R-SV-08).
- **Write-once persistence is the whole integrity guarantee** — nothing is silently
  replaced, so there is nothing to hash-verify (`spec-resolution` R-LSR-02).

### When a format spec changes

The canonical detection tool is `scripts/check-spec-version.mjs`
(`npm run check:spec-version` / `check:spec-urls`).

1. **New file.** Author `specs/…_V_x-y-z_NN.md` (SemVer per `defiNNition` §7). The old file stays.
2. **Engine.** Update `nn-core` (parser / schema / validator) and its fixtures.
   `nn-mcp` inherits core; rebuild the bundle.
3. **Version constant.** Update the default iNNfo version constant in `nn-core`.
4. **Sweep stale references.**
   `node scripts/check-spec-version.mjs --version <old> --check --by-type --with-skills`
   lists every doc, sample, test, fixture and skill file still on the old version — update each.
5. **URLs.** `npm run check:spec-urls` must stay green (also gated in CI, job `spec-integrity`).
6. **bluepriNNts.** Each L2 bluepriNNt must be compliant with the new L1. BluepriNNts that only
   exist at the old version must get a new-version record before the L1 can be made the default.
7. **Skills.** Sync any bundled copy under `skills/` from the canonical file here. Bump
   `version` + `commit` in the bootstrap manifest (`docs/use/manifest.md`).
8. **Docs.** Update this page's tables and `ecosystem.md`.
9. **Existing L3 kNNowledge is not migrated.** It keeps resolving its old, immutable parent
   until an author repoints `parent_spec.url`. No silent fallbacks.

> **V_0-3-0 → V_0-5-0 history.** `iNNfo_V_0-3-0` replaced `type:: model` with
> `type:: knowledge` for kNNowledge references and renamed L3 `model_version` to
> `knowledge_version`. `iNNfo_V_0-5-0` removed the `Marker` root primitive
> (`MARKERS_REMOVED`; `set_marker` now fails with `UNKNOWN_OPERATION`). The retired
> frontmatter-block forms `concepts:` / `markers:` / `matrices:` were removed back in
> `V_0-2-0` in favour of body-element definitions. Existing L3 kNNowledge pinned to older
> bluepriNNt versions keeps resolving unchanged.

## Related Standards

### Open Knowledge Format (OKF)

cogNNitive takes **conceptual inspiration** from [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md), the Open Knowledge Format by Google Cloud Platform, and its architecture is aligned with several of OKF's ideas (Markdown + YAML frontmatter, a directory of documents as a knowledge unit, progressive disclosure through an index). It is **not natively OKF-compliant**, and this page does not claim formal conformance. 100% OKF compatibility is planned for the future through a dedicated export mechanism.

See the [Ecosystem page](ecosystem?id=open-knowledge-format-alignment) for the conceptual mapping and known gaps.
