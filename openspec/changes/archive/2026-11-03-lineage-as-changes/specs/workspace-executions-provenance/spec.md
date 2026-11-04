# workspace-executions-provenance Specification (delta: capability removed)

Decision for the open point left by the proposal: `# NN Executions` is removed, not kept. It was a second place to record runs (`command`, `flags`, `run_at`, `inputs`, `outputs`), which duplicates the dropped run journal and contradicts "the change is the only provenance". Its useful facts map onto a `produce_artifact` change (`target` = output, `evidence` = inputs, `author` = procedure, `applied_at` = run time). Runs that produce no artifact (scan, cognitivize, import) are recorded by the sidecar and git. Only `simulacro-refactorizacion`'s `workspace_spec_NN.md` fixture uses the concept in the repository, and the published workspace spec is write-once, so the removal is delivered as a new workspace spec version within the templates release of this change.

## REMOVED Requirements

### Requirement: Executions concept definition in workspace template
(Reason: a parallel run record next to the changeset chain. Artifact-producing runs are recorded as `produce_artifact` changes, and other runs are recorded by sidecars and git.)
(Migration: none — legacy out of scope. The concept is dropped from a new workspace spec version; the published version is not edited, and the fixture that uses it is rebuilt.)

### Requirement: Distinct fields for execution traces
(Reason: `command`, `flags`, `run_at`, `inputs` and `outputs` are superseded by the `target`, `evidence`, `author` and `applied_at` of `produce_artifact`.)
(Migration: none — legacy out of scope. See `artifact-production-change`.)
