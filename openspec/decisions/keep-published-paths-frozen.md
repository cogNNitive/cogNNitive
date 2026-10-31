# Decision: keep published paths frozen

Date: 2026-10-31
Status: accepted

## Decision

The paths `iNNfo/specs`, `skills`, `manifest` and `docs` stay where they are. The
`packages-to-root` move (`iNNfo/packages/*` to `packages/*`) must not relocate any of them.

## Why

These paths are addressed from outside the repository tree:

- `manifest/source.yaml` pins artifacts under `iNNfo/specs/`, and tagged releases
  (`templates-v*`) are validated against those paths.
- `docs/CNAME` and the Pages deploy serve `docs/` as the public site.
- `skills/` is installed by path into user machines.

Moving them breaks published refs for users on older versions, with no migration path.

## Consequences

- `packages-to-root` only moves `iNNfo/packages/nn-core` and `nn-mcp`, plus every
  reference to them. Re-measure with `git grep -lF iNNfo/packages` first.
- Any proposal to relocate a frozen path needs its own heavy-lane change and a
  documented migration for published refs.
