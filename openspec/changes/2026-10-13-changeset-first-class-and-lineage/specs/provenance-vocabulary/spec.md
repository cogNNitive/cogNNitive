# Delta for provenance-vocabulary

## ADDED Requirements

### Requirement: The three nouns are used consistently in code, UI and docs

The vocabulary MUST collapse to exactly three nouns — **Source**, **Citation**,
**Lineage** — used consistently across `openspec/specs`, source identifiers, console
UI copy, and documentation, in **English**. "provenance" MUST NOT name a standalone
concept, a tab, or a data structure. "reference" MUST remain reserved for structural
cross-model fields (`type:: reference`) and MUST NOT name a citation.

#### Scenario: No fourth noun in the console
- GIVEN the console runtime and UI kit sources
- WHEN their user-facing strings are audited
- THEN no string uses "provenance", "traceability" or "grounding" as a concept name
- AND every user-facing string is English

#### Scenario: The tab uses the canonical noun
- GIVEN the `domaiNN_console.html` element modal
- WHEN its tabs are read
- THEN the tab is titled "Lineage"
- AND no tab reads "History & Provenance"

#### Scenario: reference stays structural
- GIVEN a field `type:: reference`
- WHEN it is described in docs or UI
- THEN it is called a reference (a structural link)
- AND a citation is never called a reference
