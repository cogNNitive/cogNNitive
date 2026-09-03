# Archive Report: mcp-decouple-templates

**Archived:** 2026-07-07
**Status:** Applied, verified, canonical spec merged.

## Outcome

Removed all hardcoded content from `innfo-mcp`. `get_spec` and `get_template` now resolve exclusively from an explicit `url` or a loaded model's `parent_spec.url`. `SPEC_BASE_URL`, `TEMPLATE_SPECS`, `resolveVersion()`, and the legacy `getTemplate(name)` were deleted. `validateModel`/`applyChange` resolve the template only from the model (plus an optional `template_url` on `validateModel`). The canonical `openspec/specs/innfo-mcp/spec.md` was rewritten; the prior "getTemplate legacy remains unchanged" requirement was **removed** (it was false and its URL 404'd).

## Verification

- `packages/innfo-mcp` Vitest: 12/12 green.
- `tsc --noEmit`: 0 errors. `eslint`: 0 errors (2 pre-existing `any` warnings in `applyMutation`).
- Bundle rebuilt; grep for `SPEC_BASE_URL`/`TEMPLATE_SPECS` in `bin/innfo-mcp.bundle.js`: 0.
- End-to-end: MCP boots over stdio; `get_template({ url })` against the `latest` business template resolves the full chain over the network.

## Deviations from the original proposal

Two fixes were made during integration that were not in the proposal but were required for the deliverable:

1. **Version bump** — `@cognnitive/innfo-mcp` 0.1.0 → 0.2.0 (breaking tool-contract change; `iNNv0_skills/scripts/update-mcp.js` compares versions to decide whether to pull). `server.ts` Server version bumped to match.
2. **ESM bundle banner** — `tsup.config.ts` bundle entry lacked a `createRequire` banner, so the single-file `bin/` bundle threw "Dynamic require of 'process' is not supported" at load (inlined CJS deps: MCP SDK, ajv). Added the banner. The `dist/` build was unaffected (deps external); the `bin/` bundle had never actually been executed before this integration.

## Follow-ups (out of scope)

- Published level-2 templates (business/procedures/catalog) are mislabeled `level: 3` and use level-0 frontmatter keys, skewing `coreGetTemplate` (prefers level 3). Tracked separately.
- `iNNv0_skills` (separate repo) consumes the rebuilt bundle: registered the MCP in `.opencode/opencode.json`, bumped `.cogNNitive/mcp-version.json`, and rewrote the `innv0-innfo` skill (V_2-0-0) to delegate to the MCP. Its `update-mcp.js` will re-sync once cognitive `main` carries this change.
