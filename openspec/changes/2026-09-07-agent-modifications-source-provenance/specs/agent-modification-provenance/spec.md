# Spec: Agent Modification Provenance

## Purpose

Make every successful agent mutation on an iNNfo model traceable and citeable. `innfo-core` exposes a pure builder that turns the executed `(op, args)` into a canonical Agent Modification block; `apply_change` returns that block on success; and `nn-innfo` instructs the agent to paste the block verbatim into its reply under an addressable `## NN Agent Modification: <slug>` heading — so a promoted conversation transcript can cite the synthetic reasoning via `sources::`.

## ADDED Requirements

### Requirement: Agent Modification Block Builder

`innfo-core` MUST provide a pure, side-effect-free builder (suggested `buildAgentModificationBlock`, living in or near `src/mutate.ts`) that produces the canonical Agent Modification block — a Markdown string — for an executed mutation described by `(op, args)`. The builder MUST derive `scope`, `change`, and the modification slug solely and deterministically from `(op, args)`: identical `(op, args)` MUST yield identical output. The builder MUST NOT perform file I/O and MUST NOT mutate any model; model identity, version, timestamp, rationale, and approval are caller-supplied inputs, never discovered by the builder.

#### Scenario: Block built for an executed mutation
- GIVEN an executed `add_field` op with args `{ conceptName: "Stakeholders", fieldName: "budget" }` plus caller-supplied context
- WHEN the builder is invoked with the op, args, and context
- THEN it returns a canonical Markdown block string describing that exact op and target
- AND the call performs no file I/O and no model mutation

#### Scenario: Deterministic scope and change for identical inputs
- GIVEN the same `(op, args)` pair invoked twice with identical caller-supplied context
- WHEN the builder runs both times
- THEN the two blocks are identical in `scope`, `change`, and every other deterministic field
- AND only the `timestamp` may differ between the two blocks

### Requirement: Canonical Block Field Contract

Every Agent Modification block MUST be shaped so that, pasted verbatim under a `## NN Agent Modification: <slug>` heading, it is a valid block whose lines parse with the iNNfo `key:: value` syntax. Each block MUST contain these keys in a fixed order:
- `scope::` — the executed op plus its target concept/element, derived deterministically from `(op, args)`; MUST be non-empty and MUST identify both the op and, when the args name one, the concept and/or element.
- `change::` — a concise description of what was written, derived deterministically from `(op, args)`.
- `rationale::` — the ONLY field that cannot be derived from `(op, args)` alone; it MUST come from the caller. The builder MUST accept an optional rationale argument. When the caller supplies none, the block MUST emit an explicit empty marker (`rationale:: _`); the key MUST NEVER be silently omitted.
- `approved_by::` — authorization, one of `user` | `agent`; MUST default to `agent` unless the caller passes `user`.
- `model::` — identifier of the mutated model.
- `model_version::` — the model version in effect after the mutation; when the executed op is `bump_version`, the block MUST record the version transition, including both the previous and the resulting version (exact key layout finalized in design).
- `timestamp::` — ISO 8601 timestamp captured when the block is generated.

#### Scenario: Full block with caller-supplied rationale
- GIVEN a caller supplies a rationale and passes no `approved_by`
- WHEN the builder emits the block
- THEN the block contains parseable `scope::`, `change::`, `rationale:: <rationale text>`, `approved_by:: agent`, `model::`, `model_version::`, and `timestamp::` lines

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

### Requirement: Successful apply_change Results Carry the Modification Block

`ApplyChangeResult` in `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` MUST gain an optional field `modification?: string`. `applyChange` MUST populate `modification` via the block builder on BOTH success paths — the general mutation result and the `bump_version` result — generating the block from the executed `op` and `args`. On failure (`success: false`), `modification` MUST be absent. The addition MUST be backward-compatible: the field is optional and existing consumers that ignore it MUST be unaffected. For `bump_version`, the emitted block's scope MUST reflect the version bump.

#### Scenario: Successful general mutation returns the block
- GIVEN an `add_field` mutation that validates and writes successfully
- WHEN `applyChange` returns
- THEN the result has `success: true` and a non-empty `modification` string
- AND the string equals the block the builder produces for the executed `op` and `args`

#### Scenario: Successful bump_version returns the block
- GIVEN a `bump_version` operation that validates and writes successfully
- WHEN `applyChange` returns
- THEN the result has `success: true` and a `modification` string whose `scope::` states the version bump
- AND the block records both the previous and the resulting version

#### Scenario: Failed mutation carries no modification block
- GIVEN an `add_concept` mutation rejected by validation (e.g. duplicate concept name)
- WHEN `applyChange` returns
- THEN the result has `success: false`
- AND the `modification` field is absent

### Requirement: nn-innfo Mandates Verbatim Block Paste

`actioNN/skills/nn-innfo/SKILL.md` MUST instruct the agent that whenever a mutation executed via `innfo-mcp_apply_change` succeeds and the result includes a `modification` block, the agent MUST paste that block verbatim as part of its reply under a `## NN Agent Modification: <slug>` heading, where `<slug>` is derived deterministically from the block's `scope`. When the returned block carries the empty rationale marker, the agent MUST supply the concrete reasoning in place of the marker in the pasted block — the pasted block MUST NOT retain an unfilled `rationale:: _`. When the result carries no `modification` block (failed mutation), the agent MUST NOT fabricate one. A pasted modification heading MUST be addressable by heading-slug inside the transcript, so a promoted `_source.md` transcript can be cited via `sources:: [conversations/<session-slug>_source.md#<slug>]`.

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

#### Scenario: Modification heading is citeable after promotion
- GIVEN a transcript containing a pasted `## NN Agent Modification: <slug>` heading is promoted to `sources/conversations/<session-slug>_source.md` and normalized
- WHEN a downstream model cites the synthetic reasoning with `sources:: [conversations/<session-slug>_source.md#<slug>]`
- THEN the `#<slug>` anchor resolves to the pasted modification heading under the workspace heading-slug rules
- AND no two pasted modification headings in the same transcript share the same anchor
