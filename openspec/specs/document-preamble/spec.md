# Document Preamble

## Purpose

Define the preamble channel of an iNNfo markdown document: the optional block
between the YAML frontmatter and the first `# NN` heading. It is author-owned
content — reproduced verbatim on every round trip — and it is empty by default.
(This capability replaces `document-badge`, which mandated one specific
boilerplate callout in that slot.)

## Requirements
### Requirement: The Preamble Is Optional And Author-Owned

An iNNfo document MAY carry a preamble: free-form markdown between the closing
`---` of the frontmatter and the first `# NN` heading. It exists so an author can
give context, instructions, warnings, or provenance that the document cannot
state in its own body.

No tool MAY invent preamble content for a document whose author wrote none.

#### Scenario: Serializer emits no preamble for a model without one
- GIVEN a `ParsedKnowledge` model with no recorded `rawPreamble`
- WHEN `serializeKnowledge()` produces the markdown text
- THEN the body starts at the first `# NN` heading
- AND no `> [!NOTE]` blockquote is produced

#### Scenario: Scaffolded models start at a heading
- GIVEN an agent creating a model through `add_model`, `init_knowledge`, or `planDomainScaffold`
- WHEN the file is written
- THEN the body begins with an `# NN` heading or the first `## NN` element
- AND no boilerplate callout is written

### Requirement: The Preamble Survives Round Trips Verbatim

The parser records the preamble as `rawPreamble` and the serializer re-emits it
unchanged, whatever its content and length. Callouts, headings, code fences, and
prose inside the preamble are all preserved.

#### Scenario: A custom preamble survives a mutation
- GIVEN a document whose preamble reads `> [!WARNING]` followed by a
  workspace-specific instruction
- WHEN a changeset mutates one field of that document and the result is serialized
- THEN the preamble is byte-identical in the output

#### Scenario: A document with a preamble still parses
- GIVEN a document written before this capability, carrying the retired
  `This is an **iNNfo document**` callout
- WHEN it is parsed
- THEN parsing succeeds
- AND the callout is preserved as the preamble

### Requirement: The Retired Boilerplate Badge Is Not Emitted Or Required

The callout that read `This is an **iNNfo document** — a plain-text Markdown
file.` MUST NOT be emitted by any generator: `@cognnitive/nn-core`'s
`serializeKnowledge` and changeset serializer, the `scaffold/knowledge` and
`scaffold/domain` scaffolds, the `canonical-registry` embedded templates, the
`nn-mcp` `sync_lineage` record, and the console changeset export. Validation MUST
NOT report a missing notice, and rebuilt bundles (`nn-mcp.bundle.js`, the console
bundle, `nn-core.generated.cjs`) MUST reflect the removal.

Published write-once `_V_x-y-z_` documents keep the bytes they were published
with; the badge is not edited in place.

#### Scenario: Validator no longer requires a notice
- GIVEN a valid Level-3 document with no preamble
- WHEN it is validated
- THEN no diagnostic reports a missing `[!NOTE]` notice

#### Scenario: Generated artifacts carry no badge
- GIVEN the repository after regeneration
- WHEN the committed console bundle, `nn-core.generated.cjs`, and the staged MCP
  bundle are searched
- THEN none of them contains the retired badge as generated boilerplate
- AND the `canonical-registry` mirrors of published write-once specs are exempt,
  because they reproduce those files byte-for-byte

### Requirement: Maintained Documents Align With The Removal

Maintained markdown in the repository — specification templates, samples,
documentation, and fixtures — MUST NOT carry the retired badge. The migration is
one-shot and idempotent: `scripts/strip-document-badge.mjs` removes the callout,
skips published `_V_x-y-z_` filenames, and leaves `openspec/` to hand-editing.

#### Scenario: Blueprints no longer carry the badge
- GIVEN a canonical `iNNfo/specs/bluepriNNts/<name>/spec_NN.md`
- WHEN the badge migration has run
- THEN the file has no `> [!NOTE]` boilerplate callout
- AND no `blueprint_version` bump is required, because the callout is not
  content and the template-immutability guard normalises it away on both sides
