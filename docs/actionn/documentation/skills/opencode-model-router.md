---
title: "Model Router — cogNNitive Skill"
description: "Evaluates AI model suitability for each task across 4 task scales"
html_url: https://actionn.cognnitive.com/docs/#/skills/opencode-model-router
generator: https://actionn.cognnitive.com/nn-design-presets
---

# Model Router

**Version**: 1.0.0 · **Updated**: 2026-06-27

## Purpose

Evaluates whether the current AI model is adequate for the task at hand. Classifies requests into 4 scales and recommends the optimal model based on cost and capability.

## Task scales

| Scale | Examples | Recommended Model | Cost |
|---|---|---|---|
| **Trivial / Atomic** | Change button color, one-line fix, syntax query | Flash | ~ $0.09/M |
| **Bug Fix** | Debug a function, patch a file, resolve a crash | Flash or MiMo | $0.09–$0.20/M |
| **Feature** | New component, API endpoint, new module | MiMo | ~ $0.20/M |
| **Refactor / Architecture** | Cross-cutting changes, full-repo migration, data redesign | MiniMax M3 | ~ $0.28/M |

## Typical Output

**MATCH** — the current model is correct for this task:

```
cogNNitive Model Router v1.0.0 (2026-06-27)
Model: deepseek-v4-flash
Tier: Flash
Task scale: Trivial
Verdict: MATCH
```

**MISMATCH** — the model falls short:

```
cogNNitive Model Router v1.0.0 (2026-06-27)
Model: deepseek-v4-flash
Tier: Flash
Task scale: Refactor
Verdict: MISMATCH
Recommend: minimax-m3 (~ $0.28/M)
Reason: Refactoring requires large context and multi-step reasoning.
```

## How it activates

The skill loads automatically when the user asks:

- "¿Estoy usando el modelo adecuado para esto?"
- "Is this the right model for this task?"
- "Should I switch models?"
- Any similar question about model suitability

Once evaluated, it is not re-evaluated in the same session unless the user asks again.

## Files

```
skills/nn-dev-opencode-model-router/
  SKILL.md
  MODEL_MATRIX.md
  README.md
```
