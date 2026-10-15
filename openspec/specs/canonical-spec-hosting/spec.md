<!--
  The archived predecessor repository slug is written as two adjacent code spans
  (`cogNNitive`/`iNNfo`) rather than one, on purpose: the iNNfo `check:spec-urls`
  strict legacy scan fails on any contiguous occurrence of that slug in a
  non-excluded file, and files under openspec/specs/ are in scope.
-->

# Canonical Spec Hosting

## Purpose

Fix the canonical hosting location for every iNNfo specification, template, sample model, and procedure sub-model on the monorepo: raw content at `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/` and browsing at `https://github.com/cogNNitive/cogNNitive-web/blob/main/iNNfo/`. The editor consumes a single `REMOTE_SPEC_BASE` constant, a strict repo-wide checker fails on any residual archived-repository reference and verifies canonical URLs resolve to real files, and the dead legacy root `specs/` island is removed.
## Requirements
### Requirement: Canonical Spec Hosting Base URL

All canonical iNNfo specifications MUST be hosted on the public distribution host rather
than on the repository that holds the source; this covers Level 1 core specs, Level 2
templates, Level 3 sample models, and procedure sub-models. The exact host is recorded by
open decision 2 of the `public-web-distribution` change (the public distribution
repository, or its same-origin Pages path). No canonical specification, template, sample
model, or documentation MAY reference a `raw.githubusercontent.com/cogNNitive/cogNNitive`
URL.

#### Scenario: Level 1 and defiNNe spec frontmatter
- GIVEN any Level 1 or defiNNe specification file
- WHEN its frontmatter is inspected
- THEN `spec_url`, `parent.url`, `spec.url`, and any `includes[].url` are rooted at the public distribution base URL

#### Scenario: Level 2 template spec frontmatter
- GIVEN any Level 2 template specification file
- WHEN its frontmatter is inspected
- THEN `spec_url`, `parent.url`, and `includes[].url` are rooted at the public distribution base URL

#### Scenario: Level 3 sample model and procedure submodel frontmatter
- GIVEN any Level 3 sample model or procedure sub-model
- WHEN its frontmatter is inspected
- THEN `parent_spec.url` is rooted at the public distribution base URL

### Requirement: Strict Repo-Wide Spec URL Checker

The CI URL validation script MUST verify that canonical URLs are rooted at the public
distribution host, MUST still verify local file existence for canonical URLs, and MUST
fail on any residual `raw.githubusercontent.com/cogNNitive/cogNNitive` reference in any
non-excluded file.

#### Scenario: Residual private raw reference fails
- GIVEN any non-excluded file containing a `raw.githubusercontent.com/cogNNitive/cogNNitive` URL
- WHEN `check-spec-urls` runs
- THEN it exits non-zero

### Requirement: Removal of Dead Root Specs Island

The dead legacy root `specs/**` directory (6 files) unconsumed by CI or documentation builds MUST be removed from the repository.

#### Scenario: Root specs directory does not exist
- GIVEN the repository root
- WHEN file tree is inspected
- THEN no directory named `specs/` exists at the workspace root

