# Design: nn-workspace-git plus collaboration-git docs

## Technical Approach

Standalone skill `actioNN/skills/nn-workspace-git` owns the gated workspace-to-Git workflow; Docs page owns narrative; `manifest/source.yaml` owns distribution. `nn-innfo` stays untouched SSOT: the skill reads models via `innfo-mcp` (`validate_model`, `get_template`) and never writes templates or canonical URLs. Docs follow the existing `documentation_NN.md` Page + `_sidebar.md` + `generate-docsify-suite.mjs --sidebar-only` seam.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Standalone skill vs extend `nn-innfo` | Extension risks SSOT pollution; standalone duplicates gate code | Standalone `nn-workspace-git`, `nn-innfo` read-only boundary |
| `disable-model-invocation: true` + entry menu vs auto-trigger | Auto-trigger risks accidental push; explicit gate adds friction | Explicit `/nn-workspace-git` only, alpha warning, technician-only |
| Double-confirm remote/destructive vs single | Single is faster; double blocks accidents | Double confirmation required; abort with zero side effects when git/auth missing |
| Opinionated `.gitignore` in skill vs repo root | Root ignore affects monorepo; skill-scoped ignore travels with workspace | Skill emits workspace `.gitignore`: `staging/`, heavy `original/`, `specs/` cache, `*.env`/tokens; new repos private default |
| Branch-per-change + `validate`/`check_workspace` gate vs direct push | Direct is simpler; gated PR enforces review | Branch-per-change, PR needs both gates + protected `main` + 1 approval |
| Two-layer map (`V_x-y-z` vs commit) vs commit-as-version | Conflation is the reported confusion | Explicit map table maintained by skill; version never equals commit |
| Filesystem copy outside workspace vs Git-only backup | Git-only fails offline; copy needs disk | Timestamped copy outside workspace before deep changes, manual `xcopy` fallback (mirrors `nn-upgrade` Phase 2) |
| `order:: 50` Guides Page vs new Section | New Section overkill for one guide | New `Page` under `[[Guides]]`, `source:: collaboration-git.md`, sidebar entry |

## Data Flow

```
User (/nn-workspace-git) ──→ Activation gate (nn-preflight) ──→ Prereq check (git+auth)
        │ abort, no side effects on fail
        └─→ Menu ──→ init (private + .gitignore) / branch+PR (validate+check_workspace) / map / backup
                          │                        │
iNNfo models ──read-only──┘                        └─→ Git remote (review layer only)

Docs: documentation_NN.md (Page) ──→ collaboration-git.md ──→ generate-docsify-suite.mjs --sidebar-only ──→ _sidebar.md
Manifest: source.yaml skills entry ──→ verify.js / skills-manager.js (ref_key: skills)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `actioNN/skills/nn-workspace-git/SKILL.md` | Create | Frontmatter, alpha gate, menu, branch/PR, map, backup, `.gitignore` template |
| `docs/innfo/documentation/collaboration-git.md` | Create | English-only guide (see Contracts) |
| `docs/innfo/documentation/_sidebar.md` | Modify | One Guides line: `Collaboration with Git` |
| `docs/innfo/documentation/documentation_NN.md` | Modify | New `Page`, `order:: 50`, `parent:: [[Guides]]` |
| `manifest/source.yaml` | Modify | Append `nn-workspace-git` skills entry |
| `actioNN/skills/nn-innfo/SKILL.md` | Untouched | Boundary verified by diff = zero |

## Interfaces / Contracts

Frontmatter (mirrors `nn-skills-lifecycle` / `nn-upgrade`):

```yaml
name: nn-workspace-git
description: Gated workspace-to-Git collaboration. Invoke with /nn-workspace-git.
disable-model-invocation: true
version: "V_0-1-0"
last_updated: 2026-09-09
metadata: { source_type: original }
license: MIT
compatibility: opencode, claude-code, cursor
bundled_templates: []
```

Skill body seams: `## 0. Activation Gate` delegates to `nn-preflight` (no inline script); prereq block `git --version` + auth check → abort text; menu `[a] init [b] branch+PR [c] map [d] backup`; map row `| V_0-2-0 | <sha> | <date> |`; backup `node scripts/backup-workspace.js --workspace-dir <dir>` or `xcopy` fallback. No MCP bundle.

Docs page sections (English only): Overview (SSOT vs review layer); Prerequisites (git, auth, technician); Private-by-Default + `.gitignore`; Branch-per-Change + PR gates; Version Map; Offline Backup; Boundary (never touches `nn-innfo`/URLs).

Manifest entry:

```yaml
- name: nn-workspace-git
  repo: cogNNitive/cogNNitive
  path: actioNN/skills/nn-workspace-git
  version: "V_0-1-0"
  ref_key: skills
  requires: [nn-preflight]
  description: Gated workspace-to-Git review workflow with offline backup.
```

`documentation_NN.md` block: `## NN Page: Collaboration with Git` with `title::`, `source:: collaboration-git.md`, `route:: collaboration-git`, `order:: 50`, `parent:: [[Guides]]`. Sidebar generator aborts nonzero when source file missing — file must land before generation.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Frontmatter parse, `.gitignore` patterns, map format | Node test runner / Vitest on fixtures |
| Integration | `generate-docsify-sidebar.mjs --sidebar-only` exits 0 + entry; `source.yaml` verify | Run scripts on dev checkout |
| E2E | Gate aborts without git/auth; ungated merge blocked | Manual dry-run, English-only check |

## Migration / Rollout

No migration required. Additive only; rollback deletes skill dir + docs page + sidebar line + manifest entry. Dev branch only, conventional commits, English only.

## Open Questions

- [ ] Canonical host example for docs (github.com vs generic)?
- [ ] Backup retention policy (keep N copies)?
- [ ] Is 1 approval sufficient for protected `main`?
