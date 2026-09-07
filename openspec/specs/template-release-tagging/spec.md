# Template Release Tagging & Remote Immutability

## Purpose

Establish a standardized Git release tagging convention for template packages and meta-specifications (`templates-v<version>`, `v<version>`), construct immutable tag-pinned remote URLs for template resolution, and enforce end-to-end upstream traceability across the specification hierarchy from instance models (Level 3) through templates (Level 2), meta-specifications (Level 1), and the foundational ontology (Level 0).

## Requirements

### Requirement: Standardized Git Release Tag Naming Convention

Template package releases and specification releases MUST use standardized Git tags to identify immutable release snapshots:
- Template package releases MUST use the tag pattern `templates-v<version>` (e.g. `templates-v0.3.0`, `templates-v1.0.0`), where `<version>` conforms to Semantic Versioning (SemVer 2.0.0).
- Core framework and Level 1 (`iNNfo`) / Level 0 (`defiNNe`) meta-specification releases MUST use the tag pattern `v<version>` (e.g. `v0.2.0`, `v1.0.0`).
- Release tags MUST NOT omit the prefix or use ambiguous floating aliases (e.g. `latest`, `dev`).

#### Scenario: Creating a valid template package release tag
- GIVEN a template package version `0.3.0` ready for release
- WHEN a Git release tag is published for the templates
- THEN the tag name MUST be `templates-v0.3.0`
- AND it points to an immutable commit snapshot containing the canonical template assets

#### Scenario: Creating a valid core meta-spec release tag
- GIVEN a core framework / meta-spec release for version `0.2.0`
- WHEN a Git release tag is published
- THEN the tag name MUST be `v0.2.0`
- AND it points to an immutable commit snapshot of the framework specifications

#### Scenario: Rejecting invalid or floating release tags
- GIVEN a release attempt using tag `latest` or `templates-v` without a semver string
- WHEN release validation checks the tag format
- THEN the tag is rejected as non-conforming

---

### Requirement: Tag-Pinned Remote Spec URL Construction and Immutability

Remote references to templates and meta-specifications in stable manifests, models, and configurations SHOULD use tag-pinned URLs rather than branch-pinned URLs (such as `main`). The URL structure MUST follow:
`https://raw.githubusercontent.com/<org>/<repo>/<tag>/<path>`

Once published, the content at a tag URL MUST be immutable. Stable-channel consumers resolving templates MUST NOT resolve against mutable branch refs such as `main`.

#### Scenario: Tag-pinned URL construction for remote template resolution
- GIVEN the `workspace` template at version `0.3.0` published under tag `templates-v0.3.0` in this repository
- WHEN the remote URL is generated or resolved for the stable channel
- THEN the URL pins to `.../templates-v0.3.0/iNNfo/specs/templates/workspace_spec_NN.md`
- AND it does not target the mutable `main` branch

#### Scenario: Immutability of tag-pinned template assets
- GIVEN a workspace has hydrated the `workspace` package from tag `templates-v0.3.0`
- WHEN later template edits are merged into `main` without cutting a new release tag
- THEN existing tag-pinned references keep resolving the byte-identical assets of `templates-v0.3.0`

---

### Requirement: End-to-End Upstream Traceability across the Spec Hierarchy

Every Level 3 (L3) model instance, Level 2 (L2) template specification, and Level 1 (L1) meta-spec MUST maintain verifiable upstream provenance references:
- L3 instance models MUST reference their parent L2 template (via `parent_spec` plus, for the stable channel, a tag-pinned URL).
- L2 template packages MUST declare their upstream L1 framework dependency, pinned to an immutable `v<version>` tag for stable releases.
- L1 meta-specifications MUST reference the foundational L0 ontology (`defiNNe`), pinned to an immutable `v<version>` tag for stable releases.

The resolution and validation engine MUST be able to traverse this upstream chain (L3 → L2 → L1 → L0) to verify schema conformance and provenance integrity.

#### Scenario: Full upstream provenance chain validation
- GIVEN an L3 model referencing L2 template `business` at tag `templates-v0.3.0`
- AND the L2 template declares conformance to L1 `iNNfo` at tag `v0.2.0`
- AND L1 `iNNfo` declares derivation from L0 `defiNNe` at tag `v0.1.0`
- WHEN provenance validation traverses the upstream reference chain
- THEN every reference resolves to an immutable tag
- AND the lineage from L3 to L0 is validated as coherent and reproducible

#### Scenario: Detecting an unpinned upstream link in a stable lineage
- GIVEN an L2 template referencing an L1 meta-spec via a mutable branch URL (`.../main/...`) in a stable release
- WHEN upstream traceability verification runs
- THEN a validation warning or error identifies the unpinned upstream link
