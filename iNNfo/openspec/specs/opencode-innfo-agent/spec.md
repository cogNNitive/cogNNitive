# opencode-innfo-agent Specification

## Purpose

Enable natural-language creation, editing, and querying of iNNfo models through OpenCode Desktop, backed by an iNNfo-aware MCP server over `@cognnitive/innfo-core`. The capability is delivered as an MCP server (semantic iNNfo tools), a behavior-only rules file, and a committed thin iNNfo primary agent. The iNNfo specification and templates are consumed from a single, versioned, public source of truth — never duplicated into any skill, rule, prompt, or agent config. This slice covers the OpenCode Desktop frontend only; an embedded chat inside `apps/innfo-editor`, any OpenCode plugin, custom UI panels, and remote MCP hosting are explicitly out of scope.

## Requirements

| # | Requirement | S | Description |
|---|------------|---|-------------|
| R1 | MCP Server Over innfo-core | MUST | A local stdio MCP server wraps `@cognnitive/innfo-core` and exposes the iNNfo tool surface; `opencode.json` registers `mcp.servers.innfo-mcp` at `packages/innfo-mcp/dist/server.js`. Starts as an OpenCode child process. |
| R2 | Semantic Tool Surface | MUST | Server exposes `list_models`, `read_model`, `validate_model`, `apply_change`, `get_spec`, `get_template`. Edits are intent ops, not raw line/byte edits. Template and model names follow `_NN.md` suffix. |
| R3 | Deterministic Tool-Owned Validation | MUST | Validation is performed by `innfo-core` inside `validate_model`/`apply_change`; the model's validity is decided by the tool, never asserted by the LLM |
| R4 | Self-Correction Loop | MUST | On an edit, the agent calls validation; if `errors[]` is non-empty it MUST fix and re-validate before reporting success |
| R5 | Single Source Of Truth | MUST | The iNNfo spec/templates are fetched from a public, versioned URL; `innfo-core`'s validator and the agent consume the same source |
| R6 | No Spec Duplication | MUST NOT | No skill, rules, prompt, or agent config file contains copied iNNfo spec/template content; such files may only reference/point to the source |
| R7 | Version-Aware Spec Retrieval | MUST | `get_spec`/`get_template` resolve version from filename SemVer matching V_0-1-0 (both `_NN.md` and `_F.md` suffixes). `SPEC_BASE_URL` points to `main/specs/iNNfo_V_0-1-0_NN.md`. Explicit `version` arg MAY override. |
| R8 | Spec Caching And Offline Behavior | MUST | Retrieved spec/template content is cached (ETag/version); on fetch failure the last cached version is served with a staleness annotation, and invalid/fabricated spec content MUST NOT be returned |
| R9 | Mode-Transparent Tools | MUST | Tools accept model `id`; server dispatches to FILE primitive (`_NN.md`). FOLDER mode removed. Callers never select a driver. |
| R10 | Behavior-Only Rules | MUST | The rules file describes workflow and tool usage (iNNfo FILE handling, validate-after-edit, which tool when) and is runtime-agnostic so a future embedded chat reuses it unchanged |
| R11 | iNNfo Agent In Dropdown | MUST | Committed agent (`.opencode/agents/innfo.md` + `opencode.json` `mcp.servers.innfo-mcp`) appears as **iNNfo** in OpenCode's dropdown. Selecting it loads MCP tools and behavior-only rules (`.opencode/rules/innfo.md`). |
| R12 | Scoped Permissions | MUST | The iNNfo agent's edit permissions are scoped to `models/`; it MUST NOT edit files outside that path as part of normal iNNfo operations |
| R13 | Committed Distribution Unit | MUST | MCP registration (`mcp.servers.innfo-mcp`), agent (`.opencode/agents/innfo.md`), and rules (`.opencode/rules/innfo.md`) committed to repo. Fresh clone gets iNNfo mode without setup. |
| R14 | Additive, No Behavior Change | MUST | `apps/innfo-editor`, `apps/launcher`, and existing `packages/innfo-core` public behavior are unchanged; any `innfo-core` additions are additive only and existing tests pass unchanged |
| R15 | Frontend Additivity Preserved | MUST | All iNNfo knowledge/mutation logic lives in the MCP server + `innfo-core`; OpenCode config (opencode.json/agents/rules) is declarative-only, so a future embedded chat is an additive client of the same server, not a rewrite |
| R16 | Out-Of-Scope Absence | MUST NOT | This slice MUST NOT ship an embedded chat UI in `innfo-editor`, any OpenCode plugin, any custom UI panel/webview, or a remote/hosted MCP server |

## Scenarios

| R | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| R1 | Server starts under OpenCode | `opencode.json` registers `mcp.servers.innfo-mcp` | OpenCode launches with iNNfo agent | The `innfo-mcp` process starts and its tools are advertised |
| R1 | Tools available in session | Server running | Agent lists available tools | The six iNNfo tools appear alongside built-in tools |
| R2 | Intent edit | A model `id` + "add concept Risk" | `apply_change` called | Change is an intent op, not a line/byte patch |
| R2 | Template naming | `get_template('business')` requested | Template fetched | Returned content uses `_NN.md` naming (not `_FORMAT.md`) |
| R3 | Tool decides validity | An edited model | `validate_model` runs | Validity + `errors[]` come from `innfo-core`, not from an LLM assertion |
| R4 | Invalid edit self-corrected | Natural-language request that would produce invalid iNNfo | Agent applies and validates | `errors[]` is returned; the agent fixes and re-validates before reporting success |
| R4 | Valid edit reported once green | A valid natural-language edit | Agent applies and validates | Validation passes with empty `errors[]`; success is reported |
| R5 | Shared source confirmed | Validator config and `get_spec` | Both resolve the spec for the same model version | Both read from the same public source (no second embedded copy) |
| R6 | No copied spec text | Repo skill/rules/agent/opencode files | Files are scanned for iNNfo spec keywords/rule bodies | Only URLs/pointers are found; no copied spec/template content exists |
| R7 | Version from `_NN.md` | Model `..._V_0-1-0_NN.md` | `get_spec` with no argument | Resolves `0-1-0` from updated URL |
| R7 | Legacy `_F.md` support | Model `..._V_0-1-1_F.md` | `get_spec` called | Legacy suffix resolves correctly |
| R7 | Explicit version override | Model `..._V_0-1-0_NN.md` | `get_spec` + `version: 0-1-1` | `0-1-1` spec returned (arg overrides filename) |
| R8 | Cache hit avoids refetch | Spec previously fetched, ETag unchanged | `get_spec` called again | Cached content is served without a full refetch |
| R8 | Offline serves stale, flagged | Public URL unreachable; a cached version exists | `get_spec` called | Last cached content is returned with a staleness annotation; no fabricated content |
| R8 | Offline, no cache, no fabrication | Public URL unreachable; nothing cached | `get_spec` called | A clear error is returned; no invalid/fabricated spec is produced |
| R9 | FILE dispatch | A FILE-mode model `id` | `read_model`/`apply_change` called | Server uses FILE (`_NN.md`) internally; no driver choice from caller |
| R9 | FOLDER unsupported | A model that would have been FOLDER | Tool invoked | Error returned or treated as FILE — no FOLDER dispatch occurs |
| R10 | Rules carry workflow only | The rules file | File is inspected | It contains workflow/tool-usage guidance and points to `get_spec`; it contains no copied spec rules |
| R10 | Rules reusable by other frontend | The rules file | Loaded outside OpenCode (hypothetical embedded chat) | It is valid/loadable without OpenCode-specific assumptions |
| R11 | Agent visible in dropdown | `agents/innfo.md` + `mcp.servers.innfo-mcp` registered | User opens mode dropdown | **iNNfo** listed and selectable |
| R11 | Agent loads tools+rules | iNNfo agent selected | Session activates | `innfo-mcp` tools + behavior-only rules active |
| R12 | Edits confined to models/ | iNNfo agent active | Agent performs a normal edit request | The write occurs under `models/`; no file outside `models/` is modified |
| R12 | Out-of-scope write blocked/asked | iNNfo agent active | A request would edit outside `models/` | The scoped permission prevents/asks before the out-of-scope write |
| R13 | Zero-setup for new user | Fresh clone of the repo | Open in OpenCode Desktop | iNNfo agent + `innfo-mcp` server available without manual configuration |
| R14 | Existing apps unchanged | `innfo-editor`/`launcher` running | Used as before | Behavior is identical to pre-change |
| R14 | Core tests green | `packages/innfo-core` test suite | Suite is run after this change | All existing tests pass unchanged |
| R15 | Logic not in OpenCode config | opencode.json/agents/rules | Files are inspected | They are declarative-only; no iNNfo mutation/knowledge logic resides there |
| R15 | Additive second client | The MCP server | A second (future) client connects | It obtains the same tools without server changes (additivity holds) |
| R16 | No embedded chat shipped | `apps/innfo-editor` | UI/codebase inspected | No in-app chat/agent UI is present in this slice |
| R16 | No plugin/panel/remote shipped | Repo and OpenCode config | Inspected | No OpenCode plugin, no custom UI panel/webview, and no remote MCP server are introduced |
