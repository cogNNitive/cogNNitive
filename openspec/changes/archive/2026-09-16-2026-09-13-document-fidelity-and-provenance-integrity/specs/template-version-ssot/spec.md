# Spec: Template Version Single Source of Truth

Governs how a shipped template's `template_version` reaches the editor bundle
and the published CDN manifest.

## Context

`template_version` is declared once, in `iNNfo/specs/templates/<slug>/spec_NN.md`.
It is then hand-copied into two other places:

- `iNNfo/apps/innfo-editor/src/config/samples.ts` → `SHIPPED_TEMPLATE_VERSIONS`
- `manifest/source.yaml` → each template's `version:` field (and its rendered
  `docs/use/manifest.md`)

Both copies drift. The `SHIPPED_TEMPLATE_VERSIONS` miss has recurred **six**
times and left `dev` red at `6e7481f`. `manifest/source.yaml` — what users
actually install from — is currently two minor versions behind for `workspace`
(`V_0-2-1` recorded, `V_0-4-0` shipped) and one behind for `business-model`.
`check:integrity` guards the bump itself but checks neither copy; only a unit
test catches one of them, which is too late.

## Specification Requirements

### Requirement 1: One Declaration

`iNNfo/specs/templates/<slug>/spec_NN.md` frontmatter MUST be the only
hand-maintained declaration of a template's `template_version`.

### Requirement 2: The Editor Map Is Generated

`SHIPPED_TEMPLATE_VERSIONS` MUST be generated from the template specs by a
build/sync script rather than hand-edited.

- The generated file MUST carry a "generated — do not edit" header naming the
  script that produces it.
- The generator MUST preserve the existing deliberate omission of
  `workspace_spec`, with the reason recorded in the generator, not in the
  generated output.

### Requirement 3: Manifest Versions Are Generated

`manifest/source.yaml`'s per-template `version:` fields MUST be derived from the
same template specs, and `docs/use/manifest.md` MUST be regenerated from it.

### Requirement 4: Drift Is A Commit-Time Gate

`npm run check:integrity` MUST fail when any generated copy disagrees with the
template specs.

- **GIVEN** a commit bumps `business/spec_NN.md` to a new `template_version`
- **AND** the generated copies are not regenerated
- **WHEN** `npm run check:integrity` runs
- **THEN** it MUST fail, naming the slug, the expected version and the command
  that regenerates the copies

This moves the failure from "a unit test three steps later" to "the integrity
gate the contributor already runs".

### Requirement 5: Current Drift Is Corrected

On landing this change, the generated copies MUST agree with disk:

| template | expected |
| --- | --- |
| `business` | `V_0-2-5` |
| `business-model` | `V_0-2-2` |
| `workspace` | `V_0-4-0` |

### Requirement 6: The Generator Is Idempotent

Running the generator twice MUST produce no diff on the second run, so it is
safe to wire into `check:integrity` in `--check` mode.
