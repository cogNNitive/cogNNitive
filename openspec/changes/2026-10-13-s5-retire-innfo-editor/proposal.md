# Proposal: S5 — retire the Vue editor

## Intent

Slice S5 of `refactor/stable-identity-and-changesets` (D13, D18). Once S3 confirms the
vanilla console covers the editor's used feature set, the Vue `innfo-editor` is deleted
— code, deploy, release coupling and specs. This is a deletion slice: its size is its
blast radius, not its logic.

## Scope

### In Scope
- Delete `iNNfo/apps/innfo-editor/**` (≈290 files, ≈51.5k LOC).
- Decouple the editor from the build/CI: `scripts/build-docs.mjs` (deploy to
  `docs/innfo/app/`), `scripts/sync-versions.mjs`, `scripts/check-integrity.js`,
  `scripts/guard-template-immutability.js`, `scripts/migrate-spec-urls*.mjs`.
- Remove the editor's npm workspace + lockfile entry; drop `innfo-editor` from
  `openspec/config.yaml` module/testing lists.
- Delete the four `editor-*` specs.

### Out of Scope
- The console parity work (S3) — a hard dependency; S5 opens only after S3 archives.

## Capabilities

### Removed Capabilities
- `editor-lineage-ui`
- `editor-navigation`
- `editor-routing`
- `editor-tag-authoring`

## Approach

Delete leaf-first: remove the app, then the workspace entry, then each coupling script
reference, then the specs. The `docs/innfo/app/` deploy target is retired; the console
artifacts replace it. `verify.js` and `check:integrity` must stay green with no editor
references.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/**` | Removed | the Vue editor |
| `package.json` / lockfile | Modified | drop the workspace |
| `scripts/build-docs.mjs` | Modified | drop the app deploy |
| `scripts/sync-versions.mjs`, `check-integrity.js`, `guard-template-immutability.js` | Modified | drop editor coupling |
| `scripts/migrate-spec-urls*.mjs` | Modified | drop editor refs |
| `openspec/specs/editor-*` | Removed | four specs |
| `openspec/config.yaml` | Modified | drop the module/testing entry |
| `docs/innfo/app/**` | Removed/Redirected | deploy retired |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A dependency on the editor package lingers | Med | `verify.js` + a repo-wide grep for `innfo-editor` |
| Docs still link `docs/innfo/app/` | Med | Grep the docs; repoint to the console |
| Release workflow references the editor | Med | Grep `release.yml` and CI |

## Rollback Plan

Pure deletion across git history; revert the slice commit restores everything. No data
migrates.

## Success Criteria

- [ ] `iNNfo/apps/innfo-editor` is gone; no workspace/lockfile entry remains.
- [ ] No script or CI references `innfo-editor` or `docs/innfo/app/`.
- [ ] The four `editor-*` specs are removed.
- [ ] `node scripts/verify.js` and `npm run check:integrity` are green.
