## ADDED Requirements

### Requirement: Live Specification Prose Matches Shipped Grammar and Vocabulary

Live specification and bluepriNNt files MUST use the shipped grammar and vocabulary. The `type:: citation` description in the live Level-1 spec (`iNNfo/specs/iNNfo_V_0-5-0_NN.md`) MUST use the `sources/import/<file>@## Heading` pointer grammar and MUST NOT show the retired `sources/nn/<file>#slug` form. The live `cogNNitive` bluepriNNt (`iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md`) MUST NOT carry prose describing the removed Marker primitive and MUST NOT show a `model_version` key in its Level-3 template example. Frozen predecessor files (published `_V_x-y-z_` snapshots) are exempt.

#### Scenario: Level-1 citation example uses the shipped grammar
- GIVEN `iNNfo/specs/iNNfo_V_0-5-0_NN.md`
- WHEN its `type:: citation` description is read
- THEN the pointer example uses `@## Heading` and a `sources/import/` path
- AND no `sources/nn/` or `#slug` form appears in that description

#### Scenario: cogNNitive bluepriNNt carries no retired Marker prose
- GIVEN `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md`
- WHEN its prose sections are read
- THEN no `### Markers` section describing a Marker primitive is present

#### Scenario: cogNNitive template example uses knowledge_version
- GIVEN the Level-3 template example in the live `cogNNitive` bluepriNNt
- WHEN its frontmatter keys are inspected
- THEN it shows `knowledge_version` and not `model_version`

#### Scenario: Frozen predecessors are exempt
- GIVEN `iNNfo/specs/cogNNitive_V_0-2-1_NN.md`
- WHEN the change diff is inspected
- THEN the frozen file is byte-identical to before
