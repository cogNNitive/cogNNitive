# Skill Shared Rules (canonical source)

Single source of truth for the governance, conversation-lifecycle, citation and
Informative Grace rules that used to be hand-copied into each end-user skill.
Rendered into a `generated:shared-rules` region inside each target `SKILL.md` by
`scripts/build-skill-shared-rules.mjs`, and drift-guarded by
`scripts/verify.js` (step `skill-shared-rules`).

Sections are delimited by `## rule: <id>`. Edit a section here, then run
`node scripts/build-skill-shared-rules.mjs` to refresh the skills. Do NOT edit
the generated block inside a `SKILL.md` by hand — the drift check will reject it.

## rule: governance

**System Governance & UX Protocol (MANDATORY)**

1. **Zero Unilateral Mutation (Consent First)**: NEVER move, rename, delete, or
   restructure user files without prior explicit confirmation.
2. **Recommended Option First**: In every decision menu, the computed default
   option carries the `(Recommended)` tag and is presented first (option `[a]`
   or `[1]`). When the choices are non-exclusive, also include the notice:
   *"You can select one option or a combination (e.g. A and B)"*.
3. **Conversations as Reference & Source (Zero Discard)**: Allocate the session
   transcript in `conversations/` silently at session start (`status: in_progress`)
   and auto-promote it at close (the user may opt out with `[none]`). All sessions
   are retained unconditionally.
4. **Optimistic Execution & Reversibility**: Proceed immediately on safe,
   standard, reversible actions (e.g. creating the standard directory layout,
   cognitivizing documents in place) without redundant blocking confirmations.
   Reserve explicit confirmation for destructive mutations only.

## rule: conversation-lifecycle

**Conversation Lifecycle & Closing UX**

1. **Silent reservation**: at session start, silently allocate
   `conversations/YYYY-MM-DD_HHmmss.md` with `status: in_progress`.
2. **Close triggers**: conclude the session on natural-language triggers such as
   `/close`, `cerrar`, `terminar sesión`, `listo por hoy`, or `done`.
3. **Zero Discard**: transcripts are retained unconditionally.
4. **3-title prompt**: on close, present 3 suggested titles plus a manual entry
   option `[m]`, e.g. `[1] user-auth-design`, `[2] api-gateway-refactor`,
   `[3] telemetry-setup`.
5. **Finalize**: rename the file to `conversations/YYYY-MM-DD_<slug>.md`, set the
   frontmatter `title` to the chosen title, `status: completed`, and `ended_at`
   to the ISO 8601 completion timestamp.
6. **Promote**: auto-promote the transcript to `sources/conversations/` (announce
   it; `[none]` opts out).

## rule: citation-taxonomy

**Canonical Source Taxonomy & Citation Contract**

1. **Primary Source**: the immutable, original evidence files under
   `sources/import/` or watched via `## NN External Watch Roots:` (read-only).
2. **Normalized / Secondary Source**: cognitivized in place — a co-located sidecar
   `<file>.<ext>_sidecar_NN.md` carries origin metadata (`source_file`, `sha256`,
   `size_bytes`, `source_format`, `normalized_at`); binary sources also carry the
   normalized Markdown body. Text-native files (`md`, `csv`, `json`) are cited
   directly; binaries are cited through their sidecar.
3. **Synthetic Source**: derived deliverables under `artifacts/`, cognitivized in
   place; their upstream is the `sources` they declare.
4. **User Input Source**: in-line interactive input (`source_file: "inline:..."`),
   exempt from physical disk file existence.

Citations use the pointer grammar `sources:: [<path>@<unit>, ...]` — ALWAYS a
bracketed list, with a domaiNN-relative path written in full (no implicit prefix).
A `<unit>` is `@## Heading` (Markdown), `@RowID&col` (CSV), or
`@/items/0/name` (JSON Pointer, RFC 6901). No `src-NNN` IDs, no line-number
ranges, and never a `staging/` target.

## rule: informative-grace

**Informative Grace**

Safe, standard, reversible actions proceed without a blocking confirmation.
Announce the action in the user's active session language, then continue; the
user may interrupt. Example (English): *"Proceeding with the standard {action}.
If you'd prefer a different location or want to stop, tell me before I begin."*
