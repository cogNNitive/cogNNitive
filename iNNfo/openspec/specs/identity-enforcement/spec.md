# Identity Enforcement

Software behavior that enforces the identity, uniqueness, and rename rules once, so
the UI and the MCP obey the same contract.

## Requirements

### R-IE-01: Single Enforcement Engine in innfo-core

Identity, uniqueness, and rename invariants MUST be implemented once in
`@cognnitive/innfo-core`. The editor UI and the MCP MUST call this engine rather than
implement their own mutation logic. No mutation path may bypass the shared invariants.

#### Scenario: UI and MCP reject the same duplicate identically
- GIVEN a Model already containing an Element `Review`
- WHEN either the UI or the MCP attempts to add another Element named `Review` in the same Model
- THEN both reject it with the same error, via the same core engine

### R-IE-02: Uniqueness Violations Are Errors

Adding or renaming an entity to a name that already exists within its uniqueness scope
(Element → whole Model; Concept → Model; Model → Workspace) MUST fail with an error.
The silent `#2` occurrence-suffix disambiguation MUST be removed.

#### Scenario: No silent disambiguation
- GIVEN two elements that would resolve to the same name in a Model
- WHEN the graph is built
- THEN a collision error is reported and no `Name#2` node is silently created

### R-IE-03: Transactional Rename

Renaming an Element, Concept, or Model MUST be a single transactional operation that
finds and rewrites every reference — the declaring marker/heading, index entries,
matrix row/column labels, `reference`-typed field values, graph edges, and cross-model
references — then re-validates. A partial rename MUST NOT be committed.

#### Scenario: Rename propagates to a matrix
- GIVEN an Element `Open PR` referenced by a `work-roles matrix` row
- WHEN it is renamed to `Create Pull Request`
- THEN the matrix row label is updated in the same operation
- AND validation reports no dangling references afterward

### R-IE-04: Reference-Integrity Validator

On load, the validator MUST detect dangling references (references to names that do not
exist), regardless of how they were introduced (manual edit, git merge, tool). It MUST
report them with human-friendly diagnostics. No content hash is stored in the format.

#### Scenario: Hand-edited dangling reference is surfaced
- GIVEN a model hand-edited so a matrix row references a deleted element
- WHEN the model is loaded
- THEN the validator reports a dangling-reference diagnostic naming the row and target

### R-IE-05: Diagnostic Policy

Diagnostics MUST follow one policy: ERROR for structural violations (duplicate names,
dangling references, reserved-name misuse, FOLDER mode); WARNING for recoverable issues;
nothing silently dropped.

### R-IE-06: Derived Slug Convention

When a URL/anchor/filename-safe form of a name is needed, the application MUST derive it
as `slugify(name)`: NFKD transliteration of diacritics (`ñ`→`n`, `é`→`e`), lowercase,
whitespace/`_`→`-`, strip punctuation, collapse repeated `-`, append `-1`/`-2` on
in-document collision. The slug MUST NOT be persisted in the model file and MUST NOT be
a source of truth.
