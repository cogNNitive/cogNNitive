# Technical Design: Repair nn-* Skill Contract and Guard Drift

## 1. Architecture Decisions

| Decision | Chosen Approach | Rationale |
|---|---|---|
| **Contract Guard Placement** | `scripts/skill-mcp-contract.test.mjs` | Included in `verify.js` test discovery; avoids shipping test code inside distributed skills. |
| **Catalog Validation** | Static table in `nn-start` checked against `manifest/source.yaml` | Fast execution for LLM routing; zero drift guaranteed by the automated test. |
| **Tool Reference Resolution** | Update all 17 tool names in `nn-innfo` §1 table and skill text | Restores working wizard execution on step A2a. |
| **Discard Policy** | Zero Discard in all docs | Matches code reality (`evaluateSessionDiscard` in `conversations.js`). |
| **Heading Structure** | Clean sequential headings in `nn-innfo` | Fixes duplicate `## 15` and `## 0` blocks and restores orphaned code fences. |

## 2. Guard Implementation Design
`scripts/skill-mcp-contract.test.mjs` will:
1. Parse tool names from `iNNfo/packages/innfo-mcp/src/server.ts` (using regex/AST to find `name: '...'` in tool definitions).
2. Scan all `.md` files under `skills/` for patterns like `innfo-mcp_<tool>` or table definitions.
3. Assert that every cited tool exists in `server.ts`.
4. Scan all `.md` files under `skills/` for `node <path>` and assert `fs.existsSync(<path>)`.
5. Compare `skills/nn-start/SKILL.md` skill catalog against `manifest/source.yaml`.
