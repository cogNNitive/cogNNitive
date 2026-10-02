# Delta for ci-stable-manifest-on-dev

## REMOVED Requirements

### Requirement: Stable-manifest coherence check runs on `dev` pushes

(Reason: The check compared pins and `main` content over the network on every `dev`/`main` push, and depended on tags that exist only after publication. Push CI is now offline; stable manifest validation happens once, as the post-publish smoke test of the release workflow.)

(Migration: Remove the `validate-manifest.js --channel stable` step from `.github/workflows/ci.yml` for `dev` and `main` pushes. Validation runs in the release workflow against the published manifest.)

### Requirement: Drift is detected after merge, not prevented before it

(Reason: With "pin content equals `main`" removed and the manifest generated at release time, there is no pin/`main` drift to detect.)

(Migration: None. The living spec `ci-stable-manifest-on-dev` has no remaining requirements and SHOULD be deleted when this change is archived.)
