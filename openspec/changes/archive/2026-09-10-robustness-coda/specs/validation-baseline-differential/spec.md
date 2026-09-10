# Delta for validation-baseline-differential

## ADDED Requirements

### Requirement: Single Shared Baseline Implementation

The baseline fingerprint computation MUST be exposed through the core public interface, and all validation consumers MUST use that shared implementation rather than a duplicated copy. Fingerprints produced through the shared implementation MUST be byte-identical to those produced before the consolidation.

#### Scenario: Consumers share one implementation

- GIVEN any validation consumer requesting a baseline fingerprint
- WHEN the fingerprint is computed
- THEN it comes from the single shared implementation

#### Scenario: Fingerprints byte-identical after consolidation

- GIVEN identical validation output fingerprinted before and after the consolidation
- WHEN both fingerprints are compared
- THEN they are byte-identical
