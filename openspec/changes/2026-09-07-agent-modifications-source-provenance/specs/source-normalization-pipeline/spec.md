# Spec: Source Normalization Pipeline

## MODIFIED Requirements

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

Files promoted from `conversations/` into `sources/conversations/` by the standard promotion flow are verbatim transcripts; the pipeline no longer needs to handle an executive-summary `_summary.md` path in the standard flow (see `conversations-lifecycle`):
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
