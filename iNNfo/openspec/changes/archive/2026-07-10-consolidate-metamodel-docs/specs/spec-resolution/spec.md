# Delta: Spec Resolution

## MODIFIED Requirements

### Requirement: R-LSR-01: Local Spec Search
(Previously: The resolver recursively searches the 'specs/' directory on the local filesystem before making network requests.)

In Node.js environments, the resolver MUST recursively search the 'specs/' directory for the target spec name or versioned file. In browser environments, when a workspace handle is active, the resolver MUST search the workspace's local 'specs/' directory first before making any network requests. If found in either environment, it MUST load the local file.

#### Scenario: Spec file found in specs directory (Node.js)
- GIVEN the Node.js environment is active
- AND a spec file exists locally at 'specs/FORMAT_V_0-1-3_FORMAT.md'
- WHEN the resolver requests the spec version 'V_0-1-3'
- THEN the resolver MUST load the local file 'specs/FORMAT_V_0-1-3_FORMAT.md'
- AND the resolver MUST NOT initiate any network requests to fetch the spec

#### Scenario: Spec file found in workspace specs directory (Browser)
- GIVEN the browser environment is active with an active workspace handle
- AND a spec file exists in the workspace under 'specs/domain-a/SPEC_V_1-0-0.md'
- WHEN the resolver requests the spec name 'SPEC_V_1-0-0'
- THEN the resolver MUST locate and load the file from the workspace handle
- AND the resolver MUST NOT initiate any network requests to fetch the spec
