# Lineage Focus Resolution Specification

## Purpose

TBD - created by archiving a changeset change. Update Purpose after archive.

## Requirements

### Requirement: Unit-pointed opens default to Preview

When the modal is opened pointing at a section, CSV row, or CSV cell, the default
view mode MUST be `Preview`, not `Code`, regardless of file type. A field pointer
(targeting a raw code line) MUST stay in `Code`. `Code` MUST remain selectable
through its icon toggle.

#### Scenario: Markdown section opens in preview

- GIVEN a Markdown file opened through a `sources::` pill pointing at `#section`
- WHEN the modal opens
- THEN the Preview mode is active

#### Scenario: CSV row opens in preview

- GIVEN a CSV file opened pointing at a data row
- WHEN the modal opens
- THEN the Preview mode is active and the CSV table is shown

#### Scenario: Field pointer stays in code

- GIVEN a file opened pointing at a field (a raw code line)
- WHEN the modal opens
- THEN the Code mode is active and the field line is highlighted

### Requirement: Preview auto-scrolls to the targeted unit

When the modal opens in Preview pointed at a knowledge unit, the preview surface
MUST scroll to the targeted section, row, or cell. The targeted element MUST be
highlighted (the existing targeted highlight is reused).

#### Scenario: Preview scrolls to the targeted Markdown section

- GIVEN a Markdown file opened at a heading slug
- WHEN the Preview renders
- THEN the preview container scrolls to that heading's section

#### Scenario: Preview scrolls to the targeted CSV row

- GIVEN a CSV file opened at a data row
- WHEN the Preview renders
- THEN the preview container scrolls to that row

### Requirement: Plain opens keep the content-type default

When the modal is opened without a knowledge-unit pointer, the default mode MUST
remain content-type based: Preview for Markdown, images, and PDF; Code otherwise.

#### Scenario: Plain Markdown opens in preview

- GIVEN a Markdown file opened from the explorer eye button (no unit)
- WHEN the modal opens
- THEN the Preview mode is active

#### Scenario: Plain unknown text opens in code

- GIVEN a `.txt` file opened with no unit
- WHEN the modal opens
- THEN the Code mode is active
