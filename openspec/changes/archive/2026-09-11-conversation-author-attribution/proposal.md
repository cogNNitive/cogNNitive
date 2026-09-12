# Proposal: Conversation Author Attribution

## Intent

Resolve the N:M agent-vs-user author distinction explicitly DEFERRED in `2026-09-07-agent-modifications-source-provenance` (archive, "Agent-vs-user author distinction (N:M, e.g. multi-participant meeting transcripts) — deferred"). Promoted transcripts and pasted Agent Modification blocks must be able to say WHO produced a turn or mutation, not only WHO authorized it. Without this, multi-participant transcripts are unaddressable per speaker and modification blocks cannot attribute work to a specific agent.

## Scope

### In Scope
- `author:: <id>` key in the canonical Agent Modification block (caller-supplied; `_` marker when absent).
- `## NN Turn NN: <author-id>` headings for human/agent turns in promoted `_source.md` transcripts.
- Author-naming confirmation step in the `nn-trannsform` interactive promotion prompt.
- Skill-prose alignment of `@<unit>` → `#<slug>` citation drift in `nn-innfo`.

### Out of Scope
- `is_synthetic`: NOT touched — stays at source level for the `export/ → sources/export/` re-ingestion path; orthogonal to block-level attribution; no conversation-transcript use.
- Structured `{kind, id}` author envelope — rejected (see Approach); documented-convention enforcement only, machine-readable `participants:` map deferred until a consumer needs it (YAGNI).
- Retrofitting author info onto already-promoted historical transcripts — no retroactive mutation.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-modification-provenance`: Canonical Block Field Contract gains `author::` (after `approved_by::`, before `model::`), explicit `author:: _` marker when absent, caller-supplied via `AgentModificationContext`; `nn-innfo` verbatim-paste requirement gains "replace `author:: _` with the agent's tool id at paste time".
- `conversations-lifecycle`: Interactive Transcript Promotion Prompt gains an author-naming step (suggest + confirm participant names) before promotion, resolving names into `## NN Turn NN: <author-id>` headings in the promoted `_source.md`.

## Approach

Flat `author:: <id>` field — no structured envelope; no consumer filters by kind today (lineage `--check`, `sources::` ignore author). Convention: agent ids = tool names (`OpenCode`, `Antigravity`, `ClaudeCode`); human ids = participant names (`Lucas`, `Mercedes`). `approved_by:: user|agent` = WHO AUTHORIZED; `author:: <id>` = WHO PRODUCED — distinct, coexisting semantics. The pure builder cannot know the agent's tool id, so `author` is caller-supplied (`apply_change` args → `AgentModificationContext`); absent → `author:: _` (mirroring `rationale:: _`, replaced at paste by the agent). Turn headings reuse the `## NN <Concept>: <Element>` idiom: `## NN Turn NN: <author-id>` — unique per turn, citeable slug; `author::` NOT duplicated on headings (embedded modification blocks self-describe, as they travel into arbitrary turns). Promotion prompt gains a pre-promotion naming step: agent suggests names (human from `git config user.name` / OS user; agent = its tool id), user confirms/edits, names resolve into `_source.md` headings.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/agentModification.ts` | Modified | Add `author` to `AgentModificationContext`; emit `author::` key, `_` marker fallback, after `approved_by::` |
| `iNNfo/packages/innfo-core/src/agentModification.spec.ts` | Modified | TDD-first unit tests: author field + marker |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | `author` passthrough arg → block context; both success paths |
| `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts` | Modified | Integration tests |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Mandate `author:: _` fill at paste; fix `@<unit>` → `#<slug>` drift (line ~341) |
| `actioNN/skills/nn-trannsform/SKILL.md` + promotion scripts / `test-conversations-lifecycle.js` | Modified | Author-naming prompt step; turn-heading resolution into `_source.md`; tests |
| `openspec/specs/agent-modification-provenance`, `openspec/specs/conversations-lifecycle` | Modified (at archive) | Delta specs merged at archive |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Block schema drift between core/MCP/skill | Med | Single builder + verbatim paste mandate; unit + integration tests |
| Historical transcripts (pre-change) lack author info | High | Documented limitation; no retroactive mutation |
| User declines author naming | Med | Fall back to neutral placeholder or skip promotion (resolved in design) |

## Rollback Plan

Revert commit(s) touching the builder, MCP arg passthrough, and skill prose; re-run `npm --prefix iNNfo run test` gate. Spec delta merge deferred to archive — nothing in `openspec/specs/` mutates until archive, so rollback is a clean revert without spec surgery.

## Dependencies

- None (no external deps; builds on shipped `2026-09-07-agent-modifications-source-provenance` artifacts).

## Success Criteria

- [ ] `buildAgentModificationBlock` emits `author::` after `approved_by::`; `author:: _` present when caller omits
- [ ] `apply_change` accepts `author` arg; `modification` on both success paths carries it
- [ ] Promoted `_source.md` turns render as `## NN Turn NN: <author-id>` with unique slugs
- [ ] `nn-innfo` no longer uses `@<unit>` in `sources::` citations
- [ ] Unit + integration tests green (`npm --prefix iNNfo run test`); lint/typecheck clean