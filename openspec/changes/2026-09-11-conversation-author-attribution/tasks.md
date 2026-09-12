# Tasks: Conversation Author Attribution

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-280 (additions+deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low
```

Small-medium multi-module change (core + mcp + 2 SKILL.md + trannsform tests); well under the 400-line budget, fits one PR. DRIFT-FIX NOTE (read once): citations use the `@## NN …: …` pointer grammar — do NOT "correct" `@` back to `#<slug>`; `#` fragments are `KU_MALFORMED` for `--` headings.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | innfo-core + innfo-mcp (Workstream A) | PR 1 | tasks 1-6 |
| 2 | nn-innfo + nn-trannsform + gate (B) | PR 1 | tasks 7-12, same PR |

## Module 1 — innfo-core (Workstream A: `author::`)

- [ ] **1 RED**: extend `iNNfo/packages/innfo-core/src/agentModification.spec.ts`: (a) `AgentModificationContext.author?` accepted; (b) block emits `author::` between `approved_by::` and `model::` (`author: "OpenCode"`); (c) `author:: _` when omitted/whitespace; (d) same `(op,args)` different `author` → only `author::`/`timestamp::` differ; (e) bump_version keeps `version_transition::` in new key order `scope, change, rationale, approved_by, author, model, [version_transition], model_version, timestamp`. No `npm install`.
- [ ] **2 GREEN**: implement `iNNfo/packages/innfo-core/src/agentModification.ts`: add `author?: string` to `AgentModificationContext`; emit `author:: ${ctx.author?.trim() || '_'}` between `approved_by::` and `model::`. Verify `index.ts`/`browser.ts` re-export unchanged.
- [ ] **3 VERIFY**: `npm --prefix iNNfo/packages/innfo-core test` green (incl. new cases).

## Module 2 — innfo-mcp (Workstream A passthrough)

- [ ] **4 RED**: extend `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts`: (a) `args.author: "OpenCode"` flows into `modification` on general success; (b) on `bump_version` success; (c) absent author → `author:: _`; (d) failed mutation → `modification` absent (assert unchanged).
- [ ] **5 GREEN**: implement `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`: `modificationContext(args)` (L32-39) reads `args.author` (string + non-blank → `.trim()`, else undefined) and includes `author`. Confirm both spread call sites need no per-site edit. `ApplyChangeResult` unchanged (input-only).
- [ ] **6 VERIFY**: `npm --prefix iNNfo/packages/innfo-mcp test` green.

## Module 3 — nn-innfo SKILL.md (Workstream A contract)

- [ ] **7**: update `actioNN/skills/nn-innfo/SKILL.md`: §5 add author-fill mandate after rationale-fill (`author:: _` → own tool id, e.g. OpenCode/Antigravity/ClaudeCode; MUST NOT keep unfilled); update §5 args example with `author: "<your-tool-id>"`; replace L341 stale `@<unit>` placeholder with `@## NN Turn NN: <author-id>` (turns) / `@## NN Agent Modification: <scope>` (modifications); §8d add `args.author: "<your-tool-id>"` beside rationale/approved_by; bump `last_updated` + semver. **DECISION: pick MINOR `V_0-4-1`** (paste contract gains a mandatory field).

## Module 4 — nn-trannsform (Workstream B: turn headings)

- [ ] **8 RED**: extend `actioNN/skills/nn-trannsform/test/unit/test-conversations-lifecycle.js`: `resolveTurnHeading` — `(1,'Lucas')`→`## NN Turn 01: Lucas`; `(10,'OpenCode')`→`10`; `(2,undefined)`/`(2,'   ')`→`## NN Turn 02: unnamed`; `(0,'Lucas')`→clamps 01; `(100,'X')`→`## NN Turn 100: X`; slug-parity: `nn-turn-01--lucas` and `@## NN Turn 01: Lucas` resolve (vendored slug mirror). RED `promoteConversation` integration: (a) turn-structured `fullContent`+`format:'full'` writes headings verbatim to `_source.md`; (b) `[none]` unchanged; (c) CLI `--promote-conv --format full` without `fullContent` stays mechanical verbatim copy.
- [ ] **9 GREEN**: implement `actioNN/skills/nn-trannsform/scripts/lib/conversations.js`: export `resolveTurnHeading(seq, authorId)` + `padTurn` (1-based, `padStart(2,'0')`, `unnamed` fallback). No other script wiring — agent supplies turn-structured `fullContent`.
- [ ] **10**: update `actioNN/skills/nn-trannsform/SKILL.md` §2f: insert author-naming step (suggest human name from `git config user.name` AND OS user, manual entry, skip; then confirm agent tool id; sequential human→agent; decline → `unnamed`) for `[full]` path; state promoted `_source.md` renders unique, citeable `## NN Turn NN: <author-id>` via `@## NN Turn NN: <author-id>`. Bump frontmatter.
- [ ] **11 VERIFY**: `npm --prefix actioNN/skills/nn-trannsform run test` green. If `test:promotion` PowerShell exists: not in CI, requires pwsh — do NOT block; mark not-verified per 2026-09-07 precedent.

## Module 5 — whole-change verification

- [ ] **12 GATE**: `npm --prefix iNNfo run test` (workspace), `npm --prefix iNNfo run lint`, `npm --prefix iNNfo run typecheck`, `npm --prefix actioNN/skills/nn-trannsform run test`. `format:check` informational — do not block; zero NEW drift only.

## Next Step

Ready for sdd-apply (single PR; no chain decision needed).
