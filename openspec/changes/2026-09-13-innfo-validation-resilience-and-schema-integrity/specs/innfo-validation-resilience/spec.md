# Specification: iNNfo Validation Resilience

## Purpose

Define the resilience requirements for the `@cognnitive/innfo-core` engine and `innfo-mcp` tools when ingesting, parsing, resolving, and validating iNNfo documents. This includes transparent UTF-8 BOM sanitization, fail-fast gating and noise suppression on unresolvable `parent_spec`, offline fallback via a local canonical template registry, and smart concept drift detection.

---

## Requirements

### Requirement: UTF-8 BOM Auto-Stripping

The system MUST detect and strip leading UTF-8 Byte Order Marks (`\uFEFF` / `0xFEFF`) across all Markdown and YAML frontmatter ingestion and parsing entrypoints in `@cognnitive/innfo-core` and `innfo-mcp`.

1. `parseFrontmatter`, `parseModel`, `loadModel`, `read_model`, `stripFrontmatter`, and tokenizer utilities MUST transparently sanitize leading BOM characters before passing text to YAML or Markdown parsers.
2. Files saved with UTF-8 with BOM (e.g., from Windows Notepad, PowerShell redirection, or legacy IDEs) MUST NOT trigger YAML parse errors, corrupted first-key tokens, or invalid header warnings.
3. When writing or formatting models, the system MUST emit clean UTF-8 without BOM.

#### Scenario: Ingesting frontmatter containing UTF-8 BOM
- GIVEN a Level 3 model file beginning with byte sequence `EF BB BF` (`\uFEFF---\nmodel_version: V_0-1-0`)
- WHEN `parseFrontmatter` or `loadModel` is invoked on the file
- THEN the BOM character is stripped cleanly
- AND the frontmatter parses into a valid JavaScript object without YAML syntax exceptions
- AND `model_version` is correctly extracted as `V_0-1-0`

#### Scenario: Validating model content with BOM via MCP tool
- GIVEN an inline payload to `innfo-mcp_validate_model` starting with `\uFEFF`
- WHEN the validation engine parses the document
- THEN the model is parsed without syntax errors attributable to the leading byte order mark

---

### Requirement: Parent Resolution Hard-Gate & Cascading Error Suppression

The validation engine MUST implement an explicit four-phase pipeline and enforce a fail-fast hard-gate when a model's `parent_spec` cannot be resolved.

1. **Validation Phases**:
   - **Phase 1: Ingestion & Frontmatter Parse**: Extract and validate YAML frontmatter metadata.
   - **Phase 2: Schema Resolution Hard-Gate**: Resolve `parent_spec` via workspace `specs/`, relative path, remote URL, or canonical fallback registry.
   - **Phase 3: Structural & Concept Alignment**: Validate `# NN <Concept>` declarations against parent template definitions and evaluate concept drift.
   - **Phase 4: Element, Field, Matrix, and Reference Validation**: Validate element attributes, data types, matrix intersections, WikiLinks, and `sources::` citations.
2. If Phase 2 fails to resolve the `parent_spec` (and no valid template is supplied via parameters), the engine MUST:
   - Emit a blocking diagnostic with code `PARENT_RESOLUTION_FAILED` (or `PARENT_SPEC_UNRESOLVABLE`) with severity `error`.
   - Include in the diagnostic message: the offending `parent_spec.url` or path, the exact directories and mechanisms searched (`(searched: ...)`), and actionable remediation guidance.
   - **Short-circuit validation**: The engine MUST NOT execute Phase 3 or Phase 4, suppressing all downstream secondary syntax, missing field, dangling reference, or type-mismatch warnings that would otherwise arise from the missing schema.
3. The overall validation result MUST report `valid: false` with the blocking diagnostic as the primary actionable error.

#### Scenario: Model specifies a non-existent local parent spec
- GIVEN a model with frontmatter `parent_spec: { name: "custom_spec", url: "specs/NonExistent_spec_NN.md" }`
- AND the file `specs/NonExistent_spec_NN.md` does not exist on disk
- WHEN `validateModel` is executed
- THEN validation aborts after Phase 2
- AND `result.valid` is `false`
- AND `result.errors` contains exactly the `PARENT_RESOLUTION_FAILED` diagnostic detailing the unresolvable URL and searched paths
- AND NO secondary errors for undefined concept fields or missing matrix schemas are emitted

#### Scenario: Remote parent spec unreachable during network failure without local cache
- GIVEN a model citing `parent_spec.url: "https://custom.domain.org/specs/my_app_NN.md"`
- AND the network request fails with a connection timeout or DNS error
- AND the template is not present in local cache or canonical registry
- WHEN `validateModel` is executed
- THEN a `PARENT_RESOLUTION_FAILED` diagnostic is emitted detailing the network failure and search attempts
- AND downstream schema checks are suppressed

---

### Requirement: Local Canonical Fallback Registry & Alias Resolution

The system MUST maintain a built-in canonical registry and alias mapping table for standard cogNNitive and iNNfo templates to ensure offline resilience and backwards compatibility.

1. The canonical registry MUST bundle standard Level 2 templates, including at minimum:
   - `business_spec_NN` / `business_V_0-2-0_NN.md`
   - `procedures_spec_NN` / `procedures_V_0-2-0_NN.md`
   - `organization_spec_NN` / `organization_V_0-2-0_NN.md`
   - `metrics_spec_NN` / `metrics_V_0-2-0_NN.md`
   - `workspace_spec_NN` / `workspace_V_0-2-0_NN.md`
   - `cogNNitive_spec_NN` / `cogNNitive_V_0-2-0_NN.md`
2. The alias resolution table MUST map common shorthand names, canonical URLs, and legacy repository paths to their corresponding canonical bundled template definition.
3. **Resolution Order**:
   - Step 1: Local workspace `specs/` cache or explicit relative path.
   - Step 2: Global cache (`INNFO_CACHE_DIR` / OS temp cache).
   - Step 3: Remote HTTP/HTTPS fetch (if online).
   - Step 4: Built-in Canonical Fallback Registry (if remote fetch fails or is offline).
4. When a template is resolved via the canonical fallback registry due to remote fetch failure:
   - The resolution MUST succeed, allowing validation and parsing to proceed.
   - The engine SHOULD emit an informational diagnostic or warning indicating that a fallback template was utilized.

#### Scenario: Validating a standard Business model offline
- GIVEN a model with `parent_spec.url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md"`
- AND the host machine is completely offline (no internet access)
- AND `specs/business_V_0-2-0_NN.md` is not present in the workspace
- WHEN `validateModel` or `get_template` is executed
- THEN the resolver matches the canonical alias and loads the bundled `business_V_0-2-0_NN` template
- AND Phase 3 and Phase 4 validation execute successfully against the bundled schema
- AND an informational notice `[CANONICAL_FALLBACK_APPLIED]` is recorded

#### Scenario: Resolving template via shorthand name alias
- GIVEN a model with `parent_spec: { name: "business_spec_NN", url: "business_spec_NN" }`
- WHEN `resolveTemplateWithCache` is invoked
- THEN the resolver resolves the alias to the canonical Business template schema

---

### Requirement: Concept Drift Detection & Semantic Diagnostic Heuristics

The validation engine MUST evaluate instantiated Level 3 concepts against the parent Level 2 template and emit actionable concept drift diagnostics when alien or unmapped concepts are detected.

1. When a Level 3 model declares a section `# NN <Concept>` (or `## NN <Concept>: <Element>`) where `<Concept>` is not defined in `template.concepts` (and not part of reserved structural sections such as `# NN index`, `# NN matrices:`, `## NN External Watch Roots:`, `## NN Agent Modification:`):
   - The engine MUST emit a `CONCEPT_DRIFT_WARNING` diagnostic with severity `warning`.
2. The engine MUST evaluate semantic heuristics to populate actionable candidate suggestions in the diagnostic:
   - **Typo / Levenshtein Distance**: If `<Concept>` closely matches an existing template concept (e.g., `Stakeholder` vs `Stakeholders`, `Metric` vs `Metrics`), suggest the exact canonical concept name.
   - **Cross-Template Match**: If `<Concept>` exists in another canonical template (e.g. `Procedures` or `Tasks` declared in a `business` model), identify the alternate template and suggest using template composition (`includes: [{ name, url }]`) or switching the base template.
   - **Specialization Recommendation**: If `<Concept>` is novel, suggest creating a Level 2 specialization (`<Model>_<Template>_V_x-y-z_spec_NN.md`) to formally declare the new concept and its fields.
3. Concept drift diagnostics MUST NOT mark the model as syntactically broken (`valid: false`) unless strict mode is explicitly enabled, preserving exploratory authoring workflows.

#### Scenario: Typo in concept declaration
- GIVEN a Level 3 Business model declaring `# NN Stakeholder` (singular)
- AND the parent template defines the concept `Stakeholders` (plural)
- WHEN `validateModel` executes Phase 3
- THEN a `CONCEPT_DRIFT_WARNING` diagnostic is emitted
- AND the diagnostic message contains `Did you mean "Stakeholders"?`

#### Scenario: Instantiating concepts from a peer template
- GIVEN a Level 3 Business model declaring `# NN Procedures` and `## NN Procedures: Onboarding`
- AND the parent `business` template does not declare `Procedures`, but the canonical `procedures` template does
- WHEN `validateModel` executes Phase 3
- THEN a `CONCEPT_DRIFT_WARNING` is emitted for `Procedures`
- AND the diagnostic suggests: `"Concept 'Procedures' belongs to the procedures template. Consider composing templates via 'includes' in a Level 2 specialization."`
