# console-architecture Specification

## MODIFIED Requirements

### Requirement: The console model notion is declared, not inferred

The console model notion (`roleOf`, `isConsoleModel`, `isModelCandidate`) MUST be driven by the blueprint's declared `nature`, resolved through the compiled map, and MUST NOT be derived from the blueprint name. The hardcoded name predicate (`NON_KNOWLEDGE_BLUEPRINT_RE`) and the exporter allowlist (`CONSOLE_CORE_BLUEPRINTS`) MUST be removed.

(Previously: the role was inferred from the `parent_spec.name` prefix and the exporter re-included `sources`/`artifacts`/`procedures` by name.)

#### Scenario: Role from nature
- GIVEN a core blueprint declaring `structure: catalog`
- WHEN its documents are classified
- THEN they are `catalog` and surface, without a name allowlist

#### Scenario: Hardcode absent
- GIVEN the repository after this change
- WHEN searched for `NON_KNOWLEDGE_BLUEPRINT_RE` and `CONSOLE_CORE_BLUEPRINTS`
- THEN no live occurrence exists
