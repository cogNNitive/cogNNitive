# Use the domain console

The **domain console** is a single, self-contained HTML file generated for a domaiNN. It is the user-facing surface for browsing kNNowledge and reviewing changesets — it replaces the retired Vue editor and hosted web app.

## What it is

The console is one file: `domaiNN_console.html`. Everything it needs — the UI bundle, the CSS, the registered views, and the kNNowledge payload — is inlined, so it opens from the filesystem with no server, no network, and no build step.

There is no per-document console: every console is the domain console, optionally scoped to a subset of documents or a single view.

## Generate and open it

**MCP tool** — regenerates and opens the console in a browser tab:

```text
regenerate_console({ domain: "Aurora" })
```

`regenerate_console` is idempotent: an up-to-date console is reported as `unchanged`. It is also the retry path after an `apply_change` whose console regeneration failed. Pass `model` to scope the console to a single document, and `open: false` to skip opening the browser.

**CLI** — when you are running from a checkout or have the console assets installed:

```console
$ node scripts/export-console.mjs Aurora --domain
```

`--domain` (with no selection) writes one fixed-name file at the domain root:

```text
Aurora/domaiNN_console.html
```

A selection (`<ModelName>`, `--filter <pattern>`, `--all`, `--stale`) instead writes a stable file under `artifacts/`:

```text
Aurora/artifacts/<scope>_console/<scope>_console.html
```

Useful flags:

| Flag | Effect |
|---|---|
| `--status` | Report whether the console is up to date. |
| `--tree` | Print the console's view tree. |
| `--list` | List consoles and views. |
| `--no-open` | Write the file without opening a browser. |

Both writers replace the file through a temporary file and a rename, and only when its bytes actually move.

## What it shows

- **kNNowledge browsing** — every Level-3 document in the domain, with its concepts and elements.
- **Concept colors and icons** — each concept is rendered with a stable color and icon so the shape of a document is readable at a glance.
- **Review views** — the changeset review surface, where a proposed change is shown as a diff you can inspect before approving.

The console is **static**. It cannot call the MCP server, so approvals always come back through your agent: you review in the console, then reply to the agent, which calls `apply_change`. See [Review changesets](review-changesets.md).

## Works offline from `file://`

Because the console is self-contained, you can open it directly:

```text
file:///path/to/Aurora/domaiNN_console.html
```

No web server is required. This is what makes the console safe to archive: an exported console keeps working even with no toolchain installed.

## See also

- [Review changesets](review-changesets.md) — the workflow the review view serves.
- [Agent skills overview](../skills/README.md) — the console skill and custom views.
