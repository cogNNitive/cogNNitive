# Architecture Decision: folder-format

> **Status**: Historical — FOLDER mode and `kb` template removed in V_0-2-0 (2026-07-11).
> The `folder-format` repo and KB template are no longer part of the iNNfo ecosystem.
> **Executed**: 2026-07-01
> **Supersedes**: Original iNNfo repo changeset

The old `cogNNitive/cogNNitive` repo is archived. A new clean repo `innV0/folder-format` was created as the canonical home for the FOLDER mode platform.

## What happened

1. **Created** `https://github.com/innV0/folder-format` as a fresh repo
2. **Copied** source code from `cogNNitive/cogNNitive`, stripped of legacy files
3. **Added** `@cognnitive/format-core: "file:../iNNfo/packages/format-core"` dependency
4. **Added** `scripts/bootstrap-specs.mjs` for CI setup
5. **Pushed** as single initial commit `ecc1bd1`

## Key differences from old iNNfo repo

| Aspect | Old iNNfo | folder-format |
|--------|-----------|---------------|
| Name | iNNfo | folder-format |
| Identity | Knowledge mgmt system | FORMAT FOLDER mode |
| Dependency | No format-core | `@cognnitive/format-core` via `file:` |
| Spec source | Implicit | Consumed from iNNfo |
| CI bootstrap | Manual | `npm run setup` |

## Relationship

```
folder-format/       ├── this repo (React SPA)
iNNfo/               └── sibling dir: specs + format-core library
```

## Spec resolution chain

```
FORMAT spec  → iNNfo/specs/FORMAT_V_0-1-0_FORMAT.md
Parent       → iNNfo/specs/defiNNe_V_0-1-0_FORMAT.md
Template     → iNNfo/specs/kb_V_0-1-0_FORMAT.md
```
