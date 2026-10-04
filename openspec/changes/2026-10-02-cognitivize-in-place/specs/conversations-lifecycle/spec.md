# Conversations Lifecycle Management (Delta)

## Purpose

Timestamps use the contract's single UTC helper, and a promoted transcript is a write-once markdown raw file cognitivized in place. `conversations/` keeps its role as the scratch home of live sessions. `sources/conversations/` remains a write destination.

## MODIFIED Requirements

### Requirement: Silent Session Transcript Reservation

When an interactive cogNNitive session is initialized, the system MUST immediately allocate a session transcript file at `conversations/<YYYYMMDDTHHmmssZ>.md`, where the token is the session start instant formatted by the contract's UTC helper. The file MUST be created silently, initialized with frontmatter:
- `session_id`: unique identifier for the session.
- `started_at`: ISO 8601 UTC timestamp.
- `status`: `in_progress`.
- `turns`: 0.
- `mutations`: false.
(Previously: `conversations/YYYY-MM-DD_HHmmss.md` using the local session start time.)

#### Scenario: New interactive session starts
- GIVEN a clean workspace with no active session
- WHEN a user initiates an interaction with an agent skill
- THEN a file `conversations/<YYYYMMDDTHHmmssZ>.md` is created immediately
- AND its frontmatter has `status: in_progress`, `turns: 0`, `mutations: false`
- AND no user confirmation is required

#### Scenario: Timestamp is UTC
- GIVEN a session starting at 2026-10-02T23:30:00Z on a machine in UTC-3
- WHEN the file is reserved
- THEN its name is `conversations/20261002T233000Z.md`

### Requirement: Interactive Transcript Promotion Prompt

After titling a concluded session, the agent MUST prompt the user whether to promote the transcript into `sources/conversations/`. The prompt MUST offer:
- `[full] (Recommended)`: write the verbatim transcript through `writeOnce` as `sources/conversations/<session-slug>_<UTC suffix>.md` (the suffix is the contract UTC timestamp) and cognitivize it in place.
- `[none]`: leave the transcript solely in `conversations/`.

The prompt MUST NOT offer `[summary]` or `[both]`. The raw transcript in `conversations/` MUST always remain. Before promoting on the `[full]` path the agent MUST present an author-naming step suggesting the human author's name (from `git config user.name` or OS user) and the agent's tool id. Each turn MUST render as `## NN Turn NN: <author-id>` (1-based), with the neutral placeholder `unnamed` for unnamed participants. Promoted files MUST include frontmatter `origin_transcript: conversations/<file>.md`. Promoting identical bytes again MUST write nothing (dedup).
Existing `YYYY-MM-DD_*` transcripts stay as unsuffixed family members and are not renamed. The `sources/nn/conversations/` mirror MUST NOT exist.
(Previously: wrote `sources/conversations/<session-slug>_source.md`, overwriting on repeat.)

#### Scenario: User promotes transcript as source
- GIVEN a finalized transcript `conversations/2026-09-13_api-gateway.md`
- WHEN the user selects `[full]`
- THEN `sources/conversations/2026-09-13_api-gateway_<UTC suffix>.md` exists with the verbatim transcript and `origin_transcript: conversations/2026-09-13_api-gateway.md`
- AND a co-located sidecar exists
- AND the original in `conversations/` is intact

#### Scenario: Promoting twice without changes
- GIVEN an already promoted, unchanged transcript
- WHEN the user selects `[full]` again
- THEN no new file is written

#### Scenario: User declines promotion
- GIVEN a finalized transcript
- WHEN the user selects `[none]`
- THEN nothing is written to `sources/conversations/`
