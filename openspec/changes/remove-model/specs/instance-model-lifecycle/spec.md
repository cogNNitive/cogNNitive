# Delta for instance-model-lifecycle

An instance model could be created, moved and extracted out of a compact document, but not removed: no operation existed, and deleting the file by hand was reported as `MODEL_WITHOUT_FILE`. This delta adds `remove_model` as a sealed, recorded change and makes the recorded removal a terminal state for the provenance check, without weakening it.

## ADDED Requirements

### Requirement: remove_model is a sealed, recorded change

A `remove_model` change MUST carry the instance model id in `target` and nothing else beyond `evidence`, `notes` and `author`; a destination in `to`, a precondition in `from` or `base_hash`, an element payload in `fields` or `slug`, and the model-creation keys `concept`, `name`, `blueprint_name`, `blueprint_url` and `knowledge_version` MUST be refused at parse time.

#### Scenario: A well-formed removal is sealed with the rest of the proposal

- GIVEN a proposed changeset with one change `op:: remove_model`, `target:: villabotijos-today/intro` and evidence
- WHEN the changeset is parsed and its `proposal_sha` is recomputed
- THEN the parsed change carries the same op, target and evidence
- AND the recomputed seal equals the recorded one
- AND changing the target to another model changes the seal

#### Scenario: A destination is a move, not a removal

- GIVEN a `remove_model` change carrying `to:: villabotijos-today/welcome`
- WHEN the changeset is parsed
- THEN parsing fails with a message naming the change id and `remove_model`

#### Scenario: An element address names a unit, not a model

- GIVEN a `remove_model` change whose target is `villabotijos-today/intro@00-gancho`
- WHEN the changeset is parsed
- THEN parsing fails with a message naming the change id and `remove_model`

### Requirement: Only an instance model can be removed

`remove_model` MUST refuse a compact model with `REMOVE_REQUIRES_INSTANCE`, describe an unsafe id as `REMOVE_INVALID_TARGET`, and report a target with no model or no file as `MODEL_NOT_FOUND`, in every case without writing or deleting anything.

#### Scenario: A compact model is refused

- GIVEN a compact model `notes`
- WHEN a changeset removes `notes`
- THEN the changeset is rejected with `REMOVE_REQUIRES_INSTANCE`
- AND `kNNowledge/notes_NN.md` is byte-identical to before the apply

#### Scenario: An unknown id is refused

- GIVEN a domaiNN with no model `villabotijos-today/ghost`
- WHEN a changeset removes `villabotijos-today/ghost`
- THEN the changeset is rejected with `MODEL_NOT_FOUND`
- AND no changeset is marked applied

### Requirement: A removal is refused while the model's folder holds another model

`remove_model` MUST refuse a target whose folder still holds another discovered model with `REMOVE_MODEL_HAS_DESCENDANTS`, naming the ids that must be removed first, because deleting the folder would orphan them.

#### Scenario: A container with contents is refused

- GIVEN a Series instance `villabotijos-today` whose folder holds the Video instance `villabotijos-today/intro`
- WHEN a changeset removes `villabotijos-today`
- THEN the changeset is rejected with `REMOVE_MODEL_HAS_DESCENDANTS`
- AND the message names `villabotijos-today/intro`
- AND no file is deleted

#### Scenario: The same model is removable once its children are gone

- GIVEN the same domaiNN after the child was removed by its own recorded change
- WHEN a changeset removes `villabotijos-today`
- THEN the removal applies
- AND no model file remains under that folder

### Requirement: A removal is refused while a live reference addresses the model

`remove_model` MUST refuse a target that a typed reference still addresses — the id itself, one of its descendants, or an addressed element — with `REMOVE_LEAVES_DANGLING_REFERENCES`, unless the same changeset clears or retargets that reference with an `update_field` change, and `propose_changeset` MUST run the same scan before writing anything.

#### Scenario: An unretargeted referrer blocks the removal

- GIVEN a Video instance `villabotijos-today/pepper-mapache` whose `related` field addresses `villabotijos-today/intro`
- WHEN a changeset removes `villabotijos-today/intro` alone
- THEN the changeset is rejected with `REMOVE_LEAVES_DANGLING_REFERENCES`
- AND the message names `villabotijos-today/pepper-mapache@pepper-mapache&related`
- AND both model files are untouched

#### Scenario: Clearing the reference in the same changeset applies the removal

- GIVEN the same referrer
- WHEN the changeset carries the removal and an `update_field` that retargets `related` away from the removed id
- THEN the removal applies
- AND the referrer no longer addresses the removed id
- AND the workspace check reports no `REF_MODEL_NOT_FOUND` for it

#### Scenario: propose_changeset offers the missing update_field changes

- GIVEN the same referrer
- WHEN `propose_changeset` is called with the removal alone
- THEN it fails with `REMOVE_LEAVES_DANGLING_REFERENCES`
- AND it returns one `missing_referrer_updates` entry targeting `villabotijos-today/pepper-mapache@pepper-mapache&related`

### Requirement: A recorded removal is a terminal state for MODEL_WITHOUT_FILE

The provenance check MUST NOT report `MODEL_WITHOUT_FILE` for a model id whose last applied model-lifecycle change is a `remove_model`, and MUST report it again when a later applied `add_model`, `extract_instance` or `move_model` re-creates that id and its file is then missing.

#### Scenario: A removed model is not a loss

- GIVEN an applied `add_model` for `villabotijos-today/intro` followed by an applied `remove_model` of the same id
- WHEN the provenance check runs in fold mode or in strict mode
- THEN it reports no `MODEL_WITHOUT_FILE` for that id

#### Scenario: A hand-deleted file with no recorded removal is still drift

- GIVEN an applied `add_model` for `villabotijos-today/intro` and no removal
- WHEN the file is deleted by hand
- THEN the provenance check reports `MODEL_WITHOUT_FILE` for that id

#### Scenario: A re-created id is live again

- GIVEN an applied removal of `villabotijos-today/intro` followed by an applied `add_model` of the same id
- WHEN that file is missing
- THEN the provenance check reports `MODEL_WITHOUT_FILE` for that id

### Requirement: An address to a removed model names the recording changeset

A reference that addresses a removed model id MUST resolve to `REF_MODEL_NOT_FOUND` as an error, MUST name the changeset and change that recorded the removal, and MUST NOT invent a successor; a moved id keeps naming its recorded successor.

#### Scenario: The tombstone is named

- GIVEN an applied `remove_model` recorded as change `c-07` in `changes/2026-11-18_agent_x_changes_NN.md`
- AND a reference field that still addresses the removed id
- WHEN the workspace references are validated
- THEN one `REF_MODEL_NOT_FOUND` error names the removed id and `2026-11-18_agent_x_changes_NN.md`
- AND the diagnostic metadata carries that changeset as the removal

#### Scenario: No successor is invented

- GIVEN the same removed id
- WHEN the diagnostic is reported
- THEN its message contains no `recorded successor`

### Requirement: The change log drops the removed model's live units

The fold MUST remove the units, cleared keys, element epochs and element origins of a removed model at the removal's position, MUST keep the change as a tombstone, and MUST still answer the removed units' history from the change log.

#### Scenario: The removed model owns no live unit

- GIVEN an applied field change on `villabotijos-today/intro` and a sibling model with its own unit
- WHEN the model is removed by an applied change
- THEN the live units of `villabotijos-today/intro` are empty
- AND the sibling's live unit is unchanged
- AND the removed element has no element origin
- AND the removal change is a tombstone

### Requirement: Strict replay and the manifest sync learn the terminal state

Strict replay MUST NOT replay a `remove_model` change and MUST compare every model that has a file exactly as before, and an applied changeset that removed models MUST reconcile the domain manifest non-dry so the inventory entry is archived, reporting a reconciliation failure in the apply payload without changing the apply outcome.

#### Scenario: A removed model does not fail strict replay

- GIVEN an applied creation of an instance model and an applied removal of it
- WHEN the domain provenance check runs with strict replay
- THEN it reports no diagnostics and its verdict is ok

#### Scenario: A removal reconciles the manifest

- GIVEN an apply that removed one model and returned it in `removedModels`
- WHEN the apply runs through console regeneration
- THEN the manifest reconciler runs with `dry_run: false`
- AND its outcome is reported in the payload's `manifest` field
