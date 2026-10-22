# @cognnitive/nn-core

Framework-agnostic TypeScript library shared across the cogNNitive ecosystem. Used by `nn-mcp` and the domain console tooling.

## Features

- **Parser** — unified frontmatter, concept, and matrix parsing for `_NN.md` iNNfo documents
- **Model** — type definitions for Concept, Element, Field, Matrix, and Relationship
- **Validator** — `validateKnowledge`, `validateBlueprint`, `validateFormatContent`, `validateFormatSyntax`, and `validateReferences`, validating kNNowledge documents against bluepriNNt schemas
- **Mutate & Changeset** — intent-level mutation operations and the sealed changeset apply/re-validate engine
- **Lineage & Cognitivize** — sidecar-backed source provenance and the lineage projection
- **Slug & Unit Address** — canonical slug derivation and the `unitAddress` / `parseUnitAddress` grammar
- **IO Drivers** — the `FsDriver` interface for reading and writing iNNfo documents
- **Resolver** — resolves the parent chain from level 3 (kNNowledge) up to level 0 (defiNNition), downloading specs as needed and caching them in the OS temp directory

## API

```typescript
import { parseFrontmatter, validateKnowledge } from '@cognnitive/nn-core'

// Parse YAML frontmatter from an iNNfo document
const fm = parseFrontmatter(content)
// Returns: { title, level, parent_spec, ... }

// Validate a parsed kNNowledge document against its resolved blueprint and spec chain
const result = validateKnowledge(knowledgeDoc, blueprintDoc, formatSpecDoc, options)
```

## Usage

```bash
# Build the library
npm run build -w @cognnitive/nn-core

# Run tests
npm run test -w @cognnitive/nn-core
```
