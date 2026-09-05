# Proposal: Migrate Release Manifest to Monorepo

## Intent

Complete the migration of the cogNNitive release distribution manifests and tooling to the `cogNNitive/cogNNitive` monorepo:
1. Update `manifest/source.yaml` to point all templates and the MCP bundle to `cogNNitive/cogNNitive` with paths prefixed by `iNNfo/`.
2. Establish release tags on `cogNNitive/cogNNitive` matching the stable channel requirements.
3. Regenerate and synchronize distribution documents `docs/use/manifest.md` and `docs/use/manifest-next.md`.
4. Rework manifest validation and generation test suites.
5. Remove the temporary allowlist from `iNNfo/scripts/check-spec-version.mjs`, achieving 100% repo-wide elimination of residual `cogNNitive/iNNfo` references.

## Constraints

1. **Tag Provenance & Reachability**: All stable tags must point to commits reachable from `main` on `cogNNitive/cogNNitive` to satisfy `checkReleaseProvenance`.
2. **Deterministic Regeneration**: `node scripts/manifest/generate-manifest.js --channel stable` and `--channel preview` must render cleanly without manual SHA editing.
3. **Strict Validation**: `node scripts/manifest/validate-manifest.js --channel stable` and `--channel preview` must pass with zero violations.
4. **User Gate on Tag Push**: Release tags will be created locally, but pushing tags to `origin` requires explicit user confirmation.

## Scope

### In Scope
- **`manifest/source.yaml`**:
  - Migrate all `repo: cogNNitive/iNNfo` occurrences to `repo: cogNNitive/cogNNitive`.
  - Prefix `path:` for templates with `iNNfo/` (e.g. `iNNfo/specs/templates/workspace_spec_NN.md`).
  - Prefix `path:` for MCP bundle with `iNNfo/` (`iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`).
  - Correct `version:` for `business-model` and `analysis` to `"V_0-1-0"`.
  - Update `channels.stable.refs` and `channels.preview.refs` keys and repos.
- **Distribution Mirrors**:
  - Regenerate `docs/use/manifest.md` (stable channel).
  - Regenerate `docs/use/manifest-next.md` (preview channel).
- **Test Suites & Tooling**:
  - `scripts/manifest/validate-manifest.test.js`: Update mock fixtures and assertions.
  - `scripts/manifest/generate-manifest.test.js`: Update mock fixtures.
  - `actioNN/scripts/skills-manager.test.js`: Update mock manifests.
- **Checker Enforcement**:
  - Remove allowlisted manifest paths from `iNNfo/scripts/check-spec-version.mjs`.
- **Release Tagging**:
  - Tag `templates-v0.2.0` and `innfo-mcp-v0.2.4` on `cogNNitive/cogNNitive` at current `main` commit.

### Out of Scope
- Re-architecting the manifest schema or bootstrap script protocol.
- Independent version bumps for skills (retaining existing stable references).

## Verification Plan

- `node scripts/manifest/generate-manifest.js --channel stable --check`
- `node scripts/manifest/generate-manifest.js --channel preview --check`
- `node scripts/manifest/validate-manifest.js --channel stable`
- `node scripts/manifest/validate-manifest.js --channel preview`
- `npm run verify`
- `npm --prefix iNNfo run check:spec-urls` (must pass with 0 allowlisted warnings)

## Open Decision for User Sign-Off

1. **Skills repository scope**: Keep `skills` pointing to `cogNNitive/actioNN` at `skills-v1.1.3` (which remains resolvable), or migrate skills to `cogNNitive/cogNNitive` (requiring a `skills-v1.1.3` tag on the monorepo as well)?
   - *Recommendation*: Migrate templates and MCP bundle first (which originated in `iNNfo`), keeping `skills` on `cogNNitive/actioNN` for this PR, OR migrate skills together for a unified single monorepo distribution source.
