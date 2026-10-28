# Delta for contextual-resolution

Scope: a pure fold over the scope chain with typed merge strategies (`override`, `union`),
the bluepriNNt default as floor, and a serializable `explain` trace. Phases G1 and G3
(MCP contract), plus the second-consumer proof of Adoption B.

Terms. `local(S,k)` is the value of key `k` declared in the marker kNNowledge document of
scope `S`. `effective(S,k)` folds `local` over the chain of `S`, outermost first, starting
from the bluepriNNt default of `k` (the floor).

## ADDED Requirements

### Requirement: Pure Resolution Over A Chain

nn-core MUST expose `resolve(chain, key, strategy)` returning the effective value of `key`
for the innermost scope of `chain`, together with its `explain` trace. The function MUST be
deterministic and side-effect free: the same chain content, key and strategy MUST yield an
identical result. kNNowledge MUST be read through nn-core's parser only; no private
frontmatter or field parser is permitted.

#### Scenario: Same input, same output

- GIVEN a loaded chain, the key `priority` and strategy `override`
- WHEN `resolve` is called twice
- THEN both results are deeply equal
- AND no file is written

#### Scenario: Unknown strategy

- GIVEN a call with a strategy other than `override` or `union`
- WHEN `resolve` is called
- THEN it returns an error naming the unsupported strategy
- AND it does not fall back to another strategy

### Requirement: Blueprint Default Is The Floor

When no scope in the chain declares a value for `key`, the result MUST be the bluepriNNt
default of `key`. When the bluepriNNt declares no default either, the result MUST be an
explicit absent value, not an error and not a fabricated default.

#### Scenario: No scope sets the key

- GIVEN a bluepriNNt default `health: green` and no scope in the chain declaring `health`
- WHEN `health` is resolved with `override`
- THEN the value is `green`
- AND the trace identifies the bluepriNNt as the supplier

#### Scenario: No default anywhere

- GIVEN a key with no bluepriNNt default and no scope declaring it
- WHEN it is resolved
- THEN the result is explicitly absent and the trace records that no scope supplied it

### Requirement: Override Strategy

With `override`, the value of the nearest scope in the chain that declares `key` MUST win;
scopes that do not declare it MUST be skipped. An explicitly declared empty value in a
nearer scope MUST win over a non-empty value in a farther scope.

#### Scenario: Nearest declaration wins at three depths

- GIVEN a chain `portfolio` (`priority: medium`), `alpha` (no `priority`), `p1` (`priority: high`)
- WHEN `priority` is resolved for `p1` with `override`
- THEN the value is `high`, supplied by `p1`
- AND resolving for `alpha` yields `medium`, supplied by `portfolio`

#### Scenario: Child without a value inherits

- GIVEN `portfolio` declares `priority: medium` and `p1` declares nothing
- WHEN `priority` is resolved for `p1`
- THEN the value is `medium`, supplied by `portfolio`

### Requirement: Union Strategy With Name Shadowing

With `union`, the result MUST be the set of named entries declared across the chain. When
two scopes declare an entry with the same name, the entry from the nearer scope MUST be
kept and the farther entry MUST be recorded in the trace as shadowed. Entries with distinct
names MUST all be kept. Result order MUST be deterministic: outermost scope first, then
declaration order within a scope.

#### Scenario: Entries accumulate

- GIVEN `portfolio` declares glossary entries `risk` and `issue`, and `alpha` declares `milestone`
- WHEN the glossary is resolved for `alpha` with `union`
- THEN the result contains `risk`, `issue` and `milestone`

#### Scenario: Nearer entry shadows farther entry

- GIVEN `portfolio` declares `risk: "any threat"` and `alpha` declares `risk: "schedule threat"`
- WHEN resolved for `alpha` with `union`
- THEN the result's `risk` is `"schedule threat"`
- AND the trace lists `portfolio`'s `risk` as shadowed by `alpha`

### Requirement: Explain Trace Identifies The Supplying Scope

Every resolution result MUST carry an `explain` trace listing, for each effective value (or
union entry), the supplying scope, the document that declared it, and every candidate that
was overridden or shadowed with the scope that displaced it. The trace MUST be plain data
that survives `JSON.stringify` then `JSON.parse` with deep equality, and MUST NOT contain
functions, cycles, class instances or absolute machine-specific paths.

#### Scenario: Trace names the supplier

- GIVEN `priority: high` declared in `p1`'s marker document
- WHEN `priority` is resolved for `p1`
- THEN the trace names scope `p1` and its marker document as the supplier

#### Scenario: Trace round-trips

- GIVEN any resolution result
- WHEN its trace is serialized to JSON and parsed back
- THEN the parsed value deeply equals the original

#### Scenario: Overridden candidates are visible

- GIVEN `portfolio` and `p1` both declare `priority`
- WHEN `priority` is resolved for `p1`
- THEN the trace lists `portfolio`'s value as overridden by `p1`

### Requirement: Isolate Bounds Resolution

Resolution MUST use only the scopes of the chain returned by `findScopeChain`. A scope
above an `isolate` boundary MUST NOT contribute values, and its absence MUST be reflected
in the trace.

#### Scenario: Parent value is not inherited across isolate

- GIVEN `portfolio` declares `priority: medium`, and `legacy` (`isolate: true`) declares nothing
- WHEN `priority` is resolved for `legacy`
- THEN the value comes from the bluepriNNt floor, not from `portfolio`

### Requirement: MCP resolve_effective And explain Tools

nn-mcp MUST expose a `resolve_effective` tool and an `explain` tool. `resolve_effective`
MUST accept a document or scope path, a key, and a strategy, and MUST return the effective
value, the chain used (outermost first) and the trace. `explain` MUST accept the same
inputs and MUST return the trace. Both MUST locate scopes through `findScopeChain`, and both
MUST return a structured error, not a thrown exception, for a path outside any domaiNN or
a key with an unsupported strategy.

#### Scenario: resolve_effective returns value and chain

- GIVEN the three-level fixture and `priority: high` declared in `p1`
- WHEN `resolve_effective` is called with a path in `p1`, key `priority`, strategy `override`
- THEN the response contains `high`, the chain `portfolio, alpha, p1`, and a trace naming `p1`

#### Scenario: explain returns only the trace

- GIVEN the same inputs
- WHEN `explain` is called
- THEN the response contains the trace and it equals the trace returned by `resolve_effective`

#### Scenario: Path outside any domaiNN

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN either tool is called
- THEN a structured error is returned listing the directories searched

### Requirement: Resolution Is Generic Across bluepriNNts

The nn-core resolution module MUST NOT name any bluepriNNt, concept or field of a specific
bluepriNNt. Phase G0-G2 behavior MUST be validated on a fixture that is not a video
bluepriNNt, and Adoption B MUST demonstrate a second real consumer.

#### Scenario: Core contains no consumer vocabulary

- GIVEN the scope and resolve modules in nn-core
- WHEN they are searched for `video`, `series` or `projects`
- THEN no match is found outside tests and fixtures

#### Scenario: projects bluepriNNt resolves across three levels

- GIVEN a `projects` domaiNN with portfolio, program and project scopes, and `priority` declared with `override` at portfolio and project levels
- WHEN `priority` is resolved for a document in the project
- THEN the project's value wins and the trace names the project scope
- AND resolving for a document in a program that declares nothing yields the portfolio value

## Out of scope

`restrict` and `append` strategies, per-scope `aggregate`, lockfile or materialization of
effective values, per-scope bluepriNNt version pin and a user or org scope above the
domaiNN are deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
