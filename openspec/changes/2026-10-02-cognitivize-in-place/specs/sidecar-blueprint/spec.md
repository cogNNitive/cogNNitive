# Sidecar bluepriNNt (Delta, new capability)

## Purpose

Sidecars are `_NN.md` documents, so they conform to a bluepriNNt. The Level 2 bluepriNNt is named `sidecar` (not `source`, which would differ by one letter from the `sources` catalog bluepriNNt). Its documents are never models.

## ADDED Requirements

### Requirement: The `sidecar` bluepriNNt exists and is registered

`iNNfo/specs/bluepriNNts/sidecar/spec_NN.md` MUST exist as a Level 2 bluepriNNt defining the sidecar fields (`level: 3`, `parent_spec`, `source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at`, optional `normalized_by`, optional `sources`, and optional normalizer metadata) and the optional normalized body. It MUST be registered in `manifest/source.yaml`, `canonical-registry.ts` (with the generator `MAP` entry), `blueprint-catalog.mjs`, and `sync-versions`. Its `template_version` MUST be registered where `SHIPPED_TEMPLATE_VERSIONS` is derived.

#### Scenario: Inventory guard passes
- GIVEN the new bluepriNNt folder
- WHEN `node scripts/verify.js` runs
- THEN the template inventory guard reports no unregistered folder

#### Scenario: Registry resolves the name
- GIVEN a sidecar document with `parent_spec` naming `sidecar`
- WHEN the canonical registry resolves it
- THEN it resolves to the `sidecar` bluepriNNt and not to `sources`

### Requirement: Sidecar documents conform to the bluepriNNt

Every sidecar written by `cognitivize` MUST validate against the `sidecar` bluepriNNt with no error diagnostics.

#### Scenario: Written sidecar validates
- GIVEN a sidecar produced by `cognitivize`
- WHEN the validator runs
- THEN no error is reported

#### Scenario: Missing required field
- GIVEN a sidecar lacking `sha256`
- WHEN the validator runs
- THEN an error diagnostic names `sha256`

### Requirement: Sidecars are never models

A sidecar MUST NOT be listed as a model by `list_knowledge`, the `## NN Models` section, the `export-console` target list, editor workspace detection, manifest reconciliation, or duplicate-model detection, regardless of its `level` or `parent_spec`. This is enforced by the single predicate in `nn-naming-contract`, and the exclusion MUST ship in the same slice as the first sidecar-aware consumer change.

#### Scenario: Sample workspace with sidecars
- GIVEN each sample workspace after cognitivizing its sources
- WHEN the model lists of all consumers are produced
- THEN zero sidecars appear
