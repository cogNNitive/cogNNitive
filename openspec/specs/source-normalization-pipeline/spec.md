# Source Normalization Pipeline

## Purpose

Extend the `nn-trannsform` normalization scanner to cover every active source subtree — `sources/import/`, `sources/export/`, and `sources/conversations/` — emitting canonical Markdown under `sources/nn/` with the subtree structure mirrored. Conversation transcripts and summaries are normalized with distinct `source_type` frontmatter and their `origin_transcript:` link preserved; deliverables promoted back into `sources/export/` are ingested as synthetic sources (`is_synthetic: true`, retained `derived_from:`); the ad-hoc Slack/Teams JSON parser is removed in favour of the canonical conversation lifecycle.

> Sync note: the source change (`2026-09-06-sources-conversations-lifecycle`) authored these as `## MODIFIED Requirements` against a pre-monorepo base spec that was never carried into this `openspec/specs/` tree. They are transcribed here as the current requirement state.
## Requirements
### Requirement: Multi-Subtree Normalization Scanning

The normalization scanner (`nn-trannsform` / `scanAndProcess`) MUST recursively scan all active source subtrees:
- `sources/import/`
- `sources/export/`
- `sources/conversations/`

The scanner MUST normalize discovered files into canonical Markdown representations under `sources/nn/`. The output path structure within `sources/nn/` MUST mirror the subtree structure (e.g., `sources/nn/import/...`, `sources/nn/export/...`, `sources/nn/conversations/...` or preserve distinct non-colliding relative paths).

(Previously: identical — only the scenario's conversation example file is updated to the transcript form now produced by the standard flow.)

#### Scenario: Normalization across multiple source subtrees
- GIVEN `sources/import/guide.pdf`, `sources/export/whitepaper.md`, and `sources/conversations/meeting_source.md` exist in the workspace
- WHEN `scanAndProcess` runs
- THEN `sources/nn/` receives normalized files corresponding to all three inputs
- AND each normalized file records its originating path in its frontmatter `file:` field

---

### Requirement: Conversation Transcript and Summary Normalization

Files promoted from `conversations/` into `sources/conversations/` by the standard promotion flow MUST be treated as verbatim transcripts, and the pipeline MUST NOT require an executive-summary `_summary.md` normalization path in the standard flow (see `conversations-lifecycle`):
1. Files ending with `_source.md`: The normalizer MUST treat the file as a verbatim transcript. It MUST preserve dialogue structure, speaker labels, and timestamps, and generate normalized Markdown with frontmatter `source_type: conversation_transcript`.
2. The standard flow MUST NOT emit `_summary.md` files, and the pipeline MUST NOT require a `_summary.md` normalization branch for the standard flow.

Transcript promotions MUST preserve the `origin_transcript:` reference pointing to the raw file in `conversations/`.

(Previously: the requirement also mandated validating and structuring `_summary.md` executive summaries into standardized sections with `source_type: conversation_summary`, including a scenario normalizing a summary file.)

#### Scenario: Normalizing a conversation transcript file
- GIVEN `sources/conversations/2026-09-06_auth_architecture_source.md`
- WHEN normalization runs
- THEN the normalized file in `sources/nn/conversations/2026-09-06_auth_architecture_source.md` is generated
- AND its frontmatter specifies `source_type: conversation_transcript`
- AND its dialogue turn structure is preserved

#### Scenario: Summary files are not part of the standard flow
- GIVEN a conversation promoted only as `sources/conversations/2026-09-06_auth_architecture_source.md`
- WHEN normalization runs
- THEN the transcript is normalized with `source_type: conversation_transcript`
- AND no `_summary.md` counterpart is generated or required by the pipeline

### Requirement: Synthetic Deliverable Ingestion

When deliverables are promoted from `export/` into `sources/export/` to serve as inputs for secondary models, the pipeline MUST ingest them as synthetic sources:
1. The file frontmatter in `sources/nn/` MUST include `is_synthetic: true`.
2. The frontmatter MUST retain the `derived_from:` field referencing the antecedent models from which the deliverable was originally generated.
3. The provenance builder (`buildProvenanceModel`) MUST record `is_synthetic:: true` in `# NN Sources` for these entries, allowing downstream lineage consumers to differentiate primary external inputs from generated intermediate artifacts.

#### Scenario: Ingestion of a promoted deliverable
- GIVEN `export/Market_Analysis_V_1-0-0.md` derived from model `Market_Strategy_V_1-0-0_NN.md`
- AND it is promoted to `sources/export/Market_Analysis_V_1-0-0.md`
- WHEN normalization and lineage synchronization run
- THEN the normalized file in `sources/nn/` includes `is_synthetic: true` and `derived_from: [Market_Strategy_V_1-0-0_NN.md]`
- AND the lineage record `# NN Sources` marks the entry with `is_synthetic:: true`

### Requirement: Removal of Legacy Slack/Teams JSON Parser

The ad-hoc Slack and Microsoft Teams JSON conversion logic in `scanner-converters.js` (`convertChatJson`) MUST be removed.

Ingestion of `.json` files in `sources/import/` SHALL treat JSON as structured data schemas or raw key-value payloads rather than heuristic message threads. Ingestion of interactive discussion and meeting transcripts MUST be handled via the canonical conversation lifecycle (`conversations/` and `sources/conversations/`).

#### Scenario: JSON file processed without Slack heuristic
- GIVEN a JSON configuration or data file `sources/import/config.json`
- WHEN `convertOkFormat` is invoked for `.json`
- THEN `convertChatJson` is not executed
- AND the content is parsed as structured data or formatted code block rather than extracting `thread_ts` or Slack-specific message arrays

#### Scenario: Chat transcripts ingested via conversations lifecycle
- GIVEN a team interaction transcript
- WHEN captured and imported into the workspace
- THEN it is routed through `conversations/` and normalized under `sources/conversations/` rather than relying on legacy Slack JSON parsers

