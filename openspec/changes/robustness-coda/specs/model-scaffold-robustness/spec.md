# Delta for model-scaffold-robustness

## MODIFIED Requirements

### Requirement: Explicit Procedures Block per Template

Every template MUST declare a procedures block even when empty. The declaration MUST be explicit — an empty block present on the template — rather than implied by discovery yielding no procedures. The creation wizard MUST announce an empty block instead of silently presenting a template with nothing executable.

(Previously: required a procedures block but did not pin the explicit empty declaration.)

#### Scenario: Empty block declared

- GIVEN a template with no executable procedures
- WHEN the template is inspected
- THEN an explicit empty procedures block is present

#### Scenario: Discovery agrees with the declared block

- GIVEN a template carrying an explicit empty procedures block
- WHEN procedures are discovered dynamically
- THEN discovery yields an empty set consistent with the declaration

#### Scenario: Wizard announces it

- GIVEN a template with an empty procedures block
- WHEN the wizard presents the template
- THEN it announces that no executable procedures exist
