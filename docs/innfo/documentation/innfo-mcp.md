# innfo-mcp

`@cognnitive/innfo-mcp` is an MCP (Model Context Protocol) server that wraps `@cognnitive/innfo-core` and exposes iNNfo models over the stdio transport, so AI coding agents — Claude Code, OpenCode, and others — can read, validate, and edit iNNfo models through structured tool calls instead of freeform file edits.

## Why an MCP server

- Validation stays **deterministic** — the `innfo-core` validator decides validity, not the calling LLM.
- Specification and template content is never duplicated into agent rules or config — it is always resolved live via `get_spec` / `get_template`.
- Spec and template resolution follows the model's `parent_spec` chain or an explicit URL — no hardcoded spec URLs.

## Tools

| Tool | Description |
|------|-------------|
| `list_models` | Scan the models directory and list all iNNfo models |
| `read_model` | Parse and return an iNNfo model's full structure by its id |
| `get_spec` | Resolve the iNNfo specification (level 1) from an explicit URL or a loaded model |
| `get_template` | Resolve an iNNfo template (level 2) from an explicit URL or a loaded model |
| `validate_model` | Validate a model (by id or inline content) against its resolved template |
| `apply_change` | Apply an intent-level change to a model and re-validate it |
| `validate_model_url` | Validate a model fetched from a URL, without writing to disk |
| `validate_template` | Validate a Level 2 template against its Level 1 parent spec, with parent-resolution failure diagnostics |
| `init_model` | Initialize or repair a model file with missing or corrupt frontmatter |

### `apply_change` operations

`apply_change` accepts an `op` and operation-specific `args`:

- `add_concept`
- `add_field`
- `set_marker`
- `add_element`
- `update_field`
- `remove_element`
- `rename_concept`
- `rename_element`
- `generate_index`
- `bump_version`

Each call re-validates the model and returns either the updated model or the validation errors that blocked the change.

## Architecture

```
AI coding agent (Claude Code, OpenCode, ...) → innfo-mcp (MCP server, stdio) → @cognnitive/innfo-core
                                                        ↓
                                    Public iNNfo spec/template URLs (single source of truth)
```

## Running

```bash
# Build the server
npm run build -w @cognnitive/innfo-mcp

# The server communicates over stdio — register it with your MCP-compatible agent/client
```

By default the server scans models under the current working directory; override with the `INNFO_MODELS_DIR` environment variable.

See [OpenCode iNNfo Agent](opencode-innfo-agent) for a full walkthrough of connecting innfo-mcp to OpenCode Desktop.
