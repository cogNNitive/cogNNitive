# Architecture Decision: file-format

> **Status**: Executed Ã¢â‚¬” 2026-07-01
> **Supersedes**: Original FORMAT repo changeset

The old `innV0/FORMAT` repo is archived. A new clean repo `innV0/file-format` was created as the canonical home for the FILE mode editor.

## What happened

1. **Created** `https://github.com/innV0/file-format` as a fresh repo
2. **Copied** source code from `innV0/FORMAT`, stripped of legacy files (agent configs, stale docs, master data)
3. **Added** `@cognnitive/format-core: "file:../iNNfo/packages/format-core"` dependency
4. **Added** `scripts/bootstrap-specs.mjs` for CI setup
5. **Pushed** as single initial commit `a5b824e`

## Key differences from old FORMAT repo

| Aspect | Old FORMAT | file-format |
|--------|-----------|-------------|
| Name | FORMAT | file-format |
| Dependency | No format-core | `@cognnitive/format-core` via `file:` |
| Spec source | Embedded in `docs/` | Consumed from iNNfo |
| CI bootstrap | Manual clone | `npm run setup` |
| Version | 1.0.0 | 0.1.0 |

## Relationship

```
file-format/         Ã¢” Â this repo (Vue 3 SPA)
iNNfo/          Ã¢” Â sibling dir: specs + format-core library
```

## Spec resolution chain

```
FORMAT spec  Ã¢” ’ iNNfo/specs/FORMAT_V_0-1-0_FORMAT.md
Parent       Ã¢” ’ iNNfo/specs/defiNNe_V_0-1-0_FORMAT.md
Templates    Ã¢” ’ iNNfo/specs/{business,procedures}_V_0-1-0_FORMAT.md
```
