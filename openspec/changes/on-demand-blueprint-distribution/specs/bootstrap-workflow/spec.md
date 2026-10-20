# Delta Spec: bootstrap-workflow

## ADDED Requirements

### Requirement: Core-Only Default Bootstrap and Commit Tarball Caching

During `bootstrap` and `update` execution in `scripts/lib/skills-commands.js`, the CLI MUST install only Core `bluepriNNts` and skills listed in the core manifest by default, and MUST cache downloaded repository tarballs by `(repo, commit)` so that all entries sharing a commit reuse a single archive download.

#### Scenario: Tarball downloads are deduplicated by repo and commit
- **GIVEN** a manifest with multiple skills and Core `bluepriNNts` pinned to the same `(repo, commit)`
- **WHEN** `skills-manager.js install` or `update` runs during workspace bootstrap
- **THEN** at most one tarball is downloaded per unique `(repo, commit)` pair (`<= 2` tarballs per unique commit across repositories)
- **AND** all entries pinned to that commit are extracted from the cached archive

#### Scenario: Default bootstrap installs only Core blueprints
- **GIVEN** a clean environment running default `bootstrap` / `skills-manager.js install`
- **WHEN** installation completes without `--blueprint` flags
- **THEN** only the 7 Core `bluepriNNts` and core manifest skills are installed
- **AND** optional catalog `bluepriNNts` are not downloaded until requested on demand
