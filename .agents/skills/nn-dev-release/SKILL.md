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

### Step 1: Pre-Release Validation

Before creating any release tag, verify that:
1. **Branch is clean and merged:** The changes to be released are merged into `main` and all CI checks on `main` are green (`gh run list --branch main`).
2. **Authored version matches (for `innfo-mcp` and `innfo-console`):**
   - For `innfo-mcp`: `version` in `iNNfo/packages/innfo-mcp/package.json` equals `<semver>`.
   - For `innfo-console`: `version` in `iNNfo/specs/bluepriNNts/console/package.json` equals `<semver>`.
3. **Strictly greater than existing tags:**
   The new `<semver>` MUST be strictly greater than the highest existing tag for that `<key>` in BOTH `cogNNitive/cogNNitive` AND `cogNNitive/cogNNitive-web`.

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

If a release workflow run fails, inspect the failing stage below. Re-running the workflow on the same tag is the primary recovery path because all release operations are idempotent and additive:

| Stage | Failure State | Recovery Action |
|-------|---------------|-----------------|
| **1. Parse & Decision Matrix** | No assets pushed; tag rejected (e.g. invalid key, non-increasing semver, or authored version mismatch). | Delete local/remote tag if incorrect, fix source files or version, merge to `main`, and re-tag. |
| **2. Web Commit C (Additive Sync)** | Commit C failed to push to `cogNNitive-web`. No mirror tag created. | Re-run workflow for the tag (`gh run rerun <run-id>`). |
| **3. Mirror Tag Creation** | Commit C pushed, but mirror tag failed to create. | Re-run workflow. Mirror tag creation is retried. |
| **4. Manifest Assembly** | Commit C and mirror tag exist; manifest assembly failed. | Re-run workflow. Re-assembles manifest against published history. |
| **5. Manifest Staging Validation** | Assembled manifest failed validation checks. | Release aborted before commit M. Check inventory rules and re-run. |
| **6. Manifest Commit M** | Manifest commit failed to push to `cogNNitive-web`. | Re-run workflow. Retries pushing commit M and snapshot. |
| **7. Post-Publish Smoke Test** | All assets, mirror tag, and manifest commit M are published, but live URL smoke test failed (e.g. CDN replication delay). | **DO NOT DELETE TAGS.** Published tags are immutable. Re-run the release workflow on the same tag (`gh run rerun <run-id>`) to re-verify live smoke tests once CDN propagates. |

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