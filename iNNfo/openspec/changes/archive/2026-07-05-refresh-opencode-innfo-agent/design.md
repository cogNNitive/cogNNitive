# Design: Refresh OpenCode iNNfo Agent

## Technical Approach

Five independent work areas executed in parallel-safe order: (1) rename agent/rules/docs files and update internal references, (2) fix regex and fallback paths for `_F.md` model discovery, (3) register `innfo-mcp` server in OpenCode config, (4) update spec URL and template names, (5) validate `ElementsMap` API compatibility. The MCP server uses the existing `@cognnitive/innfo-core` exports and tools — no new endpoints or server architecture changes.

## Architecture Decisions

### Decision: Regex — Single combined pattern

| Option | Tradeoff |
|--------|----------|
| `/(?:NN\|F)\.md$/i` | One pattern, one place to change. Future removal of `_F.md` means removing `F\|` from the group. |
| Two separate tests | More explicit but spreads the concern across lines. |

**Choice**: Single `/(?:NN|F)\.md$/i`. Simpler to maintain, trivial to clean up later.

### Decision: `_F.md` fallback order — `_NN.md` first

`findModelFile` and `readModel` try `_NN.md` before `_F.md`. **Rationale**: `_NN.md` is the current convention; `_F.md` is legacy. Existing models use `_F.md` so the fallback still works. When all models migrate to `_NN.md`, the `_F.md` branch becomes dead code that's easy to spot and remove.

### Decision: MCP registration in `.opencode/opencode.json`

The existing config lives at `.opencode/opencode.json`. Adding `mcp.servers.innfo-mcp` here keeps all OpenCode config in one place. No root-level `opencode.json` exists — creating one would split ownership. `.opencode/opencode.json` is the project-scoped config that OpenCode Desktop reads.

### Decision: `git mv` for file renames

Preserves git history for agent, rules, and docs files. Delete-and-create breaks `git blame` and makes code archaeology harder. `git mv` is zero-cost for renames within the same directory (agent, rules) or across directories (docs).

### Decision: Spec URL pinned to `v0.1.5`

`SPEC_BASE_URL` points to `v0.1.5/specs/iNNfo_V_0-2-0_NN.md`. Pinned to a specific tag (not `main`) for reproducibility — the agent must resolve the same spec regardless of when it's activated. Dynamic resolution (`main` branch) introduces nondeterministic behavior between sessions.

## File Changes

### Renames

| File | Action | New Path |
|------|--------|----------|
| `.opencode/agents/format.md` | `git mv` | `.opencode/agents/innfo.md` |
| `.opencode/rules/format.md` | `git mv` | `.opencode/rules/innfo.md` |
| `docs/documentation/opencode-format-agent.md` | `git mv` | `docs/documentation/opencode-innfo-agent.md` |

### Modifications

| File | What Changes |
|------|-------------|
| `packages/innfo-core/src/helpers.ts` (line 40) | `NN_MD_RE = /_NN\.md$/i` → `/(?:NN\|F)\.md$/i` |
| `packages/innfo-mcp/src/tools/mutate.ts` (line 37) | `findModelFile`: add `join(rootDir, \`${id}_F.md\`)` as 3rd candidate |
| `packages/innfo-mcp/src/tools/list-read.ts` (line 35) | `readModel`: add `join(rootDir, \`${id}_F.md\`)` as 3rd candidate |
| `packages/innfo-mcp/src/tools/spec.ts` (line 30) | `SPEC_BASE_URL`: `v0.1.1` → `v0.1.5` |
| `packages/innfo-mcp/src/tools/spec.ts` (lines 37-40) | Template map: `_FORMAT.md` → `_NN.md` for business, procedures, catalog |
| `.opencode/agents/innfo.md` | Frontmatter: `id: innfo`, `name: iNNfo`, `mcp: true`, rules ref → `rules/innfo.md`. Description text: `@cognnitive/innfo-core`, `innfo-mcp`, iNNfo naming |
| `.opencode/rules/innfo.md` | `_F.md` → `_NN.md`, remove FOLDER section text (`Most models today...`), update all FORMAT → iNNfo references |
| `.opencode/opencode.json` | Add `mcp.servers.innfo-mcp` block with `command: node`, `args: ["packages/innfo-mcp/dist/server.js"]`, `transport: stdio` |
| `docs/documentation/opencode-innfo-agent.md` | Update all FORMAT → iNNfo, format-mcp → innfo-mcp, format-core → innfo-core, example prompts, architecture diagram |
| `docs/documentation/_sidebar.md` (line 2) | Link text: `FORMAT Agent (OpenCode)` → `iNNfo Agent (OpenCode)`, target: `opencode-innfo-agent` |

### No changes

| Area | Why |
|------|-----|
| `packages/innfo-core/src/index.ts` | `listModels` and `resolveSpecVersionFromFilename` already exported |
| `ParsedModel.elements` (ElementMap) | `ElementsMap.get()`/`.set()` match the mutation pattern — no type fix needed |

## Data Flow

```
User prompt
  → OpenCode agent (innfo.md)
    → innfo-mcp MCP server (opencode.json registration)
      → @cognnitive/innfo-core (listModels, parseModel, validateModel)
        → models/ directory (scanned via regex /_(?:NN|F)\.md$/i)
        → .spec-cache/ (cached spec/template docs from SPEC_BASE_URL)
```

`list_models` flow: `scan directory` → `NN_MD_RE` test (now matches `_F.md` too) → `resolveSpecVersionFromFilename` → return `ModelInfo[]`.

`read_model`/`apply_change` flow: `findModelFile(id)` → try `id` → try `id_NN.md` → try `id_F.md` → read + parse → operate.

`get_spec` flow: `SPEC_BASE_URL/v0.1.5/specs/iNNfo_V_{version}_NN.md` → `resolveParentChain` → cache → return.

## Interfaces / Contracts

No new interfaces. `ParsedModel.elements` is `ElementsMap` (not `Map`), which exposes `.get(key)`, `.set(key, nodes)`, `.has(key)` — same call pattern as `Map`. The mutation code in `applyMutation` lines 299, 313, 322, 329 uses these methods directly and compiles without changes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (helpers.ts) | `listModels` catches `_F.md` files | Point rootDir at dir with `*_F.md` file; assert returned length ≥ 1 |
| Unit (mutate.ts) | `findModelFile` resolves `_NN.md` → `_F.md` | Mock or create both suffixed files; ensure `_NN.md` returned first when both exist |
| Unit (list-read.ts) | `readModel` falls back to `_F.md` | Pass id without suffix; assert file with `_F.md` suffix is found and parsed |
| Unit (spec.ts) | `getSpec` URL uses `v0.1.5` and `_NN.md` | Mock URL fetch; assert final URL contains `v0.1.5/specs/iNNfo_V_` and `_NN.md` |
| Integration | Agent file loads in OpenCode | Verify `opencode.json` `mcp.servers.innfo-mcp` key exists after write |
| E2E | Fresh clone gets iNNfo mode | Run `ls .opencode/agents/innfo.md` — no `format.md` remains |

## Migration / Rollout

No migration required. The `_F.md` model file (`models/Ghostbusters_V_0-1-2_business_F.md`) stays unchanged — it's now discoverable because the scanner matches both suffixes. The MCP registration is additive (previously absent, now present). The agent file rename is backwards-compatible for Git state (history preserved via `git mv`). Users with local `opencode.json` must re-commit to pick up the `mcp` section.

## Open Questions

None.
