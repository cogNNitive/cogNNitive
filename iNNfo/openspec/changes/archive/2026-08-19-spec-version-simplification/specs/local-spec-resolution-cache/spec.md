# Delta for local-spec-resolution-cache

## MODIFIED Requirements

### Requirement: R-LSRC-01: Local Workspace Spec Cache Lookup

The editor's model and metamodel loading systems MUST attempt to resolve parent
template specifications from the local workspace `specs/` cache directory before
initiating any network request.
(Previously: the example scenario cited the `specs/v0.1.0/level2/business/...` snapshot-folder path shape, which `spec-versioning` removes in favor of `specs/templates/{name}/`.)

#### Scenario: Template exists in workspace specs directory
- GIVEN the local workspace contains 'specs/templates/business/business_V_0-1-2_NN.md'
- WHEN the editor loads a model referencing 'business_V_0-1-2' as parent_spec
- THEN the editor MUST read and load 'business_V_0-1-2_NN.md' from the local workspace
- AND the editor MUST NOT trigger an HTTP request to fetch the spec
