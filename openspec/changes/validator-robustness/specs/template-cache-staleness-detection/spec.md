# Delta for Template Cache Staleness Detection

## ADDED Requirements

### Requirement: Resolver Cache Defaults to OS Temp Directory

The resolver MUST cache fetched parents and templates in the OS temp directory by default. A default run MUST create no cache artifacts inside the workspace or repository tree.

#### Scenario: Default run leaves the repo tree clean

- GIVEN a workspace needing remote parent resolution
- WHEN the resolver runs with default options
- THEN fetched content is cached under the OS temp directory
- AND no cache files appear inside the workspace tree

#### Scenario: Cached temp entry reused

- GIVEN a temp-cached entry for a canonical URL
- WHEN the same URL resolves again
- THEN the cached entry is reused without refetching

#### Scenario: Concurrent workspaces isolated

- GIVEN two workspaces resolving the same canonical URL
- WHEN both resolvers run with defaults
- THEN neither workspace tree gains cache files

### Requirement: In-Place Cache Writes Require Explicit Flag

In-workspace cache writes MUST occur only when an explicit in-place flag is passed. Without the flag the resolver MUST NOT write inside the workspace tree even when a local copy would be faster.

#### Scenario: Explicit flag restores in-tree caching

- GIVEN the explicit in-place flag is passed
- WHEN the resolver caches fetched content
- THEN the cache is written inside the workspace tree

#### Scenario: No flag means no in-tree writes

- GIVEN no in-place flag is passed
- WHEN the resolver fetches remote content
- THEN nothing is written inside the workspace tree
