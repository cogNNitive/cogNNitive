# Delta for Typed Source References

## ADDED Requirements

### Requirement: Blueprint-declared citation fields are typed onto the graph

A citation-typed field declared in a Level-2 blueprint schema (for example `Evidence.source` or `Entry.source`) MUST be typed onto the graph identically when a Level-3 document adopting that blueprint declares a value for it, regardless of the field's name. Values that do not parse MUST NOT populate `node.sources` silently and MUST surface as diagnostics.

#### Scenario: Evidence.source typed from a blueprint schema

- GIVEN a Level-3 catalog doc adopting `visual-catalog` with `source:: sources/nn/photo.md#capture`
- WHEN the model is parsed
- THEN the element's `ModelNode.sources` includes `sources/nn/photo.md`
- AND the node has a relationship with `origin: "source"` for that entry

#### Scenario: Optional Entry.source citation

- GIVEN an Entry with `source:: sources/nn/note.md#origin`
- WHEN the model is parsed
- THEN `node.sources` includes `sources/nn/note.md` with an `origin: "source"` relationship
- AND an Entry without the field parses without a source relationship
