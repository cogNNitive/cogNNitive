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

Nothing deletes it for you. GitHub removes the branch on merge and never a file, so every
landed session has to take its own claim out with the change that landed it. `claim-audit.mjs`
names the ones still lying around:

```powershell
gh pr list --state open --limit 1000 --json number > temp/prs.json
npm run check:claims -- --prs temp/prs.json
```

It exits 1 for every claim whose PR is no longer open, and lists the claims without a PR
separately, because those cannot be judged yet. CI runs the same audit in advisory mode on
every push and pull request: a tombstone is pre-existing debt on the base branch, so it warns
instead of failing somebody else's PR.
