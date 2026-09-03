# Delta Specification: spec-resolution

## ADDED Requirements

### Requirement: R-LSR-04: Local File URI and Absolute Path Resolution

In Node.js environments, when resolving a parent spec URL that uses the `file://` scheme or is formatted as an OS absolute file path, `resolver-node.ts` MUST read the file directly using local filesystem APIs (`readFile`) instead of sending an HTTP `fetch()` request.

#### Scenario: Parent spec URL with file:// scheme resolved locally

- GIVEN a `parent_spec.url` specified as a `file://` URI (e.g., `file:///path/to/spec.md`)
- WHEN the Node spec resolver attempts to load the parent spec
- THEN it MUST convert the URI to a local file path and read it via `readFile`
- AND it MUST NOT make an HTTP `fetch()` request

#### Scenario: Parent spec URL specified as OS absolute path resolved locally

- GIVEN a `parent_spec.url` specified as an OS absolute path (e.g., `C:/specs/parent.md` or `/usr/specs/parent.md`)
- WHEN the Node spec resolver attempts to load the parent spec
- THEN it MUST read the spec content directly from the local file system via `readFile`
- AND it MUST NOT make an HTTP `fetch()` request
