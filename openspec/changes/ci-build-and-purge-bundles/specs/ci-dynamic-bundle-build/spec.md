# CI Dynamic Bundle Build Specification

## Purpose

Governs the automated compilation of client single-page application (SPA) bundles and distribution artifacts during GitHub Actions CI workflow runs prior to publishing GitHub Pages.

## Requirements

### Requirement: Dynamic Build Prior to Pages Deployment

The CI deployment pipeline MUST compile all workspace dependencies, client application bundles, and distribution artifacts dynamically before uploading the GitHub Pages artifact. Source control MUST NOT be relied upon for pre-built bundles.

#### Scenario: Dynamic compilation on main branch deployment
- GIVEN a push to `main` passing deterministic verification
- WHEN the `deploy-pages` CI job executes
- THEN it MUST install dependencies using `npm ci`
- AND it MUST compile `@cognnitive/innfo-core` before building dependent packages
- AND it MUST compile `@cognnitive/innfo-editor` into `docs/innfo/app`
- AND it MUST compile MCP distribution bundles into `docs/innfo/cdn`
- AND it MUST upload the generated `docs` directory as the Pages artifact

#### Scenario: Build failure halts deployment
- GIVEN a compilation error in any package during the dynamic build step
- WHEN the build command executes in the CI runner
- THEN the step MUST fail with a non-zero exit code
- AND GitHub Pages MUST NOT upload or deploy incomplete or failing artifacts

### Requirement: Package Build Topology & Dependency Order

The CI pipeline MUST respect the package dependency graph when compiling workspace packages. Core libraries MUST be built before packages or applications that depend on their type declarations or compiled outputs.

#### Scenario: Topological build execution
- GIVEN workspace packages `@cognnitive/innfo-core`, `@cognnitive/innfo-editor`, and `@cognnitive/innfo-mcp`
- WHEN CI triggers the build sequence
- THEN `@cognnitive/innfo-core` MUST be compiled first
- AND dependent applications and packages MUST be compiled only after core build finishes successfully

### Requirement: Pre-Deployment Build Verification Gate

CI verification jobs running on pull requests and branch pushes MUST validate that packages build successfully without errors.

#### Scenario: Pull request build check
- GIVEN an open pull request modifying workspace code
- WHEN the CI `verify` workflow executes
- THEN it MUST build workspace packages in topological order
- AND the check MUST fail if any package compilation fails
