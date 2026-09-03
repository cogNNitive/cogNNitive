# Proposal: adhoc-model-authoring-fixes

## Intent

Fix adhoc model authoring issues across `innfo-mcp`, `spec-resolution`, `model-validation-warnings`, and `traNNsform-folder`. Address duplicate file suffix resolution bugs, missing `.xls` extension support and silent drops during document scanning, missing Level 2 template validation in MCP, and HTTP fetch failures on local `file://` parent spec URIs while improving diagnostics.

## Scope

### In Scope
- Support `.xls` in `nn-traNNsform` scanner alongside `.xlsx`, `.docx`, `.pdf`, and surface explicit warnings for omitted unsupported file extensions.
- Add `normalizeId()` helper in `innfo-mcp` to strip trailing `_NN`, `_NN.md`, or `.md` suffixes during model lookup.
- Add Level 2 template validation support in `innfo-mcp` via `validate_template` tool and frontmatter auto-detection.
- Handle local `file://` URIs and OS absolute paths in `resolver-node.ts` using `readFile` instead of HTTP `fetch()`.
- Differentiate `[PARENT_RESOLUTION_FAILED]` diagnostic error code from downstream missing concept validation warnings.

### Out of Scope
- Major metamodel schema restructuring.
- Modification of level-0 format specifications.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `traNNsform-folder`: Support `.xls` scanner extension and issue explicit warnings for unsupported file extensions.
- `innfo-mcp`: Normalize model IDs during resolution and support Level 2 specialization template validation.
- `spec-resolution`: Support `file://` URIs and local absolute paths in Node spec resolver without HTTP `fetch()`.
- `model-validation-warnings`: Emit distinct `[PARENT_RESOLUTION_FAILED]` error when parent specs cannot be resolved.

## Approach

1. **Scanner Extension**: Update media scanner in `apps/innfo-editor` to classify `.xls` files and collect warnings for unsupported extensions.
2. **ID Normalization**: Add `normalizeId()` to `packages/innfo-mcp` `findModelFile` and `readModel` to strip redundant `_NN` suffixes.
3. **Level 2 Validation**: Expose `validate_template` and frontmatter level-2 auto-detection in `packages/innfo-mcp`.
4. **Local Resolver & Diagnostics**: Inspect scheme in `resolver-node.ts`; if `file://` or absolute path, read with `readFile`. Emit explicit `[PARENT_RESOLUTION_FAILED]` on load failure before running model validation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/composables/useMediaScanner.ts` | Modified | Add `.xls` support and unsupported extension warnings |
| `packages/innfo-mcp/src/tools/list-read.ts` | Modified | Add `normalizeId()` helper for model lookup |
| `packages/innfo-mcp/src/tools/spec.ts` | Modified | Use `normalizeId()` and support `validate_template` |
| `packages/innfo-mcp/src/tools/resolver-node.ts` | Modified | Resolve local `file://` / absolute paths via `readFile` |
| `packages/innfo-core/src/validator/index.ts` | Modified | Differentiate parent resolution failure diagnostics |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Path normalization breaks non-standard OS paths | Low | Use standard `node:path` and `fileURLToPath` utilities |
| Template validation false positives on Level 2 specs | Low | Check frontmatter `level === 2` explicitly |

## Rollback Plan

Revert modified files in `packages/innfo-mcp`, `packages/innfo-core`, and `apps/innfo-editor` to their previous Git commits.

## Dependencies

- Node.js `node:url` (`fileURLToPath`) and `node:fs/promises`.

## Success Criteria

- [ ] `.xls` files are recognized by scanner and unsupported extensions emit warnings instead of silent drops.
- [ ] IDs with `_NN` or `_NN.md` resolve correctly without generating `..._NN_NN.md` lookups.
- [ ] `validate_template` and level-2 template validation run cleanly in `innfo-mcp`.
- [ ] `file://` URIs resolve locally without network requests, and parent resolution failures emit `[PARENT_RESOLUTION_FAILED]`.
