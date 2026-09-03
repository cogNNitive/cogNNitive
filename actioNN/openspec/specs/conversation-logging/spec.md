# Specification: Unified Conversation Logging

## Requirements

The system MUST enforce a unified conversation logging protocol across all Neural Network (NN) skills.

1. **Logging Location:** All conversation logs MUST be stored in the `<workspace_root>/conversations/` directory.
2. **Naming Convention:**
   - When a specific model is active, the file name MUST follow the format: `YYYY-MM-DD_<nombre_modelo>_<titulo_3_a_6_palabras>.md`.
   - When no specific model is actively engaged, the file name MUST follow the format: `YYYY-MM-DD_<titulo_3_a_6_palabras>.md`.
3. **Governance:** The System Governance documentation, specifically `nn-router/SKILL.md` and `AGENTS.md`, MUST mandate these rules for all NN skills. All agents SHALL adhere to these documented protocols.

## Scenarios

### Scenario 1: Logging a conversation with an active model
**Given** an NN skill is executing and engaging a specific model (e.g., "gemini-pro")
**When** a conversation is logged
**Then** the log file MUST be saved in `<workspace_root>/conversations/`
**And** the file name MUST match the pattern `YYYY-MM-DD_<nombre_modelo>_<titulo_3_a_6_palabras>.md`

### Scenario 2: Logging a conversation without a specific model
**Given** an NN skill is executing without a specific model actively engaged
**When** a conversation is logged
**Then** the log file MUST be saved in `<workspace_root>/conversations/`
**And** the file name MUST match the pattern `YYYY-MM-DD_<titulo_3_a_6_palabras>.md`

### Scenario 3: System governance enforcement
**Given** an NN skill is developed or updated
**When** reviewing the expected behaviors and system governance
**Then** `nn-router/SKILL.md` and `AGENTS.md` MUST specify the conversation logging requirements
**And** the NN skill MUST implement the specified logging location and naming convention
