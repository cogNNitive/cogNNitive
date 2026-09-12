# Delta for conversations-lifecycle

## MODIFIED Requirements

### Requirement: Interactive Transcript Promotion Prompt

After titling a concluded non-trivial session, the agent MUST prompt the user whether to promote the conversation transcript into the workspace knowledge sources (`sources/conversations/`). The prompt MUST offer two options:
- `[full]`: Promotes the full verbatim transcript to `sources/conversations/<session-slug>_source.md`.
- `[none]`: Leaves the transcript solely in `conversations/` without source promotion.

The prompt MUST NOT offer an executive-summary option (`[summary]`) or a combined option (`[both]`): `_summary.md` files are no longer produced by the standard promotion flow. The raw transcript in `conversations/` MUST always be registered regardless of the choice; promotion to `_source.md` is optional and occurs only on the user's choice.

Before promoting a transcript on the `[full]` path, the agent MUST present an author-naming step for the transcript's participants. The agent MUST suggest the human author's name, derived from `git config user.name` or the OS user (the agent MAY offer both as options alongside a manual entry), and MUST suggest the agent's own tool id (e.g. `OpenCode`, `Antigravity`). The user MUST be able to confirm or edit each suggested name before the promoted file is written.

When the `_source.md` file is generated, each conversation turn MUST be rendered as a `## NN Turn NN: <author-id>` heading, where NN is the 1-based sequential turn number and `<author-id>` is the resolved participant name. The heading MUST be unique per turn — the sequential number guarantees it — and MUST be addressable under the workspace heading-slug rules via the `@` pointer grammar, so a turn can be cited via `sources:: [conversations/<session-slug>_source.md@## NN Turn NN: <author-id>]`. The `#` fragment form (`#<slug>`) MUST NOT be used for `## NN …: …` headings: the Concept/Element boundary in their slug contains `--`, which `parseSourceRef` rejects (`KU_MALFORMED`). Turn headings MUST NOT carry an `author::` key: embedded modification blocks self-describe as they travel into arbitrary turns.

When a participant is left unnamed (the user declines to name them or skips the step), the agent MUST use the deterministic neutral placeholder `unnamed` as that participant's `<author-id>`; the promotion MUST still complete, and the missing name MUST NOT block or abort the `_source.md` write.

Promoted files in `sources/conversations/` MUST include frontmatter linking them to `origin_transcript: conversations/YYYY-MM-DD_<slug>.md`.

(Previously: the promotion prompt had no author-naming step and turns were promoted without per-turn author headings. Even earlier, the prompt offered four options — `[full]`, `[summary]`, `[both]`, `[none]` — and could emit `_summary.md`.)

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

#### Scenario: Author names are suggested, confirmed, and resolved into turn headings

- GIVEN a finalized transcript whose first turn is the human's and whose second turn is the agent's
- WHEN the user selects `[full]` and the naming step suggests `Lucas` (from `git config user.name`) and `OpenCode` (the agent's tool id), and the user confirms both unedited
- THEN the generated `_source.md` renders `## NN Turn 01: Lucas` and `## NN Turn 02: OpenCode`
- AND each heading is unique and addressable via the `@` pointer grammar, citeable as `sources:: [conversations/<session-slug>_source.md@## NN Turn 01: Lucas]`

#### Scenario: User edits a suggested author name

- GIVEN the naming step suggested `Lucas` for the human participant
- WHEN the user edits the suggestion to `Mercedes` and confirms
- THEN the human turns render as `## NN Turn NN: Mercedes` in the promoted file

#### Scenario: User declines to name a participant

- GIVEN a finalized transcript with a participant the user declines to name during the naming step
- WHEN the promotion proceeds on the `[full]` path
- THEN that participant's turns render with the neutral placeholder `## NN Turn NN: unnamed`
- AND the `_source.md` write completes without being skipped or aborted