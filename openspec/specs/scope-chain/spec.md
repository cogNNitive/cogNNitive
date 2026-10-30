# scope-chain Specification

## Purpose
TBD - created by archiving change 2026-10-28-contextual-resolution. Update Purpose after archive.
## Requirements
### Requirement: Single Scope Finder

nn-core MUST expose exactly one function, `findScopeChain(path)`, that locates the domaiNN
root and every enclosing sub-scope of `path`. Every consumer that needs a root or a scope
(nn-mcp, workspace sync, the video-script skill scripts) MUST call it and MUST NOT
implement its own upward walk. The function MUST NOT read the filesystem outside the
directories on the path from `path` up to the root.

#### Scenario: One finder in the codebase

- GIVEN the repository after phase G0
- WHEN the source is searched for upward walks that locate a domaiNN root or a scope
- THEN only `findScopeChain` implements one
- AND `findRepoRoot`, the single-directory `findManifestPath` lookup and the `.git`/`video-guard.json` branch of `resolveWorkspace` no longer exist

### Requirement: Root Is The Nearest domaiNN Marker

The domaiNN root MUST be the nearest ancestor directory (the path's own directory included)
that contains a `domaiNN_NN.md` file. The walk MUST NOT consult `.git` or any version-control
metadata, and MUST NOT depend on its presence or absence.

#### Scenario: Root found from a deep document

- GIVEN `acme/domaiNN_NN.md` and a document `acme/programs/alpha/projects/p1/plan_01.md`
- WHEN `findScopeChain` is called with the document path
- THEN the chain's root is the directory `acme`

#### Scenario: domaiNN without git

- GIVEN a domaiNN directory with `domaiNN_NN.md` and no `.git` anywhere in its ancestry
- WHEN `findScopeChain` is called with any document inside it
- THEN it returns the domaiNN root without error

#### Scenario: Git directory is ignored

- GIVEN a repository whose `.git` sits above `acme/`, and `acme/domaiNN_NN.md` exists
- WHEN `findScopeChain` is called with a document under `acme/`
- THEN the root is `acme`, not the repository root

#### Scenario: Repository root without a marker is not a root

- GIVEN a directory with `.git` and no `domaiNN_NN.md` in it or any ancestor
- WHEN `findScopeChain` is called with a path inside it
- THEN the result is a miss that lists every directory searched
- AND no exception is thrown

### Requirement: Sub-Scope Declared By A Frontmatter Flag

A directory MUST be a sub-scope if and only if it contains a kNNowledge document whose
frontmatter declares `scope: true`. No L1 or L2 declaration is required. A directory MUST
hold at most one marker; two or more `scope: true` documents in one directory MUST be
reported as an error naming both files.

#### Scenario: Three-level chain

- GIVEN `portfolio/domaiNN_NN.md`, `portfolio/programs/alpha/alpha_01.md` with `scope: true`, and `portfolio/programs/alpha/projects/p1/p1_01.md` with `scope: true`
- WHEN `findScopeChain` is called with `portfolio/programs/alpha/projects/p1/risks_01.md`
- THEN the chain is, root first, `portfolio`, `portfolio/programs/alpha`, `portfolio/programs/alpha/projects/p1`

#### Scenario: Folder without a marker is not a scope

- GIVEN `portfolio/programs/alpha/notes/` containing documents but no `scope: true` document
- WHEN `findScopeChain` is called with a document in `notes/`
- THEN `notes/` is not in the chain
- AND the innermost scope is `portfolio/programs/alpha`

#### Scenario: Flag value other than true

- GIVEN a document with `scope: false` or `scope: "yes"`
- WHEN `findScopeChain` runs over its directory
- THEN the directory is not treated as a sub-scope

#### Scenario: Two markers in one directory

- GIVEN a directory with two documents declaring `scope: true`
- WHEN `findScopeChain` is called with a path in that directory
- THEN an error is returned naming both documents

#### Scenario: Document on the way cannot be read or parsed

- GIVEN a `_NN.md` document in a directory of the ancestry that cannot be read, or whose frontmatter does not parse
- WHEN `findScopeChain` is called from below that directory
- THEN the result is the error `UNREADABLE_DOCUMENT` or `MALFORMED_FRONTMATTER` naming the document (domain-relative)
- AND no chain is returned, because the document might have declared a scope or an `isolate`

#### Scenario: Named lookup cannot leave the chain

- GIVEN a chain and a lookup path that is absolute, or that resolves outside the chain's outermost link from any of its scopes
- WHEN `findInChain` is called with it
- THEN the result is the error `PATH_OUTSIDE_SCOPE` and nothing is looked up

### Requirement: Single-Parent Containment

Every scope except the root MUST have exactly one parent: the nearest enclosing scope by
directory containment. The chain MUST therefore be linear. Tags, categories and other
memberships MUST NOT contribute to the chain.

#### Scenario: Tags do not create parents

- GIVEN a document in `portfolio/programs/alpha/` tagged with a category that names another program
- WHEN `findScopeChain` is called with the document
- THEN the chain contains only scopes that contain the document by directory

### Requirement: Isolate Stops The Chain

A sub-scope marker with frontmatter `isolate: true` MUST end the chain at that scope: the
isolated scope is the outermost scope of every chain that passes through it, and ancestors
above it MUST NOT appear in those chains.

#### Scenario: Chain cut at an isolated scope

- GIVEN `portfolio/domaiNN_NN.md`, an isolated sub-scope `portfolio/programs/legacy/legacy_01.md` (`scope: true`, `isolate: true`), and a project scope below it
- WHEN `findScopeChain` is called with a document in the project
- THEN the chain is `portfolio/programs/legacy`, then the project
- AND `portfolio` is not in the chain

#### Scenario: Siblings are unaffected

- GIVEN the same layout and a non-isolated sibling program `portfolio/programs/alpha`
- WHEN `findScopeChain` is called with a document in `alpha`
- THEN the chain still starts at `portfolio`

### Requirement: Nested domaiNN Marker Acts As A Root

A `domaiNN_NN.md` found below another one MUST start a new domaiNN: it is the root of every
chain that passes through it, with an implicit `isolate`. Model discovery for the outer
domaiNN MUST NOT descend into a directory that contains a nested `domaiNN_NN.md`, so the
nested subtree is not absorbed into the outer manifest.

#### Scenario: Nested domaiNN is its own root

- GIVEN `outer/domaiNN_NN.md` and `outer/vendor/inner/domaiNN_NN.md`
- WHEN `findScopeChain` is called with `outer/vendor/inner/docs/a_01.md`
- THEN the root is `outer/vendor/inner`
- AND `outer` is not in the chain

#### Scenario: Outer discovery stops at the nested root

- GIVEN the same layout with models under `outer/vendor/inner/`
- WHEN the outer domaiNN's models are discovered
- THEN no model under `outer/vendor/inner/` is listed in the outer manifest

### Requirement: Model Id Collision Resolves via Domain-Relative Path (Option A)

Resolution of a colliding model id across scopes MUST accept domain-relative paths, and bare stem lookup of a colliding model id MUST report an AMBIGUOUS_MODEL_ID error naming every candidate path.

- An unambiguous domain-relative path (e.g. `series/alpha/status_01`) MUST always resolve to the target document.
- Resolving the bare stem MUST produce an `AMBIGUOUS_MODEL_ID` error listing candidate paths, and MUST NOT silently choose one (first-wins walk deleted).
- Discoveries (`list_knowledge`) emit the bare stem when unique, and the domain-relative path when colliding.

#### Scenario: Sibling scopes share a stem and bare lookup is an error

- GIVEN `portfolio/programs/alpha/status_01_NN.md` and `portfolio/programs/beta/status_01_NN.md`
- WHEN resolving bare model id `status_01`
- THEN an `AMBIGUOUS_MODEL_ID` error is returned naming id `status_01` and candidates `portfolio/programs/alpha/status_01_NN.md` and `portfolio/programs/beta/status_01_NN.md`

#### Scenario: Sibling scopes share a stem and domain-relative path resolves

- GIVEN `portfolio/programs/alpha/status_01_NN.md` and `portfolio/programs/beta/status_01_NN.md`
- WHEN resolving `portfolio/programs/alpha/status_01`
- THEN resolution succeeds and returns `portfolio/programs/alpha/status_01_NN.md`

#### Scenario: Same stem in different domaiNNs is fine

- GIVEN `outer/status_01.md` and `outer/vendor/inner/status_01.md`, where `inner` has its own `domaiNN_NN.md`
- WHEN each domaiNN is discovered
- THEN no collision is reported

- GIVEN `outer/status_01.md` and `outer/vendor/inner/status_01.md`, where `inner` has its own `domaiNN_NN.md`
- WHEN each domaiNN is discovered
- THEN no collision is reported

### Requirement: Marker Move Changes Effective Values Warning

Tooling that previews a document move to a location with a different chain MUST warn for each key whose effective value would change, naming the key and the supplying scope on each side; building the preview itself is optional (Lote 2+, Q1b).

#### Scenario: Move into a scope with a different default

- GIVEN a document whose effective `priority` is `low` from scope `alpha`, and scope `beta` that sets `priority: high`
- WHEN a move of the document from `alpha` to `beta` is previewed
- THEN a warning reports `priority` changing from `low` (scope `alpha`) to `high` (scope `beta`)

#### Scenario: Move that changes nothing

- GIVEN a move between scopes that supply identical effective values for every key
- WHEN the move is previewed
- THEN no warning is emitted

### Requirement: Element Scopes Declared By Frontmatter

An element adapter MUST turn each element of a concept listed in the document frontmatter `scope_elements` into one scope node nested under the document's folder chain.
`scope_elements: [{ concept: <Concept> }, ...]` is an ordered list (outermost concept first) with an optional `parent: <field>` per entry. An element of an unlisted concept (a sub-element by
heading depth, for example) MUST NOT become a node. The parent of an element of a listed
concept other than the first MUST be, without `parent`, the nearest preceding element in
document order of the previous listed concept, and with `parent: <field>` the element of the
previous listed concept whose title is the `[[title]]` reference held in that field (exact,
unique match). The adapter MUST NOT guess: an unresolved or ambiguous parent MUST be a
structured error. The fields `slug` and `isolate` of an element MUST NOT be values. An element
with the strict boolean `isolate:: true` MUST end the chain at itself, like a folder scope;
any other value (for example the text `"true"`) MUST NOT. A document that has both
`scope: true` and `scope_elements` MUST be rejected. Node ids MUST be domain-relative, stable
and JSON-safe, and the adapter MUST be pure (it receives the already parsed elements and never
reads the filesystem).

#### Scenario: Each element of a listed concept becomes a node

- GIVEN a document with `scope_elements: [{ concept: A }, { concept: B }]`, two `A` elements `a1`, `a2` and a `B` element `b1` placed after `a2`
- WHEN the chain of `B/b1` is requested
- THEN the element nodes are `A/a2` then `B/b1`, outermost first
- AND each node id is `<doc>#<Concept>/<slug>` with the domain-relative document path

#### Scenario: Nesting follows document order

- GIVEN two `A` elements and `B` elements that follow each of them
- WHEN the chain of a `B` element is requested
- THEN its parent is the nearest preceding `A` element, not the first one

#### Scenario: Parent given by a reference field

- GIVEN `scope_elements: [{ concept: A }, { concept: B, parent: a_ref }]` and a `B` element with `a_ref:: [[Title of a1]]` placed anywhere in the document
- WHEN the chain of that `B` element is requested
- THEN its parent is the `A` element titled `Title of a1`, whatever the document order

#### Scenario: Unknown parent reference

- GIVEN a `B` element whose `parent` field is absent, is not a `[[title]]` reference, or names no `A` element
- WHEN its chain is requested
- THEN the result is the error `UNKNOWN_PARENT_ELEMENT` with a detail naming the element and the field

#### Scenario: Ambiguous parent reference

- GIVEN two `A` elements with the same title and a `B` element referencing that title
- WHEN its chain is requested
- THEN the result is the error `AMBIGUOUS_PARENT_ELEMENT`, and no parent is chosen

#### Scenario: Isolate on an element is a strict boolean

- GIVEN a `B` element with `isolate:: true` and another with `isolate:: "true"`
- WHEN each chain is built and a value is resolved through it
- THEN the first node has `isolate` true and the fold hides every node before it
- AND the second node has `isolate` false

#### Scenario: Reserved fields are not values

- GIVEN an element with `slug`, `isolate` and `colour` fields
- WHEN its node is built
- THEN `colour` is a value and neither `slug` nor `isolate` is

#### Scenario: Order and case of concepts

- GIVEN a document whose concept sections interleave (`Alpha`, `Beta`, `Alpha`, `Beta`)
- WHEN the element chain of the first `Beta` is requested
- THEN its default parent is the nearest preceding `Alpha` in document order, and the elements are listed in document order
- AND a target concept matches the declared one case-insensitively, and the nodes carry the declared spelling

#### Scenario: Unlisted concept is not a node

- GIVEN a `Layer` sub-element under a `B` element and `Layer` not listed in `scope_elements`
- WHEN the chain of `Layer/l1` is requested
- THEN the result is the error `UNKNOWN_ELEMENT`, and the `B` chain contains no `Layer` node

#### Scenario: Both scope declarations are rejected

- GIVEN a document with `scope: true` and `scope_elements`
- WHEN any element chain of it is requested
- THEN the result is the error `AMBIGUOUS_SCOPE_DECLARATION`

#### Scenario: Element target is not found or not unique

- GIVEN a target `{ concept, slug }` that matches no element, or matches two elements of one concept
- WHEN the chain is requested
- THEN the result is `UNKNOWN_ELEMENT` or `AMBIGUOUS_ELEMENT` respectively

#### Scenario: Folder document of an element chain cannot be used

- GIVEN a document whose folder chain holds an unreadable or malformed `_NN.md`, or a values document that cannot be read
- WHEN any element chain, or the folder nodes alone, are requested
- THEN the result is a structured error (`UNREADABLE_DOCUMENT` or `MALFORMED_FRONTMATTER`) naming the document, never an exception

#### Scenario: Element nodes round-trip as JSON

- GIVEN any element chain
- WHEN it is serialized with `JSON.stringify` and parsed back
- THEN it is deeply equal to the original, and requesting it twice gives equal results

