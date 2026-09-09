# Delta for source-normalization-pipeline

## ADDED Requirements

### Requirement: Feedback JSON Ingestion

The normalization scanner (`nn-trannsform --scan`) MUST ingest `sources/import/feedback/*.json` conforming to the `innfo-console-feedback` schema into canonical Markdown under `sources/nn/` (mirrored path). Emitted frontmatter MUST include `file:` (origin path), `source_type: feedback`, and `is_synthetic: true`. Normalized feedback MUST be citable via `sources::` per `document-citations`, using Source/Citation/Lineage vocabulary per `provenance-vocabulary`.

#### Scenario: Feedback scan to sources/nn

- GIVEN `sources/import/feedback/Client_V_0-2-0_round-2_feedback_20260909-120000.json`
- WHEN `nn-trannsform --scan` runs
- THEN `sources/nn/import/feedback/` gains the normalized file with `is_synthetic: true`
- AND its items are addressable via `sources::`

#### Scenario: Invalid feedback skipped with report

- GIVEN a feedback JSON failing schema validation
- WHEN the scan runs
- THEN the file is skipped and reported without aborting the run

## MODIFIED Requirements

### Requirement: Removal of Legacy Slack/Teams JSON Parser

The ad-hoc Slack and Microsoft Teams JSON conversion logic in `scanner-converters.js` (`convertChatJson`) MUST be removed.

Ingestion of `.json` files in `sources/import/` SHALL treat JSON as structured data schemas or raw key-value payloads rather than heuristic message threads, EXCEPT `sources/import/feedback/*.json`, which MUST route to the feedback ingestion branch above. Ingestion of interactive discussion and meeting transcripts MUST be handled via the canonical conversation lifecycle (`conversations/` and `sources/conversations/`).

(Previously: all `sources/import/` JSON treated as generic structured data, with no feedback branch.)

#### Scenario: JSON file processed without Slack heuristic

- GIVEN a JSON configuration or data file `sources/import/config.json`
- WHEN `convertOkFormat` is invoked for `.json`
- THEN `convertChatJson` is not executed
- AND the content is parsed as structured data or formatted code block rather than extracting `thread_ts` or Slack-specific message arrays

#### Scenario: Chat transcripts ingested via conversations lifecycle

- GIVEN a team interaction transcript
- WHEN captured and imported into the workspace
- THEN it is routed through `conversations/` and normalized under `sources/conversations/` rather than relying on legacy Slack JSON parsers

#### Scenario: Feedback JSON bypasses the generic branch

- GIVEN `sources/import/feedback/x_feedback_20260909-120000.json`
- WHEN `convertOkFormat` is invoked for `.json`
- THEN the file routes to feedback ingestion, not the generic structured-data path
