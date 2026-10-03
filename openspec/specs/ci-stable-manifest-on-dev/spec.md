# Spec: ci-stable-manifest-on-dev

> **SUPERSEDED / REMOVED** by `tag-driven-release`: Push CI on `dev` and `main` is completely offline and deterministic. Stable manifest validation occurs solely as the post-publish smoke test in `.github/workflows/release.yml`.

## Status

All requirements in this capability have been superseded and removed.

### Requirement: Stable-manifest coherence check runs on `dev` pushes (REMOVED)
- Reason: The check compared pins and `main` content over the network on every `dev`/`main` push, and depended on tags that exist only after publication. Push CI is now offline; stable manifest validation happens once, as the post-publish smoke test of the release workflow.

### Requirement: Drift is detected after merge, not prevented before it (REMOVED)
- Reason: With "pin content equals `main`" removed and the manifest generated at release time, there is no pin/`main` drift to detect.
