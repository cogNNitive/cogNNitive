# Proposal: Canonical Template Package Distribution

## Intent

Eliminate versioned file clutter in `main` by adopting canonical unversioned template filenames, shifting immutability enforcement from file cloning to immutable Git release tags, and hydrating complete template packages (spec, SOP procedures, samples) into workspaces pinned by release tags.

## Scope

### In Scope
- **Canonical Filenames**: Strip semver from template file paths under `iNNfo/specs/templates/` (e.g., `<name>_spec_NN.md`, `procedures/`, `samples/`, `assets/`).
- **Frontmatter Versioning**: Retain semantic version in template frontmatter (`template_version: "0.2.1"`).
- **Git Tag Releases**: Publish templates, Level 1 (`iNNfo`), and Level 0 (`defiNNe`) with immutable git tags (`templates-v<version>`, `v<version>`); remote URLs pin to tags instead of `main`.
- **Full Package Hydration**: Download full package assets (spec, SOP procedures, samples, layout assets) into `specs/templates/<name>/<version>/` upon workspace resolution.
- **Guard Modernization**: Replace file-cloning checks in `guard-template-immutability.js` with CI frontmatter version bump validation against base branch.

### Out of Scope
- External package registry infrastructure.
- Non-template specification path migrations.

## Capabilities

### New Capabilities
- `template-release-tagging`: Immutable git release tagging (`templates-v<version>`, `v<version>`) and tag-pinned remote URL resolution for templates and meta-specs.

### Modified Capabilities
- `template-package-structure`: Hydrate complete template packages (`spec_NN.md`, `procedures/`, `samples/`, `assets/`) into `specs/templates/<name>/<version>/` from tag-pinned remotes.

### Deprecated Capabilities
- `template-version-pruning`: Retired; workspace cache no longer relies on reachability pruning of orphaned spec files.
- `template-immutability-guard`: Retired file-cloning guard in favor of frontmatter version bump CI verification.

## Approach

1. Rename template files in `iNNfo/specs/templates/` to canonical unversioned names, retaining `template_version` in frontmatter.
2. Update resolver and hydration logic in `innfo-mcp` to download complete packages from git release tags into versioned workspace directories.
3. Modernize `scripts/guard-template-immutability.js` to enforce frontmatter `template_version` increments on modified templates during CI.
4. Mark `template-version-pruning` and `template-immutability-guard` specs as retired.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/` | Modified | Unversioned canonical template file paths |
| `iNNfo/packages/innfo-mcp` | Modified | Full package hydration from release tags |
| `scripts/guard-template-immutability.js` | Modified | CI frontmatter version bump validation |
| `openspec/specs/` | Modified | New tagging spec; deprecation of pruning and legacy immutability specs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken remote references | Medium | Pin remote URLs to release tags and provide migration mapping for legacy URLs |
| Hydration cache drift | Low | Immutable Git tags guarantee downloaded package contents are stable |

## Rollback Plan

Revert template renames and restore file-cloning immutability guard scripts from git history.

## Dependencies

Git tag publishing workflow for `templates-v*` and `v*`.

## Success Criteria

- [ ] Template paths in `main` use canonical unversioned filenames.
- [ ] Template frontmatter retains `template_version`.
- [ ] Remote template resolution fetches from immutable git release tags.
- [ ] Workspace hydration downloads full package assets (`spec_NN.md`, `procedures/`, `samples/`, `assets/`).
- [ ] CI guard blocks pull requests modifying templates without incrementing `template_version`.
