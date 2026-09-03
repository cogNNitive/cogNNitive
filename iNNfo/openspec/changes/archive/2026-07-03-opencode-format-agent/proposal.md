# Proposal: OpenCode FORMAT Agent

## Intent

Let a user create, edit, and query FORMAT models in **natural language** through **OpenCode Desktop** (the SST open-source AI coding agent, used as the ready-made frontend + agent runtime), without building any custom UI in this change. The integration is delivered as three thin, reusable pieces layered over the existing `@cognnitive/format-core`: an **MCP server** exposing semantic FORMAT tools, a **rules/skill** file carrying behavior only (zero spec content), and a committed **custom "FORMAT" primary agent** that appears in OpenCode's mode dropdown.

The governing constraint is **single source of truth**: the FORMAT specification and templates live at a public URL and are consumed identically by the `format-core` validator and by the agent (via a tool). No spec content is ever copied into a skill, prompt, or agent config.

## Scope

### In Scope

| Area | Deliverable |
|------|-------------|
| **MCP server** | A local (stdio) MCP server wrapping `@cognnitive/format-core`, exposing semantic tools: `list_models`, `read_model`, `validate_model`, `apply_change`, `get_spec`, `get_template` |
| **Spec retrieval** | `get_spec`/`get_template` fetch spec/template from the public URL, **cached** (ETag/version) and **version-aware** (resolve the spec version matching a model's SemVer) |
| **Deterministic validation** | Validation runs inside `validate_model`/`apply_change` via `format-core`; the LLM never asserts validity, it calls the tool and self-corrects from returned errors |
| **Rules/skill** | A portable Markdown rules file describing workflow and tool usage only Ã¢â‚¬â€ FILE vs FOLDER handling, "always validate after edit", when to call which tool Ã¢â‚¬â€ with **no copied spec text** |
| **FORMAT agent** | Committed `opencode.json` MCP entry + `.opencode/agents/format.md` primary agent: own model/temperature, permissions scoped to `models/`, MCP enabled, loads the rules file |
| **Docs** | A short usage note (how to select the FORMAT agent in OpenCode Desktop and talk to it) |

### Out of Scope

- **Embedded chat UI inside `apps/format-editor`** Ã¢â‚¬â€ deferred by explicit user decision; start with the two apps separate. Designed to be additive later (same MCP), not a rewrite.
- **Any OpenCode plugin or custom UI panel/webview** Ã¢â‚¬â€ the OpenCode plugin API is backend-only today; UI-panel rendering does not exist (open feature requests, no maintainer commitment).
- **Changes to `apps/format-editor` or `apps/launcher` behavior.**
- **A remote/hosted MCP server** Ã¢â‚¬â€ local stdio only for this change.
- **New FORMAT spec/template authoring** Ã¢â‚¬â€ this change consumes the existing published spec, it does not define it.

## Capabilities

### New Capabilities

- **`opencode-format-agent`** Ã¢â‚¬â€ natural-language editing/querying of FORMAT models through OpenCode Desktop, backed by a format-aware MCP server that reuses `format-core` and reads a single-source-of-truth published spec.

### Modified Capabilities

None Ã¢â‚¬â€ `format-core`, `format-editor`, and `launcher` behavior is unchanged. Any `format-core` additions are additive helpers only (e.g. exposing existing parse/validate through a stable programmatic surface).

## Approach

**1. MCP server as the shared core.** A thin Node/Bun package (`apps/format-mcp` or `packages/format-mcp`) imports `@cognnitive/format-core` and exposes semantic tools over stdio. All FORMAT knowledge and mutation logic lives here Ã¢â‚¬â€ never in OpenCode config. This is the moat that makes a future embedded chat additive.

**2. Semantic tools, not raw file edits.** `apply_change` performs intent-level operations (add concept, add field, set marker) and, in the same call, re-parses and validates, returning either the updated model or structured validation errors. The agent may still use its native file tools for free-form edits, but the safe/validated path is the MCP surface.

**3. Single source of truth via `get_spec`/`get_template`.** These fetch from the public spec URL (e.g. `https://raw.githubusercontent.com/cogNNitive/cogNNitive/v{semver}/specs/...`), cache by ETag/version, and resolve the version from the model's filename SemVer. `format-core`'s validator consumes the same source, so validator and agent can never diverge.

**4. Behavior-only rules.** The rules Markdown teaches the workflow and points the agent at `get_spec` rather than embedding rules. It is written to be runtime-agnostic so a future embedded chat loads the same file.

**5. Thin FORMAT agent as the distribution unit.** `opencode.json` registers the MCP server; `.opencode/agents/format.md` defines a primary agent (scoped permissions, model, rules) that shows up in OpenCode's dropdown. Committing these to the repo means anyone opening the project gets the FORMAT mode ready.

## Affected Areas

| Area | Impact | Changes |
|------|--------|---------|
| `packages/format-mcp/` (or `apps/format-mcp/`) | **New** | MCP server package wrapping `format-core` with the six tools |
| `packages/format-core/src/` | **Noted/Additive** | Expose a stable programmatic surface (parse/validate/serialize/spec-fetch) if not already public; no behavior change |
| `.opencode/agents/format.md` | **New** | Thin FORMAT primary agent (model, permissions scoped to `models/`, rules ref) |
| `opencode.json` | **New/Modified** | Register the local MCP server under `mcp` |
| `.opencode/rules/format.md` (or agent-referenced rules) | **New** | Behavior-only workflow rules, zero spec content |
| `docs/` | **New** | Short usage note for selecting and using the FORMAT agent |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FORMAT logic leaks into OpenCode config/rules, making a future embedded chat a rewrite | Medium | Hard rule: all logic in MCP + format-core; agent config stays declarative-only. Enforced in design + review. |
| Public spec URL unavailable/offline breaks `get_spec` | Medium | Cache with ETag; fall back to last cached version; surface a clear tool error rather than silent invalid edits |
| Spec version mismatch (model SemVer Ã¢â€°Â  fetched spec) mis-validates | Medium | `get_spec` is version-aware; resolve version from model filename; validate that the resolved version exists before editing |
| Agent bypasses MCP and free-form-edits invalid FORMAT | Medium | Rules mandate `validate_model` after any edit; `apply_change` validates inline; scoped permissions keep blast radius in `models/` |
| OpenCode config schema drift (agents/MCP) across versions | Low | Pin/document the tested OpenCode version (v1.17.x); keep config minimal |

## Rollback Plan

Fully additive and isolated. Rollback = remove the new MCP package, `.opencode/agents/format.md`, the `mcp` entry in `opencode.json`, and the rules/doc files. No existing app or `format-core` behavior is touched, so revert is safe and leaves `format-editor`/`launcher` exactly as before.

## Dependencies

- `@cognnitive/format-core` (existing) Ã¢â‚¬â€ the MCP server depends on it.
- A **published, publicly reachable** FORMAT spec/template URL (versioned). If not yet published at a stable URL, that publication is a prerequisite for `get_spec`/`get_template`.
- OpenCode Desktop (v1.17.x tested) with MCP client + custom primary agents.

## Success Criteria

- [ ] A local MCP server exposes `list_models`, `read_model`, `validate_model`, `apply_change`, `get_spec`, `get_template` and starts under OpenCode via `opencode.json`.
- [ ] Selecting the **FORMAT** agent from OpenCode's mode dropdown loads the MCP tools and the behavior-only rules.
- [ ] Natural-language "add a concept X to model Y" produces a valid FORMAT edit; an intentionally invalid request returns structured validation errors and the agent self-corrects.
- [ ] `get_spec`/`get_template` return spec content fetched from the public URL, cached, and matched to the target model's SemVer.
- [ ] No skill/rules/agent file contains copied spec content (grep for spec keywords returns only pointers/URLs).
- [ ] Agent edits are confined to `models/` (permission scope verified).
- [ ] `apps/format-editor`, `apps/launcher`, and `packages/format-core` behavior is unchanged; existing `format-core` tests pass.
