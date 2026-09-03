# Spec: Local Spec Resolution Cache

## Purpose
Simplify spec loading in the editor by resolving and parsing specifications from the local workspace's `specs/` directory first before falling back to HTTP network fetches.

## Requirements

### Requirement: R-LSRC-01: Local Workspace Spec Cache Lookup
The editor's model and metamodel loading systems MUST attempt to resolve parent template specifications from the local workspace `specs/` cache directory before initiating any network request.

#### Scenario: Template exists in workspace specs directory
- GIVEN the local workspace contains 'specs/v0.1.0/level2/business/business_V_0-1-2_NN.md'
- WHEN the editor loads a model referencing 'business_V_0-1-2' as parent_spec
- THEN the editor MUST read and load 'business_V_0-1-2_NN.md' from the local workspace
- AND the editor MUST NOT trigger an HTTP request to fetch the spec

### Requirement: R-LSRC-02: Spec Guidance Parsing from rawContent
The editor MUST parse concept descriptions, summaries, methodologies, and prompts directly from the resolved level-2 spec's `rawContent` markdown and store this metadata in the Pinia stores, replacing legacy separate documentation files.

#### Scenario: Guidance parsed from spec rawContent
- GIVEN the loaded template spec contains "## Market" followed by "### Summary\nTarget market analysis"
- WHEN the editor displays help for the "Market" concept
- THEN the editor MUST render the summary "Target market analysis" parsed from the spec's rawContent
