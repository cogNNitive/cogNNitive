# Design: S5 — retire the Vue editor

## Deletion order

1. Confirm S3 archived (the hard dependency).
2. Remove `iNNfo/apps/innfo-editor/**`.
3. Drop the npm workspace entry + lockfile; update `openspec/config.yaml`.
4. Remove each coupling: `build-docs.mjs` (app deploy), `sync-versions.mjs`,
   `check-integrity.js`, `guard-template-immutability.js`, `migrate-spec-urls*.mjs`.
5. Repoint/retire `docs/innfo/app/` links to the console.
6. Delete the four `editor-*` specs.

## Guardrails

- A repo-wide grep for `innfo-editor` and `docs/innfo/app` MUST return nothing after the
  slice (excluding git history).
- `verify.js` + `check:integrity` are the gate; both must be green with the workspace
  removed.

## Cross-cutting

No new code. The release workflow (`release.yml`) must not reference `innfo-editor`; if it
does, remove the family entry.
