# Technical Design: Job-Based /nn Entry Menu & Wizard Consolidation

## 1. Architecture Decisions

| Decision | Chosen Approach | Rationale |
|---|---|---|
| **Entry Point** | Distribute `skills/nn/SKILL.md` + retain `skills/nn-start/SKILL.md` as alias | Unifies UX on `/nn` while keeping backward compatibility for existing `AGENTS.md`. |
| **Menu Organization** | Loop-based: Sources (`[s]`) → Model (`[m]`) → Artifacts/Review (`[r]`) → Procedures (`[p]`) → Help (`[h]`) | Job-focused rather than skill-focused navigation. |
| **Recommendation Engine** | First dirty stage in probe contract | Guides user naturally to the next actionable step. |
| **Scope Precedence** | `model` > `blueprint` > `domain` | Natural scoping hierarchy with explicit tags in UI. |
| **Wizard Consolidation** | Single plan gate + inferred bluepriNNt | Reduces 6–7 blocking prompts down to ≤2 prompts. |
| **Vocabulary & Language** | Canonical terms (`bluepriNNt`, `kNNowledge`, `domaiNN`) + session language tracking | Eliminates confusing legacy jargon and mixed-language turns. |

## 2. Interaction Design & Flow
```
User types /nn
     │
     ▼
nn (Front Controller) executes domain-probe.js
     │
     ▼
Renders Job Menu with dynamic (Recommended):
  [s] Import/update sources (2 pending)
  [m] Work on a model (3 models) (Recommended)
  [r] Produce/review artifacts (consoles, hub, feedback)
  [p] Run a procedure (4 available)
  [h] Help / Documentation
  [x] Cancel
```
