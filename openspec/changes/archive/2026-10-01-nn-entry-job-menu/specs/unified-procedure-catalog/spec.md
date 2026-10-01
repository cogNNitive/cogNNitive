# Spec: Unified Procedure Catalog

## ADDED Requirements

### Requirement: Multi-Scope Procedure Discovery & Precedence
The system MUST discover procedures across three distinct scopes:
1. `model`: Declared within active model files (`## NN Procedure:`).
2. `blueprint`: Declared in the model's bluepriNNt (`list_blueprint_procedures`).
3. `domain`: Declared in the workspace `procedures/` directory.

When procedure IDs collide across scopes, the system MUST resolve them with strict precedence: `model > blueprint > domain`.
Each procedure option in the UI MUST display its origin scope tag.

#### Scenario: Procedure collision resolution
- GIVEN a procedure `sync-db` in `procedures/` (domain) and `sync-db` in the active model
- WHEN procedures are listed
- THEN the `model` procedure takes precedence and is tagged `[model]`.
