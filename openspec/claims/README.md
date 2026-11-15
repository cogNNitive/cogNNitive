# Write-area claims

One file per active claim. A claim says "this session is writing inside these paths";
another session reads it before its first edit and either finds the area free or stops.

`claim-check.mjs` ignores this README. Everything else ending in `.md` is a claim.

## Format

```
# claim: <id, same as the branch suffix>

branch: session/<id>
pr: 650
opened: 2026-11-15
thread: <where the work is being driven from>

area:
  - scripts/foo.mjs
  - iNNfo/specs/bluepriNNts/console/ui-kit.js
  - iNNfo/specs/bluepriNNts/console/nn-console.bundle.js   # generated

excludes:
  - iNNfo/specs/bluepriNNts/console/nn-runtime.js
```

- `area` holds repo-relative literal paths and narrow globs. A topic name claims nothing.
- `excludes` lists paths inside the area that belong to somebody else.
- `pr` is optional while the branch has no PR. With `--prs`, a claim whose PR is no longer
  open is reported as released instead of as a conflict.

## Lifecycle

Written before the first edit, checked with `claim-check.mjs`, and **deleted when the work
is merged**: a claim is a live lock, not a tombstone.
