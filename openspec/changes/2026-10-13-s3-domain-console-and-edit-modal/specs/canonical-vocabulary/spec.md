# Delta for canonical-vocabulary

## ADDED Requirements

### Requirement: Console is the user-facing UI term

The canonical term dictionary (`iNNfo/specs/vocabulary.json`, `docs/innfo/documentation/vocabulary.md`) MUST define "console" as the user-facing term for the UI that shows and reviews a domaiNN: the domain console (`domaiNN_console.html`, one per domaiNN) whose specialized surfaces are views shown as tabs. "editor" and "hosted app" (the retired `cognnitive.com/innfo/app/` web application) MUST be listed as retired UI terms and MUST NOT be used in user-facing copy for that UI. This does not touch "app" as the deprecated alias of `bluepriNNt`, which keeps its existing entry.

#### Scenario: The dictionary defines console
- GIVEN `iNNfo/specs/vocabulary.json`
- WHEN its UI terms are read
- THEN "console" is defined as user-facing
- AND "editor" and "hosted app" are marked retired UI terms

#### Scenario: Docs use console
- GIVEN `docs/innfo/documentation/vocabulary.md`
- WHEN it is read
- THEN it names the domain console and its views, and not an editor or a hosted app
