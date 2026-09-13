# Proposal: All-Sessions Retention and Intuitive Closing Protocol

## Intent

Eliminate data loss from automatic trivial session discarding, guarantee 100% transcript retention for every interactive session started in cogNNitive, enforce continuous incremental turn logging to prevent loss on unexpected client disconnects, and establish an intuitive, explicit session conclusion and titling UX protocol.

## Scope

### In Scope

1. **Elimination of Trivial Session Discard Filter**:
   - Retire the automatic deletion logic (`evaluateSessionDiscard` unlinking files with < 2 turns or 0 mutations).
   - Guarantee that all initialized sessions remain persisted in `conversations/` with their timestamp.
2. **Continuous Incremental Turn Logging**:
   - Mandate that conversation transcripts are appended/updated turn-by-turn (`status: in_progress`, updated `turns` count) so that abrupt window closes or process exits preserve all exchanged dialogue.
3. **Intuitive Session Conclusion Protocol**:
   - Define natural intent triggers for closing a session (`/close`, `cerrar`, `terminar sesión`, `listo por hoy`, `done`).
   - Define a non-intrusive status footer reminder on key agent milestones pointing to the active session file and how to conclude it.
   - Standardize the 3-title suggestion + custom slug step and the promotion prompt (`[full]` / `[none]`).
4. **Governance & Skill Updates**:
   - Update `conversations-lifecycle` specification.
   - Update `actioNN/skills/nn-router/SKILL.md` UX Governance Protocol.
   - Update `actioNN/AGENTS.md` and documentation.
   - Update `actioNN/skills/nn-trannsform/scripts/lib/conversations.js` and its test suite.

### Out of Scope

- Automated background garbage collection or archival sweeps (deferred to a future change).
- Re-introducing summary files (`_summary.md` remains retired).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/conversations-lifecycle/spec.md` | Modified | Core specification update removing discard filter and adding closing UX protocol |
| `actioNN/skills/nn-trannsform/scripts/lib/conversations.js` | Modified | Update `evaluateSessionDiscard` to always retain and support incremental logging |
| `actioNN/skills/nn-trannsform/test/unit/test-conversations-lifecycle.js` | Modified | Update unit tests to verify 100% retention and no auto-discard |
| `actioNN/skills/nn-router/SKILL.md` | Modified | Update System Governance & UX Protocol for session lifecycle |
| `actioNN/AGENTS.md` | Modified | Update conversation logging protocol |

## Success Criteria

- [ ] `evaluateSessionDiscard` never deletes any session file from disk regardless of turn count or mutation status.
- [ ] All unit tests in `test-conversations-lifecycle.js` pass with 100% retention assertions.
- [ ] `conversations-lifecycle` spec reflects zero-discard policy, turn appending, and the explicit closing UX protocol.
- [ ] `nn-router/SKILL.md` and `AGENTS.md` mandate continuous turn logging, footer reminders, and natural close commands.
