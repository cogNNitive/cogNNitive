# Design: Agent Modifications Source Provenance

## Technical Approach

Two coupled workstreams.

**Workstream A (Capa B)** adds a pure, side-effect-free block builder `buildAgentModificationBlock` in `innfo-core` (near `mutate.ts`), exported for `innfo-mcp`. `applyChange` populates a new optional `ApplyChangeResult.modification?` on both success paths. `nn-innfo` mandates the agent pastes that block verbatim under `## NN Agent Modification: <slug>`, making it addressable by heading-slug and citeable via `sources:: [conversations/<slug>_source.md#<slug>]`.

**Workstream B** formalises the already-implemented "Model is a first-class Source" rule (parser + validator already accept `models/...`) as authoring documentation in `citations.md`, extends artifact citations to Models, and pins the heading-level convention.

**Confirmed implemented (no code change needed for B):** `parseSourceRef` (`sourceRef.ts:57`) parses `models/<path>.md#<slug>` with `kind: 'model'`; `validateWorkspaceSources` (`workspaceSources.ts:61`) resolves both `sources/nn/` and `models/` via the host `SourceResolver`. Only documentation/assertion is genuinely new for B.

## Architecture Decisions

### Decision: Builder lives in innfo-core near mutate.ts
- **Choice**: New file `src/agentModification.ts` in `@cognnitive/innfo-core`; re-export from `index.ts` and `browser.ts` (alongside `applyMutation`, `slugifyHeading`).
- **Alternatives**: Put it in innfo-mcp (rejected — mcp is a thin host; core is the shared schema/logic layer and already owns `mutate` + `sourceRef`).
- **Rationale**: Matches existing seam (mcp imports core; core owns mutation + slug logic the builder depends on). No circular dep: core → nothing new; mcp → core (existing edge).

### Decision: `rationale` / `approved_by` flow through `opArgs`
- **Choice**: `applyChange(rootDir, id, op, args)` reads `args.rationale` (optional string) and `args.approved_by` (optional `'user' | 'agent'`, default `'agent'`) from the same `args` object already passed to `coreApplyMutation`. The MCP tool passes `opArgs` through unchanged (`server.ts:473`). The builder receives them as caller-supplied context, not derived from `op`/`args` target fields.
- **Alternatives**: A separate fourth parameter / envelope field (rejected — would change the `apply_change` MCP contract; the tool's JSON-RPC `args.args` is the single carrier).
- **Rationale**: `rationale`/`approved_by` are inert keys ignored by every mutation op (only required target keys are read), so passing them through is safe and backward-compatible.

### Decision: Scope is a deterministic string per op; slug = `slugifyHeading(scope)`
- **Choice**: `scope` is a compact, human-readable string `"<op> <target…>"` built from the executed op + required args. The `## NN Agent Modification:` heading text is `## NN Agent Modification: <scope>`, so the anchor is `<scopeSlug> = slugifyHeading(scope)` — idempotent (already-slugged) under the shared `slugifyHeading` (`sourceRef.ts:133`), guaranteeing `sources:: [conversations/<slug>_source.md#<slug>]` resolves.
- **Alternatives**: Separate short `slug` field (rejected — redundant; scope-derived slug is deterministic and matches the spec's "slug derived deterministically from scope").
- **Rationale**: Guarantees GitHub-compatible anchors without a second algorithm; collision-safe per transcript because `extractHeadings` disambiguates repeats (`-1`, `-2`).

### Decision: bump_version records a version transition
- **Choice**: `model_version::` always holds the resulting version (base contract). For `bump_version` an extra key `version_transition:: <previous> → <resulting>` records both, keeping `model_version` semantics uniform.
- **Alternatives**: Put both versions in `model_version::` (rejected — breaks the "resulting version" contract and the fixed key order).
- **Rationale**: Uniform key semantics + explicit transition, both parseable `key:: value`.

### Decision: B is documentation-only (no transformer.js change)
- **Choice**: `transformer.js`'s mechanical fallback (`applyTransformation`) collects only `sources/nn/` and is a context-overflow placeholder — the real artifact flow is agent-driven. No code change; `citations.md` + `nn-innfo` SKILL.md document Model targets.
- **Alternatives**: Teach `transformer.js` to walk `models/` (rejected — it's a dead-end mechanical concatenation placeholder, and the spec does not require it; changing it adds surface for no provenance gain).
- **Rationale**: Artifact citations are authored by the agent per `citations.md`; the chain is semantic, not mechanical.

## Workstream A — Concrete Contract

### Block schema (canonical Markdown, fixed key order)

```
## NN Agent Modification: <scopeSlug>

scope:: <scope>
change:: <change description>
rationale:: <rationale text | _>
approved_by:: agent|user
model:: <model id>
[version_transition:: V_x-y-z → V_x-y-z]   # bump_version only
model_version:: <resulting V_x-y-z>
timestamp:: <ISO-8601>
```

- `key:: value` lines parse with the iNNfo field syntax; block pastes verbatim under the `## NN Agent Modification:` heading.
- `rationale:: _` when the caller supplies none (key NEVER omitted); the pasted block MUST have the marker replaced with concrete reasoning (spec scenario).

### Per-op scope derivation (exact strings)

`<target>` tokens below interpolate `args` values verbatim. `conceptName`/`elementName`/`fieldName`/`newName`/`markerName`/`concept` are the mutation arg keys.

| op | `scope::` value |
|----|-----------------|
| add_element | `add_element concept "<conceptName>" element "<elementName>"` |
| add_concept | `add_concept concept "<conceptName>"` |
| add_field | `add_field concept "<conceptName>" field "<fieldName>"` |
| update_field | `update_field concept "<conceptName>" element "<elementName>" field "<fieldName>"` |
| remove_element | `remove_element concept "<conceptName>" element "<elementName>"` |
| rename_concept | `rename_concept "<conceptName>" → "<newName>"` |
| rename_element | `rename_element concept "<conceptName>" element "<elementName>" → "<newName>"` |
| generate_index | `generate_index taxonomy` |
| bump_version | `bump_version "<prev>" → "<result>"` (scope reflects the bump per spec) |
| set_marker | `set_marker "<markerName>"` (create-or-update; there is no distinct `add_marker` op in `mutate.ts`) |
| add_marker | **Not a real op** — `mutate.ts`'s switch has no `add_marker`; it hits `default` → "Unknown operation". Do not emit a block for it. |

**`change::`** per op (deterministic): e.g. `add_field` → `added field "<fieldName>" to concept "<conceptName>"`; `bump_version` → `bumped model version from "<prev>" to "<result>"`; generic fallback `ran <op> on the model`. `generate_index` → `regenerated the model index/taxonomy`.

### Builder signature

```ts
// src/agentModification.ts (innfo-core)
export interface AgentModificationContext {
  model: string            // model id (the `id` passed to applyChange)
  modelVersion: string     // resulting model_version frontmatter value
  timestamp?: string       // default new Date().toISOString()
  rationale?: string       // optional; omitted → `rationale:: _`
  approvedBy?: 'user' | 'agent'  // default 'agent'
}
export function buildAgentModificationBlock(
  op: string,
  args: Record<string, unknown>,
  ctx: AgentModificationContext,
): string
```

Pure: no I/O, no model mutation; identical `(op, args, ctx)` (modulo `timestamp`) → identical block. Uses `slugifyHeading` from `sourceRef.ts`.

### applyChange wiring (innfo-mcp)

- Add `modification?: string` to `ApplyChangeResult` (`apply-change.ts:16`).
- **General path** (return at `~L400`): after successful write, `modification: buildAgentModificationBlock(op, args, { model: id, modelVersion: model.frontmatter.model_version, rationale: args.rationale as string, approvedBy: args.approved_by as ... })`.
- **bump_version path** (`bumpVersion` return at `~L268`): pass `modelVersion: next.version` (resulting) and `versionTransition: { from: prev, to: next }` context so the builder emits `version_transition::`.
- Failure paths leave `modification` absent (backward-compatible optional field).

## Workstream B — Cross-Model Provenance

### citations.md diffs
- Add a rule: a citation target MAY be a Model — `models/<path>.md#<heading-slug>` — identical `<path>.md#<slug>` syntax to a Source; the chain `artifact → model element → source` resolves through the Model element's own `sources::`.
- Update "resolves canonically against `sources/nn/`" to "`sources/nn/` for Sources, `models/` for Models; unqualified paths resolve under `sources/nn/`".
- Add **Heading-Level Convention** (authoring rule, not a validation change): `# NN <Concept>` (H1 = Concept), `## NN <Concept>: <Element>` (H2 = Element), `###`+ (H3+) only inside Element description/prose, never standalone structural blocks. Confirm the slug algorithm is level-agnostic (it is — `extractHeadings` treats all headings generically), so this is authorial discipline for stable, meaningful `#<element-slug>` targets.

### nn-innfo SKILL.md diffs
- §5 / §8: mandate verbatim paste of the returned `modification` block under `## NN Agent Modification: <scopeSlug>`; fill `rationale:: _` marker; never fabricate a block on failure.
- §4 Source Citation Protocol: add that `models/<path>.md#<slug>` is a first-class citation target (already tolerated by the resolver); cross-reference the heading-level convention.
- §0 conversation-lifecycle prompt (L33): change `[full]`, `[summary]`, `[both]`, `[none]` → `[full]`, `[none]` (matches `conversations-lifecycle` spec).
- Version bump of nn-innfo SKILL.md frontmatter (`last_updated`, semver).

### nn-trannsform diffs
- `SKILL.md` §2f promotion options (L199-202): remove `[1] Executive Summary` / `[3] Both`; keep `[full]` + `[none]`; note raw transcript always registered, `_source.md` optional. Add an "Agent Modification provenance" note under §3b/§4: pasted `## NN Agent Modification` headings in a promoted `_source.md` are citeable via heading-slug.
- `scripts/lib/conversations.js`: `PROMOTION_OPTIONS` (L142-147) → only `[full]` and `[none]`; `promoteConversation` drops the `summary`/`both` branches (`_summary.md` no longer produced). Version bump the skill frontmatter.
- `transformer.js`: **no change** (mechanical fallback; see Decision).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/agentModification.ts` | Create | Pure block builder + context type |
| `iNNfo/packages/innfo-core/src/index.ts` | Modify | Re-export `buildAgentModificationBlock`, `AgentModificationContext` |
| `iNNfo/packages/innfo-core/src/browser.ts` | Modify | Re-export for browser host |
| `iNNfo/packages/innfo-core/src/agentModification.spec.ts` | Create | Unit tests (see Testing) |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modify | `modification?` field; both success returns |
| `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts` | Modify | Assert `modification` on success/absent on failure |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | §0, §4, §5/§8; verbatim-paste mandate; heading convention |
| `actioNN/skills/nn-trannsform/citations.md` | Modify | Model citation targets; heading-level convention |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modify | §2f promotion options; provenance note |
| `actioNN/skills/nn-trannsform/scripts/lib/conversations.js` | Modify | `PROMOTION_OPTIONS`, drop summary branches |

## Interfaces / Contracts

- **innfo-core** (new export): `buildAgentModificationBlock(op, args, ctx): string` + `AgentModificationContext`. Consumed by `innfo-mcp`.
- **MCP `innfo-apply-change`** (contract): result envelope gains optional `modification?: string`. New accepted `args` keys: `rationale?` (string), `approved_by?` (`'user' | 'agent'`). No breaking change.
- **Package boundary**: `@cognnitive/innfo-core` → `innfo-mcp` (existing edge, unchanged direction). No circular dependency.

## Testing Strategy (TDD, test-first)

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (core, `agentModification.spec.ts`) | Determinism: identical `(op,args,ctx)` (minus timestamp) → identical block; no I/O/mutation | Vitest, colocated `.spec.ts` |
| Unit (core) | Field contract: fixed key order, `rationale:: _` when omitted, `approved_by` default `agent`/override `user`, `version_transition` for bump | Table-driven per op |
| Unit (core) | Per-op scope strings match the table above; `add_marker` → no block (unknown op) | Expect exact `scope::` strings |
| Unit (core) | Slug: `slugifyHeading(scope)` produces the `#<slug>` that `extractHeadings` yields for `## NN Agent Modification: <scope>` (round-trip parity) | Assert equality with `slugifyHeading` |
| Integration (mcp, `mutate.spec.ts`) | `applyChange` returns `modification` on general success AND bump success; absent on failure | Extend existing applyChange describe |
| Integration (mcp) | `args.rationale`/`args.approved_by` flow through to the block | Pass via tool args |
| E2E (skill) | `_summary.md` no longer produced; `[full]`/`[none]` only | PowerShell integration test (nn-trannsform) |

## Migration / Rollout

No data migration. `modification?` is optional and backward-compatible; existing consumers ignoring it are unaffected. `_summary.md` removal: raw transcript + optional `_source.md` retained, scanner still accepts `_source.md`, so existing sources don't break (rollback = revert proposal).

## Resolved Open Questions

- **`add_marker` vs `set_marker`**: confirmed against code — the mutation engine (`mutate.ts:115`) and the MCP op list (`server.ts:184`) expose only `set_marker` (create-or-update); there is no `add_marker` op. No new op is introduced in this change. `set_marker` is the sole marker op and the builder scopes it as `set_marker "<markerName>"`. An unknown op produces no block.
- **`model` value**: the block's `model::` uses the `id` argument passed to `applyChange` — the same key used by `findModelFile` for lookup. This is the stable canonical form for the block; the resolved filename/path is an implementation detail of the workspace layout and is not the identity a downstream citation should rely on.
