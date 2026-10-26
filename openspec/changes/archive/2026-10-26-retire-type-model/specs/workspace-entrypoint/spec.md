## MODIFIED Requirements

### Requirement: Submodel Reference Extraction

The parser MUST extract referenced submodels from both traditional markdown/wikilink syntax (`[[target.md]]`, `[label](target.md)`) AND structured `Models` element properties (e.g. `path::` fields typed `knowledge`; a deprecated `type:: model` declaration normalizes to `knowledge`).

#### Scenario: Submodels declared via Models path fields
- GIVEN a `domaiNN_NN.md` containing `## NN Models: Core Engine` with `path:: kNNowledge/core_engine_NN.md`
- WHEN `recursiveParse()` processes the domaiNN entrypoint
- THEN `kNNowledge/core_engine_NN.md` is queued and parsed as a submodel in the domaiNN graph

#### Scenario: Submodels declared via wikilinks in entrypoint content
- GIVEN a `domaiNN_NN.md` body containing `[[kNNowledge/analytics_NN.md]]`
- WHEN `recursiveParse()` extracts links from the entrypoint
- THEN `kNNowledge/analytics_NN.md` is parsed and linked in the domaiNN graph

### Requirement: Level 2 Workspace Template Definition

The canonical Level 2 workspace bluepriNNt MUST be the versioned `workspace_V_0-3-0_spec_NN.md` provided under `iNNfo/specs/bluepriNNts/`, or its live `spec_NN.md` counterpart. It MUST define core workspace concept primitives including `Workspace` (`type:: text`), `Models` (`type:: knowledge`), and `Tag` (`type:: category`), with standard properties (`path`, `blueprint`, `status`). The unversioned alias `workspace_spec_NN.md` SHALL NOT be used as the distribution or conformance name.

#### Scenario: Workspace model validates against the versioned bluepriNNt
- GIVEN a `domaiNN_NN.md` declaring `parent_spec` naming the workspace bluepriNNt
- WHEN metamodel validation runs against the versioned bluepriNNt
- THEN `Workspace`, `Models`, and `Tag` concept definitions are recognized as valid metamodel concepts

#### Scenario: Models concept carries the knowledge type
- GIVEN the live workspace bluepriNNt
- WHEN its `Models` concept definition is read
- THEN its `type` is `knowledge`

#### Scenario: Alias is absent from distribution surfaces
- GIVEN the change is applied
- WHEN the bluepriNNt directories are inspected
- THEN `workspace_spec_NN.md` exists in neither `iNNfo/specs/bluepriNNts/` nor the `nn-innfo` skill bundle
- AND the canonical versioned copy is present
