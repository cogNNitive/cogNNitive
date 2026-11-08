# changeset-document-model Delta Spec

Slice 3, PR 3a. The operation's schema, provenance markers and behaviour are owned by `changeset-review-gate`; this delta only places them in the document model.

## ADDED Requirements

### Requirement: `review_gate` belongs to the closed `op` set and its keys belong to the `Change` concept

The `op` options of the `changes` bluepriNNt MUST include `review_gate`, and the `Change` concept MUST define the optional Fields `gate`, `verdict`, `reviewed_hash` and `plan_hash`; the reason of a verdict uses the existing `notes` Field. `gate`, `verdict`, `reviewed_hash` and `plan_hash` MUST be meaningful only for `op:: review_gate`: a change of any other `op` carrying one of them MUST fail validation naming the key and the `op`. The `target` format of `review_gate` is a bare model id or `<model_id>@<element_slug>`, both canonical unit addresses. The parser MUST round-trip a `review_gate` change byte-identically.

#### Scenario: Op is a valid option

- GIVEN a changeset using `op:: review_gate`
- WHEN it is validated against the `changes` bluepriNNt
- THEN no invalid-`op` diagnostic is reported

#### Scenario: Verdict keys on another op

- GIVEN an `update_field` change carrying `verdict:: approved`
- WHEN the changeset is validated
- THEN validation fails naming `verdict` and `update_field`

#### Scenario: Round trip

- GIVEN a changeset with a `review_gate` change that has `notes` and `plan_hash`
- WHEN it is parsed and serialized
- THEN the output is byte-identical to the input

#### Scenario: Target forms

- GIVEN `review_gate` changes targeting `acme` and `acme@scene-1`
- WHEN the targets are checked
- THEN both are accepted
- AND a target `acme@scene-1&voice` (a value address) is rejected as invalid for `review_gate`

### Requirement: The changeset frontmatter carries optional provenance markers

The changeset frontmatter schema MUST accept the optional keys `author_kind`, `origin` and `reviewer` defined by `changeset-review-gate` ("Human provenance lives in the changeset frontmatter"). They are sealed proposal data, not execution annotations, and MUST round-trip byte-identically.

#### Scenario: Provenance round trip

- GIVEN a changeset whose frontmatter has `author_kind: human`, `origin: console` and `reviewer: Ana`
- WHEN it is parsed and serialized
- THEN the three keys are preserved byte for byte

### Requirement: Execution annotations of a verdict are outside the seal

Applying a `review_gate` change MUST stamp the same execution facts as any applied change (status, applied time), and those facts MUST remain outside the seal as for every operation. The verdict keys and the provenance markers MUST remain inside it.

#### Scenario: Apply stamp does not break the seal

- GIVEN a sealed human console changeset with a `review_gate` change
- WHEN it is applied
- THEN `verifyProposalSha` on the applied document returns `true`
