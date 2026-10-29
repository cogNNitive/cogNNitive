# @cognnitive/nn-mcp

Model Context Protocol (MCP) server wrapping `@cognnitive/nn-core` for the `cogNNitive` ecosystem. Exposes deterministic tools over stdio transport for knowledge parsing, validation, multi-tier blueprint resolution, transitive asset discovery, safe reachability pruning, and intent-level mutations.

---

## Tool Reference

### Knowledge & Spec Tools

- **`list_knowledge`**: Scans the domaiNN `kNNowledge/` directory for valid iNNfo knowledge documents.
- **`read_knowledge`**: Parses an iNNfo knowledge document by ID into structured AST/JSON.
- **`get_spec`**: Resolves the Level-1 iNNfo specification from an explicit URL or knowledge `parent_spec.url`.
- **`get_blueprint`**: Resolves a Level-2 blueprint document from a URL or knowledge parent chain.
- **`validate_knowledge`**: Validates a Level-3 knowledge document against its blueprint schema, returning diagnostics.
- **`validate_knowledge_url`**: Validates a knowledge document fetched directly from a URL without local disk writes.
- **`validate_blueprint`**: Validates a Level-2 blueprint against its Level-1 spec.
- **`init_knowledge`**: Creates a new Level-3 knowledge file with canonical frontmatter and section structure. Create-only: a wrapper over a one-change `add_model` changeset that is written to `changes/` and applied; an existing id fails with `MODEL_EXISTS` and the file is never rewritten.
- **`propose_changeset`**: Writes a sealed changeset with `status: proposed` under `changes/` from a list of operations (`update_field`, `add_element`, `remove_element`, `rename_element`, `rename_concept`, `update_matrix_cell`, `comment`, `add_model`), then regenerates and opens the domain console. Validates before writing and never applies.
- **`apply_change`**: Applies a changeset (or a deterministic direct operation such as `bump_version`). After an applied or partially applied changeset it regenerates the domain console and opens it (`open: false` skips the browser).
- **`regenerate_console`**: Regenerates the domain console (or one model-scoped console) as a stable file under `artifacts/<stem>_console/` and opens it. Idempotent; also the retry path after a failed regeneration.
- **`query_units`**: Queries atomic knowledge units and citations across the domain.
- **`cognitivize`**: Creates or refreshes the sidecar of one raw markdown, CSV, or JSON file in place; binaries return `requires-cli`.
- **`resolve_sources`**: Resolves raw source provenance links and citations.
- **`resolve_effective`**: Read-only. The effective value of a key at a document, or at one scope element of it (`target: { concept, slug }`), folded over the scope chain with `override`, `union` or `none`; the bluepriNNt `defaults/` document is the floor. Returns `{ present, value, winner, trace }` or a structured error.
- **`explain`**: Read-only. Same inputs as `resolve_effective`; returns the same trace plus the chain of scopes it was computed over.

### Blueprint Package & Discovery Tools

- **`list_blueprints`**: Scans and lists all Level-2 spec blueprints available across 4 local tiers (workspace package, workspace flat, global cache, installed skills).
- **`hydrate_blueprint`**: Hydrates (copies) a Level-2 spec blueprint from global or skill stores into the active workspace package directory (`specs/bluepriNNts/<name>/<version>/`) atomically with write-once cache immutability.
- **`list_blueprint_procedures`**: Discovers procedures defined in a blueprint and its transitively included blueprints up to depth 10, deduplicating by procedure `id`.
  - Arguments: `knowledge_id`, `blueprint_name`, `version`, `url`, `root`.
- **`list_blueprint_skills`**: Discovers agent skills defined in a blueprint and its transitively included blueprints up to depth 10, deduplicating by skill `name`.
  - Arguments: `knowledge_id`, `blueprint_name`, `version`, `url`, `root`.

### Domain Management Tools

- **`sync_domain_manifest`**: Synchronizes domaiNN manifest entries with on-disk `kNNowledge/` documents.
- **`check_domain`**: Validates domaiNN structure, entrypoint `domaiNN_NN.md`, and integrity.
- **`init_domain`**: Creates an empty, conformant domaiNN in a new directory (canonical folders, `changes/`, `.gitattributes` with `* -text`, a manifest listing no models). Refuses a non-empty directory.

---

## Review-and-approve flow

`propose_changeset`, `apply_change`, `regenerate_console` and `init_knowledge` return `next_steps`, and the calling agent MUST relay `next_steps.notice` to the user:

1. `propose_changeset` writes the sealed proposed changeset under `changes/`.
2. The domain console is regenerated and opened in a browser tab (the notice carries the file path when it could not be opened).
3. The user reviews the proposed changes in the console. The console is a static file and cannot call the server.
4. The user replies **OK** and the agent calls `apply_change` with `next_steps.approve.changeset`. The console is regenerated again to show the result.

New models enter through an `add_model` change. Migration recipe: `init_domain` for a new domain, import the old domain as a source (`skills/nn-upgrade/scripts/migrate-domain.js --import-as-source`), derive `add_model` / `add_element` changes that cite it through `sources::`, `propose_changeset`, review, `apply_change`.

The console directory is resolved from `INNFO_CONSOLE_DIR`, then the repository checkout, then `~/.agents/console`; when no asset set is found the result carries `console.status: failed` with `CONSOLE_ASSETS_NOT_FOUND` and the change itself is unaffected.

---

## Versioned Tool Envelopes

Every successful tool result is a **versioned machine envelope**. The payload keys are preserved at the top level alongside a `version` field of the form `innfo-<tool>@<major>`:

```json
{
  "version": "innfo-validate-knowledge@1",
  "valid": true,
  "errors": [],
  "warnings": []
}
```

Tools returning a list wrap it under a named key:

```json
{
  "version": "innfo-list-knowledge@1",
  "knowledge": [ { "id": "Ghostbusters_business" } ]
}
```

Consumers MUST check `version` before parsing a result. Optional fields may be added within a major version; a breaking shape or meaning change requires a new major (bumping the envelope contract in `@cognnitive/nn-core`, `src/envelope.ts`). Helpers: `envelope(contract, payload)`, `envelopeList(contract, key, items)`, `envelopeVersion(contract, major)`.

---

## Frontmatter Composition & `alias` Syntax

When a Level-2 blueprint composes peer blueprints via `includes`, explicit frontmatter `alias` maps resolve naming collisions prior to schema merging:

```yaml
---
level: 2
blueprint_version: "V_0-2-0"
title: "Composite Domain Blueprint"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-3-0_NN.md"
includes:
  - name: "business"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/business/V_0-2-0/spec_NN.md"
    alias:
      concepts:
        "Task": "BusinessTask"
      fields:
        "Item.status": "Item.business_status"
  - name: "projects"
    url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/projects/V_0-2-0/spec_NN.md"
    alias:
      concepts:
        "Task": "ProjectTask"
procedures:
  - id: "domain-audit"
    name: "Domain Audit"
    path: "procedures/audit_NN.md"
skills:
  - name: "nn-domain-agent"
    repo: "cogNNitive/actioNN"
    path: "skills/nn-domain-agent"
---
```

---

## 4-Tier Resolution Architecture

`nn-mcp` resolves blueprint dependencies across four fallback tiers:

1. **Workspace Package Directory**: `./specs/bluepriNNts/<name>/<version>/`
2. **Workspace Flat Fallback**: `./bluepriNNts/<name>_V_<version>_NN.md` or `./specs/`
3. **Global User Cache**: `~/.agents/bluepriNNts/<name>/<version>/`
4. **Installed Skills Directory**: `~/.agents/skills/*/bluepriNNts/<name>/<version>/`
