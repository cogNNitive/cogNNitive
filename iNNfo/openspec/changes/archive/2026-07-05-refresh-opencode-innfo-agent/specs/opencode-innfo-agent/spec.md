# Delta for opencode-innfo-agent

## RENAMED

### Domain: opencode-format-agent → opencode-innfo-agent

Capability domain renamed. References: `@cognnitive/innfo-core` (was format-core), `innfo-mcp` (was format-mcp), `agents/innfo.md` (was format.md), `rules/innfo.md` (was format.md). Template suffix `_NN.md` (was `_FORMAT.md`). FOLDER removed; FILE defaults to `_NN.md`. Spec URL: `v0.1.5/specs/iNNfo_V_0-2-0_NN.md`.

## MODIFIED Requirements

### R1: MCP Server Over innfo-core (MUST)

(Previously: referenced `@cognnitive/format-core`, `format-mcp` binary, no MCP registration in `opencode.json`)

Local stdio MCP server wraps `@cognnitive/innfo-core` and exposes the iNNfo tool surface; `opencode.json` registers `mcp.servers.innfo-mcp` at `packages/innfo-mcp/dist/server.js`. Starts as an OpenCode child process.

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R1 | Server starts under OpenCode | `opencode.json` registers `mcp.servers.innfo-mcp` | OpenCode launches with iNNfo agent | The `innfo-mcp` process starts and its tools are advertised |
| R1 | Tools available in session | Server running | Agent lists available tools | The six iNNfo tools appear alongside built-in tools |

### R2: Semantic Tool Surface (MUST)

(Previously: FORMAT template naming; no `_NN.md` convention)

Server exposes `list_models`, `read_model`, `validate_model`, `apply_change`, `get_spec`, `get_template`. Edits are intent ops, not raw line/byte edits. Template and model names follow `_NN.md` suffix.

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R2 | Intent edit | A model `id` + "add concept Risk" | `apply_change` called | Change is an intent op, not a line/byte patch |
| R2 | Template naming | `get_template('business')` requested | Template fetched | Returned content uses `_NN.md` naming (not `_FORMAT.md`) |

### R7: Version-Aware Spec Retrieval (MUST)

(Previously: stale spec URL, mixed SemVer patterns, `_FORMAT.md` only)

`get_spec`/`get_template` resolve version from filename SemVer matching V_0-2-0 (both `_NN.md` and `_F.md` suffixes). `SPEC_BASE_URL` points to `v0.1.5/specs/iNNfo_V_0-2-0_NN.md`. Explicit `version` arg MAY override.

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R7 | Version from `_NN.md` | Model `..._V_0-2-0_NN.md` | `get_spec` with no argument | Resolves `0-2-0` from updated URL |
| R7 | Legacy `_F.md` support | Model `..._V_0-1-1_F.md` | `get_spec` called | Legacy suffix resolves correctly |
| R7 | Explicit version override | Model `..._V_0-2-0_NN.md` | `get_spec` + `version: 0-1-0` | `0-1-0` spec returned (arg overrides filename) |

### R9: Mode-Transparent Tools (MUST)

(Previously: dispatched to FILE or FOLDER `format-core` primitive; FOLDER mode now removed)

Tools accept model `id`; server dispatches to FILE primitive (`_NN.md`). FOLDER mode removed. Callers never select a driver.

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R9 | FILE dispatch | A FILE-mode model `id` | `read_model`/`apply_change` called | Server uses FILE (`_NN.md`) internally; no driver choice from caller |
| R9 | FOLDER unsupported | A model that would have been FOLDER | Tool invoked | Error returned or treated as FILE — no FOLDER dispatch occurs |

### R11: iNNfo Agent In Dropdown (MUST)

(Previously: FORMAT agent via `.opencode/agents/format.md`, labeled FORMAT in dropdown)

Committed agent (`.opencode/agents/innfo.md` + `opencode.json` `mcp.servers.innfo-mcp`) appears as **iNNfo** in OpenCode's dropdown. Selecting it loads MCP tools and behavior-only rules (`.opencode/rules/innfo.md`).

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R11 | Agent visible in dropdown | `agents/innfo.md` + `mcp.servers.innfo-mcp` registered | User opens mode dropdown | **iNNfo** listed and selectable |
| R11 | Agent loads tools+rules | iNNfo agent selected | Session activates | `innfo-mcp` tools + behavior-only rules active |

### R13: Committed Distribution Unit (MUST)

(Previously: FORMAT mode, format.md files)

MCP registration (`mcp.servers.innfo-mcp`), agent (`.opencode/agents/innfo.md`), and rules (`.opencode/rules/innfo.md`) committed to repo. Fresh clone gets iNNfo mode without setup.

| R | Scenario | GIVEN | WHEN | THEN |
|---|----------|-------|------|------|
| R13 | Zero-setup for new user | Fresh clone of the repo | Open in OpenCode Desktop | iNNfo agent + `innfo-mcp` server available without manual configuration |
