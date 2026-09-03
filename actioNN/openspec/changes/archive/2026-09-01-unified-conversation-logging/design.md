# Design: Unified Conversation Logging

## Overview
This document outlines the technical design for implementing the Unified Conversation Logging protocol (change `2026-09-01-unified-conversation-logging`).

## Architecture Decisions

1. **Minimal File Surface Area:** 
   Instead of injecting code into every model wrapper or application component, this change relies on updating core governance documentation. It relies on the inherent capabilities of NN agents to follow system instructions.
   
2. **Harness-Agnostic LLM Instruction Contract:**
   By placing the protocol strictly within `actioNN/skills/nn-router/SKILL.md` (acting as system instructions) and `actioNN/AGENTS.md`, the implementation is completely agnostic to the underlying runtime harness or specific LLM being used. All compliant agents reading their instructions will adopt the logging behavior natively.

3. **Log Destination & Naming Convention:**
   Logs will be written using a workspace-relative path:
   `<workspace_root>/conversations/YYYY-MM-DD_<nombre_modelo>_<titulo_3_a_6_palabras>.md`
   If no model is specifically engaged, it simplifies to:
   `<workspace_root>/conversations/YYYY-MM-DD_<titulo_3_a_6_palabras>.md`

## File Changes Table

| File Path | Action | Description |
| --------- | ------ | ----------- |
| `actioNN/skills/nn-router/SKILL.md` | Modify | Add `Section 2.5 Conversation Logging Protocol (MANDATORY)` to codify the workspace-relative path and naming convention for logging. |
| `actioNN/AGENTS.md` | Modify | Update the agent behavior guidelines to explicitly mandate compliance with the new Unified Conversation Logging rules. |

## Technical Approach

### 1. Updating `actioNN/skills/nn-router/SKILL.md`
We will introduce a new section, **Section 2.5 Conversation Logging Protocol (MANDATORY)**, detailing the exact constraints:
- The requirement to log every notable conversation.
- The destination directory: `<workspace_root>/conversations/`.
- The strict file naming convention.

### 2. Updating `actioNN/AGENTS.md`
We will inject a directive into the overarching agent responsibilities section, referencing the new logging protocol in `SKILL.md` and clarifying that failure to log properly violates the core behavioral contract.
