# Tasks: Refresh OpenCode iNNfo Agent

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full rename + regex + MCP + verify | Single PR | All phases under 400 lines, single deliverable |

## Phase 1: Naming Refresh — File renames and content updates

- [x] 1.1 `git mv .opencode/agents/format.md agents/innfo.md`; update frontmatter: `id: innfo`, `name: iNNfo`, `mcp: true`, rules ref → `rules/innfo.md`, switch description from FORMAT/format-core to iNNfo/innfo-core
- [x] 1.2 `git mv .opencode/rules/format.md rules/innfo.md`; replace `_F.md` → `_NN.md` as primary suffix, remove FOLDER-mode section, update all FORMAT → iNNfo references
- [x] 1.3 `git mv docs/documentation/opencode-format-agent.md` → `docs/documentation/opencode-innfo-agent.md`; update doc body: rename agent, tools, URL references, architecture diagram labels
- [x] 1.4 Update `docs/documentation/_sidebar.md` link text to `iNNfo Agent (OpenCode)` and target to `opencode-innfo-agent`

## Phase 2: Core Fixes — Model discovery regex and spec URLs

- [x] 2.1 `packages/innfo-core/src/helpers.ts`: change `NN_MD_RE` from `/_NN\.md$/i` to `/(?:NN|F)\.md$/i`
- [x] 2.2 `packages/innfo-mcp/src/tools/mutate.ts`: add `join(rootDir, \`${id}_F.md\`)` as 3rd candidate in `findModelFile` (after bare `id` and `id_NN.md`)
- [x] 2.3 `packages/innfo-mcp/src/tools/list-read.ts`: add `join(rootDir, \`${id}_F.md\`)` as 3rd candidate in `readModel` (same fallback order)
- [x] 2.4 `packages/innfo-mcp/src/tools/spec.ts`: update `SPEC_BASE_URL` from `v0.1.1` to `v0.1.5`; replace template map entries `business_V_0-1-1_FORMAT.md` → `business_V_0-2-0_NN.md` (and similarly for procedures, catalog)

## Phase 3: MCP Registration

- [x] 3.1 `.opencode/opencode.json`: add `mcp.servers.innfo-mcp` block with `command: node`, `args: ["packages/innfo-mcp/dist/server.js"]`, `transport: stdio`

## Phase 4: Verification — Build, test, and prove success criteria

- [x] 4.1 Run `npm run build` — confirm `packages/innfo-mcp` compiles without errors
- [x] 4.2 Unit test: `listModels` catches `_F.md` files (point rootDir at dir with `*_F.md`; assert returned length ≥ 1)
- [x] 4.3 Unit test: `findModelFile` resolves `_NN.md` first, falls back to `_F.md` when both exist
- [x] 4.4 Unit test: `readModel` parses `_F.md` file when passed bare id without suffix
- [x] 4.5 Unit test: `getSpec` URL contains `v0.1.5/specs/iNNfo_V_` + `_NN.md` suffix
- [x] 4.6 Integration: `list_models` returns Ghostbusters model (currently returns 0 — this is the showstopper fix)
- [x] 4.7 Run `npm run typecheck` and `npm run lint` — no new errors
