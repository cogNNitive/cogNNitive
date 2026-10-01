# Spec: Session Language Policy & Canonical Vocabulary

## ADDED Requirements

### Requirement: Session Language Coherence
Interactive prompts, menus, informative grace notices, and status reports MUST adhere to a single coherent language during the session, determined by the user's initial prompt language (defaulting to Spanish or English accordingly). Mixed-language turns within the same response are prohibited.

### Requirement: Canonical Level 2/3 Terminology Enforcement
User-facing copy MUST strictly use canonical ubiquitous vocabulary:
- `domaiNN` for workspace containers.
- `bluepriNNt` for schemas / templates (deprecating "app" and "Level 2").
- `kNNowledge` for domain models (deprecating "Level 3").
The terms "Level 2", "Level 3", and "app" MUST NOT appear in user prompts or error messages.

#### Scenario: Wizard uses canonical terminology
- GIVEN a user creating a new model
- WHEN the wizard prompts for the schema
- THEN it refers to it as `bluepriNNt` and not `App (Level 2)`.
