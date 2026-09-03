# format-editor Specification (Delta: deep-integration — First Slice "Core unificado + navegación")

## Purpose

Replace the "two apps" model (separate FILE and FOLDER modules, two document stores, ESLint import wall) with one unified normalized element graph (`modelStore`). Storage mode (FILE or FOLDER) becomes a per-node, per-node-projection property, orthogonal to the logical graph. This slice covers: single parse pass, recursive parse/serialize (read+write) over both representations into the same graph, root→children metamodel resolution driving forms, sibling-unique/qualified node identity, a single mixed navigation tree, and metamodel-driven editing with the ported widget system + per-field provenance. Conversion, wikilink resolution/UI, relationship view editors, rules/workflows, and AI are explicitly out of scope for this slice.

## Requirements

| # | Requirement | S | Description |
|---|------------|---|-------------|
| R1 | Single Parse Pass | MUST | Opening a workspace triggers exactly one parse pass that populates a single normalized `modelStore`; no second document store is created or hydrated separately |
| R2 | One `modelStore` | MUST | The editor maintains exactly one normalized element graph store as the source of truth for node data, fields, markers, and relationships |
| R3 | No Dual Document Stores | MUST NOT | The previously planned `documentStore` + `folderStore` split MUST NOT exist; there is no per-mode document store |
| R4 | Per-Node Storage Mode | MUST | Every node in `modelStore` records its own storage mode (`FILE` or `FOLDER`) as a node property, independent of its siblings' or parent's mode |
| R5 | Recursive Parser (Read) | MUST | The parser walks a workspace recursively, and for each node invokes `format-core`'s FILE or FOLDER read primitive according to that node's on-disk representation, inserting the result into the same `modelStore` graph |
| R6 | Recursive Serializer (Write) | MUST | The serializer walks the graph recursively and, for each node, invokes `format-core`'s FILE or FOLDER write primitive matching that node's recorded storage mode |
| R7 | Round-Trip Fidelity | MUST | Parsing a workspace and immediately serializing it back (with no user edits) reproduces content and structure equivalent to the original, for both FILE and FOLDER nodes and for mixed trees |
| R8 | No In-Place Conversion | MUST NOT | This slice MUST NOT offer or perform in-place conversion of a node's storage mode (FILE→FOLDER or FOLDER→FILE); a node's recorded mode is read and preserved only |
| R9 | Recursive Metamodel Resolution | MUST | The effective metamodel (concepts, fields, markers) for any node is resolved by walking root→node, applying `format-core`'s inherit/override pattern (`resolveParentChain` / `getSpecForLevel`) recursively across node nesting, so any subtree may override what it inherits from its ancestors |
| R10 | Metamodel Drives Forms | MUST | The node's resolved metamodel (from R9) determines which fields, markers, and widgets are rendered in that node's edit form; forms MUST NOT be derived from a hardcoded or per-mode-specific schema |
| R11 | Node Identity | MUST | A node's identity is its name, which MUST be unique among its siblings; nodes are additionally addressable by a qualified `Parent/Child` path to disambiguate identically-named nodes across different branches |
| R12 | Identity Stability on Round-Trip | MUST | A node's identity (name + qualified path) is unchanged after a parse→serialize round-trip with no user edits |
| R13 | Unified Navigation Tree | MUST | The left sidebar renders exactly one tree that mixes file-type and folder-type nodes in a single hierarchy; there is no separate FILE tree and FOLDER tree |
| R14 | Metamodel-Driven Editing | MUST | Selecting any node in the tree renders an editing form for that node's resolved fields and markers, built using the ported widget system |
| R15 | Ported Widget System | MUST | Editing widgets are the full ported widget set (not a reduced "format-core parity" subset) sufficient to cover the fixture metamodels exercised by this slice; any widget type not yet ported renders via an explicit fallback widget rather than failing or being silently omitted |
| R16 | Per-Field Provenance Capture | MUST | Every write to a node's field or marker through the editing form records per-field provenance (e.g., what changed and that it was user-edited) alongside the value |
| R17 | No ESLint FILE↔FOLDER Wall | MUST NOT | No lint rule blocks cross-imports between what were previously the FILE and FOLDER modules; `shared/` and the unified `modelStore` are used by all node handling regardless of storage mode |
| R18 | format-core Tests Unchanged | MUST | Existing `packages/format-core` test suite passes unchanged; any core additions in support of this slice are additive only and do not modify existing public API behavior |
| R19 | Out-of-Scope Absence | MUST NOT | This slice MUST NOT ship in-place conversion UI/logic, cross-boundary wikilink resolution or UI, relationship view editors (grid/table/graph/matrix), rules/workflows features, or any AI functionality |

## Scenarios

| R | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| R1 | Single pass on open | Workspace handle valid, mixed FILE/FOLDER content | User opens the workspace | Exactly one parse pass runs and populates `modelStore`; no second parse or second store hydration occurs |
| R1 | No duplicate parse on navigation | `modelStore` already populated | User navigates between nodes/routes | No re-parse of the workspace occurs |
| R2 | Single store confirmed | App running | Inspecting Pinia stores | Exactly one store holds node graph data (`modelStore`); no `documentStore`/`folderStore` instances exist |
| R3 | Dual store absence | Codebase | Searching for `documentStore` and `folderStore` definitions | Neither store is defined; only `modelStore` exists |
| R4 | Mixed mode siblings | Parent node is FOLDER; contains one FILE child and one FOLDER child | Graph is inspected | Each child records its own storage mode independently of the parent and of each other |
| R4 | Mode preserved after read | Node originally FOLDER on disk | Parsed into `modelStore` | Node's `storageMode` = FOLDER |
| R5 | Recursive read across mixed tree | Workspace root is FOLDER with nested FILE and FOLDER children | Parser runs | All nodes (root and descendants, regardless of mode) appear in the same graph |
| R5 | Read failure isolated | One nested node is malformed | Parser runs | Error is reported for that node; sibling nodes still parse into the graph (no whole-tree abort required beyond that node) |
| R6 | Recursive write across mixed tree | `modelStore` graph has FILE and FOLDER nodes, some edited | Serializer runs (save) | Each node is written using the primitive matching its recorded storage mode; all edited nodes are persisted |
| R7 | Round-trip on FILE fixture | A `models/*` FILE fixture, no edits | Parse then immediately serialize | Output is structurally/byte-equivalent to the original fixture |
| R7 | Round-trip on FOLDER fixture | A `models/*` FOLDER fixture, no edits | Parse then immediately serialize | Output is structurally/byte-equivalent to the original fixture |
| R7 | Round-trip on mixed tree | A workspace mixing FILE and FOLDER nodes, no edits | Parse then immediately serialize | All nodes round-trip equivalently, regardless of mode |
| R8 | No conversion action available | Node selected, any mode | User inspects available actions | No control or code path exists to convert the node's storage mode |
| R8 | Mode preserved despite edits | FOLDER node with field edits | User saves | Node is still written as FOLDER; mode is not altered by editing fields |
| R9 | Root concept inherited | Root defines concept `Risk`; child node has no local override | Metamodel resolved for child | Child's effective metamodel includes `Risk` inherited from root |
| R9 | Local override applied | Root defines concept `Risk`; a subtree redefines `Risk` with additional fields | Metamodel resolved for a node inside that subtree | Node's effective metamodel reflects the subtree's overridden definition, not the root's plain definition |
| R9 | Nested override two levels deep | Root → child A → grandchild; grandchild overrides a concept child A inherited from root | Metamodel resolved for grandchild | Grandchild sees its own override, not child A's or root's version |
| R10 | Form reflects resolved metamodel | Node's resolved metamodel includes fields X and Y | Node selected | Edit form renders fields X and Y (and their markers), not fields absent from the resolved metamodel |
| R10 | Form omits non-applicable fields | Node's resolved metamodel does not include field Z | Node selected | Edit form does not render field Z |
| R11 | Unique siblings accepted | Two nodes named `Alpha` and `Beta` under the same parent | Graph is built | Both nodes coexist with distinct identities |
| R11 | Duplicate sibling names rejected/flagged | Two nodes both named `Alpha` under the same parent | Graph is built | Identity conflict is detected and reported (not silently allowed as two indistinguishable `Alpha` nodes) |
| R11 | Cross-branch disambiguation | Node `Alpha` exists under `Parent1` and also under `Parent2` | Identity is resolved for each | Each resolves to a distinct qualified path (`Parent1/Alpha`, `Parent2/Alpha`) |
| R12 | Identity stable, no edits | Node `Parent/Child` exists | Parse then serialize, no edits | Node's identity after round-trip is still `Parent/Child` |
| R13 | Mixed tree rendered | Sidebar tree with both file-type and folder-type nodes | Sidebar renders | A single tree view shows both node types together, not two separate lists/trees |
| R13 | Selection works across types | Tree contains a file-type node and a folder-type node | User selects each in turn | Both are selectable from the same tree and both load their respective forms |
| R14 | Select node renders form | Any node in the tree | User selects it | A metamodel-driven edit form appears for that node's resolved fields/markers |
| R14 | Switch selection updates form | Node A's form is open | User selects node B | Form updates to reflect node B's resolved metamodel (not stale node A fields) |
| R15 | Ported widget renders known type | Node field's resolved widget type is one covered by fixture metamodels this slice | Form renders | The correct ported widget type is used for that field |
| R15 | Fallback widget for unported type | Node field's widget type is not yet ported | Form renders | An explicit fallback widget is shown for that field (not a crash or blank field) |
| R16 | Provenance recorded on edit | User edits a field value | Edit is saved | Provenance metadata (that the field was user-edited) is recorded alongside the new value |
| R16 | Provenance absent without edit | Node loaded, no user changes made | Node is inspected | No new user-edit provenance is recorded beyond what existed at parse time |
| R17 | Cross-import allowed | Code under what was the FILE area imports from what was the FOLDER area (or vice versa) via `shared/`/`modelStore` | Lint runs | No lint error is raised for this import |
| R17 | Rule absence confirmed | ESLint config | Config is inspected | No rule corresponding to the old R15 FILE↔FOLDER boundary exists |
| R18 | Core suite green | `packages/format-core` test suite | Suite is run after this slice lands | All existing tests pass unchanged |
| R18 | No breaking core change | `format-core` public API | API surface is compared pre/post slice | Only additive helpers exist, if any; no existing signature or behavior changed |
| R19 | No conversion UI shipped | Editor UI | User explores available actions on any node | No file↔folder conversion control exists |
| R19 | No wikilink UI shipped | Editor UI | User explores a node with a name matching another node elsewhere | No cross-boundary wikilink resolution or link UI is presented |
| R19 | No relationship view editors shipped | Editor UI | User explores navigation/menus | No grid/table/graph/matrix relationship view editor is present |
| R19 | No rules/workflows or AI shipped | Editor UI and codebase | User explores UI; codebase is scanned | No rules/workflows features and no AI imports/SDKs/generation UI exist |
