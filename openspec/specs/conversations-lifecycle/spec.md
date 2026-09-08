# Conversations Lifecycle Management

## Purpose

Define the full lifecycle of an interactive cogNNitive session transcript: silent reservation of a timestamped file in `conversations/` at session start, automatic discard of trivial sessions, post-session title suggestion and rename, and an interactive prompt to promote the finalized transcript into `sources/conversations/` as a verbatim source, an executive summary, both, or neither.
## Requirements
### Requirement: Silent Session Transcript Reservation

When an interactive cogNNitive session is initialized, the system MUST immediately allocate a session transcript file at `conversations/YYYY-MM-DD_HHmmss.md` (where `YYYY-MM-DD_HHmmss` corresponds to the session start local timestamp). The file MUST be created silently without prompting the user, initialized with standard frontmatter metadata:
- `session_id`: Unique identifier for the interaction session.
- `started_at`: ISO 8601 timestamp.
- `status`: `in_progress`.

#### Scenario: New interactive session starts
- GIVEN a clean workspace with no active session
- WHEN a user initiates an interaction with an agent skill (e.g., `nn-router`, `nn-innfo`)
- THEN a new transcript file `conversations/YYYY-MM-DD_HHmmss.md` is created immediately
- AND its initial frontmatter has `status: in_progress`
- AND the session start does not require user confirmation to reserve the file

### Requirement: Trivial Session Discard Filtering

Upon session termination or exit, the agent MUST evaluate whether the session was trivial. A session SHALL be classified as trivial if:
1. It contains fewer than 2 user-agent conversation turns (fewer than 2 user prompts with corresponding agent replies); AND
2. Zero workspace files were created, modified, or deleted during the session.

If the session meets the trivial criteria, the system MUST delete the reserved transcript file from `conversations/` automatically without prompting the user. If the session does not meet the trivial criteria, the transcript MUST be preserved.

#### Scenario: User exits after asking a single question without mutations
- GIVEN a reserved transcript file `conversations/2026-09-06_120000.md`
- AND the user exchanged 1 turn (e.g. asking "what skills are available?") with no workspace file changes
- WHEN the user exits the session or closes interaction
- THEN `conversations/2026-09-06_120000.md` is deleted from disk
- AND no prompt is displayed to the user regarding transcript retention

#### Scenario: Non-trivial session with mutations
- GIVEN a reserved transcript file `conversations/2026-09-06_120000.md`
- AND the user exchanged 1 turn that resulted in generating a new model file `models/Architecture_V_0-1-0_NN.md`
- WHEN the user exits the session
- THEN the session is flagged as non-trivial
- AND the transcript file is retained on disk

#### Scenario: Multi-turn exploratory session without mutations
- GIVEN a reserved transcript file `conversations/2026-09-06_120000.md`
- AND the user exchanged 3 turns discussing architecture options without writing any files
- WHEN the user concludes the session
- THEN the session is flagged as non-trivial due to turn count (>= 2 turns)
- AND the transcript file is retained on disk

### Requirement: Post-Session Title Suggestion and Renaming

Upon conclusion of a non-trivial session, the agent MUST present 3 suggested title options that concisely capture the primary topics, decisions, or deliverables of the session. The user SHALL be allowed to select one of the 3 suggestions or input a custom slug. The transcript file MUST then be finalized:
1. The file MUST be renamed to `conversations/YYYY-MM-DD_<slug>.md`.
2. The transcript frontmatter `title` MUST be updated with the chosen title.
3. The transcript frontmatter `status` MUST be set to `completed`.
4. The transcript frontmatter `ended_at` MUST record the ISO 8601 completion timestamp.

#### Scenario: User selects suggested title
- GIVEN a non-trivial session with reserved file `conversations/2026-09-06_120000.md`
- WHEN the session concludes
- THEN the agent displays 3 suggested titles (e.g., `[1] user-auth-design`, `[2] api-gateway-refactor`, `[3] telemetry-setup`) and a manual entry option `[m]`
- AND WHEN the user chooses option `1`
- THEN the file is renamed to `conversations/2026-09-06_user-auth-design.md`
- AND the frontmatter `status` is set to `completed`

#### Scenario: User provides custom slug
- GIVEN a concluded non-trivial session
- WHEN the agent prompts for title selection and the user inputs `[m]` with custom slug `payment-webhook-fixes`
- THEN the file is renamed to `conversations/2026-09-06_payment-webhook-fixes.md`

### Requirement: Interactive Transcript Promotion Prompt

After titling a concluded non-trivial session, the agent MUST prompt the user whether to promote the conversation transcript into the workspace knowledge sources (`sources/conversations/`). The prompt MUST offer two options:
- `[full]`: Promotes the full verbatim transcript to `sources/conversations/<session-slug>_source.md`.
- `[none]`: Leaves the transcript solely in `conversations/` without source promotion.

The prompt MUST NOT offer an executive-summary option (`[summary]`) or a combined option (`[both]`): `_summary.md` files are no longer produced by the standard promotion flow. The raw transcript in `conversations/` MUST always be registered regardless of the choice; promotion to `_source.md` is optional and occurs only on the user's choice.

Promoted files in `sources/conversations/` MUST include frontmatter linking them to `origin_transcript: conversations/YYYY-MM-DD_<slug>.md`.

(Previously: the prompt offered four options — `[full]`, `[summary]`, `[both]`, `[none]` — and could emit an executive summary `_summary.md`.)

#### Scenario: User promotes transcript as source
- GIVEN a finalized transcript `conversations/2026-09-06_api-gateway.md`
- WHEN prompted for promotion and the user selects `[full]`
- THEN `sources/conversations/2026-09-06_api-gateway_source.md` is generated
- AND it contains the verbatim transcript and frontmatter `origin_transcript: conversations/2026-09-06_api-gateway.md`
- AND `conversations/2026-09-06_api-gateway.md` remains intact in `conversations/`

#### Scenario: User declines promotion
- GIVEN a finalized transcript `conversations/2026-09-06_api-gateway.md`
- WHEN prompted for promotion and the user selects `[none]`
- THEN no file is written to `sources/conversations/`
- AND `conversations/2026-09-06_api-gateway.md` remains in `conversations/`

#### Scenario: Summary options are no longer offered
- GIVEN a concluded non-trivial session ready for the promotion prompt
- WHEN the agent presents the promotion options
- THEN only `[full]` and `[none]` are offered
- AND no `[summary]` or `[both]` option is presented and no `_summary.md` file is written for any selection

