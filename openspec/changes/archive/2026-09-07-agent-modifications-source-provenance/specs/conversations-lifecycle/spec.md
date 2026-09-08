# Spec: Conversations Lifecycle Management

## MODIFIED Requirements

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
