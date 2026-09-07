# Template Release Tagging & Remote Immutability

## Purpose

Establish a standardized Git release tagging convention for template packages and meta-specifications (`templates-v<version>`, `v<version>`), construct immutable tag-pinned remote URLs for template resolution, and enforce end-to-end upstream traceability across the specification hierarchy from instance models (Level 3) through templates (Level 2), meta-specifications (Level 1), and foundational ontologies (Level 0).

## Requirements

### Requirement: Standardized Git Release Tag Naming Convention

Template package releases and specification releases MUST use standardized Git tags to identify immutable release snapshots:
- Template package releases MUST use the tag pattern `templates-v<version>` (e.g., `templates-v0.3.0`, `templates-v1.0.0`), where `<version>` conforms to Semantic Versioning (SemVer 2.0.0).
- Core framework and Level 1 (`iNNfo`) / Level 0 (`defiNNe`) meta-specification releases MUST use the tag pattern `v<version>` (e.g., `v0.2.0`, `v1.0.0`).
- Tags created for template releases MUST NOT omit the prefix or use ambiguous floating aliases (e.g., `latest`, `dev`).

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

Remote references to templates and meta-specifications in manifests, models, and configurations MUST use tag-pinned URLs instead of branch-pinned URLs (such as `main`). The URL structure MUST follow:
`https://raw.githubusercontent.com/<org>/<repo>/<tag>/<path>`

Once published, the referenced content at the tag URL MUST be immutable. Downstream consumers resolving templates MUST NOT resolve against mutable branch refs like `main` in production or stable channels.

#### Scenario: Tag-pinned URL construction for remote template resolution
- GIVEN a template named `workspace` at version `0.3.0` published under tag `templates-v0.3.0` in repository `cogNNitive/iNNfo`
- WHEN the remote URL is generated or resolved
- THEN the URL is `https://raw.githubusercontent.com/cogNNitive/iNNfo/templates-v0.3.0/specs/templates/workspace/spec_NN.md`
- AND it pins explicitly to tag `templates-v0.3.0` rather than `main`

#### Scenario: Preventing mutable branch references in stable configurations
- GIVEN a manifest or model declaration referencing `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/workspace/spec_NN.md`
- WHEN release integrity or coherence verification runs on stable manifests
- THEN the URL is flagged as non-conforming because it targets mutable branch `main` instead of an immutable release tag

#### Scenario: Immutability of tag-pinned template assets
- GIVEN a workspace has hydrated template package `workspace` from tag `templates-v0.3.0`
- WHEN subsequent template modifications are merged into `main` without creating a new release tag
- THEN existing tag-pinned references continue resolving the exact byte-identical assets associated with `templates-v0.3.0`

---

### Requirement: End-to-End Upstream Traceability across Spec Hierarchy

Every Level 3 (L3) model instance, Level 2 (L2) template specification, and Level 1 (L1) meta-spec MUST maintain unbroken, verifiable upstream provenance references:
- L3 instance models MUST reference their parent L2 template via tag-pinned URLs or tag-pinned spec declarations (`parent_spec:: .../templates-v<version>/...` or `template_version: <version>`).
- L2 template packages MUST declare their upstream L1 framework / meta-specification dependency pinned to an immutable `v<version>` tag.
- L1 meta-specifications MUST reference the foundational L0 ontology (`defiNNe`) pinned to an immutable `v<version>` tag.

The resolution and validation engine MUST be capable of traversing this upstream chain (L3 -> L2 -> L1 -> L0) to verify schema conformance and provenance integrity.

#### Scenario: Full upstream provenance chain validation
- GIVEN an L3 model file referencing L2 template `business` at tag `templates-v0.3.0`
- AND the L2 template declares conformance to L1 `iNNfo` at tag `v0.2.0`
- AND L1 `iNNfo` declares derivation from L0 `defiNNe` at tag `v0.1.0`
- WHEN provenance validation traverses the upstream reference chain
- THEN all references resolve to immutable tags
- AND the entire lineage from L3 to L0 is validated as coherent and reproducible

#### Scenario: Detecting broken or unpinned upstream link in lineage
- GIVEN an L2 template referencing an L1 meta-spec via a mutable branch URL (`.../main/...`)
- WHEN upstream traceability verification runs
- THEN a validation warning or error is emitted identifying the unpinned upstream link
