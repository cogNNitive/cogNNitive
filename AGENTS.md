<!-- gentle-ai:session-start-skill -->
## Session Start: Load nn-dev-development (MANDATORY)

At the very start of every session in this repository, before any repository
operation, load the `nn-dev-development` skill via the `skill` tool and follow it:

- Skill name: `nn-dev-development`
- Path: `.agents/skills/nn-dev-development/SKILL.md`

It runs the concurrency scan against the shared working tree and enforces the
branch-first consent gate before any repo write. Do not skip it, even for
read-only or "quick" work — it also detects concurrent agents holding the tree.
<!-- /gentle-ai:session-start-skill -->