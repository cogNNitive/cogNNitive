# Source Normalization Pipeline (Delta)

## Purpose

Normalization is cognitivization in place: every active source subtree gets co-located sidecars, with no mirror tree. Promoting deliverables into a sources folder disappears because any file can be cognitivized where it lives.

## MODIFIED Requirements

### Requirement: Multi-Subtree Normalization Scanning

The scanner (`nn-trannsform --scan` / `scanAndProcess`) MUST recursively scan `sources/import/` and `sources/conversations/` and MUST cognitivize every file in them that has no up-to-date sidecar, through the single `cognitivize` operation. Sidecars MUST be co-located with their raw file; no `sources/nn/` mirror and no `sources/export/` subtree exist. Sidecar files and `staging/` MUST be skipped.
(Previously: scanned `sources/import/`, `sources/export/`, and `sources/conversations/` and wrote mirrored normalized files under `sources/nn/`.)

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

### Requirement: Conversation Transcript and Summary Normalization

Files promoted from `conversations/` into `sources/conversations/` by the standard promotion flow MUST be verbatim transcripts and MUST be cognitivized in place. The transcript is markdown, so its sidecar has no body and its turn structure (speaker labels, `## NN Turn NN: <author-id>` headings, timestamps) is preserved by the raw file, which is the citation target. The sidecar MUST record `source_type: conversation_transcript`. The pipeline MUST NOT require an executive-summary `_summary.md` path. The raw file's `origin_transcript:` frontmatter MUST be preserved.
(Previously: normalized the transcript into `sources/nn/conversations/` with `source_type` in the normalized file's frontmatter.)

#### Scenario: Transcript cognitivized in place
- GIVEN `sources/conversations/2026-09-06_auth_architecture_20260906T120000Z.md`
- WHEN normalization runs
- THEN a co-located sidecar exists with `source_type: conversation_transcript`
- AND the raw transcript's dialogue structure is byte-unchanged

#### Scenario: Summary files are not part of the standard flow
- GIVEN a conversation promoted only as a transcript
- WHEN normalization runs
- THEN no `_summary.md` counterpart is generated or required

### Requirement: Feedback JSON Ingestion

The scanner MUST cognitivize `sources/import/feedback/*.json` files conforming to the `innfo-console-feedback` schema in place. The sidecar MUST record `source_type: feedback` and MUST NOT include `is_synthetic`. The raw JSON is the citation target, addressed by JSON Pointer per `citation-parser-resolver`. Invalid feedback MUST be skipped with a report without aborting the run.
(Previously: converted the JSON into canonical markdown under `sources/nn/` with `source_type: feedback`.)

#### Scenario: Feedback scan produces a sidecar
- GIVEN `sources/import/feedback/Client_round-2_feedback_20260909T120000Z.json`
- WHEN `--scan` runs
- THEN a co-located sidecar exists with `source_type: feedback`
- AND an item is citable as `sources/import/feedback/Client_round-2_feedback_20260909T120000Z.json@/items/0`

#### Scenario: Invalid feedback skipped with report
- GIVEN a feedback JSON failing schema validation
- WHEN the scan runs
- THEN the file is skipped and reported without aborting the run

## REMOVED Requirements

### Requirement: Synthetic Deliverable Ingestion
(Reason: promoting artifacts into `sources/export/` no longer exists. An artifact reused as input is cognitivized where it lives and cited directly; its upstream lineage is its own `sources` edge, and no synthetic flag is stored.)
(Migration: files previously under `sources/export/` are handled by the nn-upgrade rewriter; see `workspace-template-upgrade`.)
