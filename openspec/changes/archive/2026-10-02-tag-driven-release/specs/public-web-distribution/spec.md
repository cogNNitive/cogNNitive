# Delta for public-web-distribution

## ADDED Requirements

### Requirement: Additive versioned publish

Every publish to the public repository MUST be additive for versioned release paths. Commits are immutable and pinned by tag and SHA, so previously released trees stay reachable and served by SHA. The following release-owned paths (relative to `docs/`) MUST be written only by the release workflow: `innfo/cdn/innfo-mcp-v*.bundle.js` (append-only), `innfo/cdn/manifest.json`, `use/manifest.md`, `update/manifest.md`, and `use/manifests/<tag>.md` (append-only). Push-to-main site publishing MUST preserve these paths from the existing web checkout, MUST NOT delete or overwrite them, and MUST fail if the built artifact itself contains one of them. A versioned file MUST NOT be overwritten with different bytes.

#### Scenario: Older bundle survives a new release
- GIVEN the site serves `innfo-mcp` bundle version `0.11.0`
- WHEN version `0.12.0` is published
- THEN the `0.11.0` bundle URL still resolves to the same bytes
- AND the `0.12.0` bundle URL resolves

#### Scenario: Publishing never prunes
- GIVEN a push-to-main publish whose build output lacks a release-owned path that exists in the public repository
- WHEN the publish runs
- THEN that path remains in the public repository unchanged

#### Scenario: Build artifact containing a release-owned path
- GIVEN the main build artifact contains `use/manifest.md` or a versioned CDN bundle
- WHEN push-to-main publish runs
- THEN it fails and writes nothing

#### Scenario: Versioned file with different bytes
- GIVEN `innfo/cdn/innfo-mcp-v0.11.0.bundle.js` is already published
- WHEN a publish carries different bytes for that path
- THEN the publish fails and the file is unchanged

#### Scenario: Previously deleted bundles are restored once
- GIVEN versioned bundles that earlier publishes removed
- WHEN the one-time restore from the public repository history (last served bytes) is applied additively
- THEN each such versioned URL resolves again

### Requirement: Release tags are mirrored into the public repository

The public repository MUST carry a tag with the same name as each monorepo release tag, created by the release workflow only after the content commit C for that release exists. The mirror tag MUST point at C, the commit holding the published tree for that release, not at the later manifest commit. No other process MAY create such tags, and a published tag MUST NOT be moved or deleted.

#### Scenario: Mirror tag present after release
- GIVEN the release `skills-v2.10.0` completed
- WHEN tags of the public repository are listed
- THEN `skills-v2.10.0` exists and points at the release's content commit

#### Scenario: Tags are not created by hand
- GIVEN the documented procedure
- WHEN a maintainer releases
- THEN no step asks them to tag the public repository manually

### Requirement: Manifest is served from the public repository's site

`https://cognnitive.com/use/manifest.md` MUST be served from the public repository's published site and MUST be updated only by the release workflow's manifest commit. Unauthenticated clients MUST be able to fetch it, both from the site and from `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md`.

#### Scenario: Manifest URL resolves unauthenticated
- GIVEN a completed release
- WHEN the manifest URL is requested without credentials
- THEN it returns the manifest that pins the released version

## MODIFIED Requirements

### Requirement: One-Way Publish Pipeline

The private monorepo MUST build the site and publish the artifact to the public repository through automated paths only: push-to-main site publication and the tag-driven release workflow. The public repository MUST NOT write back to the private one. Each publish MUST use a credential scoped to the single public repository, and the release workflow MUST use a credential separate from the push-to-main publish credential.

#### Scenario: Publish on build
- GIVEN a successful `build-docs` on the private repo
- WHEN the publish job runs
- THEN the built artifact is pushed to the public repository
- AND the publish credential is scoped to that repository only

#### Scenario: Publish on release
- GIVEN a release tag was pushed
- WHEN the release workflow runs its publish stage
- THEN the release artifact is pushed to the public repository without removing earlier releases
- AND the credential is limited to the public repository's contents (which cover tags)
- AND it is distinct from the push-to-main publish credential

#### Scenario: No reverse writes
- GIVEN the public repository
- WHEN it changes
- THEN no automated path writes back to the private monorepo

### Requirement: Idempotent Publish

Publishing MUST be a no-op when the built artifact is byte-identical to what the public repository already holds, including when the workflow is re-run on the same release tag.

#### Scenario: Unchanged artifact
- GIVEN the public repo already holds the current artifact
- WHEN the publish job runs again
- THEN no commit is created

#### Scenario: Re-run of a release publish
- GIVEN a release whose web commit already exists
- WHEN the release workflow is re-run on the same tag
- THEN no second web commit is created
