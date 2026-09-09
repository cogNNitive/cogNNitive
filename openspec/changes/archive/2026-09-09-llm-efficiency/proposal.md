# Proposal: LLM context efficiency

## Intent

Sessions waste LLM context: whole files in prompts for surgical edits, full re-validations per micro-change, raw external sources in the hot loop, one model for reasoning and editing. This change budgets every LLM call — slice reads, per-intent budgets, scored source mapping — sequenced AFTER `validator-robustness`, whose diagnostic codes it consumes.

## Scope

### In Scope
- NEW `llm-context-efficiency`: slice reads with caps over existing MCP query units (never full dumps for surgical work); per-intent context budgets.
- Minimal `intent:` router (`coach`/`surgical`/`verify`/`match`) with manual override, declared by skills.
- Scored source→element mapping with review queue; doubtful pairs queue for review, never silent exclusion (MODIFIES `source-normalization-pipeline`).
- Measurement gate: per-intent call/token counts; benchmark before vs after on one promotion.

### Out of Scope
- NO persistent workspace index cache — deferred unless later measured; `surgical` reads go through existing query units only.
- No model-behavior or template-content changes; no release/process changes.

## Capabilities

### New Capabilities
- `llm-context-efficiency`: slice reads, context budgets, minimal intent router.

### Modified Capabilities
- `source-normalization-pipeline`: scored matching + review queue, never silent exclusion.

## Approach

P0: slice-read rule + differential `verify` prompts (exit + new errors only, full logs stay on disk). P1: `intent:` field + model-per-intent guidance, scored mapping pipeline (import → normalize → score → review doubtful only). Touch `iNNfo/packages/innfo-mcp` (capped slice queries), `actioNN/skills/*` (budgets, router), `nn-trannsform` pipeline (scored matcher).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-mcp` | Modified | Capped slice/query units, concise verify output |
| `actioNN/skills/*` | Modified | `intent:` declaration, context budgets, slice-first rule |
| `actioNN/skills/nn-trannsform` | Modified | Scored source→element matcher + review queue |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Slices omit needed context | Med | Caps documented per intent; manual override always available |
| Router complicates skills | Low | Single optional `intent:` field, no-op defaults |

## Rollback Plan

Remove `intent:` field and budgets — skills fall back to current behavior (no-op defaults). Revert mapping to manual procedure. No persisted state to clean (no index cache is created).

## Dependencies

- `validator-robustness` diagnostic codes (sequence second; `verify` prompts consume new-error-only output).

## Success Criteria

- [ ] Surgical prompts use slices; no file over cap included whole.
- [ ] Iteration token cost down vs measured baseline via the measurement gate.
- [ ] `npm --prefix iNNfo run test`, `lint`, `typecheck` green.

## Proposal question round

1. Slice cap for `surgical` prompts (lines): fix a number now, or let sdd-spec set it after measuring current sizes?
