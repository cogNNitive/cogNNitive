# Design: Trim referenced-external-skill ceremony

## Decision

Keep the trust-boundary controls (immutable `commit` pin, SPDX `license`, consent-gated
`install-external`); remove the three pieces that add no enforcement value.

| Piece | Verdict | Rationale |
|---|---|---|
| `commit` (40-hex) | Keep | Immutability anchor; verified structurally |
| `license` (SPDX) | Keep | Compliance; required to distribute any reference |
| consent + "not reviewed" notice | Keep | Third-party fetch is a trust boundary |
| `sha256` digest | Demote to optional, unenforced | Redundant with the immutable commit pin |
| `ref` (tag → commit) | Retire | Never resolved (policy is offline) |
| `distribution: vendored` | Retire | Dead path; contradicts "never vendored" |

## Seam

One enforcement point remains: `validateExternalSkill` in
`scripts/manifest/lib/external-skill-policy.js`. It checks `name`, `repo`, `path`,
`commit`, `license` presence and the `commit` shape. The `external-skills` step in
`scripts/verify.js` and `scripts/check-integrity.js` both call it, so trimming the module
trims both gates at once (no caller-level guard to duplicate).

## Not touched

`scripts/lib/skill-tree-digest.js` and the `install-external --sha256` flag are general
install machinery; leaving them keeps `skills-manager` behavior stable and avoids
regenerating the shipped manager bundle for a no-op.
