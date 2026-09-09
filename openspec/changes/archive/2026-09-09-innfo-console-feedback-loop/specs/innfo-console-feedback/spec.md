# innfo-console-feedback Specification

## Purpose

Reviewer-to-model loop: console reviewers export structured feedback JSON; an agent-reviewed Apply Feedback procedure carries accepted items back into the source model with staleness protection and patch-bump versioning.

## Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST carry `source_model`, `source_model_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `session_label`/`feedback_slug`, and `viewer`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`), `target` (`element_id`/`concept`/`element`/`field`/`matrix`), `original`/`proposed`/`comment` as applicable, and `status` (`pending`|`applied`|`rejected`). Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`.

#### Scenario: Valid export validates

- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates and matches the filename pattern

#### Scenario: Malformed item rejected

- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

### Requirement: Export Modal

The Export modal MUST require a human identifier, slugify it to `feedback_slug`, and offer human-instructions plus agent-prompt tabs. Drafts MUST persist in `localStorage` and resume on reopen. Unknown draft fields MUST be ignored.

#### Scenario: Identifier gate and draft resume

- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved draft

### Requirement: Apply Feedback Procedure

The procedure MUST check `source_model_version` against the current model (staleness: block on mismatch until reviewer confirms), MUST render a diff preview, MUST apply accepted items via `innfo-mcp apply_change`, MUST run `validate_model`, MUST bump the patch version, and MUST regenerate the stable-name console `{Model}_V_{version}_console.html`. Timestamped copies SHALL be archive-only.

#### Scenario: Happy-path apply

- GIVEN fresh feedback with two `pending` corrections
- WHEN applied and approved
- THEN the model patch-bumps, validates, and the stable console regenerates

#### Scenario: Stale feedback blocked

- GIVEN feedback pinned to an older `source_model_version`
- WHEN applied
- THEN the run blocks with a staleness report until confirmed

#### Scenario: Failed validation aborts

- GIVEN applied items that break `validate_model`
- WHEN validation runs
- THEN the run aborts with no version bump and no console rewrite
