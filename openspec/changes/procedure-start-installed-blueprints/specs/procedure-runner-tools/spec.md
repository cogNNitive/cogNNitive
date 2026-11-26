# Delta for procedure-runner-tools

`procedure_start` resolved a procedure id against one floor: whichever bluepriNNt package the chain's innermost `parent_spec` named. A domaiNN whose entry declares the `domaiNN` container therefore could not start a procedure that another installed package ships, while `validate_blueprint` and `list_blueprint_procedures` saw it; and a stored `bluepriNNt:<package>/<doc>` address was read back through that same single floor, so even a run whose resolution had picked the right package could not be loaded. The id now falls through to the installed packages, exactly one declaration resolving it, and an address is read from the package it names.

## MODIFIED Requirements

### Requirement: procedure_start creates a run

`procedure_start` MUST resolve a procedure id, or a domain-relative procedure document path, with this precedence, the first match winning: a procedure document of the domaiNN that declares the id; the bluepriNNt package named by the `parent_spec` of the document the call resolves in; and, when neither declares the id, the one bluepriNNt package installed in the domaiNN that declares it.
An id that two or more installed bluepriNNt packages declare, with no document and no `parent_spec` choosing one, MUST be refused with `PROCEDURE_NOT_FOUND` and a message naming every candidate package, and the package scan order MUST NOT choose one.
A `bluepriNNt:<package>/<doc>` address recorded in a run header MUST be read from the folder of the package the address names, never from the package the domaiNN's `parent_spec` names at read time.
An unknown procedure MUST be refused with `PROCEDURE_NOT_FOUND`, and a `value` slot that is required, has no default and is absent from `params` MUST be refused with `MISSING_REQUIRED_SLOT`.
The run MUST be created by one changeset holding `add_model` of a `Procedure Execution` at its `executions/{slug}/` placement, its header (`procedure`, `def_rev` set to the procedure's `knowledge_version`, `params` with slot defaults applied) and its `started` event.
A run id that is already taken MUST be refused with `RUN_EXISTS`, and a domaiNN that does not carry the executions bluepriNNt package MUST be refused with `EXECUTIONS_NOT_INSTALLED`, before anything is written.

#### Scenario: A run starts with its defaults
- GIVEN a procedure `review` with slots `doc` (required) and `format` (default `html`)
- WHEN `procedure_start` is called with `procedure: review`, `params: {"doc": "spec"}`, `run: r1`
- THEN `executions/r1/` holds the run with `def_rev`, `params` `{"doc":"spec","format":"html"}` and event `e-001` of kind `started`, written by one changeset

#### Scenario: One installed bluepriNNt ships the procedure
- GIVEN a domaiNN whose entry declares the `domaiNN` container, and `specs/bluepriNNts/music-bands/` declaring and shipping `add-music-group`
- WHEN `procedure_start` is called from `.` with `procedure: add-music-group`
- THEN the run starts with `procedure: bluepriNNt:music-bands/procedures/add_music_group_procedures_NN.md`, and `procedure_state` reads that run through the same address

#### Scenario: Two installed bluepriNNts ship the same id
- GIVEN two installed packages declaring `add-music-group` and no domaiNN document declaring it
- WHEN `procedure_start` is called with `procedure: add-music-group`
- THEN it is refused with `PROCEDURE_NOT_FOUND`, the detail names both packages, and no run is written

#### Scenario: A domaiNN document keeps the id
- GIVEN `procedures/add_music_group_procedures_NN.md` declares the id an installed package also declares
- WHEN `procedure_start` is called from `.` with `procedure: add-music-group`
- THEN the run header records `procedures/add_music_group_procedures_NN.md`
