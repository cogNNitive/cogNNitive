# Delta for spec-resolution

## MODIFIED Requirements

### Requirement: R-LSR-01: Local Spec Search

In Node.js environments, the resolver MUST recursively search the 'specs/'
directory for the target spec name or versioned file. In browser environments,
when a workspace handle is active, the resolver MUST search the workspace's local
'specs/' directory first before making any network requests. If found in either
environment, it MUST load the local file.
(Previously: example paths cited the pre-flattening `v0.1.0/level2/...` shape; the search behavior itself is unchanged.)

#### Scenario: Spec file found in specs directory (Node.js)
- GIVEN the Node.js environment is active
- AND a spec file exists locally at 'specs/iNNfo_V_0-1-3_NN.md'
- WHEN the resolver requests the spec version 'V_0-1-3'
- THEN the resolver MUST load the local file 'specs/iNNfo_V_0-1-3_NN.md'
- AND the resolver MUST NOT initiate any network requests to fetch the spec

#### Scenario: Spec file found in workspace specs directory (Browser)
- GIVEN the browser environment is active with an active workspace handle
- AND a spec file exists in the workspace under 'specs/templates/business/business_V_0-1-0_NN.md'
- WHEN the resolver requests the template 'business_V_0-1-0'
- THEN the resolver MUST locate and load the file from the workspace handle
- AND the resolver MUST NOT initiate any network requests to fetch the spec

### Requirement: R-LSR-02: Network Fallback and Write-Once Persistence

If a spec is not found locally within the 'specs/' directory, the resolver MUST
fetch it from the URL specified in 'parent_spec.url' and save the downloaded
content into the same 'specs/' directory, under the document's own canonical
versioned filename, so subsequent requests resolve it via R-LSR-01 (local search)
without a repeat fetch. There is no separate cache directory: 'specs/' serves both
hand-placed/vendored templates and anything a previous run already downloaded —
the local search in R-LSR-01 is the only lookup step.

'specs/' content is immutable by convention (a version bump always produces a new
filename under the flat `specs/` + `specs/templates/{name}/` layout, never an
in-place edit — see the `spec-versioning` capability, R-SV-01/R-SV-02). Persisting
a resolved spec is therefore write-once: if a file with the canonical filename
already exists, the resolver MUST leave it untouched rather than overwrite it.
This write-once rule is the entire integrity guarantee — because content is never
silently replaced, there is nothing to hash-verify or expire.
(Previously: referenced an undefined "spec versioning changelog"; now cites the `spec-versioning` capability directly. The `v0.2.x`/`latest/` snapshot folders this rule used to protect are removed by that same capability.)

#### Scenario: Spec not found locally is fetched and saved into specs/
- GIVEN a spec version 'V_0-2-0' is not present in the 'specs/' directory
- AND the parent spec defines a fallback URL in 'parent_spec.url'
- WHEN the resolver requests the spec version 'V_0-2-0'
- THEN the resolver MUST fetch the spec content from the network using 'parent_spec.url'
- AND the resolver MUST save the downloaded content into 'specs/' under its own canonical versioned filename
- AND return the fetched spec content

#### Scenario: Previously-fetched spec is loaded on subsequent requests without a repeat fetch
- GIVEN a spec version 'V_0-2-0' was fetched and saved into 'specs/' by an earlier run
- WHEN the resolver requests the spec version 'V_0-2-0' again
- THEN the resolver MUST load the spec content directly from 'specs/' (via R-LSR-01)
- AND the resolver MUST NOT initiate a network request

#### Scenario: An existing specs/ file is never overwritten
- GIVEN a file already exists in 'specs/' under a spec's canonical versioned filename
- WHEN the resolver would otherwise fetch and save content under that same filename
- THEN the resolver MUST leave the existing file's content untouched
- AND MUST NOT overwrite it with newly-fetched content

#### Scenario: Unparseable content is a hard error, not a silent fallback
- GIVEN content resolved from any source (local file path, 'specs/', or network fetch)
- WHEN the content has no parseable YAML frontmatter block
- THEN the resolver MUST raise a resolution error immediately
- AND MUST NOT treat the content as a valid spec with empty/absent frontmatter
- AND MUST NOT silently fall through to another resolution step
