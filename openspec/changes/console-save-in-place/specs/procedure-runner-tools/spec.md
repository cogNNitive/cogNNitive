## ADDED Requirements

### Requirement: import_console reads the domaiNN console when no path is given

The `import_console` MCP tool MUST accept a call without `path`, and SHALL then read `domaiNN_console.html` at the domaiNN root.
A call without `path` whose console does not exist MUST refuse with `CONSOLE_NOT_FOUND` and name the console to pass.
A call with `path` MUST keep reading exactly that file.

#### Scenario: an agent imports a console saved in place

- **WHEN** an agent calls `import_console` with no `path` and the domaiNN console holds drafts
- **THEN** the tool reads that console, writes its changeset to `changes/` and reports it

#### Scenario: no console at the domaiNN root

- **WHEN** an agent calls `import_console` with no `path` and no console exists at the domaiNN root
- **THEN** the tool refuses with `CONSOLE_NOT_FOUND` and the message names `path`
