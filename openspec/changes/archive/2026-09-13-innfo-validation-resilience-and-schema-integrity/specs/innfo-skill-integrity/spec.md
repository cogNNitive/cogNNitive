# Specification: iNNfo Skill Schema Integrity & Mechanical Upgrade Protocol

## Purpose

Define the protocol requirements for the `nn-innfo` skill (`actioNN/skills/nn-innfo/SKILL.md`) when authoring, repairing, and upgrading iNNfo models. This includes a mandatory Step 0 Schema Integrity Gate to verify schema resolution before attempting downstream child element repairs, and a mechanical linting/upgrade playbook for eliminating legacy syntax and encoding artifacts.

---

## Requirements

### Requirement: Step 0 Schema Integrity Gate

Before attempting to diagnose or repair child reference warnings, matrix mismatches, or element field inconsistencies in a Level 3 model, the agent MUST verify that the model's `parent_spec` resolves cleanly to a valid Level 2 template.

1. The agent MUST inspect the result of `innfo-mcp_validate_model` (or `innfo-mcp_get_template`) for `PARENT_RESOLUTION_FAILED` or `CRITICAL_BLOCKER` diagnostics.
2. If `parent_spec` cannot be resolved:
   - The agent MUST halt all downstream field, matrix, or reference remediation.
   - The agent MUST NOT attempt to edit child elements or add missing fields while the parent schema is unreachable.
   - The agent MUST report the unresolved parent template to the user, displaying the searched paths `(searched: ...)` and offering remediation options:
     - Correct the `parent_spec.url` to a valid stable HTTP/HTTPS URL or workspace-relative path.
     - Rehydrate the template into `specs/` using `innfo-mcp_hydrate_template` or canonical registry fallback.
     - Check the MCP root configuration (`INNFO_MODELS_DIR`).
3. Only after the schema resolution gate passes (`parent_spec` successfully resolved) SHALL the agent proceed to Phase 3/4 content and reference remediation.

#### Scenario: Agent attempts to fix a model with broken parent spec URL
- GIVEN an active model `models/Domain_NN.md` with an unresolvable `parent_spec.url`
- AND the validation output reports `[PARENT_RESOLUTION_FAILED]`
- WHEN the agent executes the audit or repair workflow in `nn-innfo`
- THEN the agent executes Step 0 and halts further edits
- AND the agent informs the user that the parent schema is unreachable
- AND the agent does NOT suggest adding or modifying child element fields until the schema link is fixed

#### Scenario: Agent repairs model after parent spec resolves
- GIVEN an active model whose `parent_spec.url` resolves cleanly to `specs/business_V_0-2-0_NN.md`
- WHEN the agent performs validation and audit
- THEN Step 0 succeeds
- AND the agent proceeds to analyze and repair child references, matrix crossings, and field types

---

### Requirement: Mechanical Linting & Encoding Sanitization Playbook

The `nn-innfo` skill MUST provide deterministic instructions for identifying and mechanically repairing legacy syntax, corrupted encodings, and obsolete structural patterns.

1. **BOM Encoding Sanitization**:
   - The agent MUST detect files containing byte order marks (`\uFEFF`) and strip them upon saving, enforcing UTF-8 without BOM.
2. **Obsolete Level 3 `# NN index` Removal**:
   - The agent MUST remove root `# NN index` navigation blocks from Level 3 domain models (`models/*_NN.md`).
   - The `# NN index` heading is reserved exclusively for workspace manifest documents (`workspace_NN.md` / `index.md`) and Level 2 templates, not Level 3 domain data models.
3. **Heading and Slug Collision Detection**:
   - The agent MUST detect duplicate `## NN <Concept>: <Element>` headings within a model file that yield identical slugs (e.g. `## NN Person: Alice` and another `## NN Person: Alice`).
   - The agent MUST prompt for disambiguation or rename duplicate elements using `innfo-mcp_apply_change` (`rename_element`).
4. **Frontmatter Standardization (V_0-2-0)**:
   - The agent MUST ensure Level 3 frontmatter contains only valid metadata: `model_version`, `parent_spec: { name, url }`, and optional workspace/provenance tags.
   - The agent MUST remove forbidden legacy frontmatter structures such as `concepts: []` or `fields: []` embedded in YAML frontmatter.

#### Scenario: Agent encounters Level 3 model with obsolete `# NN index`
- GIVEN a Level 3 model containing `# NN index\n* [[Stakeholders]]\n* [[Offerings]]`
- WHEN the agent lints or refactors the model
- THEN the agent removes the `# NN index` section from the Level 3 model file
- AND verifies that navigation remains correctly derived from the Concept section headings (`# NN Stakeholders`, `# NN Offerings`)

#### Scenario: Agent detects slug collision across elements
- GIVEN a model containing two headings with the exact same identifier `## NN Features: Export`
- WHEN the agent runs the mechanical lint check
- THEN the collision is flagged as an error
- AND the agent prompts the user with distinct candidate names (e.g., `Export CSV`, `Export PDF`) to restore referential uniqueness
