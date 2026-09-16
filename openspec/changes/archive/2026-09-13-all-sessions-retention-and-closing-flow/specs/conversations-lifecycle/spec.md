# Conversations Lifecycle Management

## Purpose

Define the full lifecycle of an interactive cogNNitive session transcript: silent reservation of a timestamped file in `conversations/` at session start, guaranteed retention of all sessions (zero automatic discard), continuous incremental turn logging, post-session title suggestion and rename, and an interactive prompt to promote the finalized transcript into `sources/conversations/` as a verbatim source with per-turn author attribution, or to decline promotion.

## Requirements

### Requirement: Silent Session Transcript Reservation

When an interactive cogNNitive session is initialized, the system MUST immediately allocate a session transcript file at `conversations/YYYY-MM-DD_HHmmss.md` (where `YYYY-MM-DD_HHmmss` corresponds to the session start local timestamp). The file MUST be created silently without prompting the user, initialized with standard frontmatter metadata:
- `session_id`: Unique identifier for the interaction session.
- `started_at`: ISO 8601 timestamp.
- `status`: `in_progress`.
- `turns`: 0.
- `mutations`: false.

#### Scenario: New interactive session starts
- GIVEN a clean workspace with no active session
- WHEN a user initiates an interaction with an agent skill (e.g., `nn-router`, `nn-innfo`)
- THEN a new transcript file `conversations/YYYY-MM-DD_HHmmss.md` is created immediately
- AND its initial frontmatter has `status: in_progress`, `turns: 0`, `mutations: false`
- AND the session start does not require user confirmation to reserve the file

### Requirement: Guaranteed All-Session Retention (Zero Discard)

The system MUST preserve all initialized session transcripts in `conversations/`. The system SHALL NOT automatically delete or discard session transcript files on session exit or conclusion, regardless of the number of turns exchanged or whether file mutations occurred. Users retain the liberty to review, keep, or manually delete conversation files.

#### Scenario: User exits after asking a single question without mutations
- GIVEN a reserved transcript file `conversations/2026-09-13_120000.md`
- AND the user exchanged 1 turn without workspace file changes
- WHEN the user exits the session or closes interaction
- THEN `conversations/2026-09-13_120000.md` is NOT deleted and remains on disk in `conversations/`

#### Scenario: Multi-turn exploratory session without mutations
- GIVEN a reserved transcript file `conversations/2026-09-13_120000.md`
- AND the user exchanged 3 turns discussing architecture options without writing any files
- WHEN the user concludes the session
- THEN the transcript file is retained on disk

### Requirement: Continuous Incremental Turn Logging

During an active session, the system MUST update the active transcript file in `conversations/` on each dialogue turn. Each turn MUST record the speaker and content, and increment the frontmatter `turns` counter while maintaining `status: in_progress`. If the interaction is disconnected or closed unexpectedly, all turns up to that point remain saved.

#### Scenario: Sudden client disconnect
- GIVEN an active session at turn 3 recorded in `conversations/2026-09-13_120000.md`
- WHEN the client window is closed abruptly
- THEN the transcript contains the full text of all 3 completed turns with frontmatter `status: in_progress`

### Requirement: Intuitive Session Conclusion and Closing UX

The agent MUST support natural language triggers to conclude a session (e.g., `/close`, `cerrar`, `terminar sesión`, `listo por hoy`, `done`). On key deliverables or milestone responses, the agent MAY append a non-intrusive status footer indicating the active transcript path and reminding the user of the close command.

Upon conclusion of a session, the agent MUST present 3 suggested title options that concisely capture the primary topics, decisions, or deliverables of the session. The user SHALL be allowed to select one of the 3 suggestions or input a custom slug. The transcript file MUST then be finalized:
1. The file MUST be renamed to `conversations/YYYY-MM-DD_<slug>.md`.
2. The transcript frontmatter `title` MUST be updated with the chosen title.
3. The transcript frontmatter `status` MUST be set to `completed`.
4. The transcript frontmatter `ended_at` MUST record the ISO 8601 completion timestamp.

#### Scenario: User triggers close command
- GIVEN an active session with reserved file `conversations/2026-09-13_120000.md`
- WHEN the user types `/close` or "listo, cerremos"
- THEN the agent displays 3 suggested titles (e.g., `[1] user-auth-design`, `[2] api-gateway-refactor`, `[3] telemetry-setup`) and a manual entry option `[m]`
- AND WHEN the user chooses option `1`
- THEN the file is renamed to `conversations/2026-09-13_user-auth-design.md`
- AND the frontmatter `status` is set to `completed`

### Requirement: Interactive Transcript Promotion Prompt

After titling a concluded session, the agent MUST prompt the user whether to promote the conversation transcript into the workspace knowledge sources (`sources/conversations/`). The prompt MUST offer two options:
- `[full] (Recommended)`: Promotes the full verbatim transcript to `sources/conversations/<session-slug>_source.md`.
- `[none]`: Leaves the transcript solely in `conversations/` without source promotion.

The prompt MUST NOT offer an executive-summary option (`[summary]`) or a combined option (`[both]`). The raw transcript in `conversations/` MUST always be registered regardless of the choice.

Before promoting a transcript on the `[full]` path, the agent MUST present an author-naming step for the transcript's participants. The agent MUST suggest the human author's name (derived from `git config user.name` or OS user) and the agent's tool id.

When the `_source.md` file is generated, each conversation turn MUST be rendered as a `## NN Turn NN: <author-id>` heading, where NN is the 1-based sequential turn number and `<author-id>` is the resolved participant name. When a participant is left unnamed, the agent MUST use the deterministic neutral placeholder `unnamed`.

Promoted files in `sources/conversations/` MUST include frontmatter linking them to `origin_transcript: conversations/YYYY-MM-DD_<slug>.md`.

#### Scenario: User promotes transcript as source
- GIVEN a finalized transcript `conversations/2026-09-13_api-gateway.md`
- WHEN prompted for promotion and the user selects `[full]`
- THEN `sources/conversations/2026-09-13_api-gateway_source.md` is generated
- AND it contains the verbatim transcript and frontmatter `origin_transcript: conversations/2026-09-13_api-gateway.md`
- AND `conversations/2026-09-13_api-gateway.md` remains intact in `conversations/`

#### Scenario: User declines promotion
- GIVEN a finalized transcript `conversations/2026-09-13_api-gateway.md`
- WHEN prompted for promotion and the user selects `[none]`
- THEN no file is written to `sources/conversations/`
- AND `conversations/2026-09-13_api-gateway.md` remains in `conversations/`
