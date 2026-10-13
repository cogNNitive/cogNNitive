# Tasks: S5 — retire the Vue editor

Deletion slice; each group leads with the check that must end green.

## 1. Precondition

- [ ] 1.1 Confirm S3 is archived (the console covers the used feature set).

## 2. Delete the app + workspace

- [ ] 2.1 Remove `iNNfo/apps/innfo-editor/**`.
- [ ] 2.2 Drop the workspace entry + lockfile; update `openspec/config.yaml`.

## 3. Decouple build/CI

- [ ] 3.1 `scripts/build-docs.mjs`: drop the app deploy.
- [ ] 3.2 `sync-versions.mjs`, `check-integrity.js`, `guard-template-immutability.js`,
      `migrate-spec-urls*.mjs`: drop editor references.
- [ ] 3.3 `release.yml` / CI: drop any `innfo-editor` reference.

## 4. Docs + specs

- [ ] 4.1 Repoint/retire `docs/innfo/app/` links to the console.
- [ ] 4.2 Delete `openspec/specs/editor-lineage-ui`, `editor-navigation`, `editor-routing`,
      `editor-tag-authoring`.

## 5. Verification

- [ ] 5.1 Grep: no `innfo-editor` or `docs/innfo/app` remains (outside git history).
- [ ] 5.2 `node scripts/verify.js` + `npm run check:integrity` green.
