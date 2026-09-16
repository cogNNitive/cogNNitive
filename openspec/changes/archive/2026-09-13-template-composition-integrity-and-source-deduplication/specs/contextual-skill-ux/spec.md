# Specification: Contextual Skill UX in `nn-innfo`

## Requirement: Intent-Driven Execution and Minimal Menu Interruption

The `nn-innfo` skill instructions must guide the assistant to execute explicit user requests directly, avoiding rigid option menus when context is already established.

### Scenario: Direct execution of explicit commands
- **GIVEN** a user invoking `nn-innfo` with an explicit intent (e.g., "corré el preflight", "buscá fuentes nuevas", "analizá el mapeo")
- **WHEN** the agent processes the request
- **THEN** the agent executes the intent immediately without presenting the root lettered menu (`[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[y]`).

### Scenario: Contextual follow-up after sub-task completion
- **GIVEN** a sub-task completes (such as preflight check or source discovery)
- **WHEN** the agent summarizes the result
- **THEN** the agent asks a focused, single follow-up question directly related to the findings (e.g., "¿Querés incorporar las 14 transcripciones nuevas?")
- **AND** refrains from redisplaying the entire root option menu unless the user explicitly requests help or menu navigation.
