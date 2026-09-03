# Delta for Template & Skill Bundling

## MODIFIED Requirements

### Requirement: Manifest Schema Extension and Template Validation

The `agent-bootstrap` manifest schema MUST support an optional `templates` array alongside `skills`, `workflows`, and `entrypoint`. Every commit-bearing entry (`skills[]`, `templates[]`, `mcp[]`) MUST carry a `ref` field (a human-reviewable tag or branch name) alongside its generated `commit`:

```yaml
templates:
  - name: workspace_spec_NN
    repo: cogNNitive/iNNfo
    path: specs/templates/workspace_spec_NN.md
    ref: v0.2.0
    version: "V_0-2-0"
    commit: "3f1a9c2b8e4d6f0a1b2c3d4e5f60718293a4b5c6"
```

The manifest validator (`validate-manifest.js`) MUST validate top-level `templates` entries by verifying that `commit` is reachable within the declared `repo`'s own history (not merely resolvable via a shared fork-network lookup), checking file path existence, verifying version parity between manifest declarations and template file headers/frontmatter, and verifying dependency closure across skills and workflows. A `commit` that does not match resolving `ref` through the GitHub API for the declared `repo` MUST fail validation.

(Previously: commit existence was checked only via a single-commit GitHub API lookup against the declared repo, which could false-positive when the commit object was also reachable through a shared fork network; `ref` did not exist in the schema.)

#### Scenario: Manifest with valid skills and templates block passes validation
- GIVEN an `agent-bootstrap` manifest containing valid `skills` and `templates` entries with matching GitHub commit SHAs, correct `ref` correspondence, and local file versions
- WHEN `validate-manifest.js` runs against the manifest
- THEN validation completes with exit code `0`
- AND all skills and templates are reported as valid

#### Scenario: Manifest with invalid template commit SHA fails validation
- GIVEN a `templates` entry whose commit SHA does not exist anywhere on GitHub
- WHEN `validate-manifest.js` verifies the commit against the GitHub API
- THEN validation fails with an error indicating an unresolvable template commit SHA
- AND validation exits with a non-zero exit code

#### Scenario: Template commit belonging to a different repo fails validation
- GIVEN a `templates` entry declaring `repo: cogNNitive/iNNfo` with a structurally valid 40-hex `commit` that only exists in `cogNNitive/actioNN`
- WHEN `validate-manifest.js` checks repo-scoped commit existence
- THEN validation fails with an error naming the declared repo
- AND validation exits with a non-zero exit code

#### Scenario: Version mismatch between manifest and template frontmatter fails validation
- GIVEN a `templates` entry declaring version `"V_1-0-0"` while the template file header specifies `"V_0-9-0"`
- WHEN `validate-manifest.js` checks version parity
- THEN a version mismatch error is raised identifying the expected versus actual template version

#### Scenario: Manifest without templates block remains backward compatible
- GIVEN a legacy `agent-bootstrap` manifest containing only `skills` and `workflows`
- WHEN `validate-manifest.js` evaluates the manifest
- THEN validation succeeds without throwing missing-key errors for `templates`

## ADDED Requirements

### Requirement: MCP Bundle Commit Pinning

Every `mcp[]` entry MUST carry `repo`, `path`, `ref`, and a generated `commit`, and its `url` MUST embed that `commit` rather than a branch name:

```yaml
mcp:
  - name: innfo-mcp
    repo: cogNNitive/iNNfo
    path: packages/innfo-mcp/bin/innfo-mcp.bundle.js
    ref: v0.2.0
    commit: "3f1a9c2b8e4d6f0a1b2c3d4e5f60718293a4b5c6"
    url: https://raw.githubusercontent.com/cogNNitive/iNNfo/3f1a9c2b8e4d6f0a1b2c3d4e5f60718293a4b5c6/packages/innfo-mcp/bin/innfo-mcp.bundle.js
```

`url` values containing `/main/` (or any branch segment) in place of a commit MUST fail validation. The same repo-scoped existence and ref-correspondence rules that apply to `templates[]` and `skills[]` MUST apply to `mcp[]` entries.

#### Scenario: Unpinned mcp url fails validation
- GIVEN an `mcp[]` entry whose `url` contains `/main/` in place of a commit segment
- WHEN `validate-manifest.js` validates the entry
- THEN validation fails with an error identifying the unpinned MCP bundle URL

#### Scenario: Commit-pinned mcp url passes validation
- GIVEN an `mcp[]` entry whose `url` embeds a `commit` matching that entry's own repo-scoped, ref-resolved commit
- WHEN `validate-manifest.js` validates the entry
- THEN validation passes for that entry

### Requirement: Version Field Backward Compatibility

The `version` field on every manifest entry MUST remain a display-only string, distinct from `commit` and `ref`, and consumer update-detection logic (`skills-manager.js`) MUST continue to compare `commit` only. Adding `ref` to the schema MUST NOT change `version` semantics or require any change to already-installed `~/.agents/bootstrap-state.json` records.

#### Scenario: Existing installed state remains valid after schema change
- GIVEN a machine with `~/.agents/bootstrap-state.json` recorded against a pre-`ref` manifest
- WHEN the manifest is regenerated with `ref` fields added
- THEN `skills-manager.js status` MUST continue to compare recorded `commit` values without requiring re-installation
- AND `version` MUST NOT be used as an update-detection key
