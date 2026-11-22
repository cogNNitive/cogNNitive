# Delta for skill-catalog

The `nn-upgrade` skill was retired in favour of `nn-update` when the Blueprint Lineage
Reconciliation flow replaced the in-place migration. Its `SKILL.md` has been a forwarder
that only logs a deprecation notice since V_0-1-0, and every script it used to own now
lives in `skills/nn-update/scripts/`. The deprecation cycle is over: `nn-upgrade` leaves
the distributed catalog, and `nn-update` is the single skill that owns the flow, its
consent gate and its backup step. A domaiNN written by an older release keeps working
because nothing the retired skill referenced is deleted: the scripts moved and the frozen
`workspace` bluepriNNt stays byte-identical.

## REMOVED Requirements

### Requirement: nn-upgrade is a distributable alias skill

`manifest/source.yaml` no longer declares a `nn-upgrade` entry, so the generated manifests
stop listing the skill and a fresh install no longer receives a directory whose only
content is a deprecation notice.
`skills/nn-upgrade/` MUST NOT exist in the repository.
The allowlists that enumerate distributable skill roots (`scripts/lib/publish-web-guard.js`,
the workspace inventory in `scripts/lib/license-inventory.js`) MUST NOT name it.

#### Scenario: The generated manifest lists nn-update and not nn-upgrade
- GIVEN a clean checkout of this repository
- WHEN `npm run regen` renders `docs/use/manifest-next.md`
- THEN the manifest names `nn-update`
- AND no entry names `nn-upgrade`

#### Scenario: A fresh install contains no forwarder skill
- GIVEN the generated manifest of a release that includes this change
- WHEN an agent installs the skills it pins
- THEN no `skills/nn-upgrade` directory is created

### Requirement: The retirement leaves no broken reference behind

A path that named `skills/nn-upgrade/**` MUST either be gone or point at the location the
file actually has today: the scripts live in `skills/nn-update/scripts/`.
Documentation that teaches the retired invocation MUST teach the canonical one.

#### Scenario: The bundle builder points at the file it writes
- GIVEN `scripts/build-preflight-primitives.mjs` bundles the `nn-core` primitives
- WHEN the committed target list is read
- THEN the `nn-core` bundle is named at `skills/nn-update/scripts/lib/nn-core.generated.cjs`
