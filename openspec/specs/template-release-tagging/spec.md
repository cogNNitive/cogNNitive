# Template Release Tagging & Remote Immutability

## Purpose

Establish a standardized Git release tagging convention for template packages and meta-specifications (`blueprints-v<version>`, `skills-v<version>`, `innfo-mcp-v<version>`, `innfo-console-v<version>`, `v<version>`), construct immutable tag-pinned remote URLs for template resolution in `cogNNitive/cogNNitive-web`, and enforce end-to-end upstream traceability across the specification hierarchy.

## Requirements

### Requirement: Standardized Git Release Tag Naming Convention

Releases of distributed artifacts MUST use annotated tags named `<key>-v<semver>` created in the monorepo, where `<key>` is one of `skills`, `blueprints`, `innfo-mcp`, `innfo-console` and `<semver>` conforms to Semantic Versioning `MAJOR.MINOR.PATCH` without prerelease suffixes. Template package releases MUST use the key `blueprints`. Each monorepo release tag MUST be mirrored with the same name in `cogNNitive-web` by the release workflow.

Historical `templates-v<version>` tags and `v<version>` meta-spec tags remain valid history and MUST NOT be deleted or moved. Tags with the `v<version>` shape (Level 1 `iNNfo` and Level 0 `defiNNe` meta-specifications) are outside the release workflow and MUST NOT start it. Release tags MUST NOT omit the prefix or use floating aliases (for example `latest`, `dev`).

New versions of each key MUST start above the highest version of that key already present in either repository, so that no tag name is reused for different content.

#### Scenario: Creating a valid release tag
- GIVEN a blueprints package version `0.20.0` ready for release
- WHEN the release tag is created in the monorepo
- THEN the tag name MUST be `blueprints-v0.20.0`
- AND it is annotated
- AND the release workflow creates `blueprints-v0.20.0` in `cogNNitive-web` after the web commit exists

#### Scenario: Meta-spec tag does not release
- GIVEN a core meta-spec tag `v0.2.0`
- WHEN it is pushed
- THEN the release workflow does not run

#### Scenario: Rejecting invalid or floating release tags
- GIVEN a release attempt using tag `latest` or `blueprints-v` without a semver string
- WHEN release validation checks the tag format
- THEN the tag is rejected as non-conforming

#### Scenario: Name collision with different content is prevented
- GIVEN `skills-v2.9.0` exists in both repositories at unrelated SHAs
- WHEN the next skills release is chosen
- THEN its version is strictly greater than `2.9.0`
- AND the existing tags are left untouched

---

### Requirement: Tag-Pinned Remote Spec URL Construction and Immutability

Remote references to templates and meta-specifications in stable manifests, models, and configurations SHOULD use tag-pinned URLs rather than branch-pinned URLs (such as `main`). Tag-pinned URLs for released artifacts MUST resolve against the mirror tag in the public repository `cogNNitive/cogNNitive-web`, so that they work without authentication. The URL structure MUST follow:
`https://raw.githubusercontent.com/<org>/<repo>/<tag>/<path>`

Once published, the content at a tag URL MUST be immutable. Stable-channel consumers resolving templates MUST NOT resolve against mutable branch refs such as `main`.

#### Scenario: Tag-pinned URL construction for remote template resolution
- GIVEN the `workspace` template published under mirror tag `blueprints-v0.20.0` in `cogNNitive/cogNNitive-web`
- WHEN the remote URL is generated or resolved for the stable channel
- THEN the URL pins to `.../cogNNitive-web/blueprints-v0.20.0/<path>`
- AND it does not target the mutable `main` branch

#### Scenario: Immutability of tag-pinned template assets
- GIVEN a workspace has hydrated the `workspace` package from tag `blueprints-v0.20.0`
- WHEN later template edits are merged into `main` without cutting a new release tag
- THEN existing tag-pinned references keep resolving the byte-identical assets of `blueprints-v0.20.0`

---

### Requirement: End-to-End Upstream Traceability across the Spec Hierarchy

Every Level 3 (L3) model instance, Level 2 (L2) template specification, and Level 1 (L1) meta-spec MUST maintain verifiable upstream provenance references:
- L3 instance models MUST reference their parent L2 template (via `parent_spec` plus, for the stable channel, a tag-pinned URL).
- L2 template packages MUST declare their upstream L1 framework dependency, pinned to an immutable `v<version>` tag for stable releases.
- L1 meta-specifications MUST reference the foundational L0 ontology (`defiNNe`), pinned to an immutable `v<version>` tag for stable releases.

The resolution and validation engine MUST be able to traverse this upstream chain (L3 → L2 → L1 → L0) to verify schema conformance and provenance integrity.

#### Scenario: Full upstream provenance chain validation
- GIVEN an L3 model referencing L2 template `business` at tag `blueprints-v0.20.0`
- AND the L2 template declares conformance to L1 `iNNfo` at tag `v0.2.0`
- AND L1 `iNNfo` declares derivation from L0 `defiNNe` at tag `v0.1.0`
- WHEN provenance validation traverses the upstream reference chain
- THEN every reference resolves to an immutable tag
- AND the lineage from L3 to L0 is validated as coherent and reproducible

#### Scenario: Detecting an unpinned upstream link in a stable lineage
- GIVEN an L2 template referencing an L1 meta-spec via a mutable branch URL (`.../main/...`) in a stable release
- WHEN upstream traceability verification runs
- THEN a validation warning or error identifies the unpinned upstream link

---

### Requirement: Mirror tags are written once

A mirror tag in `cogNNitive-web` MUST be created at most once per release name and MUST NOT be force-moved. A re-run that finds the tag at the expected commit MUST leave it unchanged; a re-run that finds it at a different commit MUST fail.

#### Scenario: Re-run keeps the tag
- GIVEN mirror tag `skills-v2.10.0` at the release's web commit
- WHEN the release workflow is re-run
- THEN the tag is unchanged

#### Scenario: Divergent tag is never moved
- GIVEN mirror tag `skills-v2.10.0` at a different commit
- WHEN the release workflow is re-run
- THEN the job fails and the tag is not moved
