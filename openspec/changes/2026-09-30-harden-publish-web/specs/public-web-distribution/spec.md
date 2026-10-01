# Delta for public-web-distribution

## ADDED Requirements

### Requirement: Deep Source Guard

Before any clone or network call, the publish MUST scan every published surface and abort
on forbidden content. `node_modules/`, `.env` and `.env.*` MUST be forbidden at any depth.
`src`, `packages`, `apps`, `package.json`, `package-lock.json` and `tsconfig.json` MUST be
forbidden at a surface root. A violation MUST raise an error naming the offending path; the
guard MUST NOT terminate the process directly.

#### Scenario: Nested node_modules aborts
- GIVEN `skills/nn-trannsform/node_modules/` exists in the working tree
- WHEN the publish runs
- THEN it fails naming that path
- AND no clone or push happens

#### Scenario: Nested env file aborts
- GIVEN a `.env` or `.env.local` file at any depth in a surface
- WHEN the publish runs
- THEN it fails before cloning

#### Scenario: Root-level source still aborts
- GIVEN a surface root containing `src` or `package.json`
- WHEN the publish runs
- THEN it fails before cloning

### Requirement: Nested Manifest Allowlist

Nested `package.json` and `package-lock.json` files MUST be permitted only inside an
explicit allowlist of directories. The allowlist MUST initially contain only
`skills/nn-trannsform/`.

#### Scenario: Allowlisted manifest publishes
- GIVEN `skills/nn-trannsform/package.json` and `package-lock.json`
- WHEN the guard runs
- THEN it passes and both files are published

#### Scenario: Non-allowlisted nested manifest aborts
- GIVEN a `package.json` under a directory not in the allowlist
- WHEN the guard runs
- THEN it fails naming that path

#### Scenario: Allowlist does not relax other rules
- GIVEN `skills/nn-trannsform/node_modules/`
- WHEN the guard runs
- THEN it still fails

### Requirement: Public-Repo-Owned Files Preserved

Files owned by the public repository (`.nojekyll`, and `CNAME` when absent from the
artifact) MUST survive a site replace: the published tree MUST contain them and the publish
commit MUST NOT delete them. The diff exclusion list MUST be effective for the replace, not
only for change detection. Local real (non-dry-run) publishes MUST NOT be refused.

#### Scenario: Changed site keeps .nojekyll
- GIVEN the public clone has `docs/.nojekyll` and the artifact differs from `docs/`
- WHEN the publish replaces the site
- THEN `docs/.nojekyll` is present and unchanged in the commit

#### Scenario: Only owned files differ
- GIVEN the artifact is otherwise identical to the public repo
- WHEN the publish runs
- THEN no commit is created

#### Scenario: Local real publish allowed
- GIVEN a non-CI environment with a valid credential
- WHEN a real publish runs
- THEN it proceeds exactly as in CI

### Requirement: Credential Non-Disclosure

The publish credential MUST NOT appear in process arguments, remote URLs, persisted git
config, or any output. All git error output MUST be redacted before being surfaced.

#### Scenario: Failed git command is redacted
- GIVEN a git command forced to fail with a known token
- WHEN the error is surfaced
- THEN the output contains no part of the token

#### Scenario: Clone holds no credential
- GIVEN a successful clone
- WHEN the clone's remote configuration is inspected
- THEN it contains no token

### Requirement: Guaranteed Temp Cleanup

The temporary clone MUST be removed on every exit path, including guard failures, git
failures and dry runs. The process MUST exit from a single top-level point.

#### Scenario: Failure leaves no temp dir
- GIVEN any forced failure after the clone is created
- WHEN the publish exits
- THEN no `publish-web-*` directory remains in the temp dir

#### Scenario: Dry run cleans up
- GIVEN a dry run
- WHEN it finishes
- THEN no `publish-web-*` directory remains
