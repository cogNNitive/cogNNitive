# opencode-format-agent Specification (Delta: opencode-format-agent)

## Purpose

Enable natural-language creation, editing, and querying of FORMAT models through OpenCode Desktop, backed by a format-aware MCP server over `@cognnitive/format-core`. The capability is delivered as an MCP server (semantic FORMAT tools), a behavior-only rules file, and a committed thin FORMAT primary agent. The FORMAT specification and templates are consumed from a single, versioned, public source of truth â€” never duplicated into any skill, rule, prompt, or agent config. This slice covers the OpenCode Desktop frontend only; an embedded chat inside `apps/format-editor`, any OpenCode plugin, custom UI panels, and remote MCP hosting are explicitly out of scope.

## Requirements

| # | Requirement | S | Description |
|---|------------|---|-------------|
| R1 | MCP Server Over format-core | MUST | A local stdio MCP server wraps `@cognnitive/format-core` and exposes the FORMAT tool surface; it starts as an OpenCode child process via `opencode.json` |
| R2 | Semantic Tool Surface | MUST | The server exposes `list_models`, `read_model`, `validate_model`, `apply_change`, `get_spec`, `get_template`; edits are expressed as intent operations, not raw line/byte edits |
| R3 | Deterministic Tool-Owned Validation | MUST | Validation is performed by `format-core` inside `validate_model`/`apply_change`; the model's validity is decided by the tool, never asserted by the LLM |
| R4 | Self-Correction Loop | MUST | On an edit, the agent calls validation; if `errors[]` is non-empty it MUST fix and re-validate before reporting success |
| R5 | Single Source Of Truth | MUST | The FORMAT spec/templates are fetched from a public, versioned URL; `format-core`'s validator and the agent consume the same source |
| R6 | No Spec Duplication | MUST NOT | No skill, rules, prompt, or agent config file contains copied FORMAT spec/template content; such files may only reference/point to the source |
| R7 | Version-Aware Spec Retrieval | MUST | `get_spec`/`get_template` resolve the spec/template version from the target model's filename SemVer (or an explicit `version` argument) |
| R8 | Spec Caching And Offline Behavior | MUST | Retrieved spec/template content is cached (ETag/version); on fetch failure the last cached version is served with a staleness annotation, and invalid/fabricated spec content MUST NOT be returned |
| R9 | Mode-Transparent Tools | MUST | Tools accept a model `id`; the server dispatches to the correct FILE or FOLDER `format-core` primitive internally; callers do not select a driver |
| R10 | Behavior-Only Rules | MUST | The rules file describes workflow and tool usage (FILE/FOLDER handling, validate-after-edit, which tool when) and is runtime-agnostic so a future embedded chat reuses it unchanged |
| R11 | FORMAT Agent In Dropdown | MUST | A committed primary agent (`.opencode/agents/format.md` + `opencode.json` MCP entry) appears in OpenCode's mode dropdown and, when selected, loads the MCP tools and the rules file |
| R12 | Scoped Permissions | MUST | The FORMAT agent's edit permissions are scoped to `models/`; it MUST NOT edit files outside that path as part of normal FORMAT operations |
| R13 | Committed Distribution Unit | MUST | The MCP registration, agent definition, and rules are committed to the repo so any user opening the project in OpenCode Desktop gets the FORMAT mode ready without extra setup |
| R14 | Additive, No Behavior Change | MUST | `apps/format-editor`, `apps/launcher`, and existing `packages/format-core` public behavior are unchanged; any `format-core` additions are additive only and existing tests pass unchanged |
| R15 | Frontend Additivity Preserved | MUST | All FORMAT knowledge/mutation logic lives in the MCP server + `format-core`; OpenCode config (opencode.json/agents/rules) is declarative-only, so a future embedded chat is an additive client of the same server, not a rewrite |
| R16 | Out-Of-Scope Absence | MUST NOT | This slice MUST NOT ship an embedded chat UI in `format-editor`, any OpenCode plugin, any custom UI panel/webview, or a remote/hosted MCP server |

## Scenarios

| R | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| R1 | Server starts under OpenCode | `opencode.json` registers the local MCP server | OpenCode Desktop launches with the FORMAT agent | The server process starts and its tools are advertised to the agent |
| R1 | Tools available in session | Server running | Agent lists available tools | The six FORMAT tools appear alongside built-in tools |
| R2 | Intent edit, not line edit | A model `id` and intent "add concept Risk" | Agent calls `apply_change` | The change is expressed as an intent op (add concept), not a raw line/byte patch |
| R3 | Tool decides validity | An edited model | `validate_model` runs | Validity + `errors[]` come from `format-core`, not from an LLM assertion |
| R4 | Invalid edit self-corrected | Natural-language request that would produce invalid FORMAT | Agent applies and validates | `errors[]` is returned; the agent fixes and re-validates before reporting success |
| R4 | Valid edit reported once green | A valid natural-language edit | Agent applies and validates | Validation passes with empty `errors[]`; success is reported |
| R5 | Shared source confirmed | Validator config and `get_spec` | Both resolve the spec for the same model version | Both read from the same public source (no second embedded copy) |
| R6 | No copied spec text | Repo skill/rules/agent/opencode files | Files are scanned for FORMAT spec keywords/rule bodies | Only URLs/pointers are found; no copied spec/template content exists |
| R7 | Version from filename | Model `..._V_0-1-1_...` | `get_spec` called with no explicit version | The spec version resolved is `0-1-1` |
| R7 | Explicit version override | Model `..._V_0-1-1_...` | `get_spec` called with `version: 0-1-0` | The `0-1-0` spec is returned (arg overrides filename) |
| R8 | Cache hit avoids refetch | Spec previously fetched, ETag unchanged | `get_spec` called again | Cached content is served without a full refetch |
| R8 | Offline serves stale, flagged | Public URL unreachable; a cached version exists | `get_spec` called | Last cached content is returned with a staleness annotation; no fabricated content |
| R8 | Offline, no cache, no fabrication | Public URL unreachable; nothing cached | `get_spec` called | A clear error is returned; no invalid/fabricated spec is produced |
| R9 | FILE model transparent | A FILE-mode model `id` | `read_model`/`apply_change` called | Server uses the FILE primitive internally; caller passed no driver choice |
| R9 | FOLDER model transparent | A FOLDER-mode model `id` | `read_model`/`apply_change` called | Server uses the FOLDER primitive internally; caller passed no driver choice |
| R10 | Rules carry workflow only | The rules file | File is inspected | It contains workflow/tool-usage guidance and points to `get_spec`; it contains no copied spec rules |
| R10 | Rules reusable by other frontend | The rules file | Loaded outside OpenCode (hypothetical embedded chat) | It is valid/loadable without OpenCode-specific assumptions |
| R11 | Agent visible in dropdown | Committed `agents/format.md` + `opencode.json` | User opens OpenCode Desktop mode dropdown | A FORMAT agent entry is listed and selectable |
| R11 | Selecting agent loads tools+rules | FORMAT agent available | User selects it | The MCP tools and behavior-only rules are active in the session |
| R12 | Edits confined to models/ | FORMAT agent active | Agent performs a normal edit request | The write occurs under `models/`; no file outside `models/` is modified |
| R12 | Out-of-scope write blocked/asked | FORMAT agent active | A request would edit outside `models/` | The scoped permission prevents/asks before the out-of-scope write |
| R13 | Zero-setup for new user | Fresh clone of the repo | User opens it in OpenCode Desktop | The FORMAT agent and MCP server are available without additional manual configuration |
| R14 | Existing apps unchanged | `format-editor`/`launcher` running | Used as before | Behavior is identical to pre-change |
| R14 | Core tests green | `packages/format-core` test suite | Suite is run after this change | All existing tests pass unchanged |
| R15 | Logic not in OpenCode config | opencode.json/agents/rules | Files are inspected | They are declarative-only; no FORMAT mutation/knowledge logic resides there |
| R15 | Additive second client | The MCP server | A second (future) client connects | It obtains the same tools without server changes (additivity holds) |
| R16 | No embedded chat shipped | `apps/format-editor` | UI/codebase inspected | No in-app chat/agent UI is present in this slice |
| R16 | No plugin/panel/remote shipped | Repo and OpenCode config | Inspected | No OpenCode plugin, no custom UI panel/webview, and no remote MCP server are introduced |
