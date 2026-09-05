# Proposal: Monorepo Release Workflow & Parity Guards

## Intent

Following the migration of cogNNitive from a multi-repo model (ctioNN, eNNvironment, iNNfo) to a unified monorepo (cogNNitive/cogNNitive), the developer release skill (.agents/skills/nn-dev-release/SKILL.md) still assumes three separate local git repositories and outdated paths (e.g. referencing non-existent eNNvironment).

Furthermore, the existing release validation pipeline has two blind spots:
1. **No local pre-flight parity check**: A developer can bump versions or edit skills/templates locally without updating manifest/source.yaml, or tag a release without aligning the manifest, causing silent version drift.
2. **Weak MCP validation**: While skills and templates verify file presence and version match on GitHub, alidateMcp in scripts/manifest/lib/manifest-rules.js does not verify that iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js physically exists at the target commit, nor does it check that innfo-mcp/package.json matches the version declared in the manifest.

## Scope

### In Scope
- **Update .agents/skills/nn-dev-release/SKILL.md**:
  - Re-align all options ([a], [b], [c], [d]) with the single monorepo root.
  - Standardize the monorepo release workflow: check git status on root, run deterministic workspace pre-checks, execute version bump across all 4 iNNfo packages, rebuild MCP/core bundles, cut git tags (<A.B.C>, innfo-mcp-v<A.B.C>, and optional skills-v<X.Y.Z>, 	emplates-v<T.U.V>), update manifest/source.yaml, regenerate and validate manifests.
- **Implement Local Parity & MCP Integrity Guard**:
  - Add scripts/manifest/check-parity.js (under 200 lines to satisfy orchestrator line limits) that verifies:
    - Every skill declared in manifest/source.yaml exists locally and its SKILL.md frontmatter version matches.
    - Every template declared in manifest/source.yaml exists locally and its header/frontmatter version matches.
    - The MCP bundle path iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js exists locally, and iNNfo/packages/innfo-mcp/package.json version matches mcp.version.
  - Wire this parity check into scripts/verify.js so it executes deterministically during pre-commit and CI.
- **Enhance Remote MCP Validation in manifest-rules.js**:
  - Update alidateMcp to check that entry.path exists in the repo at entry.commit via GitHub API.
  - Update manifest unit tests to cover the new MCP path check.

### Out of Scope
- Changing external API endpoints or breaking existing manifest schema (2.0).
- Re-architecting how git tags are signed.

## Approach
Keep manifest/source.yaml as the central declaration of published artifacts, but strictly prevent release drift by enforcing local parity before commit/tagging and enforcing remote existence during manifest validation.
