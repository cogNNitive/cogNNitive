# Source Normalization Pipeline

## Purpose

Normalization is cognitivization in place: every active source subtree gets co-located sidecars, with no mirror tree. Promoting deliverables into a sources folder disappears because any file can be cognitivized where it lives.
## Requirements
### Requirement: Multi-Subtree Normalization Scanning

The scanner (`nn-trannsform --scan` / `scanAndProcess`) MUST recursively scan `sources/import/` and `sources/conversations/` and MUST cognitivize every file in them that has no up-to-date sidecar, through the single `cognitivize` operation. Sidecars MUST be co-located with their raw file; no `sources/nn/` mirror and no `sources/export/` subtree exist. Sidecar files and `staging/` MUST be skipped.

#### Scenario: Normalization across subtrees
- GIVEN `sources/import/guide.pdf` and `sources/conversations/meeting_20261002T101500Z.md`
- WHEN `scanAndProcess` runs
- THEN `sources/import/guide.pdf_sidecar_NN.md` and `sources/conversations/meeting_20261002T101500Z.md_sidecar_NN.md` exist next to their raw files
- AND each sidecar `source_file` records the raw file's workspace-relative path

#### Scenario: No mirror tree
- GIVEN a completed scan
- WHEN the workspace is listed
- THEN no `sources/nn/` directory exists

#### Scenario: Sidecars are not rescanned
- GIVEN existing sidecars
- WHEN `--scan` runs again with unchanged raws
- THEN nothing is written

---

### Requirement: Conversation Transcript and Summary Normalization

Files promoted from `conversations/` into `sources/conversations/` by the standard promotion flow MUST be verbatim transcripts and MUST be cognitivized in place. The transcript is markdown, so its sidecar has no body and its turn structure (speaker labels, `## NN Turn NN: <author-id>` headings, timestamps) is preserved by the raw file, which is the citation target. The sidecar MUST record `source_type: conversation_transcript`. The pipeline MUST NOT require an executive-summary `_summary.md` path. The raw file's `origin_transcript:` frontmatter MUST be preserved.

#### Scenario: Transcript cognitivized in place
- GIVEN `sources/conversations/2026-09-06_auth_architecture_20260906T120000Z.md`
- WHEN normalization runs
- THEN a co-located sidecar exists with `source_type: conversation_transcript`
- AND the raw transcript's dialogue structure is byte-unchanged

#### Scenario: Summary files are not part of the standard flow
- GIVEN a conversation promoted only as a transcript
- WHEN normalization runs
- THEN no `_summary.md` counterpart is generated or required

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

### Requirement: Scored Source-to-Element Matching

Normalized sources MUST be matched to model elements with a recorded score per
pair. Pairs at or above the match threshold link automatically; pairs below it
MUST NOT link silently. Scoring MUST run outside the hot reasoning loop, so
reviewer attention is spent on doubtful pairs only.

#### Scenario: Confident pairs link automatically
- GIVEN normalized sources and model elements
- WHEN scoring completes
- THEN each pair carries a recorded score
- AND pairs at or above threshold link automatically

#### Scenario: Unmatched source is queued, never dropped
- GIVEN a source scoring below threshold for every element
- WHEN matching completes
- THEN the source is queued for review
- AND it is NOT silently excluded

### Requirement: Doubtful-Pair Review Queue

Every doubtful or unmatched pair MUST enter a review queue. Reviewers confirm or reject each queued pair through the recorded confirm path, and no source SHALL be dropped without a recorded decision. Undecided pairs MUST remain queued across sessions; cross-session persistence stays caller-owned and no store is added by this change.

#### Scenario: Reviewer confirms a doubtful pair

- GIVEN doubtful pairs waiting in the queue
- WHEN a reviewer confirms one
- THEN the link is recorded together with the decision

#### Scenario: Reviewer rejects a doubtful pair

- GIVEN a doubtful pair waiting in the queue
- WHEN a reviewer rejects it
- THEN the rejection is recorded together with the decision
- AND the source is marked decided, never silently dropped

#### Scenario: Undecided pairs stay queued

- GIVEN a review session ending with pairs undecided
- WHEN the queue is inspected
- THEN undecided pairs remain queued
- AND none are treated as excluded

