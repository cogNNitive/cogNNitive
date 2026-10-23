# blueprint-nature Specification

## Purpose

A Level-2 blueprint declares its nature — how its documents are structured, whether their content is authored or derived, and (by derivation) whether they surface. This replaces the hardcoded name rules in the console and the naming contract.

## ADDED Requirements

### Requirement: Nature is declared in the blueprint

A Level-2 blueprint MAY declare `nature` in frontmatter with two axes: `structure` (`catalog` | `members` | `projection`) and `ownership` (`authored` | `derived`). An unknown value MUST be a diagnostic.

#### Scenario: Nature is read
- GIVEN a blueprint with `nature: { structure: members, ownership: derived }`
- WHEN its nature is resolved
- THEN `structure` is `members` and `ownership` is `derived`

#### Scenario: Unknown nature value is flagged
- GIVEN `structure: collection`
- WHEN the blueprint is validated
- THEN a diagnostic names the unknown value

### Requirement: Compiled `blueprint -> nature` map

Core MUST compile the map from the embedded canonical registry, so `roleOf` and the discovery predicates stay pure and browser-safe (no filesystem). Domain-local blueprints MUST resolve their nature at runtime through the blueprint resolver.

#### Scenario: Pure lookup
- GIVEN the compiled map
- WHEN `roleOf` classifies a core-blueprint document
- THEN it returns the same role as before the change, without reading the filesystem

#### Scenario: Domain-local blueprint
- GIVEN a domain with a local blueprint declaring `structure: members`
- WHEN the console exports the domain
- THEN that blueprint's member documents are discovered without a core edit

### Requirement: Collections materialize into standard elements

The console MUST materialize a declared collection into ordinary payload elements: `catalog` reads the catalog document's elements, `members` emits one unit per internal element with a derived stable id, `projection` computes from the source. No new document MUST be stored.

#### Scenario: Members materialize
- GIVEN a `members` collection of N documents each holding M elements
- WHEN the console is exported
- THEN N×M units exist with derived, unique ids

### Requirement: Derived surfacing and editability

Every declared collection MUST surface as a console model; `surface` MUST NOT be a declared knob. The edit affordance MUST derive from `ownership`: `derived` ⇒ no edit affordance; `authored` ⇒ proposable. The apply engine remains the final guard.

#### Scenario: Derived collection is read-only
- GIVEN a collection with `ownership: derived`
- WHEN its units render
- THEN no edit pencil is offered

#### Scenario: Declared collection surfaces
- GIVEN a blueprint declaring any `structure`
- WHEN the console is exported
- THEN its units appear as a model (no allowlist consulted)
