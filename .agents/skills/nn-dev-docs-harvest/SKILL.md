---
name: nn-dev-docs-harvest
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Turns scattered session rationale into verified public documentation — harvests recent Engram conversations, extracts the WHY behind product decisions, verifies every claim against current code (parser, validator, MCP, editor, spec), then writes and registers pages under docs/innfo/documentation/ in the Docsify suite. Read-only harvest before any write; user-facing why/how content only; every published claim verified; generated artifacts never hand-edited. Trigger: harvest docs, session rationale to docs, document decisions, why/how documentation, write docs from memory, turn memory into documentation.
---

# nn-dev-docs-harvest Skill (Session Rationale to Verified Docs)

## Overview

`nn-dev-docs-harvest` is an internal maintenance skill for maintainers of `cogNNitive`.
It closes the gap between what sessions decide and what the product documents: it
harvests recent Engram conversations, extracts the **WHY** behind product decisions,
**verifies each claim against the current code**, and writes/registers public pages
under `docs/innfo/documentation/`.

The recurring failure it fixes: rationale lives in chat and Engram (why the validator
infers a version, why consoles boot offline, why a field is optional) while the
published docs only describe surface behavior. Re-deriving that rationale later is
expensive; publishing an unverified guess as fact is worse. This skill makes the
pipeline **harvest → extract → verify → publish** repeatable.

This skill is maintainer-only. It is **not** distributed: it is not under
`actioNN/skills/` and is not registered in `manifest/source.yaml`. It is a sibling of
`nn-dev-development`, `nn-dev-check-integrity`, `nn-dev-release`, and `nn-usage-audit`.

Scope: all operations limited to `D:\Users\lucas\Documents\GitHub\cogNNitive`.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-docs-harvest (📚)
```

Session-scoped: once per conversation.

---

## Inputs (fill before starting)

| Input | Default | Meaning |
|-------|---------|---------|
| `window_days` | `14` | How far back the Engram harvest looks. |
| `project` | `cognnitive` | Engram project filter. |
| `doc_root` | `docs/innfo/documentation/` | Where public pages live and are registered. |
| `focus` | *(optional)* | Subsystem/topic to prioritize, e.g. `validator`, `offline consoles`. |

State the resolved values in one line before harvesting.

---

## 0. Preconditions

1. Load and obey `nn-dev-development` **before any write**: run its concurrency scan
   (Section 1) and pass its single-branch consent gate (Section 2) on `dev`. That
   skill owns the "never stage foreign files / never `git add .` / `-A`" rule.
2. Harvest is **read-only first** — Sections 1–3 mutate nothing on disk.
3. Confirm the tree state so new pages are attributable: `git status -sb`.

---

## 1. Harvest (read-only)

1. `mem_context` (project `cognnitive`) — recent sessions overview.
2. `mem_search` across the `window_days` window, per branch:
   - `session summary` (the per-session summaries),
   - types `architecture` / `decision` / `bugfix` / `discovery`,
   - feature/topic names from `focus` and from product surfaces (validator, MCP tools,
     editor, offline consoles, templates).
3. **Previews are ~300 chars.** A search hit is a pointer, not content — always
   `mem_get_observation` on the id before using anything from it.
4. Record a raw candidate list: `{ claim, source_id }`. Do not filter yet.

Completion criterion: every session summary in the window reviewed, and every
non-summary hit triaged (kept as a candidate or dismissed).

---

## 2. Extract — EDITORIAL CRITERIA (the core rule)

Include a candidate **only** when it answers, for an iNNfo **USER**:

- **"Why the app works this way"** — design rationale, tradeoffs, constraints that
  shaped a decision; or
- **"How X works"** — behavior, semantics, integration, edge cases of a feature.

Exclude internal process and release mechanics — branches, tags, CI, manifests, version
bumps, concurrency incidents, refactor bookkeeping. Those are maintainer history, not
user documentation.

For each surviving candidate, record the full triple:

| claim (one sentence) | source observation id | target doc page (slug) |
|----------------------|-----------------------|------------------------|
| | | |

Completion criterion: every candidate either has a triple or is explicitly excluded, and
each target page is an existing page or a justified new slug.

---

## 3. Verify against current code (MANDATORY)

Never publish an unverified claim. For **every** claim, locate the authoritative source
and confirm the claim still holds today:

| Claim about | Authoritative source |
|-------------|----------------------|
| Parsing / semantics | `iNNfo/packages/innfo-core/src/` |
| Validation rules | validator in `innfo-core` |
| MCP behavior / tools | `iNNfo/packages/innfo-mcp/src/server.ts` + tool handlers |
| Editor behavior | `iNNfo/apps/innfo-editor/src/` |
| Format / templates | `iNNfo/specs/` (Level 1 spec, Level 2 templates) |
| Console / runtime | console generator + runtime sources |

- Discard or flag stale claims — memory can outlive the code.
- Watch three traps: (a) behavior that exists only **uncommitted** in the working tree,
  (b) claims true only for **some** templates/versions, (c) "source of truth" claims
  contradicted by duplicated code elsewhere.
- If a claim cannot be verified, drop it or escalate it as a question to the maintainer —
  do not soften it into vague prose.

Completion criterion: every published claim cites a file (and symbol/line) that proves
it; every unverifiable claim removed or escalated.

---

## 4. Write + register in the Docsify suite

1. Create or edit the page at `<doc_root><slug>.md`.
2. Register a page block in `docs/innfo/documentation/documentation_NN.md` inside the
   correct `## NN Section:` (e.g. `Components`, `Architecture`, `Guides`,
   `Runtime & Internals`):

```
## NN Page: <Title>
title:: <Title>
source:: <slug>.md
route:: <slug>
order:: <N>
parent:: [[<Section>]]
description:: <one line>
```

3. Regenerate the suite — never hand-edit generated files. The docs-only command is:

```powershell
node scripts/generate-docsify-suite.mjs docs/innfo/documentation/documentation_NN.md
```

   Sidebar-only refresh (the model path is required):
   `node scripts/generate-docsify-suite.mjs docs/innfo/documentation/documentation_NN.md --sidebar-only`.
   `npm run build:docs` also regenerates the suite, but it is a **heavier full build**: it
   first builds innfo-core / innfo-mcp / innfo-editor and restages the CDN bundle and
   template catalog before running the generator. Use it only when those artifacts need
   rebuilding.
4. **NEVER hand-edit** `_sidebar.md`, `_navbar.md`, `llms.txt`, `ai-index.yaml` — they are
   generated by the script.
5. Re-check `git status -sb`: only the intended page(s) plus `documentation_NN.md` should
   be authored; regenerated suite files may change as a build side effect.

Completion criterion: the generator exits 0 and the new page resolves in the generated
sidebar/index.

---

## 5. Close-out

1. `mem_save` a summary of what was published (title e.g. `Harvested session rationale
   into docs`, type `pattern`/`architecture`, `capture_prompt: false`).
2. Hand off to `nn-dev-check-integrity` (docs group green, no generated drift), then to
   `nn-dev-release` for the batched `dev` → `main` merge.

---

## Core Rules

1. **Read-only harvest before any write** — Sections 1–3 mutate nothing.
2. **Only user-facing why/how content** — no process, release, or git mechanics.
3. **Every published claim verified** — cite the file/symbol that proves it; drop what you
   cannot verify.
4. **Generated artifacts are never hand-edited** — regenerate via
   `node scripts/generate-docsify-suite.mjs docs/innfo/documentation/documentation_NN.md`.
5. **Scratch under `temp/`** — throwaway notes/fixtures live in the gitignored repo-root
   `temp/`, never beside source.
6. **Monorepo scope** — `D:\Users\lucas\Documents\GitHub\cogNNitive` only.
