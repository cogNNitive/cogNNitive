# LLM Context Efficiency Specification

## Purpose

Every automated call declares its context budget and intent class. Surgical work
reads bounded slices through existing query units; verification carries only
outcomes; broad reasoning and fuzzy matching stay out of the hot loop. Nothing
travels "just in case". Diagnostic codes are defined by
`validator-robustness` (referenced, not re-specified). No index cache; no
model-behavior or template-content changes.

## Requirements

### Requirement: Bounded Slice Reads for Surgical Work

Surgical work (few elements of one concept) MUST read bounded
slices through existing query units and MUST NOT include whole files. No
included unit SHALL exceed 150 lines without an explicit slice or recorded
override. The cap fits one concept slice plus schema: observed artifacts
reach ~600 lines while surgical edits touch tens of lines, removing roughly
three quarters of per-iteration tokens.

#### Scenario: Surgical edit reads slices only

- GIVEN a 600-line artifact and an edit touching one concept
- WHEN the surgical call is assembled
- THEN every included unit is a slice within the cap
- AND no whole file over the cap is included

#### Scenario: Override for wide context

- GIVEN a task whose needed context spans the cap
- WHEN the caller records a manual override
- THEN the wider unit MAY be included
- AND the override is recorded alongside the call

### Requirement: Per-Intent Context Budgets

Each call MUST declare exactly one intent — `coach`, `surgical`, `verify`, or
`match` — and respect its budget. `coach` calls SHALL be few but MAY consume up
to half the session budget; `surgical` and `verify` calls SHALL form the
majority of calls at a fraction of the cost each; `match` calls MUST NOT carry
raw sources.

#### Scenario: Budget concentrated in few coach calls

- GIVEN a session of mixed calls with declared intents
- WHEN per-intent costs are tallied
- THEN costly context concentrates in few `coach` calls
- AND `surgical`/`verify` calls stay small and cheap

#### Scenario: Call spanning two intents

- GIVEN work that spans two intents
- WHEN the intent is declared
- THEN the caller MUST declare the broader (more expensive) intent

### Requirement: Minimal Intent Router with Manual Override

The skill layer MUST expose a single optional intent field accepting `coach`,
`surgical`, `verify`, or `match`. An undeclared
intent MUST default to current behavior (no-op). A manual override MUST always
be available and MUST take precedence over the declared intent.

#### Scenario: Declared intent governs the call

- GIVEN a skill declaring intent `surgical`
- WHEN the call executes
- THEN the slice and budget rules for `surgical` apply

#### Scenario: Operator overrides a wrong intent

- GIVEN a declared intent that proves wrong mid-task
- WHEN the operator overrides it
- THEN the override value governs
- AND execution continues under those rules

### Requirement: Differential Verify Prompts and Measurement Gate

`verify` prompts MUST carry only outcome data — exit status plus errors new
against the baseline defined by `validator-robustness` — and MUST NOT embed
full logs or rendered artifacts; full logs remain on disk. Each session MUST
record per-intent call and token counts; one promotion MUST be benchmarked
before versus after.

#### Scenario: Re-validation carries new errors only

- GIVEN a re-validation after a micro-change
- WHEN the verify prompt is built
- THEN it contains exit status and new-vs-baseline errors only
- AND the full log stays on disk

#### Scenario: Clean run carries the verdict only

- GIVEN a validation run with zero new errors
- WHEN the verify prompt is built
- THEN it carries the clean verdict only
- AND no historical errors are re-explained

#### Scenario: Before-vs-after benchmark recorded

- GIVEN the benchmark promotion run before and after this change
- WHEN the runs are compared
- THEN per-intent call and token totals and the measured reduction are recorded
