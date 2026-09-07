# Proposal: Agent Modifications Source Provenance

## Intent

The agent modifies iNNfo models through `innfo-mcp_apply_change` without recording, in a structured and traceable way, WHAT it changed, WHY, and with what authorization. Today the agent documents modifications free-form and inconsistently (sometimes a summary, sometimes nothing), and `sources::` cannot cite synthetic agent reasoning because no addressable block exists. The goal is source-attribution traceability for every piece of information in a Level-3 model.

The strict provenance rule (already agreed): every piece of information in a Level-3 model has a `sources::` resolving always to `sources/nn/`. Two source channels exist: formal sources (`sources/import/` → `sources/nn/`) and conversation sources (agent+user contributions; `conversations/` → `sources/conversations/` → `sources/nn/conversations/`).

The synthetic agent case is resolved by "Capa B": the MCP emits a STRUCTURED **Agent Modification** block as part of the `apply_change` result. The MCP knows exactly which `op` ran, on which concept/element, and with which args, so the `scope` is exact and deterministic. The `nn-innfo` skill instructs the agent to paste that block verbatim into its reply, producing a `## NN Agent Modification: <slug>` heading addressable by heading-slug in the promoted transcript, citeable via `sources:: [conversations/<slug>_source.md#<slug>]`.

A second, unifying generalization is folded in: **a Model is a first-class Source**. The same identifier form — `<workspace-relative-path>.md#<heading-slug>` — addresses any knowledge block in the workspace, whether the file is a Source under `sources/nn/` or a Model under `models/`. This makes cross-model citations possible: an artifact can cite an element of a Model (`models/x.md#element-a`) which in turn cites a Source (`sources/nn/1.md#section`), closing a fully traceable chain with one uniform mechanism. The parser (`parseSourceRef`) and validator (`validateWorkspaceSources`) already accept `models/...`; this change formalises the rule, extends artifact citation to Models, and pins the heading-level convention (H1 = Concept, H2 = Element, H3+ = description) as an authoring rule.

## Scope

### In Scope
- `iNNfo/packages/innfo-core`: a function generating the structured modification block from `(op, args)`.
- `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`: `ApplyChangeResult` gains a `modification` field carrying the block; `applyChange` populates it on both success paths (general mutation ~L400 and `bump_version` ~L268).
- `actioNN/skills/nn-innfo/SKILL.md`: instruct the agent to paste the block verbatim into its reply.
- `actioNN/skills/nn-trannsform`: conversation promotion flow — remove `_summary.md` from the standard promotion menu/options; keep the raw transcript always registered in `conversations/`; promotion to `_source.md` stays OPTIONAL.
- **Cross-model provenance (chain-complete):**
  - Formalise the rule "a Model is a first-class Source" — `models/<path>.md#<slug>` is a valid Citation target, uniform with `sources/nn/<path>.md#<slug>`.
  - Extend artifact citation (`actioNN/skills/nn-trannsform/citations.md`) so a deliverable can cite a Model element (`models/x.md#element-a`) in addition to a Source — the artifact→model→source chain.
  - Pin the heading-level convention (H1 = Concept, H2 = Element, H3+ = description) as an authoring rule so model-heading slugs are meaningful and stable.

### Out of Scope
- Concrete schema of the block (design phase).
- Discovery/progressive-disclosure tiering for conversation promotion (future generic conversation).
- Agent-vs-user author distinction (N:M, e.g. multi-participant meeting transcripts) — deferred.

## Capabilities

### New Capabilities
- `agent-modification-provenance`: covers the structured Agent Modification block generation in innfo-core, its propagation through `applyChange` results, and the nn-innfo verbatim-paste instruction that makes the block addressable/citeable.

### Modified Capabilities
- `conversations-lifecycle`: promotion flow — `_summary.md` removed from the standard menu; raw transcript always registered; `_source.md` promotion stays optional.
- `source-normalization-pipeline`: normalization continues to accept `_source.md` (and no longer a `_summary.md` path in the standard flow).
- `document-citations`: artifact citations may now target Models (`models/<path>.md#<slug>`) as well as Sources — closing the artifact→model→source chain. Includes the heading-level convention (H1/H2/H3) as an authoring rule for stable, meaningful model-heading slugs.

## Approach (non-binding)

1. Add a pure function in `innfo-core` (e.g. `buildAgentModificationBlock(op, args)` → structured block, mirrored by a unit spec).
2. Wire it into `applyChange`'s two success returns via a new `modification` field on `ApplyChangeResult`.
3. Update `nn-innfo/SKILL.md` §5/§8 to mandate pasting the emitted block verbatim, yielding the `## NN Agent Modification` heading.
4. Update `nn-trannsform` promotion (SKILL.md + `scripts/lib/conversations.js` + README) to drop `_summary.md` from the menu while keeping the raw transcript and optional `_source.md`.

**Agent Modification block (INTENT — fields below, exact schema in design):** `scope` (op + concept/element + args), `change` (what was written), `rationale` (why), `approved_by` (authorization), plus any further fields the design deems necessary (e.g. model id, timestamp, version).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/mutate.ts` (+ spec) | Modified | New block-builder function |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | `modification` field on result, both success paths |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Verbatim block paste instruction |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modified | Promotion flow, `_summary.md` removal |
| `actioNN/skills/nn-trannsform/scripts/lib/conversations.js` | Modified | Promotion options/menu |
| `actioNN/skills/nn-trannsform/citations.md` | Modified | Artifact citations may target Models (cross-model chain) + heading-level convention |
| `actioNN/skills/nn-trannsform/scripts/transformer.js` | Modified (if needed) | Mechanical fallback aware of `models/` as citation sources |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Block schema drift between core/mcp/skill | Med | Single builder in core consumed by mcp; skill references it |
| `_summary.md` removal breaks existing sources | Med | Raw transcript + `_source.md` retained; scanner keeps accepting `_source.md` |
| Scope not exact for some ops | Low | MCP derives scope deterministically from op+args |

## Rollback Plan

Revert the `modification` field to optional/absent in `ApplyChangeResult` (backward-compatible addition), restore the `_summary.md` promotion option, and remove the paste instruction. No data migration required.

## Dependencies

- `iNNfo/packages/innfo-core` published/available to `innfo-mcp` (workspace dependency).

## Success Criteria

- [ ] `applyChange` returns a structured modification block on both success paths.
- [ ] `nn-innfo` instructs verbatim paste creating an addressable `## NN Agent Modification` heading.
- [ ] A promoted `_source.md` transcript with an Agent Modification block is citeable via `sources:: [conversations/<slug>_source.md#<slug>]`.
- [ ] `_summary.md` removed from standard `nn-trannsform` promotion; raw transcript always registered.
- [ ] A Model element is citeable as a first-class Source: `sources:: [models/<path>.md#<slug>]` validates.
- [ ] An artifact can cite a Model element (`models/x.md#element-a`) closing the artifact→model→source chain in `citations.md`.
- [ ] The heading-level convention (H1 = Concept, H2 = Element, H3+ = description) is documented as an authoring rule.

---
Size: **medium** (innfo-core + innfo-mcp + two actioNN skills). Single PR default (iNNfo AGENTS.md), review budget 800 lines.
