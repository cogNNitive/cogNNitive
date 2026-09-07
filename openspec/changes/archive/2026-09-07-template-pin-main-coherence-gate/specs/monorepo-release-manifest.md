# Spec: Monorepo Release Manifest

## ADDED Requirements

### Requirement: Stable Template Main Coherence

For every template declared in the `stable` channel of `manifest/source.yaml`, the system MUST verify that the template's content at its pinned commit is coherent with the content at the same `path` on the `main` branch. Coherence is defined as an empty diff after normalizing line endings and stripping a leading BOM from both revisions; raw byte identity is not required.

The system MUST report a violation whenever the two contents differ, in either direction: `main` ahead with unreleased work, or a tag released without being merged to `main`. Each violation MUST name the template `path`, the pinned commit, and both compared revisions (the pinned commit and `main`).

This check MUST apply only to the `stable` channel, where `requireProvenance` is `true`. The `preview` channel MUST NOT be evaluated, because it pins `main` and is trivially coherent.

The comparison MUST reuse the existing GitHub authentication (`authHeaders`, `GITHUB_TOKEN`). When the comparison fails due to rate limiting, the system MUST report the violation with `RATE_LIMIT_HINT` and MUST NOT crash.

No frontmatter URL (`spec_url`, `parent_spec.url`, `includes[].url`) is rewritten by this check; canonical `main` URLs remain unchanged.

#### Scenario: Identical pinned and main content

- GIVEN a template on the `stable` channel whose content at its pinned commit equals the content at the same `path` on `main` after line-ending/BOM normalization
- WHEN the manifest is validated for the `stable` channel
- THEN no coherence violation is reported for that template

#### Scenario: main ahead of the pinned commit

- GIVEN a template on the `stable` channel pinned to a commit whose content differs from the content on `main` because unreleased work advanced `main`
- WHEN the manifest is validated for the `stable` channel
- THEN a coherence violation is reported naming the `path`, the pinned commit, and both revisions

#### Scenario: tag released without being merged to main

- GIVEN a template on the `stable` channel whose pinned commit contains content that differs from `main` because the release tag was never merged to `main`
- WHEN the manifest is validated for the `stable` channel
- THEN a coherence violation is reported naming the `path`, the pinned commit, and both revisions

#### Scenario: rate limit during comparison

- GIVEN the template content comparison for a `stable` template returns a rate-limit error
- WHEN the manifest is validated for the `stable` channel
- THEN a violation is reported with `RATE_LIMIT_HINT`
- AND validation does not crash

#### Scenario: coherence not evaluated on preview

- GIVEN a template declared on the `preview` channel only
- WHEN the manifest is validated for the `preview` channel
- THEN no main-coherence comparison is performed for that template
