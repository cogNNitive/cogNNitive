# Delta for source-normalization-pipeline

## REMOVED Requirements

### Requirement: Feedback JSON Ingestion

(Reason: reviewer feedback JSON is retired; reviewer changes arrive as changesets.)
(Migration: None. A JSON file under `sources/import/feedback/` is now cognitivized as an ordinary JSON source.)

## MODIFIED Requirements

### Requirement: Removal of Legacy Slack/Teams JSON Parser

The ad-hoc Slack and Microsoft Teams JSON conversion logic in `scanner-converters.js` (`convertChatJson`) MUST be removed.

Ingestion of `.json` files anywhere under `sources/import/` SHALL treat JSON as structured data schemas or raw key-value payloads rather than heuristic message threads, with no folder-specific exception. Ingestion of interactive discussion and meeting transcripts MUST be handled via the canonical conversation lifecycle (`conversations/` and `sources/conversations/`). (Previously: `sources/import/feedback/*.json` was routed to a feedback ingestion branch.)

#### Scenario: JSON file processed without Slack heuristic
- GIVEN a JSON configuration or data file `sources/import/config.json`
- WHEN `convertOkFormat` is invoked for `.json`
- THEN `convertChatJson` is not executed
- AND the content is parsed as structured data or formatted code block rather than extracting `thread_ts` or Slack-specific message arrays

#### Scenario: Chat transcripts ingested via conversations lifecycle
- GIVEN a team interaction transcript
- WHEN captured and imported into the workspace
- THEN it is routed through `conversations/` and cognitivized under `sources/conversations/` rather than relying on legacy Slack JSON parsers

#### Scenario: The retired drop zone gets no special routing
- GIVEN a JSON file in the retired `sources/import/feedback/` drop zone
- WHEN `convertOkFormat` is invoked for `.json`
- THEN the file takes the generic structured-data path
