# Delta for Cross-Model Reference Validation

## MODIFIED Requirements

### Requirement: Qualified Cross-Model Reference Syntax

Cross-model references MUST use the qualified form `[[Model Title :: Element Name]]` exclusively. Positional or anchor-based syntax (e.g. `path#slug`) MUST NOT be supported. The workspace-scope validator MUST re-scan raw field values for the qualified form rather than relying on per-file parsing; `references.ts` keeps its existing per-file bypass for any `::`/`[...]` value. For multivalue reference fields, exactly ONE canonical multivalue syntax MUST be accepted in ALL reference fields of every model; any other multivalue form MUST fail with a stable diagnostic code plus an inline hint naming the canonical form and suggesting migration.
(Previously: qualified single-reference form only; multivalue syntax undefined and failures hintless.)

#### Scenario: Qualified reference recognized for workspace validation

- GIVEN a field value `fundadores:: [[Acme Org :: Jane Doe]]`
- WHEN the workspace-scope validator scans the field
- THEN the value is parsed as a qualified reference with model title `Acme Org` and element name `Jane Doe`

#### Scenario: Positional path-anchor syntax is not recognized

- GIVEN a field value using positional syntax such as `acme_org.md#jane-doe`
- WHEN the workspace-scope validator scans the field
- THEN the value is not recognized as a qualified cross-model reference and is left to existing per-file handling

#### Scenario: Canonical multivalue form accepted everywhere

- GIVEN a reference field holding several values in the canonical multivalue form
- WHEN the workspace-scope validator scans the field
- THEN every value resolves as an independent qualified reference

#### Scenario: Non-canonical multivalue fails with code and migration hint

- GIVEN a reference field using a non-canonical multivalue form such as `[[A]], [[B]]`
- WHEN the workspace-scope validator scans the field
- THEN a stable-code diagnostic is reported
- AND the hint names the canonical form and suggests migration
