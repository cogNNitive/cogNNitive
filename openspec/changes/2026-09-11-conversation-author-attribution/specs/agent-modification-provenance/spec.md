# Delta for agent-modification-provenance

## MODIFIED Requirements

### Requirement: Canonical Block Field Contract

Every Agent Modification block MUST be shaped so that, pasted verbatim under a `## NN Agent Modification: <slug>` heading, it is a valid block whose lines parse with the iNNfo `key:: value` syntax. Each block MUST contain these keys in a fixed order:
- `scope::` — the executed op plus its target concept/element, derived deterministically from `(op, args)`; MUST be non-empty and MUST identify both the op and, when the args name one, the concept and/or element.
- `change::` — a concise description of what was written, derived deterministically from `(op, args)`.
- `rationale::` — the ONLY field that cannot be derived from `(op, args)` alone; it MUST come from the caller. The builder MUST accept an optional rationale argument. When the caller supplies none, the block MUST emit an explicit empty marker (`rationale:: _`); the key MUST NEVER be silently omitted.
- `approved_by::` — authorization, one of `user` | `agent`; MUST default to `agent` unless the caller passes `user`. This key records WHO AUTHORIZED the mutation.
- `author::` — created-by attribution, emitted after `approved_by::` and before `model::`. It records WHO PRODUCED the mutation, which is distinct from WHO AUTHORIZED it; `approved_by::` and `author::` MUST coexist in the block. It MUST be supplied by the caller via `AgentModificationContext` (`author?: string`); the builder MUST NOT derive an author from `(op, args)`, because identity is unknown to the pure builder. When the caller supplies none, the block MUST emit the explicit empty marker (`author:: _`); the key MUST NEVER be silently omitted.
- `model::` — identifier of the mutated model.
- `model_version::` — the model version in effect after the mutation; when the executed op is `bump_version`, the block MUST record the version transition, including both the previous and the resulting version (exact key layout finalized in design).
- `timestamp::` — ISO 8601 timestamp captured when the block is generated.

The synthetic-vs-human author distinction is enforced by convention, not schema: agent ids are tool names (e.g. `OpenCode`, `Antigravity`, `ClaudeCode`) and human ids are participant names (e.g. `Lucas`). No structured author envelope and no machine-readable participants registry are required.

(Previously: the block had no `author::` key; only `approved_by::` recorded authorization.)

#### Scenario: Full block with caller-supplied rationale

- GIVEN a caller supplies a rationale and passes no `approved_by`
- WHEN the builder emits the block
- THEN the block contains parseable `scope::`, `change::`, `rationale:: <rationale text>`, `approved_by:: agent`, `author::`, `model::`, `model_version::`, and `timestamp::` lines

#### Scenario: Rationale omitted by the caller

- GIVEN a caller passes no rationale
- WHEN the builder emits the block
- THEN the `rationale::` key is present with the explicit empty marker `rationale:: _`
- AND the `rationale::` key is never absent from the block

#### Scenario: Explicit user approval

- GIVEN a caller passes `approved_by: "user"`
- WHEN the builder emits the block
- THEN the block records `approved_by:: user`

#### Scenario: Version-bump block records the transition

- GIVEN an executed `bump_version` op that moved the model from `V_0-1-0` to `V_0-2-0`
- WHEN the builder emits the block
- THEN the `scope::` value reflects the version bump
- AND the block records both `V_0-1-0` (previous) and `V_0-2-0` (resulting)

#### Scenario: Full block with caller-supplied author

- GIVEN a caller supplies `author: "OpenCode"` and `approved_by: "user"`
- WHEN the builder emits the block
- THEN the block contains an `author:: OpenCode` line placed between `approved_by::` and `model::`
- AND the block also records `approved_by:: user`, keeping the two keys distinct and coexisting

#### Scenario: Author is caller-supplied, not derived from the op

- GIVEN the same `(op, args)` pair invoked twice, once with `author: "OpenCode"` and once with `author: "Lucas"`
- WHEN the builder runs both times
- THEN the two blocks differ in their `author::` line
- AND their `scope::` and `change::` are identical (only `timestamp::` and `author::` may differ)

#### Scenario: Author omitted by the caller

- GIVEN a caller passes no author
- WHEN the builder emits the block
- THEN the `author::` key is present with the explicit empty marker `author:: _`
- AND the `author::` key is never absent from the block

### Requirement: nn-innfo Mandates Verbatim Block Paste

`actioNN/skills/nn-innfo/SKILL.md` MUST instruct the agent that whenever a mutation executed via `innfo-mcp_apply_change` succeeds and the result includes a `modification` block, the agent MUST paste that block verbatim as part of its reply under a `## NN Agent Modification: <slug>` heading, where `<slug>` is derived deterministically from the block's `scope`. When the returned block carries the empty rationale marker, the agent MUST supply the concrete reasoning in place of the marker in the pasted block — the pasted block MUST NOT retain an unfilled `rationale:: _`. When the returned block carries the empty author marker, the agent MUST replace the marker with its own tool id in the pasted block — the pasted block MUST NOT retain an unfilled `author:: _`. When the result carries no `modification` block (failed mutation), the agent MUST NOT fabricate one. A pasted modification heading MUST be addressable inside the transcript via the `@` pointer grammar, so a promoted `_source.md` transcript can be cited via `sources:: [conversations/<session-slug>_source.md@## NN Agent Modification: <scope>]`. The `#` fragment form (`#<slug>`) MUST NOT be used for `## NN …: …` headings: the Concept/Element boundary in their slug contains `--`, which `parseSourceRef` rejects (`KU_MALFORMED`).

(Previously: the paste mandate covered only the `rationale:: _` marker fill; no `author::` fill was required.)

#### Scenario: Agent pastes the returned block on success

- GIVEN an `innfo-mcp_apply_change` call succeeds and returns a `modification` block
- WHEN the agent composes its reply
- THEN the reply contains exactly one `## NN Agent Modification: <slug>` heading followed by the block pasted verbatim
- AND `<slug>` is derived deterministically from the block's `scope`

#### Scenario: Agent fills the rationale marker at paste time

- GIVEN the returned block contains `rationale:: _`
- WHEN the agent pastes the block into its reply
- THEN the agent replaces the marker with its concrete reasoning
- AND the pasted block does not contain `rationale:: _`

#### Scenario: Agent fills the author marker at paste time

- GIVEN the returned block contains `author:: _`
- WHEN the agent pastes the block into its reply
- THEN the agent replaces the marker with its own tool id (e.g. `author:: OpenCode`)
- AND the pasted block does not contain `author:: _`

#### Scenario: Modification heading is citeable after promotion

- GIVEN a transcript containing a pasted `## NN Agent Modification: <scope>` heading is promoted to `sources/conversations/<session-slug>_source.md` and normalized
- WHEN a downstream model cites the synthetic reasoning with `sources:: [conversations/<session-slug>_source.md@## NN Agent Modification: <scope>]`
- THEN the `@` pointer resolves to the pasted modification heading under the workspace heading-slug rules
- AND no two pasted modification headings in the same transcript share the same anchor