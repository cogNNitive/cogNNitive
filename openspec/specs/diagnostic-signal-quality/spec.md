# Diagnostic Signal Quality Specification

## Purpose

Some validator checks emit one diagnostic per occurrence of a condition that
is structurally repetitive and not actionable by the document's author (e.g.
one warning per template concept lacking documentation — a gap in the
TEMPLATE, not the model). Emitted at full volume, these floods bury
diagnostics the author CAN act on. This spec requires such checks to
aggregate.

## Requirements

### Requirement: Non-Actionable Repetitive Diagnostics Are Aggregated

When a validator check would otherwise emit one diagnostic per occurrence for
a condition that (a) recurs structurally across many items of the same kind,
and (b) is not something the document's author can individually fix (the
defect lives in the template or a shared definition, not the authored
content), the check MUST emit a single aggregated diagnostic instead,
containing the occurrence count and the list of affected items. Validation
semantics (pass/fail, `valid`) MUST NOT change — this affects presentation
only.

#### Scenario: Template documentation gaps aggregate into one diagnostic

- GIVEN a template with ~85 concepts lacking a complete guidance section
- WHEN `checkTemplateDocumentation()` runs against a model of that template
- THEN exactly ONE diagnostic is emitted, naming the count and listing the affected concepts

#### Scenario: Aggregated diagnostic does not change validity

- GIVEN the aggregated documentation diagnostic is emitted
- WHEN the overall validation result is computed
- THEN `valid` is unaffected by this diagnostic, exactly as the per-occurrence warnings were before

#### Scenario: A single, isolated occurrence is still reported as one diagnostic

- GIVEN a template with exactly one concept lacking documentation
- WHEN `checkTemplateDocumentation()` runs
- THEN one diagnostic is emitted — no change in behavior for the non-flood case

#### Scenario: Actionable, author-fixable diagnostics are unaffected

- GIVEN a diagnostic condition that the document's author CAN individually fix
- WHEN that check runs
- THEN it continues to emit one diagnostic per occurrence, unaffected by this aggregation rule
