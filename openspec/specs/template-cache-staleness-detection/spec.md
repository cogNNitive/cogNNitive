# Template Cache Staleness Detection

## Purpose

Detect stale locally cached iNNfo specs and templates by content-hash comparison against their canonical remote URLs. The innfo-mcp resolver supports an opt-in `checkFreshness` (default OFF, preserving R-LSR-01), `validateModel` surfaces a non-blocking `[TEMPLATE_CACHE_STALE]` warning (default ON), and nn-preflight gains an opt-in `--workspace-dir` staleness scan that reports stale specs as ACTION_REQUIRED while treating unresolvable or unreachable remotes as non-blocking.

## Requirements

### Requirement: Freshness check is opt-in

`resolveParentChainNode` MUST accept a `checkFreshness` option (default OFF).
When OFF, the resolver MUST NOT perform network I/O beyond existing behavior
(R-LSR-01: fetch NOT called when a local spec exists).

#### Scenario: Freshness disabled: local cache resolves without fetch or warning

- GIVEN `checkFreshness` is disabled
- WHEN a spec resolves from the local cache
- THEN no fetch occurs
- AND no staleness warning is emitted

---

### Requirement: Local resolutions are content-hash compared to remote

When `checkFreshness` is ON and a spec resolves from a LOCAL tier
(workspace/global/skill), the resolver MUST fetch the canonical remote URL, if
present, and compare by CONTENT HASH. Differing hashes → `stale`; equal →
`fresh`. `spec_version` MUST NOT be used.

#### Scenario: Local copy diverged from remote

- GIVEN a cached template in `specs/` whose content hash differs from the canonical remote
- AND `checkFreshness` is enabled
- WHEN the template resolves from the local tier
- THEN the resolved document is marked `stale`

---

### Requirement: Freshness check is non-fatal and offline-tolerant

A failed fetch (timeout, HTTP error, no network) MUST NOT fail resolution; mark
`unknown` and continue.

#### Scenario: Offline fetch fails during validation

- GIVEN the canonical remote is unreachable
- AND `checkFreshness` is enabled
- WHEN a local spec resolves
- THEN resolution succeeds and provenance is `unknown`

---

### Requirement: validateModel surfaces TEMPLATE_CACHE_STALE warning

`validateModel` (validate.ts) MUST emit a `[TEMPLATE_CACHE_STALE]` warning
(severity `warning`, non-blocking for `valid`) when the resolved template's
provenance is `stale`, including the canonical URL and a remediation hint
naming `check_workspace` as the self-heal remedy (the write-once rehydration
that `check_workspace` already performs), not manual file surgery under
`specs/`. The warning MUST reflect the content-hash result, not
`spec_version`.

(Previously: the remediation hint told the agent to delete/replace the local
copy under `specs/` by hand, and never mentioned `check_workspace`.)

#### Scenario: Stale template still validates

- GIVEN a cached template in `specs/` differing from the canonical remote
- AND `checkFreshness` is enabled
- WHEN `validateModel` runs
- THEN a `[TEMPLATE_CACHE_STALE]` warning is emitted
- AND `valid` is NOT forced to false by this warning alone

#### Scenario: Remediation hint names check_workspace

- GIVEN a `[TEMPLATE_CACHE_STALE]` warning is emitted
- WHEN the agent reads the warning's `promptHint`/message
- THEN it names `check_workspace` as the remedy
- AND it does not instruct manual file deletion/replacement under `specs/`

---

### Requirement: preflight accepts --workspace-dir

`preflight-check.js` MUST accept a `--workspace-dir <path>` flag. When absent,
behavior MUST be byte-for-byte as today (global-env audit only).

#### Scenario: No flag: global-env audit unchanged

- GIVEN no `--workspace-dir` argument
- WHEN `preflight-check.js` runs
- THEN output and exit codes are byte-for-byte unchanged

---

### Requirement: Workspace scan reports stale specs as ACTION_REQUIRED

With `--workspace-dir`, the preflight MUST recursively scan `<workspace>/specs/`
(incl. `specs/templates/**`) for iNNfo spec/template markdown files, read each
`spec_url` frontmatter (fallback `parent_spec.url`), fetch the remote via Node
native fetch, content-hash compare, and report each stale entry (path + URLs)
as ACTION_REQUIRED (exit 1).

#### Scenario: Stale spec blocks preflight

- GIVEN `--workspace-dir` with a stale spec in `specs/`
- WHEN the scan runs
- THEN the stale file is listed (local path and URLs)
- AND the exit code is 1 with ACTION_REQUIRED

#### Scenario: All-fresh workspace passes

- GIVEN `--workspace-dir` with all-fresh specs in `specs/`
- WHEN the scan runs
- THEN no stale entries are reported and the exit code is 0

---

### Requirement: Unresolvable/unreachable remotes are non-blocking

Files without a resolvable `spec_url`/`parent_spec.url` MUST be skipped
silently. An unreachable remote MUST be reported as a warning, not a blocker.

#### Scenario: Spec without canonical URL skipped

- GIVEN a file under `specs/` without `spec_url` or `parent_spec.url`
- WHEN the scan runs
- THEN the file is skipped silently and not reported

#### Scenario: Remote unreachable: warning

- GIVEN a spec whose canonical remote is unreachable
- WHEN the scan runs
- THEN the entry is a warning and the exit code is not 1 due to it

---

### Requirement: Staleness scan uses Node native fetch

The staleness scan MUST use Node native fetch and MUST NOT shell out to bare
`curl` (PowerShell `Invoke-WebRequest` alias).

#### Scenario: In-process fetch

- GIVEN the scan needs a remote comparison
- WHEN the scan runs
- THEN the remote is fetched with Node native fetch (no external curl)

---

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