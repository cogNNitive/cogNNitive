# @cognnitive/innfo-mcp

Model Context Protocol (MCP) server wrapping `@cognnitive/innfo-core` for the `cogNNitive` ecosystem. Exposes deterministic tools over stdio transport for model parsing, validation, multi-tier template resolution, transitive asset discovery, safe reachability pruning, and intent-level mutations.

---

## Tool Reference

### Model & Spec Tools

- **`list_models`**: Scans the workspace `models/` directory for valid iNNfo models.
- **`read_model`**: Parses an iNNfo model by ID into structured AST/JSON.
- **`get_spec`**: Resolves the Level-1 iNNfo specification from an explicit URL or model `parent_spec.url`.
- **`get_template`**: Resolves a Level-2 template document from a URL or model parent chain.
- **`validate_model`**: Validates a Level-3 model against its template schema, returning diagnostics.
- **`validate_model_url`**: Validates a model fetched directly from a URL without local disk writes.
- **`validate_template`**: Validates a Level-2 template against its Level-1 spec.
- **`init_model`**: Initializes or scaffolds a Level-3 model file with canonical frontmatter and section structure.
- **`apply_change`**: Applies deterministic intent mutations (add field, rename concept/element, `bump_version`).

### Template Package & Discovery Tools

- **`list_templates`**: Scans and lists all Level-2 spec templates available across 4 local tiers (workspace package, workspace flat, global cache, installed skills).
- **`hydrate_template`**: Hydrates (copies) a Level-2 spec template from global or skill stores into the active workspace package directory (`specs/templates/<name>/<version>/`) atomically with write-once cache immutability.
- **`list_template_procedures`**: Discovers procedures defined in a template and its transitively included templates up to depth 10, deduplicating by procedure `id`.
  - Arguments: `model_path`, `model_id`, `template_name`, `version`, `url`, `root`.
- **`list_template_skills`**: Discovers agent skills defined in a template and its transitively included templates up to depth 10, deduplicating by skill `name`.
  - Arguments: `model_path`, `model_id`, `template_name`, `version`, `url`, `root`.

### Maintenance & Safety Tools

- **`prune_orphaned_specs`**: Constructs a workspace reference reachability graph over L3 models, workspace templates, and entrypoint manifests to identify unused/orphaned spec files.
  - Arguments:
    - `dry_run` (`boolean`, default: `true`): Reports orphan candidates without modifying disk.
    - `backup` (`boolean`, default: `true`): Packages candidate specs into `.backup/specs_<timestamp>.zip` prior to removal.
    - `root` (`string`): Workspace root directory override.

---

## Frontmatter Composition & `alias` Syntax

When a Level-2 template composes peer templates via `includes`, explicit frontmatter `alias` maps resolve naming collisions prior to schema merging:

```yaml
---
level: 2
spec_version: "V_0-2-0"
title: "Composite Domain Template"
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
includes:
  - name: "business"
    url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/business/V_0-2-0/spec_NN.md"
    alias:
      concepts:
        "Task": "BusinessTask"
      fields:
        "Item.status": "Item.business_status"
  - name: "projects"
    url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/projects/V_0-2-0/spec_NN.md"
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

`innfo-mcp` resolves template dependencies across four fallback tiers:

1. **Workspace Package Directory**: `./specs/templates/<name>/<version>/`
2. **Workspace Flat Fallback**: `./templates/<name>_V_<version>_NN.md` or `./specs/`
3. **Global User Cache**: `~/.agents/templates/<name>/<version>/`
4. **Installed Skills Directory**: `~/.agents/skills/*/templates/<name>/<version>/`
