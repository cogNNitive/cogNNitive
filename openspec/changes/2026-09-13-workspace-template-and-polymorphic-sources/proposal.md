# Proposal: Workspace Template Refactoring & Polymorphic Sources Architecture

## Context & Motivation

In iNNfo workspaces, the relationship between the physical filesystem (sources/original/, sources/nn/, models/) and the semantic workspace model (workspace_NN.md) had architectural overlap:
1. **Physical Metadata Duplication**: Previous iterations placed physical file hashes (aw_hash), byte sizes (size), and normalization timestamps (
ormalized_at) inside both the Markdown workspace model and the individual file frontmatters in sources/nn/, violating Single Source of Truth (SSOT) and creating maintenance drift.
2. **Limited Source Types**: Previous source definitions assumed only local raw files (aw_filename), lacking native polymorphic support for web snapshots, dynamic feeds (RSS/news), Git repositories, and local disks without URLs.
3. **Hardcoded Path Boilerplate**: Every source and model repeated full directory prefixes (sources/nn/..., sources/original/...) instead of relying on workspace conventions.

## Proposed Changes

1. **Refactor Workspace Template Specification (workspace_spec_NN.md)**:
   - Upgrade the template to support polymorphic Sources (local_file, url_snapshot, dynamic_feed, git_repo, pi_export).
   - Remove redundant physical file metadata (aw_hash, size, 
ormalized_at, 
ormalized_by) from the Level 3 workspace model, declaring sources/nn/ frontmatter as the SSOT for file-level proof and integrity.
   - Introduce convention-based relative subpaths (subpath) and universal origin_uri (supporting RFC 3986 https://, ile:///, and local paths).
   - Add first-class 	ags support for categorization across domains.

2. **Polymorphic Ingestion & Reader Architecture**:
   - Establish standard conventions for static web snapshots (url_snapshot), recurring news/feeds (dynamic_feed), and local offline assets (local_file).
   - Maintain strict separation of concerns:
     - **Physical Storage / Scanner**: sources/original/ and sources/nn/*.md frontmatter.
     - **Semantic Topology**: workspace_NN.md (Level 3 domain model).
     - **Verification Engine**: MCP validator reconciles references deterministically.

## Non-Goals

- Replacing the existing procedures/ or rtifacts/ W3C PROV lineage models.
- Running autonomous unprompted background scraping daemons in the CLI (refresh policies remain actionable execution hints for procedures and agents).
