# Delta for workspace-template-upgrade

## ADDED Requirements

### Requirement: Structural reference and citation rewrite

The `nn-upgrade` migrator MUST rewrite every name-based structural reference — `reference`
fields, matrix row/column headers and cross-model references — to the target element or
concept slug, and MUST rewrite citations to the current grammar. An ambiguous name (two
elements sharing a display name with different slugs) MUST be reported and NOT rewritten.
A citation whose target is under `sources/archive/` MUST be reported as a warning and NOT
rewritten. The migrator MUST emit a detector report (what would change) and a rewriter
report (what changed), both write-once.

#### Scenario: A reference is rewritten to its slug
- GIVEN a `sibling:: [[Element 2A]]` reference and a frozen slug `element-2a`
- WHEN the migrator runs
- THEN the reference is `[[element-2a]]` (or the slug address)

#### Scenario: An ambiguous name is reported, not guessed
- GIVEN two elements sharing a display name and distinct slugs
- WHEN a reference to that name is found
- THEN it is reported and left unrewritten

#### Scenario: A snapshot citation is preserved
- GIVEN a citation to `sources/archive/legacy_data.csv`
- WHEN the migrator runs
- THEN the citation is unchanged and a warning names it

#### Scenario: Re-running is a no-op
- GIVEN an already-migrated domain
- WHEN the migrator runs again
- THEN no document changes and no new artifact is written
