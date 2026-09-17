# Spec: Submodel Recursion in Tree Navigation

## Requirement 1: Direct Concept Unfolding
When a model node in the tree (e.g. `Discografia` under `Models`) is expanded:
- It MUST NOT render a redundant intermediary child row for the submodel filename.
- It MUST directly render the submodel's concepts (e.g. `Disco`, `Sello`) as virtual group nodes.
- Each unfolded concept group MUST allow expanding its child elements.

## Requirement 2: Continuist Look & Feel
- Workspace structural scaffolding MUST use neutral slate styling.
- Pill components in the tree MUST respect neutral container background without overpowering high-saturation fills.
