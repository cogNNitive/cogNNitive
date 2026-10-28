# Delta for scope-chain

Scope: one scope and root finder in nn-core. A domaiNN root is the nearest `domaiNN_NN.md`
marker found by walking up; a sub-scope is a marker kNNowledge document with `scope: true`;
containment is single-parent; `isolate` stops the chain. Phase G0.

Terms. The **chain** of a path is the ordered list of scopes that contain it, from the
domaiNN root (outermost) to the nearest enclosing scope (innermost). A **marker** is the
kNNowledge document that declares a scope: `domaiNN_NN.md` for the root, any kNNowledge
document with frontmatter `scope: true` for a sub-scope.

## ADDED Requirements

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

### Requirement: Model Id Collision Is An Error

Model ids are filename stems and are global to a domaiNN. When two documents in different
scopes of one domaiNN resolve to the same model id, scope discovery MUST report an error
that names the id and both document paths. It MUST NOT silently choose one, and it MUST NOT
qualify the id with a scope.

#### Scenario: Sibling scopes share a stem

- GIVEN `portfolio/programs/alpha/status_01.md` and `portfolio/programs/beta/status_01.md`
- WHEN the domaiNN's scopes and models are discovered
- THEN one error is reported naming id `status_01` and both paths

#### Scenario: Same stem in different domaiNNs is fine

- GIVEN `outer/status_01.md` and `outer/vendor/inner/status_01.md`, where `inner` has its own `domaiNN_NN.md`
- WHEN each domaiNN is discovered
- THEN no collision is reported

### Requirement: Marker Move Changes Effective Values Warning

When a document is moved to a location with a different chain, tooling that performs or
previews the move SHOULD compare the document's effective values before and after and warn
for each key whose effective value would change, naming the key and the supplying scope on
each side.

#### Scenario: Move into a scope with a different default

- GIVEN a document whose effective `priority` is `low` from scope `alpha`, and scope `beta` that sets `priority: high`
- WHEN a move of the document from `alpha` to `beta` is previewed
- THEN a warning reports `priority` changing from `low` (scope `alpha`) to `high` (scope `beta`)

#### Scenario: Move that changes nothing

- GIVEN a move between scopes that supply identical effective values for every key
- WHEN the move is previewed
- THEN no warning is emitted

## Out of scope

Per-field `inherit::`, L2 scope declaration, per-scope ingestion and scope-qualified model
ids are deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
