---
name: nn-usage-audit
version: "0.1.0"
description: Repeatable audit of real user-model sessions from Engram. Filters non-cognnitive projects, extracts app vs dev problems, evaluates LLM context efficiency, and updates dev/auditoria-uso-real.md + dev/eficiencia-llm.md. Trigger: audit usage, auditar uso, usage audit, eficiencia LLM, repetir auditoria.
---

# nn-usage-audit Skill (Usage & LLM-Efficiency Audit)

## Overview

Repeats the audit done on 2026-09-09 over Engram memory: finds real user sessions
(Arenzano-like model-building projects, NOT `cognnitive` dev), lists bugs/problems
split by app (MCP/validator/skills/templates) vs dev-process (git/concurrency/CI),
evaluates LLM context efficiency, and appends findings to `dev/` docs.

## Inputs

- `window_days` (default 7): how far back to look.
- `mode`: `sweep` (summaries + error-code counts, cheap) or `deep` (full observations on 1-2 projects + sweep on the rest). Default: `deep` on top project + `sweep` elsewhere.
- `focus_projects` (optional): e.g. `arenzano, lc_programas`. Default: auto-detect (top non-cognnitive by observation count).

## Procedure

### 1. Collect (read-only, no repo writes)
1. `mem_context` — recent sessions overview.
2. `mem_search(all_projects=true)` with queries: model names, `session summary`, `validar modelo template MCP error`, `wizard coach arquitectura`, transcription/projection keywords.
3. Record totals: sessions, observations, project list. Note empty-result queries (observability gaps).

### 2. Filter
- Exclude `project:cognnitive` (dev-process evidence only, goes to section B).
- Rank remaining projects by observation count in window. Pick top 1-2 for `deep`, rest for `sweep`.

### 3. Deep-dive (per focus project)
- `mem_get_observation` on session_summary + bugfix/discovery/architecture items.
- For each finding record: evidence (#id), severity, status (fixed/open/patched), affected files/paths.
- Classify: **A app** (MCP/validator/skill/template/artefact) or **B dev** (git/concurrent/CI/release).

### 4. LLM-efficiency pass
- Flag: full-model/file in prompt for surgical edits, full re-validations, resolver cache in prompt path, raw transcripts in loop, no intent routing, harness/HTML dumps, pre-existing validation noise.
- Propose: slice access (`query_units` capped), differential validate (`--baseline --only-changed`), MODEL_DATA contract, transcript match-then-review, intent router (coach/surgical/verify/match), spec index cache.
- Record per-session metrics when available: calls per intent, tokens per intent, mean surgical context size.

### 5. Write back (needs `nn-dev-development` consent gate on `dev`)
- Update `dev/auditoria-uso-real.md`: new findings appended with #ids; move fixed items to "ya arreglado"; add new patch→cohesive-refactor proposals.
- Update `dev/eficiencia-llm.md`: new waste patterns + measurements; update sweep-vs-deep recommendation.
- Never write outside `dev/` + this skill without explicit user order.

### 6. Report
- Compact block: projects scanned, new vs known bugs, wasteful patterns, doc paths, recommendation: `sweep` enough or another `deep` needed.

## Modes cost guide
- `sweep`: ~1 search + summaries per project. Cheap. Use for "otras OBEs".
- `deep`: full observations + file cross-checks. Expensive. Use for top 1-2 projects or new error codes.

## Anti-rules
- Never dump full models/transcripts into the audit prompt — use summaries + slices.
- Never mix rot-fixes with promotion work in the same proposal.
- Never commit resolver cache (`<template>/specs/`) or BOM files; strip and warn.
