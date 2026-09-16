# Design: Template Composition Integrity, Source Content-Hash Deduplication, and Contextual Skill UX

## Architecture & Technical Approach

### 1. Template Composition Integrity Gate in Preflight

#### Current Gap
`scripts/preflight-check.js` checks environment conditions (Node.js version, ecosystem skills count, MCP server connectivity, and git commit pin of templates), but performs zero AST composition validation of the templates themselves. A template can have invalid `includes:`, cyclic references, or duplicate matrix headers while still passing preflight with a green checkmark.

#### Design
- Introduce a `validateTemplateCompositions()` check within `scripts/preflight-check.js` (and the `nn-preflight` skill script).
- For each template in `specs/templates/` and `specs/`:
  - Load the template AST.
  - Recursively expand all `includes:` definitions.
  - Check for duplicate Concept / Node identifiers across composed sub-templates.
  - Validate that every matrix `source::` and `target::` resolves to an existing node within the composed tree.
- Categorize findings:
  - **BLOCKER**: Syntax error, broken `includes:` URL/path, or unresolvable matrix endpoints.
  - **WARNING**: Namespace overlap or duplicate concept names across included specs.
  - **OK**: All canonical templates compose into a valid, conflict-free AST.

---

### 2. Resolving Concept Collisions in `business_V_0-2-4`

#### Current Gap
`specs/business_V_0-2-4_NN.md` declares:
```yaml
includes:
  - name: "business-model"
  - name: "analysis"
  - name: "organization"
  - name: "projects"
  - name: "metrics"
```
And defines:
```markdown
## NN Matrix Definition: Metrics-Organizational goals Matrix
source:: Metrics
target:: Organizational goals
```
However:
1. `metrics/spec_NN.md` declares `* [[Metrics]]` as a top-level category node.
2. `business-model/spec_NN.md` and related models reference metrics concepts in strategic headings without qualifying the namespace.
3. The parser in `@cognnitive/innfo-core` encounters duplicate node definitions or ambiguous source mappings when flattening the index.

#### Design
- Disambiguate the composite `business_V_0-2-4` template:
  - Explicitly define the root node hierarchy and ensure `business-model` sub-trees do not redeclare conflicting `Metrics` nodes that shadow `metrics/spec_NN.md`.
  - Update matrix definitions in `specs/business_V_0-2-4_NN.md` and `specs/templates/business/V_0-2-4/business_V_0-2-4_NN.md` to reference unambiguous canonical concepts.
  - Add regression unit tests in `iNNfo/packages/innfo-core/tests/` asserting that `business_V_0-2-4` composes and validates cleanly without errors.

---

### 3. Content-Hash (SHA-256) Source Deduplication

#### Current Gap
When auditing sources in a workspace, files present in both `sources/nn/<category>/` and `sources/nn/import/<category>/` are evaluated by path string only. Identical files with identical content are counted twice, causing the assistant to falsely list imported sources as "new un-cited sources" that require manual review.

#### Design
- Implement a content-hash indexer in the workspace source auditing routine:
  ```typescript
  interface SourceEntry {
    relativePath: string;
    sha256: string;
    isCanonical: boolean;
    primaryPath?: string;
  }
  ```
- Priority rules for primary path:
  1. `sources/nn/<category>/<file>` takes precedence over `sources/nn/import/<category>/<file>`.
  2. If content SHA-256 matches an already-indexed canonical source, register the second path as an `alias` and suppress it from the un-cited sources delta list.
- Expose this deduplication transparently in source scan summaries.

---

### 4. Contextual Prompt Flow in `nn-innfo`

#### Current Gap
The `nn-innfo` prompt mandates lettered menus (`[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[y]`) at the start and after completing secondary actions (like running preflight). This creates a chatbot-like barrier where the user's momentum is interrupted by menu repetition.

#### Design
- Update `actioNN/skills/nn-innfo/SKILL.md`:
  - Enforce **Intent-First Execution**: If the user prompt already contains an actionable request (e.g. "preflight check", "check new sources", "map sessions to students"), execute the requested workflow immediately without presenting the root menu.
  - Transition cleanly after sub-tasks: Once a sub-task completes, provide a direct contextual follow-up question related to the task at hand rather than re-rendering the global `[a]-[y]` menu.
