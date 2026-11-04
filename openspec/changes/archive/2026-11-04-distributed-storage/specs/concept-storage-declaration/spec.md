# concept-storage-declaration Specification

## Purpose

A Level-2 bluepriNNt declares, per concept, where the instances of that concept are stored: `compact` (all instances are elements of one kNNowledge model) or `distributed` (each instance is the root of its own kNNowledge model, called an instance model). The declaration is the only source of truth for storage; folder shapes never imply it. The scope chain (`scope-chain`) is orthogonal and unchanged.

Terms: a `placement rule` is the bluepriNNt-declared path template that says where an instance model of a distributed concept lives. A `container` is the thing an instance is stored under (the domaiNN root or an instance of another distributed concept). The surface that carries the declaration (frontmatter keys, heading, template syntax, how a concept names its container) is a design decision; the requirements below hold for any surface.

Examples use the real `video-script` concepts: `Series` and `Video` distributed, `Scene` and `Layer` elements of a Video instance model.

## Requirements

### Requirement: Storage is declared per concept

A bluepriNNt MUST be able to declare, for each of its concepts, one of two storage forms: `compact` or `distributed`. The declaration MUST be per concept, not per bluepriNNt, so one bluepriNNt MAY declare some concepts compact and others distributed. A concept that carries no declaration MUST be treated as `compact`.

#### Scenario: Mixed declaration in one bluepriNNt
- GIVEN a `video-script` bluepriNNt version declaring `Series` and `Video` distributed and `Preset` compact
- WHEN the bluepriNNt is parsed
- THEN the storage of `Series` and `Video` is `distributed` and the storage of `Preset` is `compact`

#### Scenario: Undeclared concept is compact
- GIVEN a bluepriNNt concept `Programa` with no storage declaration
- WHEN its storage is read
- THEN it is `compact`
- AND no diagnostic is emitted

#### Scenario: Invalid storage value
- GIVEN a concept declaring storage `scattered`
- WHEN the bluepriNNt is validated
- THEN a diagnostic names the concept and the accepted values `compact` and `distributed`

### Requirement: A distributed concept declares a placement rule and a container

A distributed concept MUST declare a placement rule and the container its instances are stored under. A bluepriNNt that declares a concept distributed without a placement rule, or with a rule that cannot name a container, MUST fail bluepriNNt validation with a diagnostic naming the concept.

#### Scenario: Placement rule present
- GIVEN `Video` declared distributed with a placement rule placing each instance under `series/<series>/assets/<video>/` and the container `Series`
- WHEN the bluepriNNt is validated
- THEN it validates

#### Scenario: Placement rule missing
- GIVEN `Video` declared distributed with no placement rule
- WHEN the bluepriNNt is validated
- THEN validation fails naming `Video` and the missing placement rule

### Requirement: A distributed concept is a model root and its children are elements

An instance of a distributed concept MUST be the root of its own kNNowledge model, one instance per model. The child concepts of a distributed concept (for example `Scene` and `Layer` under `Video`) MUST be elements of the instance model, nested by the existing heading-depth rules. An element of a child concept MUST NOT be stored as its own model by this declaration (splitting an element into a file is out of scope).

#### Scenario: Video instance model holds Scenes and Layers
- GIVEN the instance model of Video `pepper-mapache`
- WHEN it is read
- THEN the model root is the Video
- AND `00-gancho` (Scene) and `00-gancho-presenter` (Layer) are elements of that model

#### Scenario: Two instances in one model are rejected
- GIVEN one model holding two Video roots
- WHEN it is validated
- THEN validation fails with a cardinality diagnostic naming the concept `Video` and the model

### Requirement: Combining storage forms across the concept hierarchy is validated

A bluepriNNt MUST be rejected at validation, with a diagnostic naming both concepts, when its declarations combine storage forms in a way the design phase marks invalid (for example a distributed concept whose container is a concept that is not an instance model or the domaiNN root). Whether a compact concept may hold elements whose child concept is distributed is decided by design; the diagnostic requirement holds for either answer.

#### Scenario: Invalid combination is named
- GIVEN a bluepriNNt whose distributed concept names a container that cannot hold it
- WHEN the bluepriNNt is validated
- THEN a diagnostic names the distributed concept and the offending container concept

### Requirement: Storage is orthogonal to the scope chain

The storage declaration MUST NOT change what `findScopeChain` returns, which documents are sub-scopes (`scope: true`), how `isolate` cuts a chain, or how values are inherited. Placement decides where an instance lives; the scope chain decides from whom it inherits values.

#### Scenario: Instance inherits series values
- GIVEN Video instance `villabotijos-today/pepper-mapache` under `series/villabotijos-today/assets/pepper-mapache/` and a series scope document declaring `fps`
- WHEN `resolve_effective` resolves `fps` for the instance model
- THEN the value is supplied by the series scope exactly as it is today

#### Scenario: Declaring storage does not create a scope
- GIVEN a folder holding an instance model but no document with `scope: true`
- WHEN `findScopeChain` runs from it
- THEN the folder is not part of the chain

### Requirement: Folder shape never implies storage

No tool MAY infer that a concept is distributed from the presence of a per-instance folder. A model in a folder of its own, whose concept is not declared distributed, MUST be treated as an ordinary compact model with no placement expectation.

#### Scenario: Undeclared per-instance folder
- GIVEN `proyectos/alpha/models/alpha_business_NN.md` of a bluepriNNt whose `Project` concept declares no storage
- WHEN the domaiNN is validated
- THEN no placement diagnostic is emitted for it
- AND the model is an ordinary compact model
