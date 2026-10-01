# Spec Delta: Bootstrap Workflow (Canonical Layout)

## MODIFIED Requirements

### Requirement: Canonical Bootstrap Output
`bootstrap.js` MUST scaffold the workspace with `kNNowledge/` and `domaiNN_NN.md`. The initial lineage record MUST declare `iNNfo_V_0-3-0` as its parent specification. The bootstrapped workspace MUST immediately evaluate to `kind: 'current'` under `detectLegacy`.

#### Scenario: Bootstrap creates current workspace
- GIVEN a clean directory
- WHEN `bootstrap.js` executes
- THEN `detectLegacy` returns `{ kind: 'current' }`
- AND `domaiNN_NN.md` and `kNNowledge/` are created.
