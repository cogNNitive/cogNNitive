# Proposal: iNNfo Validation Resilience and Schema Integrity

## Intent

Improve resilience and developer/agent experience when authoring, scaffolding, upgrading, and validating living iNNfo Level 3 models against evolving Level 2 templates, MCP tools, and remote specification changes. Prevent misleading cascading reference/syntax errors when schemas cannot be resolved, ensure robust local fallback for built-in specifications, sanitize UTF-8 BOM encoding issues across frontmatter parsers, provide smart concept drift heuristics, and introduce a Step 0 schema integrity gate and mechanical upgrade guidance in `nn-innfo`.

---

## Scope

### In Scope

1. **Engine / MCP Resilience (`@cognnitive/innfo-core` & `innfo-mcp`)**:
   - **UTF-8 BOM Auto-stripping**: Automatic detection and stripping of `\uFEFF` byte-order marks (BOM) in YAML frontmatter loaders, parsers, and AST tokenizers across the core engine and MCP server.
   - **Hard-Gate on Unresolvable `parent_spec`**: Fail-fast validation gating when a model's `parent_spec` cannot be resolved locally or remotely. Emit a blocking diagnostic (`PARENT_SPEC_UNRESOLVABLE` / `CRITICAL_BLOCKER`) and stop/flag unresolvable schemas before generating misleading partial, syntax, or reference warnings.
   - **Local Canonical Registry & Alias Fallback**: Provide a built-in canonical registry and alias fallback mechanism for standard template specifications (e.g. `workspace_spec_NN`, `cogNNitive_spec_NN`, `business_spec_NN`, `procedures_spec_NN`, `organization_spec_NN`, `metrics_spec_NN`) when remote URLs fail, network is offline, or GitHub is unreachable.
   - **Concept Drift Heuristics**: Analyze Level 3 models against the parent template to detect when an instantiated concept is absent from the parent Level 2 template, emitting actionable diagnostic suggestions (e.g. suggesting matching alternate templates, recommending template extension / specialization, or identifying typos).

2. **Skills / Agent Guidance (`actioNN/skills/nn-innfo/SKILL.md`)**:
   - **Step 0 Schema Integrity Pre-Check**: Introduce a mandatory Step 0 schema integrity pre-check in `nn-innfo` before attempting downstream child reference, matrix, or element repairs.
   - **Mechanical Upgrade & Linting Advice**: Comprehensive agent playbook for fixing common legacy or corrupt patterns:
     - Sanitizing hidden BOM characters.
     - Removing obsolete Level 3 `# NN index` root headings.
     - Detecting and resolving slug and heading collisions.
     - Migrating legacy frontmatter attributes to current V_0-2-0 standards.

### Out of Scope

- Modifying the core Level 1 `iNNfo` / `defiNNe` meta-specification grammar.
- Autonomous background network polling or scraping daemons.
- Overwriting user model files without explicit confirmation or agent-in-the-loop review.

---

## Capabilities

### New Capabilities

- `innfo-validation-bom-sanitizer`: Transparent detection and stripping of UTF-8 BOM headers across all Markdown and YAML frontmatter ingestion pipelines.
- `innfo-canonical-spec-registry`: Built-in local fallback registry and alias resolution table for standard ecosystem specifications.
- `innfo-concept-drift-diagnostics`: Semantic heuristics detecting alien concepts in Level 3 models relative to parent Level 2 templates, offering remediation suggestions.
- `nn-innfo-step-zero-gate`: Agent protocol enforcing schema resolution verification prior to deep child reference remediation.

### Modified Capabilities

- `innfo-mcp-validate-model`: Enhanced validation lifecycle with early hard-stop gating on unresolvable `parent_spec` and suppressed secondary cascading diagnostics.
- `nn-innfo-upgrade-guidance`: Updated linting, mechanical cleanup, and troubleshooting instructions in `actioNN/skills/nn-innfo/SKILL.md`.

---

## Approach

### 1. Frontmatter BOM Sanitization
- In `@cognnitive/innfo-core` (and MCP readers `loadModel`, `parseFrontmatter`, `read_model`), normalize incoming file buffers and strings by stripping leading byte-order marks (`str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str` / `\uFEFF`).
- Ensure YAML frontmatter parsers receive clean string inputs, avoiding YAML parse exceptions on Windows-authored files or editors that inject BOMs.

### 2. Validation Pipeline Hard-Gate & Error Suppression
- Reorder validation execution into explicit phases:
  1. **Phase 1: Ingestion & Frontmatter Parse**: Extract frontmatter and identify `parent_spec`.
  2. **Phase 2: Schema Resolution Hard-Gate**: Resolve `parent_spec` via local cache (`specs/`), workspace relative path, remote fetch, or canonical registry fallback.
     - If resolution fails: Emit a single `CRITICAL_BLOCKER` diagnostic with searched paths and candidate fixes. **Short-circuit validation** to prevent misleading secondary warnings (such as undefined fields or dangling references).
  3. **Phase 3: Structural & Concept Alignment**: Compare model `# NN <Concept>` declarations against parent template concepts.
     - If concepts drift: Emit `CONCEPT_DRIFT_WARNING` with candidate templates or extension hints.
  4. **Phase 4: Element, Field, Matrix, and Reference Validation**: Execute detailed schema checks only after schema structure is confirmed valid.

### 3. Local Canonical Registry & Alias Map
- Embed a canonical fallback registry in `innfo-mcp` / `@cognnitive/innfo-core` mapping common template names and legacy alias URLs (`workspace_spec_NN`, `cogNNitive_spec_NN`, `business_V_0-2-0_NN.md`, etc.) to bundled canonical template definitions.
- When remote URL resolution encounters network errors (DNS, timeout, 404), seamlessly fallback to the canonical registry while logging an informational notice.

### 4. Agent Guidance & Step 0 Gate in `nn-innfo`
- Update `actioNN/skills/nn-innfo/SKILL.md` to instruct agents:
  - **Step 0 Pre-Check**: Before diagnosing child reference warnings or modifying model elements, confirm that `parent_spec` resolves cleanly.
  - **Mechanical Linting Rules**:
    - Strip BOMs if frontmatter fails to parse.
    - Remove `# NN index` (H1 index headings belong to workspace navigation, not Level 3 domain models).
    - Ensure slug uniqueness across `## NN Concept: Element` headings.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/` | Modified | Add UTF-8 BOM sanitization in frontmatter parsing and helpers |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modified | Implement `parent_spec` hard-gate, suppress cascading errors, and add concept drift heuristics |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modified | Add local canonical registry and alias fallback for built-in templates |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modified | Support canonical alias mapping and offline resolution |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Document Step 0 schema integrity gate and mechanical upgrade / linting playbook |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Canonical registry version drift | Low | Prioritize explicit workspace `specs/` cache and explicit URLs; registry acts strictly as offline fallback |
| False-positive concept drift warnings on custom extensions | Low | Classify concept drift as informational suggestions / warnings rather than blocking errors |
| Masking real syntax errors with short-circuiting | Low | Short-circuit only on unresolvable `parent_spec`; resume full validation once schema resolves |

---

## Rollback Plan

- All changes are backwards-compatible additions to parser resilience and validation diagnostics.
- If necessary, revert commits in `iNNfo/packages/innfo-core`, `iNNfo/packages/innfo-mcp`, and `actioNN/skills/nn-innfo/SKILL.md`. Existing valid models will continue to function without disruption.

---

## Dependencies

- `@cognnitive/innfo-core`
- `innfo-mcp`
- `actioNN/skills/nn-innfo`

---

## Success Criteria

- [ ] Frontmatter parser handles files with UTF-8 BOM (`\uFEFF`) without throwing syntax errors.
- [ ] Models with unresolvable `parent_spec` produce a single, actionable `CRITICAL_BLOCKER` without secondary cascading reference noise.
- [ ] Validation succeeds offline or during network dropouts for standard templates via the canonical registry fallback.
- [ ] Concept drift heuristics flag undefined concepts in Level 3 models and suggest relevant templates or specializations.
- [ ] `actioNN/skills/nn-innfo/SKILL.md` includes the Step 0 schema pre-check and mechanical upgrade playbook.
