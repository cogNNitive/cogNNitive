# Design: Pipeline Validation Gates

## Technical Approach

Two-layer architecture: (1) a `packages/pipeline-gates/` library with `validateGate()` and `integrateGate()` functions, and (2) an MCP `validate_model_url` tool on `packages/innfo-mcp/` for URL-based validation. A CLI script `scripts/pipeline-gate.js` exposes both gates for skill invocation. SKILL.md files in external repos are updated to reference the gates.

## Architecture Decisions

### Decision: Pipeline gates as separate package

**Choice**: New `packages/pipeline-gates/` with `validateGate` and `integrateGate` exports
**Alternatives considered**: Inline in `scripts/pipeline-gate.js`, add to `innfo-mcp` package
**Rationale**: The gates are orchestrator-level concerns (file ops, version parsing, index.md edits) â€” not MCP tools. A separate package keeps concerns clean and is testable via Vitest like other packages.

### Decision: validate_model_url as add-only to innfo-mcp

**Choice**: Add 1 new tool to innfo-mcp (`validate_model_url`) without modifying existing tools
**Alternatives considered**: Inline URL fetch + validate in the gate
**Rationale**: The MCP server already handles spec resolution and caching. Reusing it avoids duplicating that logic. The gate calls the MCP â€” it doesn't replicate it.

### Decision: CLI script wraps the package

**Choice**: `scripts/pipeline-gate.js` imports from `@cognnitive/pipeline-gates` and exposes CLI flags
**Alternatives considered**: No CLI, direct MCP calls or package-only usage
**Rationale**: The workflow-orchestrator and trannsform skills are invoked by AI agents that can run Node scripts more easily than importing packages or making MCP calls. A CLI is the lowest-friction integration point.

### Decision: SKILL.md updates are documented as design decisions, not code

**Choice**: document exact SKILL.md changes in design; apply during implementation
**Alternatives considered**: Keep SKILL.md changes as separate PRs
**Rationale**: Skills are external files but are part of the same delivery. Documenting the exact changes here keeps everything traceable in a single SDD change.

## Data Flow

```
trannsform generates model â†’ output/business/Foo_V_0-1-0_bar_NN.md
                                 â”‚
                                 â–¼
â”Œâ”€ Validate Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  1. Check filename: *_NN.md (not *_NN_draft.md)  â”‚
â”‚  2. Check frontmatter: has spec_version, level,  â”‚
â”‚     parent_spec, model_version, title              â”‚
â”‚  3. Check notice: "> [!NOTE] This is a iNNfo..." â”‚
â”‚  4. Call innfo-mcp validate_model (content mode)  â”‚
â”‚     â†’ fails â†’ GATE FAILS, pipeline stops           â”‚
â”‚     â†’ passes â†’ continue to Integrate              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚ passes
                   â–¼
â”Œâ”€ Integrate Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  1. Parse model_version from frontmatter          â”‚
â”‚  2. Increment patch: V_0-1-0 â†’ V_0-1-1            â”‚
â”‚  3. Update frontmatter model_version               â”‚
â”‚  4. Rename file: *_V_0-1-0_* â†’ *_V_0-1-1_*        â”‚
â”‚  5. Move to workspace root (or target dir)         â”‚
â”‚  6. Update index.md with WikiLink                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚ done
                   â–¼
         Model ready in workspace + index.md updated
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/pipeline-gates/package.json` | Create | ESM package wrapping gates |
| `packages/pipeline-gates/tsconfig.json` | Create | TypeScript config |
| `packages/pipeline-gates/tsup.config.ts` | Create | Bundler config |
| `packages/pipeline-gates/src/index.ts` | Create | Public API: validateGate, integrateGate |
| `packages/pipeline-gates/src/validate.ts` | Create | Naming/frontmatter/notice checks + MCP call |
| `packages/pipeline-gates/src/integrate.ts` | Create | Version increment + file move + index.md |
| `packages/pipeline-gates/src/version.ts` | Create | Version parse/increment utilities |
| `packages/pipeline-gates/src/types.ts` | Create | Shared types |
| `packages/pipeline-gates/src/validate.spec.ts` | Create | Tests for validate gate |
| `packages/pipeline-gates/src/integrate.spec.ts` | Create | Tests for integrate gate |
| `packages/pipeline-gates/src/version.spec.ts` | Create | Tests for version utilities |
| `packages/innfo-mcp/src/server.ts` | Modify | Add validate_model_url tool definition + handler |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modify | Export validateModel for reuse by validate_model_url |
| `scripts/pipeline-gate.mjs` | Create | CLI: `node scripts/pipeline-gate.mjs validate <file>` / `integrate <file>` |
| `~/.agents/skills/innv0-workflow-orchestrator/SKILL.md` | Modify | Add Gate stage type, validation flow, fail-stop |
| `~/.agents/skills/innv0-trannsform/SKILL.md` | Modify | Add post-generation gate call, depends_on metadata |
| `~/.agents/skills/innv0-innfo/SKILL.md` | Modify | Add validation contract reference |
| `~/.config/opencode/skills/sdd-init/SKILL.md` | Modify | Add init pre-flight checks (MCP, skills, URLs) |

## Interfaces / Contracts

```typescript
// packages/pipeline-gates/src/types.ts

export interface GateResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

export interface ValidateOptions {
  /** Path to the model file. */
  filePath: string
  /** Optional. If true, skip MCP validation. */
  skipMcp?: boolean
  /** Optional. The innfo-mcp server URL (default: stdio). */
  mcpServer?: string
}

export interface IntegrateOptions {
  /** Path to the model file. */
  filePath: string
  /** Target directory for the file (default: workspace root from CWD). */
  targetDir?: string
  /** Dry-run mode â€” don't modify files. */
  dryRun?: boolean
}

export interface IntegrateResult extends GateResult {
  newFilePath?: string
  newVersion?: string
  indexEntry?: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `version.ts` â€” parse, increment, format | Vitest, table-driven: V_0-1-0â†’V_0-1-1, V_1â†’V_1-0-1, edge cases |
| Unit | `validate.ts` â€” naming check, frontmatter check, notice check | Vitest with mock file content |
| Unit | `integrate.ts` â€” version bump, file rename, index.md update | Vitest with temp dir fixtures |
| Integration | innfo-mcp `validate_model_url` | Vitest with a test model fixture fetched from URL |
| E2E | Full pipeline: generate â†’ validate â†’ integrate | Shell script invoking pipeline-gate.mjs on a test model |

## Migration / Rollout

No migration required. The first model that goes through the new pipeline will use the gates automatically once the workflow-orchestrator includes Gate stages. Existing models are unaffected.

## Open Questions

- None
