# Proposal: Greenfield Domain Setup, Tooling Ergonomics & Agent UX Polish

## Intent

Real-world end-user session analysis of a greenfield cogNNitive domain creation (from an empty local directory on disk/Google Drive, importing a primary source, and authoring a bespoke Level-2 app and Level-3 model) revealed recurring friction points across the tooling layer, the `innfo-mcp` mutation engine, and the agent interaction model:

1. **Bootstrap In-Place Missing**: The bootstrap CLI in `nn-sources` only supports creating a child folder within a parent destination (`path.join(dest, name)`). When an agent or user is already inside their target workspace directory, there is no `--in-place` (or `--cwd`) mode, forcing agents to invent scratch scripts in `%TEMP%` using Node internals.
2. **MCP Narrative Concept Blind Spot**: In `innfo-mcp`, `propose_changeset` only provides operations for structured elements (`add_element`, `update_field`, `update_matrix_cell`, `remove_element`). There is no operation to update concepts defined with primitive `text` (narrative sections such as Brand, Vision, Mission). Agents are forced to hack the blueprint schema from `text` to `weight` to make them editable.
3. **Matrix Row Orphanage**: When `init_knowledge` scaffolds a starter model with an example element (e.g. `Example Campaña`) and an associated item-markers row, removing that element with `remove_element` cleans the concept section but leaves the row orphaned in the markdown matrix table. The MCP lacks matrix row deletion and does not cascade removals.
4. **Accent & Non-ASCII Matrix Fragility**: `update_matrix_cell` requires normalized ASCII slugs. Lookups using human-readable matrix headers with accents (e.g. `Mensajes × Públicos` or `Campaña`) fail unless manually pre-slugified by the caller.
5. **Traceability Contract Confusion & Changeset Accumulation**: The canonical 2-hop citation model (`element -> changeset -> source`) was not explicitly documented in `nn-innfo`. The agent promised direct citations to the source file, attempted invalid mutations, reverse-engineered the MCP bundle, and generated 34 exploratory changesets that polluted `changes/` and `index.md`. The MCP provides no prune/squash operation, forcing manual shell deletions (`Remove-Item`).
6. **Agent UX & Language Friction**: The agent defaulted to English blueprints (`Campaign`, `Audiences`, `Positioning`) despite both the user prompt and the imported source document being in Spanish. Furthermore, the agent overwhelmed the end user with internal engine plumbing (SHA-256 hashes, AST roles, LF vs CRLF, warnings) and enforced an exhaustive single-letter menu loop (`c`, `a`, `a`, `a`, `a`) instead of adopting optimistic execution.

## Scope

### In Scope

- **CLI & Bootstrap (`nn-sources`)**:
  - Add native `--in-place` flag to `scripts/index.js` and `bootstrapProject` to scaffold the current working directory without directory re-nesting.
- **MCP Mutation Engine (`innfo-mcp`)**:
  - Add `update_concept_text` (or `set_narrative`) operation to `propose_changeset` to support updating `primitive: text` sections.
  - Automatically cascade element removal to matrix rows and reference lists in `remove_element`, or expose `remove_matrix_row`.
  - Add transparent accent-folding and case-insensitive normalization for matrix and concept name lookups.
  - Expose a `prune_changesets` tool in `innfo-mcp` to safely clean up unreferenced exploratory changesets.
- **Agent Skills & Guidance (`nn`, `nn-innfo`, `nn-start`)**:
  - Document the authoritative 2-hop traceability contract (`element -> changeset -> source`) in `nn-innfo/SKILL.md`.
  - Add Domain Language Detection protocol to `nn-innfo`: default blueprint concepts, field names, and matrix titles to the user's conversational/source language.
  - Add Business User UX guidelines: suppress engine plumbing dumps (hashes, AST roles) and apply Optimistic Execution to end-to-end greenfield creation loops.

### Out of Scope

- Changes to Level 0 `defiNNition` grammar or Level 1 `iNNfo` parser specification.
- Modifying legacy domain upgrade workflows (`nn-upgrade`).
- Automated multi-lingual translation engines.

## Capabilities

### New Capabilities
- `bootstrap-in-place`: Initialize the active working directory directly as a cogNNitive domaiNN.
- `mcp-narrative-concept-mutation`: Propose changesets targeting `primitive: text` concepts without altering blueprint types.
- `mcp-changeset-pruning`: Safely prune dangling/unreferenced changesets from `changes/` and update `index.md`.

### Modified Capabilities
- `innfo-mcp`: `remove_element` cascades row cleanup in matrices; `update_matrix_cell` normalizes non-ASCII matrix titles.
- `nn-innfo`: Canonical 2-hop citation protocol documented; domain language auto-detection rule enforced; optimistic execution guidance clarified.

## Approach

1. **Bootstrap In-Place**: Update `skills/nn-sources/scripts/lib/bootstrap.js` so that when `destParentDir` is null or `options.inPlace` is true, `projectDir` defaults to `process.cwd()`. Expose `--in-place` in `skills/nn-sources/scripts/index.js`.
2. **`innfo-mcp` Narrative & Matrix Hardening**:
   - In `innfo-mcp` changeset handler, support an operation `{ type: 'update_concept_text', conceptName: string, content: string }`.
   - On `remove_element`, scan matrix tables and prune rows matching `elementName` / slug.
   - Use slug normalization (`deburr` / lowercase) when matching matrix names in cell operations.
   - Implement `prune_changesets` tool that finds `.md` files in `changes/` not referenced by any active model in `kNNowledge/` or `index.md`, removes them, and re-indexes.
3. **Skill & Protocol Updates**:
   - In `skills/nn-innfo/SKILL.md`, add a dedicated section on "Canonical Traceability & Citation Architecture" explaining how `sources::` on changesets links elements to primary sources.
   - In `skills/nn/SKILL.md` and `skills/nn-innfo/SKILL.md`, add "Language Domain Alignment" and "End-User Abstraction Guard" (hide low-level plumbing unless troubleshooting).

## Risk & Impact

- **Low Risk**: All proposed changes are additive or bug fixes to existing tooling.
- **Backward Compatibility**: Existing workspaces and models remain 100% compliant. Blueprints using `primitive: text` will now work as originally intended without requiring workarounds.
