# Repository Asset Hygiene Specification

## Purpose

Governs the exclusion and removal of compiled client bundles, CDN distribution scripts, and generated binaries from Git version control across the repository.

## Requirements

### Requirement: Zero Tracked Compiled Artifacts

Version control MUST NOT track compiled application assets, CDN distribution bundles, or generated executable binaries. All such artifacts MUST be untracked from Git.

#### Scenario: Repository index contains no client bundles
- GIVEN the repository Git index
- WHEN inspecting tracked files
- THEN zero files MUST be tracked under `docs/innfo/app/assets/`
- AND zero bundle files MUST be tracked under `docs/innfo/cdn/*.bundle.js`
- AND zero binary files MUST be tracked under `iNNfo/packages/innfo-mcp/bin/`

#### Scenario: Purging existing tracked bundles
- GIVEN previously committed bundle artifacts in the repository index
- WHEN the asset hygiene purge is applied
- THEN all matching files MUST be removed from Git index tracking (`git rm --cached`)
- AND source code files and source templates MUST remain intact in the working tree

### Requirement: Git Ignore Enforcement

The repository `.gitignore` MUST define explicit exclusion rules for compiled bundles and binaries to prevent accidental commits during local development.

#### Scenario: Local build outputs ignored by default
- GIVEN a local build that writes assets to `docs/innfo/app/assets/`, `docs/innfo/cdn/*.bundle.js`, or `iNNfo/packages/innfo-mcp/bin/`
- WHEN `git status` or standard `git add` is executed
- THEN Git MUST treat the compiled files as untracked and ignored
- AND the working tree MUST remain clean of unintentional build artifacts

#### Scenario: Attempted commit of ignored artifact rejected
- GIVEN an un-forced `git add` targeting an ignored bundle path
- WHEN a commit is attempted
- THEN Git MUST NOT stage the bundle file
- AND the commit MUST NOT include compiled artifacts
