# hosted-app-retirement-notice Specification

## Purpose
TBD - created by archiving change 2026-10-13-s5-retire-innfo-editor. Update Purpose after archive.
## Requirements
### Requirement: Retired app address serves one static notice page

The public URL `https://cognnitive.com/innfo/app/` MUST serve a single static English page,
`docs/innfo/app/index.html`, that states the hosted app was retired and that cogNNitive now uses
the domain console. `docs/innfo/app/index.html` MUST be the only file tracked under
`docs/innfo/app/`. The page MUST NOT contain a JavaScript application, MUST NOT redirect, and
MUST NOT load the retired editor bundle. It MUST follow the cogNNitive brand tokens of the
`nn-design-presets` skill and MUST remain readable at mobile width.

#### Scenario: Notice page is the only tracked file

- GIVEN the repository after S5-delete
- WHEN the tracked files under `docs/innfo/app/` are listed
- THEN the list is exactly `docs/innfo/app/index.html`

#### Scenario: No bounce into the retired SPA

- GIVEN the Pages artifact built from `docs/`
- WHEN a visitor requests a path under `/innfo/app/`
- THEN no served page redirects to `/innfo/app/?p=` and no file under `docs/innfo/app/` references `assets/`

### Requirement: Notice page explains the replacement and links to the docs

The notice page MUST explain that the domain console is the self-contained `domaiNN_console.html`
file generated locally, by `scripts/export-console.mjs` or the MCP tool `regenerate_console`,
and that changes are reviewed through changesets. It MUST link to the usage, offline consoles,
reviewer guide, innfo-mcp and agent installation documentation, and every link target MUST exist
in `docs/`.

#### Scenario: Links resolve

- GIVEN the notice page
- WHEN each internal `href` is mapped to a file under `docs/`
- THEN the target exists (documentation pages are docsify hash routes backed by `docs/innfo/documentation/<page>.md`)

#### Scenario: Replacement is explained

- GIVEN the notice page
- WHEN its text is read
- THEN it names the domain console, `regenerate_console` and `export-console.mjs`, and states that the hosted app is retired

