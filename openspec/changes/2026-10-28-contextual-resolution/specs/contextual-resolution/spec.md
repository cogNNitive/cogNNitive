# Delta for contextual-resolution

Scope: a pure fold over the scope chain with typed merge strategies (`override`, `union`),
the bluepriNNt default as floor, and a serializable `explain` trace. Phases G1 and G3
(MCP contract), plus the second-consumer proof (LC_programas adoption, Lote 2+).

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

- GIVEN a call with a strategy other than `override`, `union` or `none`
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

### Requirement: None Strategy Keeps A Declared Value Local To Its Scope

With `none`, the result MUST be the value declared by the innermost node of the visible chain (the target) and nothing else: ancestors and the bluepriNNt floor MUST NOT supply it. A key the target does not declare MUST resolve as explicitly absent, never inherited. `none` is for values that are identity, outputs or recorded facts (for example an invoiced price), where inheriting a later change would rewrite history. The trace MUST name the target as `winner` (or none), MUST list ancestor and floor declarations of the key under `notInherited` and MUST NOT list them as `overridden`.

#### Scenario: Omitted contractual value stays absent

- GIVEN a root declaring `price: "84"` and a target node declaring no `price`
- WHEN `price` is resolved with `none`
- THEN the result is explicitly absent
- AND the trace lists the root's `"84"` under `notInherited`, with an empty `overridden`

#### Scenario: Own contractual value is returned

- GIVEN a root declaring `price: "84"` and a target node declaring `price: "90"`
- WHEN `price` is resolved with `none`
- THEN the value is `"90"`, supplied by the target
- AND the root's `"84"` is listed under `notInherited`, not under `overridden`

#### Scenario: Floor is never a source for none

- GIVEN a floor declaring `price: "10"` and a target node declaring nothing
- WHEN `price` is resolved with `none`
- THEN the result is absent and the floor's declaration is listed under `notInherited`

#### Scenario: Target is the nearest node after an isolate cut

- GIVEN a chain whose innermost node is below an isolated node
- WHEN `none` is resolved
- THEN only the innermost node is read, and nodes above the isolate are not listed

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

nn-mcp MUST expose a `resolve_effective` tool and an `explain` tool. Both MUST accept a
document or scope `path` (domain-relative, or absolute inside the server's domaiNN), a `key`,
a `strategy` (`override`, `union` or `none`) and an optional element target
`{ concept, slug }` naming a declared scope element of that document. Both MUST locate scopes
through `findScopeChain` (and, with an element target, `loadElementChain`), MUST obtain the
value and the trace from nn-core `resolve` (no second fold in nn-mcp), and MUST NOT write.

`resolve_effective` MUST return the effective value, whether it is present, the winner and
the trace. `explain` MUST return the same trace plus the chain of scopes it was computed over
(node id, kind, supplier document and `isolate` flag, outermost first) and the floor supplier.
Neither MUST return a composed procedure.

The floor MUST be located by nn-mcp: the bluepriNNt package named by the `parent_spec` of the
innermost values document of the chain is resolved through the bluepriNNt package resolver
(`resolveBlueprintPackage`), and its floor is the single `_NN.md` under the package's
`defaults/` folder. A package that cannot be resolved, or has no `defaults/` document, means
no floor and is not an error; more than one `_NN.md` under `defaults/` is the structured
error `AMBIGUOUS_FLOOR`.

Both tools MUST return a structured error, never a thrown exception or a rejected call, with
a stable `code` and a `detail`: `INVALID_ARGUMENT` (a missing or ill-typed input),
`PATH_OUTSIDE_SCOPE` (the path is outside the server's domain root), `NO_DOMAIN_ROOT` (with
the directories `searched`), `UNSUPPORTED_STRATEGY`, the element errors of the element
adapter, and the document errors `UNREADABLE_DOCUMENT` and `MALFORMED_FRONTMATTER` (with the
domain-relative `path`). Every response MUST survive `JSON.stringify` then `JSON.parse` with
deep equality and MUST NOT contain absolute machine paths other than inside `searched`.

#### Scenario: resolve_effective returns value and winner

- GIVEN the three-level fixture and `priority: high` declared in `p1`
- WHEN `resolve_effective` is called with a path in `p1`, key `priority`, strategy `override`
- THEN the response contains `high`, present true, the winner `p1`, and a trace listing `portfolio`'s `medium` as overridden by `p1`

#### Scenario: explain returns the trace and the chain

- GIVEN the same inputs
- WHEN `explain` is called
- THEN the response contains the chain `portfolio, alpha, p1` with node kinds
- AND its trace deep-equals the trace returned by `resolve_effective`

#### Scenario: Element target

- GIVEN a document declaring `scope_elements` and a scene element declaring `music_volume: 0.06` below a series declaring `0.4`
- WHEN `resolve_effective` is called for that document, the key `music_volume`, `override` and the target `{ concept: Scene, slug }`
- THEN the value is `0.06`, the winner is the scene element, and the trace lists the series' `0.4` as overridden by it

#### Scenario: none keeps an omitted value absent

- GIVEN a root declaring `precio_hora_tutoria: "84"` and a Prestación element declaring none
- WHEN `resolve_effective` is called with `none` and that element as target
- THEN the result is absent and the trace lists the root's declaration under `notInherited`

#### Scenario: Floor fallback

- GIVEN a package whose `defaults/` document declares `health: green` and no scope declaring `health`
- WHEN `resolve_effective` is called for `health` with `override`
- THEN the value is `green` and the winner is the floor supplier `bluepriNNt:<package>`
- AND the same call in a domaiNN whose package has no `defaults/` document is explicitly absent, not an error

#### Scenario: Path outside any domaiNN

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN either tool is called
- THEN the structured error `NO_DOMAIN_ROOT` is returned listing the directories searched

#### Scenario: Path outside the server's domain root

- GIVEN an absolute path that is not inside the server's domain root
- WHEN either tool is called
- THEN the structured error `PATH_OUTSIDE_SCOPE` is returned and nothing outside the root is read

#### Scenario: Bad input never throws

- GIVEN a missing key, an unsupported strategy, an unknown element target or an unreadable document
- WHEN either tool is called
- THEN a structured error with its code is returned and no exception escapes

### Requirement: Resolution Is Generic Across bluepriNNts

The nn-core resolution module MUST NOT name any bluepriNNt, concept or field of a specific
bluepriNNt. Phase G0-G2 behavior MUST be validated on a fixture that is not a video
bluepriNNt, and the LC_programas adoption (Programa as element scope, after the element
adapter) MUST demonstrate a second real consumer. The fold MUST take an abstract chain of
scope nodes; folder scopes are the first adapter and element scopes a later one.

#### Scenario: Core contains no consumer vocabulary

- GIVEN the scope and resolve modules in nn-core
- WHEN they are searched for `video`, `series` or `projects`
- THEN no match is found outside tests and fixtures

#### Scenario: Generic fixture resolves across three levels

> Moved 2026-10-28: the `projects` bluepriNNt has no real consumer and is no longer an
> adoption target. The three-level proof is the generic non-video fixture in Lote 1; the
> real second consumer is LC_programas (element scope, Lote 2+).

- GIVEN a generic fixture domaiNN with root, mid and leaf scopes, and a key declared with `override` at root and leaf levels
- WHEN the key is resolved for a document in the leaf
- THEN the leaf's value wins and the trace names the leaf scope
- AND resolving for a document in a mid scope that declares nothing yields the root value

### Requirement: Drift Report Is A Pure Read-Only Function

nn-core MUST expose a pure `driftReport` that states, for each scope that offers values to descendants and each compared key, the baseline value the scope offers and how many units deviate from it.
A **unit** is a grouping of leaf chains chosen by the caller (the leaf itself, or the supplying
document); the report MUST treat unit labels as opaque. A unit **deviates** from scope S on key K
when at least one of its chains resolves K, with `override`, to a value that is not deeply equal
to the value K resolves to at S (deep JSON equality, object key order irrelevant); a key absent
at S and present in the unit deviates. The baseline and every unit value MUST be obtained from
`resolve` (no second fold), so the floor is part of the baseline and a unit that crosses an
isolate after S MUST NOT be counted for S. The report MUST list each deviating value once with
the number of units that hold it and the supplier of the first, MUST say whether all units hold
one single value (`uniform`), and MUST NOT emit a row for a key that no scope or unit supplies.
A key whose strategy is `none` MUST be compared with `none` and MUST never have an inherited baseline: its baseline is explicitly absent and each unit's value is its own declaration, so sibling variants are still reported. Any other key whose strategy is not `override` MUST be listed in `skipped` with a reason, never omitted.
The report MUST be plain JSON, versioned, deterministically ordered, independent of the order of
its input chains, and MUST NOT mutate its input.

#### Scenario: Deviating units are counted

- GIVEN a scope `series` declaring `volume: 0.4` and eight units below it, four declaring `0.06`, one declaring `0.2` and three declaring nothing
- WHEN the report is built
- THEN the row for scope `series` and key `volume` has baseline `0.4` supplied by `series`
- AND 5 of 8 units deviate, it is not uniform, and the variants are `0.06` held by 4 units and `0.2` held by 1

#### Scenario: Uniform repetition is reported as hoistable

- GIVEN six units below a scope that declares nothing, each declaring `price: "84"`
- WHEN the report is built
- THEN the row for that scope and `price` has an absent baseline, 6 of 6 units deviating, uniform true and the single variant `"84"` held by 6 units

#### Scenario: No deviation

- GIVEN units below a scope that all inherit its value
- WHEN the report is built
- THEN the row has 0 deviating units and no variants

#### Scenario: Key declared nowhere is not a row

- GIVEN a requested key that no scope, unit or floor declares
- WHEN the report is built
- THEN no row and no skipped entry exists for it

#### Scenario: Floor value is the baseline when no scope declares

- GIVEN a floor declaring `transition: none`, a root declaring nothing, and one unit declaring `transition: fade`
- WHEN the report is built
- THEN the baseline of the root row is `none`, supplied by the floor, and 1 unit deviates

#### Scenario: Isolate bounds the baseline

- GIVEN a root declaring `level: 1`, one unit below an isolated scope and one unit below an ordinary scope
- WHEN the report is built
- THEN the root row counts only the unit below the ordinary scope

#### Scenario: Union keys are skipped visibly

- GIVEN a key whose strategy is `union`
- WHEN the report is built
- THEN no row exists for it and `skipped` names the key with a reason

#### Scenario: None keys report siblings without an inherited baseline

- GIVEN a scope declaring `price: "84"` and three units below it, two declaring `price: "84"` and one declaring `price: "90"`
- WHEN the report is built with strategy `none` for `price`
- THEN the row has an absent baseline, 3 of 3 units deviating, uniform false and the variants `"84"` held by 2 units and `"90"` held by 1
- AND `price` is not listed in `skipped`

#### Scenario: Report round-trips JSON and is deterministic

- GIVEN any input
- WHEN the report is built twice, once with the chains in reverse order
- THEN both reports are deeply equal and survive `JSON.parse(JSON.stringify(report))` unchanged

#### Scenario: Report never mutates its input

- GIVEN a deep-frozen or snapshotted input
- WHEN the report is built
- THEN the input is deeply equal to its snapshot afterwards

## Out of scope

`restrict` and `append` strategies, per-scope `aggregate`, lockfile or materialization of
effective values, per-scope bluepriNNt version pin and a user or org scope above the
domaiNN are deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
