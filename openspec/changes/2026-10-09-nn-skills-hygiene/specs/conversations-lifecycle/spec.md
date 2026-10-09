# Delta for Conversations Lifecycle Management

## MODIFIED Requirements

### Requirement: Intuitive Session Conclusion and Closing UX

The agent MUST support natural language triggers to conclude a session (e.g.,
`/close`, `cerrar`, `terminar sesión`, `listo por hoy`, `done`). On key
deliverables or milestone responses, the agent MAY append a non-intrusive status
footer indicating the active transcript path and reminding the user of the close
command.

Upon conclusion of a session, the agent MUST present 3 suggested title options
that concisely capture the primary topics, decisions, or deliverables of the
session. The user SHALL be allowed to select one of the 3 suggestions or input
a custom slug. The transcript file MUST then be finalized:
1. The file MUST be renamed to `conversations/YYYY-MM-DD_<slug>.md`.
2. The transcript frontmatter `title` MUST be updated with the chosen title.
3. The transcript frontmatter `status` MUST be set to `completed`.
4. The transcript frontmatter `ended_at` MUST record the ISO 8601 completion timestamp.

The closing-UX wording (close triggers, the 3-title prompt, rename, and
promotion) MUST be sourced from the generated shared-rules block
(`skill-shared-rules`) and MUST NOT be restated per skill, so `nn`, `nn-innfo`,
and `nn-trannsform` present one canonical form.
(Previously: each skill restated its own closing UX and the copies had diverged.)

#### Scenario: User triggers close command
- GIVEN an active session with reserved file `conversations/2026-09-13_120000.md`
- WHEN the user types `/close` or "listo, cerremos"
- THEN the agent displays 3 suggested titles (e.g., `[1] user-auth-design`, `[2] api-gateway-refactor`, `[3] telemetry-setup`) and a manual entry option `[m]`
- AND WHEN the user chooses option `1`
- THEN the file is renamed to `conversations/2026-09-13_user-auth-design.md`
- AND the frontmatter `status` is set to `completed`

#### Scenario: Closing UX wording is uniform across skills
- GIVEN the generated blocks in `nn`, `nn-innfo`, and `nn-trannsform`
- WHEN the closing-UX wording is compared
- THEN it is identical and traceable to the shared source
