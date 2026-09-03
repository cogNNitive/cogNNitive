# Delta for format-editor (hierarchy-model)

## Purpose

Correct the FOLDER-mode hierarchy derivation in the recursive parser (`recursiveParser.ts`). Establishes the Root/Concept/Element/Sub-element node model, a per-mode source of truth for hierarchy on read, and the rule that a directory without `_FORMAT.md` is a concept/group node that the walk must recurse into rather than abort on. Refines `deep-integration`'s R5 (Recursive Parser — Read). Read-only: no index-block generation, no FILE↔FOLDER conversion, no wikilink/relationship-view/AI work.

## MODIFIED Requirements

### Requirement: Recursive Parser (Read)

The parser MUST walk a workspace recursively, and for each node invoke `format-core`'s FILE or FOLDER read primitive according to that node's on-disk representation, inserting the result into the same `modelStore` graph. A directory with no `_FORMAT.md` MUST NOT abort the walk: it MUST become a concept/group node, and the walk MUST recurse unconditionally into that directory's children. A directory with a present but unparseable `_FORMAT.md` MUST report an issue for that node AND still recurse into that directory's children (its subtree is not dropped).

(Previously: a missing `_FORMAT.md` was treated as a fatal parse failure — `parseFolderNode`'s catch block returned before reaching `dirHandle.entries()`, aborting the branch and silently dropping the whole subtree.)

#### Scenario: Recursive read across mixed tree

- GIVEN workspace root is FOLDER with nested FILE and FOLDER children
- WHEN the parser runs
- THEN all nodes (root and descendants, regardless of mode) appear in the same graph

#### Scenario: Missing `_FORMAT.md` becomes a concept node and recursion continues

- GIVEN a directory has no `_FORMAT.md` (e.g. `AILab`)
- WHEN the parser visits that directory
- THEN the directory becomes a concept/group node
- AND the walk recurses into its child entries instead of aborting

#### Scenario: Present-but-unparseable `_FORMAT.md` still recurses

- GIVEN a directory's `_FORMAT.md` exists but fails to parse (malformed content)
- WHEN the parser visits that directory
- THEN an issue is reported for that node's path
- AND the walk still recurses into that directory's children (no subtree is dropped)

#### Scenario: Read failure isolated to one node

- GIVEN one nested node is malformed
- WHEN the parser runs
- THEN an error is reported for that node; sibling nodes still parse into the graph

## ADDED Requirements

### Requirement: Concept/Element/Sub-element Node Model

The graph MUST distinguish three node kinds beneath the root: Concept (a type, from the metamodel), Element (an instance of a concept), and Sub-element (a nested instance). Children MUST follow this rule: the root's children are concepts; a concept's children are its elements; an element's children are its sub-elements.

#### Scenario: Bare directory recognized as a concept

- GIVEN a top-level directory has no `_FORMAT.md` (e.g. `AILab`)
- WHEN the tree is built
- THEN the directory is represented as a concept node, not an element node

#### Scenario: Directory with `_FORMAT.md` and `type` recognized as an element

- GIVEN a directory has a parseable `_FORMAT.md` declaring `type: "AILab"` (e.g. `AILab/Anthropic`)
- WHEN the tree is built
- THEN the directory is represented as an element node of concept `AILab`, nested under the `AILab` concept node

### Requirement: Union of In-File and Directory Children

The children of a node MUST be the union of its in-file children (derived from the index-block taxonomy via `normalizeElementsIntoGraph`) and its child directories/files, with no duplicate and no dropped children.

#### Scenario: Union with no in-file children

- GIVEN a concept node has only child directories and no index-block taxonomy entries
- WHEN the tree is built
- THEN all child directories appear as children with no duplicates

#### Scenario: Union with both sources present

- GIVEN a node has index-block taxonomy children AND child directories
- WHEN the tree is built
- THEN the node's children are the union of both sources, and no child is counted twice or omitted

### Requirement: Per-Mode Hierarchy Source of Truth (Read)

On read, the source of truth for hierarchy MUST be per-mode: for FILE nodes, the index block (`taxonomy`) is the source of truth for element hierarchy; for FOLDER nodes, the directory structure is the source of truth. The root index block MUST NOT be treated as a hierarchy source for a FOLDER-mode subtree.

#### Scenario: FILE node hierarchy from index block

- GIVEN a FILE node's `_FORMAT.md` declares an index-block taxonomy
- WHEN the parser builds that node's element hierarchy
- THEN the hierarchy matches the taxonomy edges, not any directory structure

#### Scenario: FOLDER node hierarchy from directory structure

- GIVEN a FOLDER-mode root has bare concept directories and element leaf directories
- WHEN the parser builds the tree
- THEN the hierarchy is derived from directory nesting, and the root's own index block (if any) is not used to derive that FOLDER subtree's hierarchy

### Requirement: Metamodel Binding with Structural Fallback

A concept/group node MUST bind to a matching metamodel concept when the resolved metamodel provides one (semantic enrichment). When the metamodel cannot be resolved (e.g. browser-side parent-spec-chain resolution is unavailable), the node MUST remain a structural concept/group node rather than being dropped, altered incorrectly, or causing a crash.

#### Scenario: Metamodel resolves the concept

- GIVEN the resolved metamodel defines concept `AILab`
- WHEN a bare directory named `AILab` is parsed
- THEN the concept node is tagged as bound to metamodel concept `AILab`

#### Scenario: Metamodel cannot be resolved

- GIVEN the metamodel cannot be resolved in the browser for a bare directory
- WHEN that directory is parsed
- THEN the directory still becomes a structural concept/group node
- AND its subtree is still walked and included in the graph

### Requirement: Catalog Fixture Loads to a Non-Empty Tree

Loading a catalog-shaped directory handle (root `_FORMAT.md` in FOLDER mode, bare concept directories, element leaf directories with `_FORMAT.md` and `type:`) MUST yield a non-empty tree containing each bare concept directory as a concept node with its element leaf directories as children.

#### Scenario: `AI_Industry_V_1-0-0_catalog`-shaped fixture parses end-to-end

- GIVEN a catalog-shaped fixture modeled on `models/AI_Industry_V_1-0-0_catalog/` (bare `AILab` directory containing `Anthropic/_FORMAT.md` with `type: "AILab"`)
- WHEN `recursiveParse` runs over the fixture's root directory handle
- THEN the resulting tree is non-empty
- AND it contains concept node `AILab` with element child `Anthropic`
- AND `Anthropic` carries `type: "AILab"`

### Requirement: Scope Guard — No Write-Path, Conversion, or Downstream Feature Changes

This slice MUST NOT introduce index-block generation on save, FILE↔FOLDER conversion, cross-boundary wikilinks or their UI, relationship view editors, or AI functionality. `packages/format-core`'s public API and behavior MUST remain unchanged.

#### Scenario: No index-block generation triggered by this slice's read fix

- GIVEN a FOLDER-mode workspace is parsed and no save is performed
- WHEN the tree is inspected
- THEN no index block has been generated or written for any FOLDER node

#### Scenario: `format-core` unchanged

- GIVEN `packages/format-core`'s existing test suite and public API
- WHEN this slice's changes are applied
- THEN the suite passes unchanged and no existing signature or behavior is altered
