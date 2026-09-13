# Design: Workspace Template & Polymorphic Sources Architecture

## Architectural Layers

`
+-------------------------------------------------------------+
| Layer 1: Physical Storage (Local Filesystem)                |
| - sources/original/ (Raw user files / downloaded assets)    |
| - sources/nn/*.md (Normalized markdown + YAML frontmatter)  |
|   SSOT for: sha256, size_bytes, normalized_at, origin_url   |
+------------------------------+------------------------------+
                               |
               Resolved via subpath convention
                               |
+------------------------------v------------------------------+
| Layer 2: Semantic Domain Model (Level 3 - workspace_NN.md)  |
| - Conforms to: workspace_spec_NN.md (Level 2 Template)      |
| - Concepts: Workspace, Models, Sources, Procedures,         |
|   Artifacts, Tag                                            |
| - SSOT for: Domain topology, subsystem relations,           |
|   lineage graphs, business tags                             |
+------------------------------+------------------------------+
                               |
               Deterministic Reconciliation
                               |
+------------------------------v------------------------------+
| Layer 3: Engine & Linter (innfo-core / innfo-mcp)           |
| - Validates reference integrity (Model -> Source -> Disk)   |
| - Flags unlinked orphan files (Warning)                     |
| - Flags dangling references without disk file (Error)       |
+-------------------------------------------------------------+
`

## Schema Refactoring in workspace_spec_NN.md

1. **Version Update**: Bump template specification version to V_0-4-0 (or V_0-3-1).
2. **Concept Workspace**:
   - Add fields: models_dir, sources_dir.
3. **Concept Sources**:
   - Add: 	ype, origin_uri, ormat, subpath, efresh_policy, status, 	ags.
   - Deprecate/Remove from L3 body: aw_filename, aw_hash, size, 
ormalized_at, 
ormalized_by, 
ormalized_content, aw_file.
4. **Matrices**:
   - Retain Artifact-Source Lineage and add Model-Source Lineage.
