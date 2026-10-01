# Spec Delta: Router Governance (Contract Repair)

## MODIFIED Requirements

### Requirement: Catalog Source and Static Registry Deprecation
The routing catalog within `nn-start` MUST reflect the actual distributed skills defined in `manifest/source.yaml`. The phantom `.cogNNitive/skill-registry.md` and `scripts/build-registry.js` references MUST be excised.

### Requirement: Zero Discard Session Alignment
All documentation, skill instructions, and references to session lifecycles MUST consistently document Zero Discard policy (`evaluateSessionDiscard` returns `false`).

#### Scenario: Zero Discard documented consistently
- GIVEN any skill or doc file
- WHEN session lifecycle is described
- THEN the text MUST state that sessions are retained unconditionally (Zero Discard).
