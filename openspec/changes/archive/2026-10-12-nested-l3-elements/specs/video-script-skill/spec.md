# Delta for video-script-skill

## ADDED Requirements

### Requirement: Compiler Resolves Layers via Explicit Parentage

The video script compiler MUST bind `Layer` elements to their parent `Scene` using explicit `parentSlug` values before falling back to slug prefix matching. Flat legacy scripts lacking `parentSlug` MUST continue resolving via slug prefix fallback.

#### Scenario: Nested layers bind by parent slug

- GIVEN a script with nested Layer elements specifying `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its parent Scene via `parentSlug`

#### Scenario: Flat legacy layers fall back to slug prefix

- GIVEN a legacy script lacking `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its Scene via slug prefix
