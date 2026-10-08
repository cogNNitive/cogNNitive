# Proposal: Domain Bootstrap Cleanup (conversations auto-promote + domaiNN parent_spec fix)

## Why

Two small, reversible frictions in the user-domain lifecycle, both verified
against the tree on 2026-10-07:

1. **Conversations ask twice.** `openspec/specs/conversations-lifecycle/spec.md:75`
   mandates a `[full] / [none]` promotion prompt at session close, on top of the
   title prompt. The raw transcript always stays in `conversations/`, so the user
   answers two questions to keep what is already saved. Maintainer decision:
   auto-promote by default with opt-out (lazy middle ground), not silent discard
   and not mandatory promotion.
2. **Bootstrap writes a stale identity.** `skills/nn-trannsform/scripts/lib/bootstrap.js:112`
   scaffolds `domaiNN_NN.md` with `parent_spec.name: "workspace"`, but the
   language map already migrates `"workspace" -> "domaiNN"`
   (`innfo-core/tests/legacy/language-map.test.ts:121`, issue #103 Bug 2).
   New domains are born legacy.

## What Changes

1. **Conversations: auto-promote with opt-out.**
   - At session close the agent still proposes 3 titles and renames
     `conversations/<stamp>.md` -> `conversations/YYYY-MM-DD_<slug>.md`.
   - Promotion to `sources/conversations/<slug>_<UTC>.md` (verbatim, write-once,
     `origin_transcript:` + co-located sidecar) happens **by default**; the user
     is told how to skip it (`[none]`), not asked to approve it.
   - `conversations/` raw files are still retained (Zero Discard stays).
   - Update `openspec/specs/conversations-lifecycle/spec.md:75-79`,
     `skills/nn/SKILL.md:95-97`, `skills/nn-trannsform/SKILL.md:74-75`.
2. **Bootstrap: `workspace` -> `domaiNN`.**
   - One-line fix in `bootstrap.js:112` (+ fixture expectations in
     `test-bootstrap-recursive.js` / `TESTING.md:73` if they assert the old name).
   - New `domaiNN_NN.md` files validate as `current`, not `legacy-layout`.

### Out of scope

- Deleting `conversations/` entirely (rejected: raw transcripts are the audit
  trail; `sources/conversations/` holds only promoted, suffixed copies).
- Touching `.gitattributes` `* -text` policy (confirmed correct: raw-byte sha256
  guard, harmless without git).
- Preflight behavior (confirmed correct: informational upgrade signal, never a
  blocker).

## Impact

- `skills/nn-trannsform/scripts/lib/bootstrap.js`
- `openspec/specs/conversations-lifecycle/spec.md`
- `skills/nn/SKILL.md`, `skills/nn-trannsform/SKILL.md` (+ tests)

## Success Criteria

- [ ] `bootstrapProject` scaffolds `parent_spec.name: "domaiNN"`; tests green.
- [ ] Session close promotes by default; user can still opt out; raw kept.
- [ ] Spec + skill copy agree (no `[full]/[none]` approval prompt left).
