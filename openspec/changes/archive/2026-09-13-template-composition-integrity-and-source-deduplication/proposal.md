# Proposal: Template Composition Integrity, Source Content-Hash Deduplication, and Contextual Skill UX

## Intent

Address critical user-experience and architectural gaps discovered during real-world workspace operations in cogNNitive:
1. **Eliminate False-Positive Preflight Checks**: Extend preflight diagnostics (`nn-preflight`, `nn-dev-check-integrity`) from shallow file existence / git pin checks to active semantic composition and schema collision checks across all registered Level 2 templates.
2. **Resolve Template Composition Collisions**: Fix composite template namespace collisions (such as the `Metrics` concept collision in `business_V_0-2-4` composed from `business-model` and `metrics`) and establish composition isolation rules.
3. **Automate Content-Hash Source Deduplication**: Implement automatic SHA-256 hash deduplication in `actioNN` source scanning so mirrored or imported sources across `sources/nn/` and `sources/nn/import/` do not create phantom un-cited source backlogs.
4. **Streamline Conversational Skill UX (`nn-innfo`)**: Refactor `nn-innfo` skill prompts to prioritize contextual intent execution over repetitive lettered menu dumps (`[a]`, `[b]`, `[c]`, `[d]`), avoiding disruptive menu re-prompts after targeted actions like preflight or source audits.

---

## Scope

### In Scope

1. **Preflight & Template Composition Validation (`scripts/preflight-check.js`, `@cognnitive/innfo-core`)**:
   - Add a template composition check in preflight that evaluates `includes:` trees of canonical and local templates for conflicting node names, duplicate matrix definitions, and broken parent references.
   - Surface template composition warnings or blockers directly in the preflight report before model generation/scaffolding starts.

2. **Template Composition Bugfix & Schema Namespacing (`specs/business_V_0-2-4_NN.md`, `specs/templates/business/`)**:
   - Fix concept collision between `business-model` (which references business metrics) and `metrics` (which defines the `[[Metrics]]` root index and matrix definitions).
   - Ensure `business_V_0-2-4_NN.md` and related composite specs validate cleanly in `innfo-mcp` and `@cognnitive/innfo-core`.

3. **Source Hash Deduplication (`actioNN/scripts/` / workspace scanner)**:
   - Compute SHA-256 digests for normalized source files in `sources/nn/`.
   - Treat identical files across distinct directory trees (e.g. `sources/nn/<category>/` vs `sources/nn/import/<category>/`) as aliases with a primary canonical reference, eliminating false duplicate reports when cross-referencing against model `sources::`.

4. **Contextual Skill Flow (`actioNN/skills/nn-innfo/SKILL.md`)**:
   - Revise interactive agent prompt guidelines to avoid dumping root option menus when the user has already provided an actionable command or is continuing an established workflow.

### Out of Scope

- Rewriting Level 1 core AST parser primitives.
- Modifying underlying storage engines or git binary protocols.

---

## Capabilities

### New Capabilities

- `template-composition-preflight-gate`: Semantic validation of template composition hierarchies during workspace preflight and integrity checks.
- `source-content-hash-deduplication`: Automated SHA-256 hashing and deduplication of primary and normalized sources in workspace auditing.
- `contextual-agent-orchestration`: Prompt heuristics in `nn-innfo` eliminating redundant root menu regurgitation.

### Modified Capabilities

- `business-template-v-0-2-4`: Fixed namespace alignment for `business_V_0-2-4` composite template.
- `preflight-check`: Enhanced diagnostic reporter showing template composition status alongside Node version and source counts.

---

## Success Metrics

1. **Zero False-Positive Preflights**: Preflight fails or warns immediately if any active or referenced template composition fails schema validation.
2. **Valid `business_V_0-2-4` Compilation**: Models pinned to `business_V_0-2-4` validate cleanly with zero unresolvable matrix or concept collisions.
3. **Accurate Source Delta Reporting**: Workspace source audits report only genuinely new un-cited content, suppressing identical duplicates across import folders.
4. **Fluid Conversation Flow**: `nn-innfo` executes user intents directly without forcing unnecessary menu cycles.
