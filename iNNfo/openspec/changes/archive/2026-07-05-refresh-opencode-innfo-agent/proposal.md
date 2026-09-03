# Proposal: Refresh OpenCode iNNfo Agent

## Intent

The original `opencode-format-agent` was built for iNNfo V_0-1-1 (_F.md suffix, `format-core` naming). Since then the ecosystem evolved: spec is V_0-2-0 with `_NN.md` suffix, packages renamed to `innfo-*`, and the MCP server (`packages/innfo-mcp`) was built but never wired up. The current agent (`format.md`), rules, docs, spec URLs, and model scanner are all stale — `list_models` returns 0 results, `get_spec`/`get_template` fetch non-existent URLs, `opencode.json` lacks MCP registration, and `findModelFile` can't find the only model. This change brings everything back to working order against the current iNNfo V_0-2-0 conventions.

## Scope

### In Scope
- Rename agent config, rules, and docs from FORMAT/format to iNNfo/innfo naming
- Update `opencode.json` with the MCP server registration (`mcp.servers.innfo-mcp`)
- Fix `listModels` scanner to detect `_F.md` AND `_NN.md` suffixes (or migrate the model)
- Fix `findModelFile` in mutate.ts to also search for `_F.md` extension
- Update `SPEC_BASE_URL` to match current spec version (v0.1.5 → specs/iNNfo_V_0-2-0_NN.md)
- Update template name map (`business_V_0-1-1_FORMAT.md` → `business_V_0-2-0_NN.md`)
- Update rules content to reflect `_NN.md` standard, remove FOLDER references
- Update docs and agent descriptions to match current naming
- Verify `apply_change` data structure compatibility with `ElementsMap`

### Out of Scope
- New MCP tools beyond the existing 6
- Embedded chat UI in `apps/innfo-editor`
- New model creation or model migration (only scanner/finder fixes)
- Rebuilding or redesigning the MCP server architecture
- Changes to `packages/innfo-core` behavior

## Capabilities

### New Capabilities
None — all capabilities already exist.

### Modified Capabilities
- **`opencode-format-agent`** → renamed to **`opencode-innfo-agent`**:
  - Spec URL base updated to `v0.1.5/specs/iNNfo_V_0-2-0_NN.md`
  - Template spec names updated from `_FORMAT.md` to `_NN.md` patterns
  - Model scanning supports both `_NN.md` and `_F.md` suffixes
  - Agent/rules/docs use iNNfo naming (not FORMAT)
  - MCP registration added to `opencode.json`

## Approach

**1. Fix naming across the wire.** Rename `.opencode/agents/format.md` → `innfo.md`, `.opencode/rules/format.md` → `innfo.md`, update `docs/documentation/opencode-format-agent.md` → `opencode-innfo-agent.md`. Update all internal references (agent frontmatter, rule text, doc text). Agent `id` becomes `innfo`, name becomes `iNNfo`.

**2. Fix model discovery (the showstopper).** `helpers.ts:listModels` regex `/_NN\.md$/i` misses `_F.md` models. Change to `/_(NN|F)\.md$/i`. Similarly `mutate.ts:findModelFile` must try `_F.md` as fallback alongside `_NN.md`.

**3. Register MCP in `opencode.json`.** Add `mcp.servers.innfo-mcp` entry pointing to `packages/innfo-mcp/dist/server.js` with stdio transport.

**4. Fix spec URL + template names.** Update `SPEC_BASE_URL` to `v0.1.5/specs`. Replace template name map entries from `_FORMAT.md` to `_NN.md` names.

**5. Update rules content.** Replace `_F.md` → `_NN.md`, remove FOLDER-mode references, update workflow text to match current V_0-2-0 behavior.

**6. Validate `apply_change`.** Confirm `ElementsMap.get()`/`.set()` work correctly with mutate logic (they do — ElementsMap is Map-like). No data structure fix needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.opencode/agents/format.md` | **Modified** | Rename to `innfo.md`, update id/name/description to iNNfo, update MCP references |
| `.opencode/rules/format.md` | **Modified** | Rename to `innfo.md`, update _F.md→_NN.md, remove FOLDER refs, update workflow text |
| `.opencode/opencode.json` | **Modified** | Add `mcp.servers.innfo-mcp` registration block |
| `docs/documentation/opencode-format-agent.md` | **Modified** | Rename to `opencode-innfo-agent.md`, update all naming/URLs |
| `packages/innfo-core/src/helpers.ts` | **Modified** | Fix `listModels` regex to match both `_F.md` and `_NN.md` |
| `packages/innfo-mcp/src/tools/mutate.ts` | **Modified** | Fix `findModelFile` to try `_F.md` extension as fallback |
| `packages/innfo-mcp/src/tools/spec.ts` | **Modified** | Update `SPEC_BASE_URL` to `v0.1.5`, update template name map |
| `openspec/specs/opencode-format-agent/spec.md` | **Modified** | Delta spec: update R2 (tool naming), R7 (URL/version), R9 (mode), R11 (agent name), spec URLs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Renamed agent file breaks existing opencode sessions | Low | Old `format.md` agent is in `.gitignore`; only affects local config — fresh `git checkout` picks up new `innfo.md` |
| Spec URL change breaks existing models' `parent_spec.url` | Med | Updated URL is for `get_spec`/`get_template` only; model files reference their own `parent_spec` — must ensure resolution still works |
| `_F.md` model file conflicts with new `_NN.md` expectations | Low | Both suffixes scanned; existing model works without migration; new models should use `_NN.md` |
| `opencode.json` is untracked — merge conflicts on first commit | Low | Manually ensure no stale local version overwrites; doc the first-commit step |

## Rollback Plan

All changes are additive/config-level within existing files:
- Revert `.opencode/agents/innfo.md` → restore `format.md` from git
- Revert `.opencode/rules/innfo.md` → restore `format.md` from git
- Revert `opencode.json` → remove `mcp` section
- Revert `packages/innfo-core/src/helpers.ts` → restore old regex
- Revert `packages/innfo-mcp/src/tools/spec.ts` → restore old URL/map
- Revert `packages/innfo-mcp/src/tools/mutate.ts` → restore old find logic
- Revert docs rename
- All oneliners — safe to `git checkout` each file

## Dependencies

- npm build succeeds for `packages/innfo-mcp` (pre-req for MCP server)
- Spec at `v0.1.5/specs/iNNfo_V_0-2-0_NN.md` is accessible (public GitHub)

## Success Criteria

- [ ] `list_models` returns the Ghostbusters model (currently returns 0)
- [ ] `get_spec` fetches from `v0.1.5/specs/iNNfo_V_0-2-0_NN.md` (not stale v0.1.1 URL)
- [ ] `get_template('business')` returns template with NN naming (not FORMAT naming)
- [ ] `opencode.json` has an `mcp` section with `innfo-mcp` server registered
- [ ] Agent `innfo.md` appears in OpenCode mode dropdown with MCP tools loaded
- [ ] `apply_change` operations succeed on the Ghostbusters model (elements API compatibility)
- [ ] Rules file no longer references `_F.md` as the primary standard
