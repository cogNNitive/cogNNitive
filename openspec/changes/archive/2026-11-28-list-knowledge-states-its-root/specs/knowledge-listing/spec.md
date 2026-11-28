# Delta for knowledge-listing

`list_knowledge` answers `{ version, knowledge: [] }` when the server is rooted somewhere that is
not a domaiNN: no resolved-root echo, no warning, nothing an agent can use to tell "this domaiNN
holds no models" from "the server is not looking at a domaiNN". An agent reads "0 models" and
concludes the model does not exist. This change makes the tool state the root it read and refuse
an empty list it cannot justify. A real domaiNN's listing keeps its shape (`innfo-list-knowledge@1`
with `knowledge`), so this is an additive change within the same envelope major; only the
previously unjustified empty answer becomes a structured failure.

## ADDED Requirements

### Requirement: A listing states the root it read
Every `list_knowledge` result MUST carry the absolute path that was scanned as `root`.
A successful listing MUST keep the `innfo-list-knowledge@1` envelope and its `knowledge` array unchanged, and MUST report `ok: true`.
An explicit `domain` or `root` argument MUST be the path echoed, resolved to absolute form.

#### Scenario: A real domaiNN answers with its resolved root
- GIVEN a domaiNN root holding `domaiNN_NN.md` and two model documents
- WHEN `list_knowledge` is called with no `domain` argument
- THEN the result carries `ok: true`, `root` equal to that absolute path, and both models under `knowledge`

#### Scenario: An explicit override is the path echoed
- GIVEN a second domaiNN passed as the `domain` argument
- WHEN `list_knowledge` is called with it
- THEN `root` names that second directory and `knowledge` lists only its models

### Requirement: An empty listing that cannot prove absence is a reported failure
When the resolved root holds no `domaiNN_NN.md`, `list_knowledge` MUST return an error result carrying `ok: false`, `code: NO_DOMAIN_ROOT`, the resolved `root`, and a `detail` naming that root and stating that an empty listing proves nothing about any model.
When the resolved root is a domaiNN but no model document was found under it, `list_knowledge` MUST return an error result carrying `ok: false`, `code: NO_MODELS`, the resolved `root`, and a `detail` naming that root the same way.
An empty `knowledge` array MUST remain a successful `ok: true` result when the domaiNN holds model documents and the requested `collection` has no members.

#### Scenario: A root without the entrypoint is reported
- GIVEN a directory that holds no `domaiNN_NN.md`
- WHEN `list_knowledge` is called with it as the resolved root
- THEN the call is an error carrying `NO_DOMAIN_ROOT`, the resolved root and an empty `knowledge`

#### Scenario: A domaiNN without models is reported
- GIVEN a directory holding `domaiNN_NN.md` and no model document
- WHEN `list_knowledge` is called with it
- THEN the call is an error carrying `NO_MODELS` and the resolved root

#### Scenario: An empty collection stays a plain list
- GIVEN a domaiNN holding at least one model document and no member of the requested collection
- WHEN `list_knowledge` is called with that `collection`
- THEN the call succeeds with `ok: true`, the resolved root and an empty `knowledge`
