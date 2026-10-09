# Delta for ephemeral-overlays

## ADDED Requirements

### Requirement: Markdown-Native Blockquote Overlay Syntax

A VUS scene MUST recognize lines beginning with `>` as ephemeral overlay events, in the forms `> quote: "..."`, `> lower-third: "..." [subtitle="..."]`, and `> broll: <path> [source="..."]`. Each such line MUST parse into a structured overlay AST node and MUST NOT be captured as narration prose.

#### Scenario: Each blockquote directive parses into a structured node

- GIVEN a scene containing a `> quote:`, a `> lower-third:`, and a `> broll:` line
- WHEN the vendored parser processes it
- THEN each line becomes a typed overlay AST node with its payload and options

#### Scenario: Narration prose stays clean of directive tokens

- GIVEN a script mixing narration lines with `>` overlay lines
- WHEN the parser processes it
- THEN the narration text contains no `>` directive tokens
- AND text-to-speech consumes only the narration prose

### Requirement: Sequential Collision-Free Overlay Scheduling

The scene compiler MUST schedule blockquote overlays sequentially without temporal collision, and MUST apply configurable `enter_animation` and `exit_animation` per overlay.

#### Scenario: Sequential overlays do not overlap

- GIVEN multiple `>` overlays declared in one scene
- WHEN the scene is compiled
- THEN their timelines are scheduled sequentially with no overlap

#### Scenario: Configured animations reach the overlay track

- GIVEN an overlay declaring enter and exit animations
- WHEN the overlay track is emitted
- THEN it carries the configured `enter_animation` and `exit_animation`

### Requirement: Legacy Inline Overlay Deprecation

Legacy inline HTML overlay directives (`<!-- overlay: ... -->`) MUST be deprecated. During the transition the parser MUST continue to accept them and emit a backward-compatibility warning, and every legacy code path MUST be quarantined with a 1:1 `legacy-ledger.yaml` entry carrying a `legacy:` marker.

#### Scenario: Legacy inline overlay still parses with a warning

- GIVEN a script using a legacy `<!-- overlay: ... -->` directive
- WHEN the parser processes it
- THEN the overlay is recognized
- AND a deprecated-syntax warning is emitted

#### Scenario: Legacy code path is ledgered

- GIVEN the deprecated inline-overlay code path
- WHEN the repository is inspected
- THEN it carries a `legacy:` marker
- AND `legacy-ledger.yaml` holds exactly one matching entry
