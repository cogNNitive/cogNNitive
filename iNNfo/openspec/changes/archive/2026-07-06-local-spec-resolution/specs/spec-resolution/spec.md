# Delta for spec-resolution

## ADDED Requirements

### Requirement: R-LSR-01: Local Spec Search
The resolver MUST recursively search the 'specs/' directory for the target spec name or versioned file before making any network requests. If found, it MUST load the local file.

#### Scenario: Spec file found in specs directory
- GIVEN a spec file exists locally at 'specs/FORMAT_V_0-1-3_FORMAT.md'
- WHEN the resolver requests the spec version 'V_0-1-3'
- THEN the resolver MUST load the local file 'specs/FORMAT_V_0-1-3_FORMAT.md'
- AND the resolver MUST NOT initiate any network requests to fetch the spec

#### Scenario: Spec file found in nested subdirectory of specs
- GIVEN a spec file exists locally at 'specs/domain-a/SPEC_V_1-0-0.md'
- WHEN the resolver requests the spec name 'SPEC_V_1-0-0'
- THEN the resolver MUST recursively locate and load the local file 'specs/domain-a/SPEC_V_1-0-0.md'
- AND the resolver MUST NOT initiate any network requests to fetch the spec

### Requirement: R-LSR-02: Network Fallback and Caching
If a spec is not found locally within the 'specs/' directory, the resolver MUST fetch it from the URL specified in 'parent_spec.url' and save the downloaded content to the '.spec-cache/' directory for future runs. On subsequent runs, if the spec is present in '.spec-cache/', the resolver MUST load it from the cache.

#### Scenario: Spec not found locally is fetched and cached
- GIVEN a spec version 'V_0-2-0' is not present in the 'specs/' directory
- AND the parent spec defines a fallback URL in 'parent_spec.url'
- WHEN the resolver requests the spec version 'V_0-2-0'
- THEN the resolver MUST fetch the spec content from the network using 'parent_spec.url'
- AND the resolver MUST save the downloaded content to '.spec-cache/'
- AND return the fetched spec content

#### Scenario: Cached spec is loaded on subsequent requests
- GIVEN a spec version 'V_0-2-0' is not in 'specs/'
- AND a cached file for 'V_0-2-0' exists in '.spec-cache/'
- WHEN the resolver requests the spec version 'V_0-2-0'
- THEN the resolver MUST load the spec content directly from '.spec-cache/'
- AND the resolver MUST NOT initiate a network request

### Requirement: R-LSR-03: Browser-safe Core Imports
The core build condition for the browser ('browser.ts' entry point) MUST NOT import Node.js native libraries ('node:fs', 'node:fs/promises', 'node:path') or the Node-based resolver.

#### Scenario: Browser entry point has no Node.js module imports
- GIVEN the 'browser.ts' entry point for the core module
- WHEN the module is compiled or analyzed for browser usage
- THEN there MUST NOT be any imports or references to 'node:fs', 'node:fs/promises', or 'node:path'
- AND there MUST NOT be any imports or references to the Node-based resolver

#### Scenario: Browser bundler compiles the core package successfully
- GIVEN the browser-safe core entry point 'browser.ts'
- WHEN a browser bundler compiles the package with browser targets
- THEN the compilation MUST succeed without throwing errors about missing Node.js polyfills or native modules
