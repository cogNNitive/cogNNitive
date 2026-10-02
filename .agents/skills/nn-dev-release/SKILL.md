---
name: nn-dev-release
version: "3.0.0"
description: Internal developer skill for cogNNitive maintainers. Manages monorepo git status, gate checks, version bumping, release tagging, manifest generation, and distribution validation.
---

# nn-dev-release Skill (Tag-Driven Release Manager)

## Overview

`nn-dev-release` is an internal maintenance skill for developers and maintainers of `cogNNitive`. It governs the tag-driven release workflow across the unified monorepo (`cogNNitive/cogNNitive`).

Under the tag-driven release model (AD-1..AD-9):
- Pushing an annotated release tag `<key>-v<semver>` on the monorepo is the **sole release trigger**.
- No hand-typed channel versions or pinned SHAs in `manifest/source.yaml`.
- The release workflow (`.github/workflows/release.yml`) executes additively to `cogNNitive-web`, creates mirror tags, generates and publishes the stable manifest, and executes automated smoke tests.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-release (🛠️)
```

---

## 1. Release Keys Table

The monorepo defines four distinct release keys. Each release tag MUST match `<key>-v<semver>`:

| Release Key | Target Subsystem | Authored Version Source | Target in Manifest |
|-------------|------------------|-------------------------|--------------------|
| `skills` | Agent Skills suite | `skills/*/SKILL.md` (individual) | `skills[*]` |
| `blueprints` | Domain templates & specs | `iNNfo/specs/templates/*/spec_NN.md` | `templates[*]` |
| `innfo-mcp` | MCP server & tools bundle | `iNNfo/packages/innfo-mcp/package.json` | `mcp` bundle |
| `innfo-console` | Interactive blueprint console | `iNNfo/specs/bluepriNNts/console/package.json` | `console_assets` |

---

## 2. Release Procedure ("Tag, Push, Watch")

The entire release procedure consists of three steps: **Tag, Push, Watch**.

### Step 1: Pre-Release Validation — the "don't burn a tag" checklist

Every tag attempt is **irreversible**: it can never be re-used, moved, or deleted
once published, and it leaves a mirror tag + manifest snapshot on `cogNNitive-web`.
There is no "undo release". Run **all** of these before `git tag`:

1. **Branch is clean and merged:** the changes to release are on `main` and the
   latest `CI & Verify` run on the **exact** `origin/main` tip is `success`
   (`gh run list --branch main --workflow "CI & Verify" --limit 1`).
2. **The tagged commit already contains the CURRENT release scripts.** The workflow
   checks out the tag and runs `scripts/**` **from that commit** — a fix merged
   after the tag does NOT reach the tag's re-run. If you are about to tag the tip
   of `main`, confirm `main` already carries the release-script fixes.
3. **Authored version matches (for `innfo-mcp` and `innfo-console`):**
   - `innfo-mcp`: `version` in `iNNfo/packages/innfo-mcp/package.json` equals `<semver>`.
   - `innfo-console`: `version` in `iNNfo/specs/bluepriNNts/console/package.json` equals `<semver>`.
4. **Strictly greater than existing tags:** `<semver>` MUST be greater than the
   highest existing tag for that `<key>` in BOTH the monorepo and
   `cogNNitive/cogNNitive-web`.
5. **`release.yml` env is complete.** Every step that touches the GitHub API carries
   a token — in particular the **Post-Publish Smoke Test** step, whose validator
   (`validateManifestText`) calls the GitHub API and fails with HTTP 403/429 when
   unauthenticated. Inspect that step's `env:` block for `GITHUB_TOKEN`.
6. **`vars.RELEASE_ENABLED == 'true'`.** Otherwise a tag push silently runs as a
   **dry run** (the workflow sets `DRY_RUN` when the variable is absent/false) and
   the smoke test is skipped — a green-looking no-op that publishes nothing.
7. **Release freeze.** No other session/agent may push to `dev`/`main` while the
   release workflow is in flight: a moved `origin/main` breaks the tag's own
   verification (see §4). Announce the freeze before tagging.

### Step 2: Create Annotated Tag

Create an annotated git tag locally on the `main` commit:

```powershell
git tag -a <key>-v<semver> -m "release: <key> v<semver>"
```

*Example:*
```powershell
git tag -a skills-v2.9.0 -m "release: skills v2.9.0"
```

### Step 3: Push Tag & Watch Release Workflow

Push the tag to `origin`:

```powershell
git push origin <key>-v<semver>
```

Then watch the automated release workflow:

```powershell
gh run list --workflow release.yml --limit 1
gh run watch <run-id> --exit-status
```

The release workflow (`release.yml`) will:
1. Validate the tag and compute the release decision matrix (`scripts/release/publish-decision.js`).
2. Sync the published assets to `cogNNitive-web` and stage versioned CDN bundles (commit C).
3. Create the corresponding mirror tag on `cogNNitive-web`.
4. Assemble the updated manifest from the previous published manifest + tagged inventory (`scripts/release/assemble-manifest.js`).
5. Save snapshot to `docs/use/manifests/<tag>.md` and publish manifest (commit M).
6. Run live smoke tests (`scripts/release/smoke.js`).

---

## 3. Definition of Deployed

A release SHALL be reported as "deployed" ONLY when all 4 legs verify:
1. **Monorepo tag:** Monorepo release tag `<key>-v<semver>` is pushed to `cogNNitive/cogNNitive`.
2. **Workflow success:** The `release.yml` GitHub Actions run concludes with `success`, including the smoke test job.
3. **Mirror tag:** The mirror tag `<key>-v<semver>` exists in `cogNNitive/cogNNitive-web` pointing to commit C.
4. **Live resolution:** The published manifest at `https://cognnitive.com/use/manifest.md` and versioned CDN URLs resolve and reflect the released version.

---

## 4. Failure & Re-Run States

> ⚠️ **A failed tag usually CANNOT be re-run to green.** "Re-run the workflow on
> the same tag" is only valid for a **transient infrastructure/network failure
> with no code or state change**. It does NOT work once either is true:
> - **`origin/main` advanced past the tag.** Release verification (e.g. the
>   template-immutability guard) compares the tag checkout against `origin/main`;
>   a moved main makes the old tag look like it went backwards and false-fails.
> - **The fix that makes it pass landed AFTER the tag was cut.** The workflow runs
>   the scripts *from the tag*, so a later fix never reaches the tag's re-run.
>
> In both cases the recovery is a **new version tag** (`<key>-v<next>`), never a
> re-run. Do not delete or move the failed tag (published tags are immutable).

If a release workflow run fails, inspect the failing stage below. Re-running on the same tag is the primary recovery path **only for a transient failure** (see the callout above); all release operations are idempotent and additive:

| Stage | Failure State | Recovery Action |
|-------|---------------|-----------------|
| **1. Parse & Decision Matrix** | No assets pushed; tag rejected (e.g. invalid key, non-increasing semver, or authored version mismatch). | Delete local/remote tag if incorrect, fix source files or version, merge to `main`, and re-tag. |
| **2. Web Commit C (Additive Sync)** | Commit C failed to push to `cogNNitive-web`. No mirror tag created. | Re-run workflow for the tag (`gh run rerun <run-id>`). |
| **3. Mirror Tag Creation** | Commit C pushed, but mirror tag failed to create. | Re-run workflow. Mirror tag creation is retried. |
| **4. Manifest Assembly** | Commit C and mirror tag exist; manifest assembly failed. | Re-run workflow. Re-assembles manifest against published history. |
| **5. Manifest Staging Validation** | Assembled manifest failed validation checks. | Release aborted before commit M. Check inventory rules and re-run. |
| **6. Manifest Commit M** | Manifest commit failed to push to `cogNNitive-web`. | Re-run workflow. Retries pushing commit M and snapshot. |
| **7. Post-Publish Smoke Test** | All assets, mirror tag, and manifest commit M are published, but the live smoke failed (CDN replication delay, or an unauthenticated validator — see §4b). | **DO NOT DELETE TAGS.** Re-run (`gh run rerun <run-id>`) **only** if `origin/main` has not moved and the fix predates the tag; otherwise cut a new version. |

---

## 4b. Known Failure Modes (symptom → cause → fix)

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Post-Publish Smoke Test` fails with `Live manifest … failed validation` although the manifest already reached byte-equality | the smoke step ran **without a token**; `validateManifestText`'s GitHub API calls returned 403/429 | add `GITHUB_TOKEN: ${{ secrets.WEB_RELEASE_TOKEN || secrets.GITHUB_TOKEN }}` to that step's `env:` |
| `Template Immutability Guard` fails on a tag with `base: "V_0-X-0", current: "V_0-(X-1)-0"` — especially on a **re-run** | the guard diffed the tag against a moved-on `origin/main` | base is now `merge-base(HEAD, origin/main)`; if it still fires on an old tag, cut a new version |
| Workflow concludes without publishing anything | `vars.RELEASE_ENABLED` is not `'true'` → silent dry run | set the repo variable to `true`, then re-tag |
| `Authored version mismatch` | tag `<semver>` ≠ the key's `package.json` `version` | bump the package in the same batch, then tag |
| `Version below existing tag` | semver ≤ an existing tag for the key | cut a higher version — tags are immutable |

---

## 5. Rollback & Disaster Recovery

### Manual Snapshot Rollback

Every release saves an immutable snapshot of the stable manifest to `docs/use/manifests/<tag>.md` on `cogNNitive-web`. If an emergency rollback of the stable manifest is required:
1. Clone `cogNNitive-web`.
2. Copy the desired previous snapshot:
   ```bash
   cp docs/use/manifests/<previous-tag>.md docs/use/manifest.md
   cp docs/use/manifests/<previous-tag>.md docs/update/manifest.md
   ```
3. Commit and push to `cogNNitive-web` `main`:
   ```bash
   git commit -m "revert(manifest): rollback stable manifest to <previous-tag>"
   git push origin main
   ```

### Concurrency & Cancelled Runs

The release workflow uses `concurrency: group: release, cancel-in-progress: false` to ensure releases do not clobber each other. If a pending release run is cancelled or failed due to GitHub Actions infrastructure, simply trigger a re-run on the tag via `gh run rerun <run-id>` or `workflow_dispatch`.

---

## 6. Core Guidelines for Maintainers

1. **Never edit `manifest/source.yaml` channels or versions by hand:** `manifest/source.yaml` contains static inventory declarations only.
2. **Never push untagged release commits:** Releases are driven purely by git tags.
3. **Always verify `main` CI before tagging:** Releases must only be cut from verified `main` commits.
4. **Never delete published mirror tags:** Published mirror tags on `cogNNitive-web` are immutable restore points.