# Design: Conversation Author Attribution

## Technical Approach

Two coupled workstreams, both additive and backward-compatible.

**Workstream A (block provenance)** extends the shipped `buildAgentModificationBlock` with a caller-supplied `author` field. `innfo-core` gains `author?: string` on `AgentModificationContext` and emits `author::` between `approved_by::` and `model::`, with an explicit `author:: _` marker when omitted (mirrors `rationale::`). `innfo-mcp`'s `apply_change` accepts `args.author` and threads it through the existing `modificationContext(args)` seam — which already feeds BOTH success paths. `nn-innfo` SKILL.md gains the "replace `author:: _` with your tool id at paste time" mandate plus the tool-id convention, and drops the stale `@<unit>` placeholder in the citation example.

**Workstream B (transcript turns)** resolves the N:M speaker attribution deferral: promoted `_source.md` transcripts render each turn as `## NN Turn NN: <author-id>`. Mechanism chosen: **A1 — the agent rewrites the transcript at close time** (verified: the raw `conversations/*.md` format has NO stable turn marker; see `conversations/2026-09-06_workspace-models-rename.md`, a curated summary, not a turn-annotated log). The agent supplies the turn-structured body as `fullContent` to `promoteConversation`, which already writes it verbatim. A new pure helper `resolveTurnHeading(seq, authorId)` pins numbering + fallback deterministically for tests.

## Architecture Decisions

### Decision: `author` is a caller-supplied context field with `_` fallback
- **Choice**: `AgentModificationContext.author?: string`; builder emits `author:: ${ctx.author?.trim() || '_'}`; key NEVER omitted.
- **Alternatives**: derive from `(op, args)` (rejected — identity is unknowable to the pure builder, same reasoning as `rationale`); structured `{kind, id}` envelope (rejected in proposal, YAGNI).
- **Rationale**: mirrors the shipped `rationale:: _` handling exactly; identical `(op, args)` with differing `author` yields differing blocks only in `author::`/`timestamp::` (spec scenario "Author is caller-supplied").
- Backward-compat: existing callers pass no `author` → `author:: _`; no breaking change. `q()` quoting helpers untouched (`author` is a plain value like `approved_by`, not a quoted target).

### Decision: one seam, two call sites — `modificationContext(args)` carries `author`
- **Choice**: extend `modificationContext` (apply-change.ts:32-39) to read `args.author`; both builder invocations (bump ~L293, general ~L431) already spread `...modificationContext(args)` — no per-site edits needed. `server.ts:626` passes `opArgs` through unchanged; no server change.
- **Alternatives**: per-site `author:` literal (rejected — duplicates the seam the shipping change already built); new 4th parameter (rejected — changes the MCP contract).
- **Rationale**: `author` is inert to every mutation op (only required target keys are read), same as `rationale`/`approved_by`; `ApplyChangeResult` unchanged — `author` is input-only.

### Decision: Turn blocks originate from the agent (A1), not a script parse (A2)
| Option | Tradeoff | Decision |
|---|---|---|
| A1 agent rewrites transcript at close, injects `## NN Turn` headings; `promoteConversation` receives resolved body via existing `fullContent` | Agent has full conversation in context; script stays a verbatim writer (Zero Unilateral Mutation ethos); no fragile marker parsing | **Chosen** |
| A2 deterministic script parse of a turn marker | Requires a stable marker in raw transcripts; **verified absent** (raw files are free-form summaries) — fragile, would invent structure | Rejected |

- `promoteConversation(workspaceRoot, sessionFile, { format: 'full', fullContent })` — the script strips leading frontmatter of `fullContent` (L260-265) and writes verbatim; no parse, no heading injection. CLI `--promote-conv --format full` without `fullContent` stays a mechanical verbatim copy (documented fallback; existing Test 7 stays green).
- New pure export in `scripts/lib/conversations.js`:
  ```js
  function resolveTurnHeading(seq, authorId) {
    const n = String(Math.max(1, Number(seq) || 1)).padStart(2, '0')
    const author = typeof authorId === 'string' && authorId.trim() !== '' ? authorId.trim() : 'unnamed'
    return `## NN Turn ${n}: ${author}`
  }
  ```

### Decision: `## NN Turn NN:` numbering — 1-based, 2-digit zero-padded
- **Choice**: `01`, `02`, … `99`, `100`.
- **Alternatives**: unpadded (`1`, `2`, …) — rejected: `nn-turn-10--x` sorts lexicographically before `nn-turn-2--x` in snippets/navigation.
- **Rationale**: matches the spec scenario (`## NN Turn 01: Lucas`); padding keeps slug ordering aligned with turn order. Verified slug: `headingSlugParts('NN Turn 01: Lucas').slug === 'nn-turn-01--lucas'` (vendored mirror = innfo-core algorithm).

### Decision: Decline-to-name fallback is `unnamed`
- **Choice**: any participant left unnamed (user skips/declines) → `## NN Turn NN: unnamed`. Promotion still completes; never blocks the `_source.md` write (spec scenario). Verified slug `nn-turn-03--unnamed`.
- **Rationale**: deterministic, spec-mandated placeholder; number keeps headings unique even when both participants are `unnamed`.

### Decision: Turn/mutation citations use `@` pointers — the `#<slug>` lexer cannot carry `--`
- **Verified finding**: every `## NN …: …` heading slug contains the `--` Concept/Element boundary (`nn-turn-01--lucas`, `nn-agent-modification--<scope-slug>`). `parseSourceRef`'s slug grammar `[a-z0-9]+(?:-[a-z0-9]+)*` REJECTS `--` → `sources:: [conversations/x_source.md#nn-turn-01--lucas]` returns null → validator error `KU_MALFORMED`. The `@` grammar (`parseKnowledgeUnitRef` → `slugifyUnitHeading` → `extractHeadings`) resolves `--` slugs TODAY with zero core change — both `@## NN Turn 01: Lucas` (raw) and serialized `@##nn-turn-01--lucas` work.
- **Choice**: the canonical, validator-accepted citation for turns and pasted modification headings is:
  `sources:: [conversations/<session-slug>_source.md@## NN Turn 01: Lucas]` / `…@## NN Agent Modification: <scope>`
- **Rationale**: the spec's `#<slug>` prose is shorthand; mechanically the `#` form cannot carry `--` slugs and is deprecated-with-warning (`KU_DEPRECATED_HASH`) anyway. No parser change — the heading-slug machinery is level-agnostic by design (verified: `extractHeadings`/`resolveHeadingSection`/`unitResolve` handle any heading; `markdown-utils.js` mirrors the identical algorithm). Design flags this for spec-prose reconciliation at verify/archive.

### Decision: Turn headings carry NO `author::` key
- **Choice**: the heading text IS the author marker (`## NN Turn NN: <author-id>`); embedded `## NN Agent Modification` blocks self-describe via their `author::` field.
- **Rationale**: avoid duplicate/conflicting attribution keys; blocks travel into arbitrary turns regardless of who authored the turn.

## Concrete Diffs

**`iNNfo/packages/innfo-core/src/agentModification.ts`**
```ts
export interface AgentModificationContext {
  model: string
  modelVersion: string
  timestamp?: string
  rationale?: string
  approvedBy?: 'user' | 'agent'
  author?: string          // NEW — created-by attribution; absent → `author:: _`
  versionTransition?: { from: string; to: string }
}
// in buildAgentModificationBlock, after `approvedBy`:
const author = ctx.author && ctx.author.trim() ? ctx.author.trim() : '_'
// lines array — final fixed order:
// scope, change, rationale, approved_by, author, model, [version_transition], model_version, timestamp
`approved_by:: ${approvedBy}`,
`author:: ${author}`,      // NEW, between approved_by and model
`model:: ${ctx.model}`,
```

**`iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`** (L32-39)
```ts
function modificationContext(args: Record<string, unknown>): {
  rationale?: string
  approvedBy?: 'user' | 'agent'
  author?: string
} {
  const rationale = typeof args.rationale === 'string' ? args.rationale : undefined
  const approvedBy = args.approved_by === 'user' ? 'user' : undefined
  const author = typeof args.author === 'string' && args.author.trim() !== '' ? args.author.trim() : undefined
  return { rationale, approvedBy, author }
}
```
Both call sites already spread it — bump_version (~L293-298) and general success (~L431-435):
```ts
modification: buildAgentModificationBlock('bump_version', args, {
  model: id,
  modelVersion: next.version,
  versionTransition: { from: prevVersion, to: next.version },
  ...modificationContext(args),   // now carries author
}) ?? undefined,
```

## SKILL.md drill-down

**`actioNN/skills/nn-innfo/SKILL.md`**
- §5 (L343): after the rationale-fill mandate, add: "The returned block carries `author:: _`. Replace `_` with your own tool id — the identifier of the agent you are (e.g. `OpenCode`, `Antigravity`, `ClaudeCode`) — at paste time; the pasted block MUST NOT keep an unfilled `author:: _`."
- §5 (L344): args pattern → `args: { …, rationale: "why", approved_by: "user", author: "<your-tool-id>" }`; add the spin: the tool id you pass IS the id you paste — same identifier convention.
- §5 (L341): replace the stale `sources:: [conversations/<session-slug>_source.md@<unit>]` placeholder with the concrete `@`-pointer form above (turns `@## NN Turn NN: <author-id>`; modifications `@## NN Agent Modification: <scope>`).
- §8d (L409): add "pass `args.author: "<your-tool-id>"` alongside `args.rationale` / `args.approved_by` so the block is populated at the source." Bump frontmatter `last_updated` + semver.

**`actioNN/skills/nn-trannsform/SKILL.md`** §2f: insert between steps 4 and 5 an author-naming step (suggest human name from `git config user.name` AND `$env:USERNAME`/OS user as options [a]/[b], manual entry [c], skip [x]; then confirm the agent tool id; sequential — human first, then agent; decline → `unnamed`) and state the promoted `_source.md` renders `## NN Turn NN: <author-id>` headings, unique and citeable. Bump frontmatter.

## Naming-prompt UX (agent, `[full]` path)

```
📋 Author naming (before promoting to sources/conversations/):
Who is the human participant?
  [a] (Recommended) Lucas    (from git config user.name)
  [b] lucas                  (from $env:USERNAME / OS user)
  [c] enter a name manually
  [x] leave unnamed
> a
Your tool id (who produced your turns — e.g. OpenCode, Antigravity)?
  author-id: OpenCode   [Enter] confirm · type to edit
> (confirm)
```
Decline at any point → that participant renders `unnamed`. Promotion completes regardless.

## Data Flow

    agent ── apply_change({op, args:{..., author:"OpenCode"}}) ──▶ innfo-core builder
       │                                                              │
       │        modification block (author:: OpenCode) ◀──────────────┘
       ▼
    reply: ## NN Agent Modification: <scope>  (author marker filled)
       │
    session close ── naming step ([a]/[b]/[c]/[x]; agent id) ──▶ agent rewrites transcript
       │
       ▼
    promoteConversation({format:'full', fullContent: turn-structured body})
       │  resolveTurnHeading(1,'Lucas') → ## NN Turn 01: Lucas …
       ▼
    sources/conversations/<slug>_source.md ──scanner──▶ sources/nn/conversations/<slug>_source.md
       │
       ▼
    citations: sources:: [conversations/<slug>_source.md@## NN Turn 01: Lucas]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/agentModification.ts` | Modify | `author?: string` on context; emit `author::` between `approved_by::`/`model::`; `_` fallback |
| `iNNfo/packages/innfo-core/src/agentModification.spec.ts` | Modify | Key-order (author), `_` fallback, placement, scope/change unaffected |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modify | `modificationContext` reads `args.author` (single seam; both success paths) |
| `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts` | Modify | Author threaded on both success paths; absent → `author:: _`; failure → no modification |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | §5 author-fill mandate + tool-id convention + citation-pointer fix; §8d author arg; frontmatter |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modify | §2f author-naming step + turn-heading rendering rule; frontmatter |
| `actioNN/skills/nn-trannsform/scripts/lib/conversations.js` | Modify | Add pure `resolveTurnHeading(seq, authorId)` + `padTurn`; export |
| `actioNN/skills/nn-trannsform/test/unit/test-conversations-lifecycle.js` | Modify | Turn-heading helper, padding, `unnamed` fallback, verbatim `fullContent` write |
| `openspec/specs/*` | — | NOT touched (delta merge at archive) |

## Testing Strategy (strict_tdd)

| Layer | What to Test | Approach |
|---|---|---|
| Unit (core) | New order `scope, change, rationale, approved_by, author, model, [version_transition], model_version, timestamp` | Update fixed-order `toEqual`; bump-path order incl. `version_transition` |
| Unit (core) | `author:: OpenCode` between `approved_by`/`model`; `author:: _` when omitted/whitespace; same `(op,args)` different `author` → only `author::` diffs | Colocated Vitest cases |
| Integration (mcp) | `args.author` flows on general + bump success; absent → `author:: _`; failed mutation → `modification` absent | Extend `mutate.spec.ts` modification describe |
| Unit (trannsform) | `resolveTurnHeading(1,'Lucas')` → `## NN Turn 01: Lucas`; `(10,…)` → `10`; `(2, undefined)`/`('   ')` → `## NN Turn 02: unnamed` | `test-conversations-lifecycle.js` |
| Unit (trannsform) | Slug resolution: `nn-turn-01--lucas` via vendored slug mirror; `@## NN Turn 01: Lucas` pointer resolves | Lifecycle test + slug-parity suite |
| Integration (trannsform) | `promoteConversation` with turn-structured `fullContent` writes headings verbatim to `_source.md`; `[none]` unchanged; CLI fallback intact | Extend lifecycle file (Test 6/7) |

Commands: `npm --prefix iNNfo run test` · `npm --prefix iNNfo run lint` · `npm --prefix iNNfo run typecheck` · `npm --prefix actioNN/skills/nn-trannsform run test`. `format:check` informational (do not block; zero NEW drift).

## Risks / Edge Cases

- **Historical transcripts (pre-change)**: not retro-mutated — documented limitation; no headings added, still citable by other anchors/text.
- **`--` slugs vs `#` fragments**: resolved — citations use `@` pointers; NO core/parser change needed (verified: heading extraction, scanner, unit resolution are level-agnostic; `slugifyHeading`/mirror parity covers turn headings already).
- **Alternating speakers**: numbering strictly sequential (1, 2, 3…) per turn, author changes per heading; no nesting, no per-participant numbering.
- **>99 turns**: `100`+ renders unpadded — still unique and mostly-order-correct.
- **CLI promotion** (`--promote-conv`): mechanical verbatim copy, no headings — agent-driven path is the spec's promotion path.

## Migration / Rollout

No data migration. `author` is an additive optional arg; `author:: _` output is backward-compatible (existing consumers/tests unaffected except fixed-order assertions). Spec deltas merge at archive; `openspec/specs/` untouched now.

## Open Questions

- [ ] Spec-prose reconciliation: deltas write `#<slug>`; design pins `@## …` pointers as the working form (KU_MALFORMED evidence above). Confirm sdd-verify tests target the `@` grammar.
- [ ] Whether `nn-innfo` frontmatter bump is MINOR (`V_0-4-1`) vs PATCH — prose-only behavior change; tasks to decide.