# sidecar-blueprint Delta Spec

## MODIFIED Requirements

### Requirement: The `sidecar` bluepriNNt exists and is registered

`iNNfo/specs/bluepriNNts/sidecar/spec_NN.md` MUST exist as a Level 2 bluepriNNt defining the sidecar fields (`level: 3`, `parent_spec`, `source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at`, optional `normalized_by`, optional `sources`, optional origin fields `synchronization`, `origin_path`, `origin_uri` and `retrieved_at`, and optional normalizer metadata) and the optional normalized body. It MUST NOT declare `source_url` or `downloaded_at`. It MUST be registered in `manifest/source.yaml`, `canonical-registry.ts` (with the generator `MAP` entry), `blueprint-catalog.mjs`, and `sync-versions`, and its `blueprint_version` MUST be bumped by this change. Its `template_version` MUST be registered where `SHIPPED_TEMPLATE_VERSIONS` is derived.
(Previously: no origin fields were declared and the bluepriNNt could carry an origin URL in normalizer metadata.)

#### Scenario: Inventory guard passes
- GIVEN the new bluepriNNt folder
- WHEN `node scripts/verify.js` runs
- THEN the template inventory guard reports no unregistered folder

#### Scenario: Registry resolves the name
- GIVEN a sidecar document with `parent_spec` naming `sidecar`
- WHEN the canonical registry resolves it
- THEN it resolves to the `sidecar` bluepriNNt and not to `sources`

#### Scenario: Origin fields are declared
- GIVEN the `sidecar` bluepriNNt after this change
- WHEN its fields are listed
- THEN `synchronization`, `origin_path`, `origin_uri` and `retrieved_at` are declared as optional
- AND `source_url` and `downloaded_at` are not declared

#### Scenario: Sidecar with origin keys validates
- GIVEN a sidecar produced for a synchronized file
- WHEN the validator runs
- THEN no error is reported for the origin keys
