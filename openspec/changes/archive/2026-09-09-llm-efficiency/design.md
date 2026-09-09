# Design: LLM context efficiency

## Technical Approach

Sequence second after `validator-robustness` and consume its contracts without re-specifying them: `validate_model(baseline_path)` new-error-only output, temp-dir resolver cache, `QUERY_RESULT_CAP=100` in `query-units.ts`. This change adds bounded slice assembly on top of existing read-only units, a no-op-default `intent:` skill field, differential `verify` prompt shaping (caller-side), additive per-intent counters, and a deterministic scorer inside the nn-trannsform pipeline. No new packages, no model/template changes, no persistent index cache (explicit non-goal).

## Architecture Decisions

### Slice assembly (cap 150)

| Option | Tradeoff | Decision |
|---|---|---|
| New slice MCP tool | Clean contract, but new surface + tests | Reject |
| Capped params on existing units (`read_model`, `query_units`) | Minimal diff, reuses caps/truncation | **Accept** |

**Rationale:** `read_model` gains optional `concept` + `element` + `max_lines` (default 150, hard ceiling unless `override_reason` recorded); `query_units` gains optional `max_values_chars` so projections can't smuggle whole files. Surgical assembly = one concept slice + schema excerpt, never `read_model` whole. Cap 150 confirmed: observed artifacts ~600 lines vs surgical touches of tens of lines; 150 fits concept slice + schema with margin, and `override_reason` covers wider spans.

### Intent router

| Option | Tradeoff | Decision |
|---|---|---|
| Required router with enforcement | Strong guarantees, breaks every skill call | Reject |
| Optional `intent:` frontmatter field, no-op default, manual override wins | Zero breakage, relies on skill discipline | **Accept** |

**Rationale:** proposal risk "router complicates skills" demands the minimal seam.

```yaml
intent: surgical   # coach | surgical | verify | match; omit = current behavior
override_intent: verify  # always wins when present
```

### Verify prompts

| Option | Tradeoff | Decision |
|---|---|---|
| Change validator output shape | Breaks existing consumers | Reject |
| Caller-side prompt builder over existing `baseline_path` output | Additive, zero validator diff | **Accept** |

**Rationale:** `verify` prompts carry `{ exit, new_errors[], verdict }` only; full logs stay on disk by path reference. Clean run carries verdict only.

### Measurement gate

| Option | Tradeoff | Decision |
|---|---|---|
| MCP response telemetry | Touches hot server path | Reject |
| Caller-side JSONL counters (`intent`, calls, in/out tokens) | Additive, non-breaking, session-scoped | **Accept** |

**Rationale:** counters live in `scripts/lib/usage-counters.js` (nn-trannsform) plus a skill-documented convention for nn-innfo; benchmark = one promotion run before vs after, recorded per intent.

### Scored matching in nn-trannsform

| Option | Tradeoff | Decision |
|---|---|---|
| LLM fuzzy match in hot loop | Accurate but burns window | Reject |
| Deterministic scorer (`score-matcher.js`) + LLM review of doubtful-only | Cheap bulk, attention where uncertain | **Accept** |

**Rationale:** import → normalize → score → review-doubtful-only. Generics/unmatched enter the review queue; never silent exclusion. Threshold is a named constant with tests.

```js
// scripts/lib/score-matcher.js
export function scorePairs(sources, elements, { threshold = 0.7 } = {}) {}
// → { links: [{sourceId, elementId, score}], queue: [{sourceId, candidates, reason}] }
```

## Data Flow

```
surgical:  skill(intent) ──→ read_model(concept,element,max_lines=150) ──→ slice+schema ──→ edit
                              query_units(capped projection) ──↗
verify:    validate_model(baseline_path) ──→ {exit,new_errors} ──→ prompt(exit+new only) ──→ verdict
                                    full log ──→ disk (path ref only)
match:     import ──→ normalize ──→ score-matcher ──→ links (≥threshold) + queue (<threshold)
                                                    doubtful ──→ LLM review ──→ recorded decision
counters:  every call ──→ usage-counters.js ──→ session JSONL ──→ benchmark before-vs-after
```

Seams: MCP tools import from `@cognnitive/innfo-core` only (unchanged); skills call MCP, never core directly; scorer imports `scanner-core.js` types only, exports `scorePairs`; counters are dependency-free JSONL append.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-mcp/src/tools/list-read.ts` | Modify | Optional `concept/element/max_lines/override_reason` slice params on `readModel` |
| `iNNfo/packages/innfo-mcp/src/tools/query-units.ts` | Modify | Optional `max_values_chars` cap on projected values |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modify | Schema passthrough + descriptions for new params (no new tool) |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modify | None or thin `newErrorsOnly` selector; validator output unchanged |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | `intent:` field, slice-first + differential-verify rules, budgets |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modify | Scored pipeline step + review-queue procedure |
| `actioNN/skills/nn-trannsform/scripts/lib/score-matcher.js` | Create | Deterministic scorer + threshold constant |
| `actioNN/skills/nn-trannsform/scripts/lib/usage-counters.js` | Create | Per-intent call/token JSONL counters |

## Interfaces / Contracts

`read_model(id, { concept?, element?, max_lines = 150, override_reason? })` returns slice + `truncated` flag; unit >150 lines without slice or override is a caller violation, not a server error. `verify` prompt shape: `{ exit: number, new_errors: Diagnostic[], verdict: string, log_path: string }`. Review queue entry: `{ sourceId, candidates: ScoredPair[], status: pending|confirmed|rejected }`; undecided stays queued across sessions.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Slice params (cap/override/truncated), value-char cap, scorer threshold + never-drop, counters append | Vitest (`query-units.spec.ts`, `list-read.spec.ts` sisters) / node runner for scripts |
| Integration | `validate_model(baseline_path)` → verify prompt carries new-only; pipeline import→queue end-to-end on fixtures | Vitest + existing PowerShell nn-trannsform integration tests |
| E2E | Only if wizard/router path changes user flow | Playwright `apps/innfo-editor`, otherwise skip |

## Migration / Rollout

Defaults keep current behavior: omitted `intent:` = no-op, slice params optional, counters additive, scorer runs alongside manual procedure until benchmark passes. No persisted state (no index cache created); rollback = remove `intent:` + budgets, revert matcher to manual. Grandfathering: none required — stated explicitly, no legacy paths.

## Open Questions

- [x] Proposal Q1 slice cap: CONFIRMED at 150 per spec — fits concept slice + schema against ~600-line observed artifacts; `override_reason` covers wide spans. Adjust only with measured counter-evidence from the benchmark.
- [ ] Scorer threshold default (0.7 proposed): finalize during tasks with fixture calibration.
- [ ] Counter JSONL location (workspace `.cogNNitive/` vs temp/): finalize in tasks; must not pollute workspace tree.
