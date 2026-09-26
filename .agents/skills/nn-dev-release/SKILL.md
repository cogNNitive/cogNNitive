---
name: nn-dev-release
version: "2.1.0"
description: Internal developer skill for cogNNitive maintainers. Manages monorepo git status, gate checks, version bumping, release tagging, manifest generation, and distribution validation.
---

# nn-dev-release Skill (Developer Release & Workflow Manager)

## Overview

`nn-dev-release` is an internal maintenance skill for developers and maintainers of `cogNNitive`. It automates the release and verification workflow across the unified monorepo (`cogNNitive/cogNNitive`):
- **`actioNN/`** — Skills & governance subsystem
- **`iNNfo/`** — Core engine (`packages/innfo-core`), MCP server (`packages/innfo-mcp`), visual editor (`apps/innfo-editor`), and canonical specifications (`specs/`)
- **`manifest/`** — Source declarations (`source.yaml`) for distribution manifests
- **`docs/`** — Documentation portal and rendered distribution manifests (`docs/use/manifest.md`)
- **`scripts/`** — Zero-dependency deterministic verification, generator, and validator tooling

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-release (🛠️)
```

---

## 0. Entry Menu

Present the following interactive menu **only when the task is ambiguous**
(multiple plausible options). When the maintainer already approved a specific
task (audit, sync, release, validate), skip the menu and run that option
directly — presenting it anyway is noise:

```markdown
🛠️ cogNNitive — Developer Release & Workflow Manager

- [a] (Recomendado) Auditar estado del Monorepo (Git status, drift de paridad local y tags recientes)
- [b] Sincronizar y verificar gates (Pull main + verify.js + tests completos)
- [c] Ejecutar Release completo (Bump de versión + Rebuild + Tags en GitHub + Regenerar Manifest + Push)
- [d] Validar publicación del Manifest (Ejecutar validate-manifest.js con GITHUB_TOKEN)
- [x] Cancelar
```

Before creating any PR (`gh pr create`), always run
`gh pr list --head <head> --base <base>` first — an open PR for the same
branch pair already exists more often than not (expediente 2026-09-08: PR #83
dev→main was open and nearly duplicated).

---

## 1. Protocol execution details

### Option [a]: Auditar estado del Monorepo

Run an empirical scan across the monorepo root:

```powershell
Write-Host "=== MONOREPO: cogNNitive/cogNNitive ==="
git status -sb

Write-Host "`n=== RECENT TAGS BY SUBSYSTEM ==="
Write-Host "Skills:"
git tag -l "skills-v*" --sort=-creatordate | Select-Object -First 3
Write-Host "Templates:"
git tag -l "templates-v*" --sort=-creatordate | Select-Object -First 3
Write-Host "MCP:"
git tag -l "innfo-mcp-v*" --sort=-creatordate | Select-Object -First 3
Write-Host "iNNfo Suite:"
git tag -l "v*" --sort=-creatordate | Where-Object { $_ -notmatch '^(skills|templates|innfo-mcp)-' } | Select-Object -First 3

Write-Host "`n=== LOCAL WORKSPACE PARITY ==="
node scripts/manifest/check-parity.js

Write-Host "`n=== DEPLOY-DoD (tag · CI-tip · Pages · CDN/manifest) ==="
# 1. tag pushed?  2. CI success on the origin/main tip?  3. Pages deploy on that tip?
gh run list --branch main --workflow "CI & Verify" --limit 1 --json headSha,status,conclusion
$runId = gh run list --branch main --workflow "CI & Verify" --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view $runId --json jobs --jq '.jobs[] | select(.name=="deploy-pages") | {name,conclusion,headSha}'
# 4. CDN bundle + manifest pins resolve
$env:GITHUB_TOKEN = (gh auth token).Trim()
node scripts/manifest/validate-manifest.js
```

Present a consolidated summary table with:
- Current branch & push sync status
- Working tree status (Clean / Uncommitted changes)
- Latest release tags for each subsystem
- Parity status between local workspace files and `manifest/source.yaml`
- Deploy-DoD (tag / CI-tip / Pages / CDN-manifest): all four legs green, or ❌
  naming the failing leg — a tag alone NEVER satisfies the definition of deployed

---

### Option [b]: Sincronizar y verificar gates

1. Perform `git pull origin main` in the monorepo root.
2. Run workspace verification in release mode:
   ```powershell
   node scripts/verify.js --release
   ```
   *(--release adds the live stable-manifest publication check — pins resolving to tags on main-reachable commits — on top of the deterministic gates: template inventory, orchestrator line limits < 200 lines, workspace parity, scripts typecheck, generated-manifest freshness).*
3. In `iNNfo`:
   - Run typecheck: `npm run typecheck --prefix iNNfo`
   - Run tests: `npm test --prefix iNNfo`
   - Run lint: `npm run lint --prefix iNNfo`
4. Report test count and gate results to the developer.

---

### Option [c]: Ejecutar Release completo (Bump de versión + Tags + Manifest + Push)

> **Pre-merge gate (blocking — run before step 0).** This option merges
> `dev → main` and cuts tags. Run the merge gate from `nn-dev-check-integrity`
> (Group 1b) first: batch CI signal present and green, `origin/main` CI
> `success` and stationary since the batch was verified. On ❌ STOP with the
> named reason (fix-forward on `dev` for batch-caused red; maintainer-approved
> exception with the failing run id for pre-existing red). Never skip it.

0. **Clean tree + release order (blocking preconditions)**:
   - The merge gate (above) must have PASSED before anything in this option
     runs — merging, tagging, and pinning are a **gate, not advice**.
   - `generate-manifest.js` reads versions off the working-tree files, so a
     dirty tree contaminates the pin (expediente 2026-09-08: an uncommitted
     0.5.0 bump leaked into `source.yaml`). Before step 6, `git status
     --porcelain` must show no modifications under `iNNfo/**/package.json`
     (and ideally a fully clean tree); if dirty, commit or stash first.
   - Release order **merge → tag → pin** is blocking: the stable channel only
     accepts pins whose commits are reachable from `main` (the validator
     rejects "diverged" tips). Tagging `dev`-only commits first leaves stable
     red until the `dev`→`main` merge lands — so merge first (or tag commits
     already on `main`), then pin. Do NOT tag until the merge has landed on
     `main`.
   - **Restore Point role**: When executing a release prior to major refactors
     or high-impact changes, the created tag serves as an immutable cryptographic
     restore point. See `nn-dev-development` Section 6 for rollback procedures.

1. **Confirm Version Bump Scope**:
   Prompt the developer to select which subsystem is releasing:
   - `iNNfo Suite` (`v<A.B.C>` & `innfo-mcp-v<A.B.C>`)
   - `Skills` (`skills-v<X.Y.Z>`)
   - `Templates` (`templates-v<T.U.V>`)
   - `Console` (`innfo-console-v<C.D.E>` — the published `innfo-console.bundle.js`
     distributed through the manifest `console-assets` block)

2. **Synchronize & Bump Versions**:
   - For `iNNfo Suite`:
     - Update `version` to `<A.B.C>` in `iNNfo/packages/innfo-mcp/package.json` and `iNNfo/apps/innfo-editor/package.json`.
     - Run `npm run sync:versions` to automatically propagate `<A.B.C>` into:
       - `iNNfo/packages/innfo-core/package.json`
       - `@cognnitive/innfo-core` dependency range in `innfo-mcp/package.json` (`^<A.B.C>`)
       - `manifest/source.yaml` `skills[].mcp[].version`
     - Rebuild bundles:
       ```powershell
       npm --prefix iNNfo/packages/innfo-core run build
       npm --prefix iNNfo/packages/innfo-mcp run build:bundle
       npm run build:docs
       ```
   - For `Skills`:
     - Bump `version:` in targeted `skills/<skill>/SKILL.md`.
     - Update channel release version in `manifest/source.yaml` under `channels.stable.refs` (`key: skills`, `version: "<X.Y.Z>"`).
     - Run `npm run sync:versions` (synchronizes `skills[].version` in `source.yaml`).
   - For `Templates`:
     - Bump `template_version:` (or `spec_version:`) in targeted `iNNfo/specs/templates/<template>/spec_NN.md`.
     - Update channel release version in `manifest/source.yaml` under `channels.stable.refs` (`key: templates`, `version: "<T.U.V>"`).
     - Run `npm run sync:versions` (synchronizes `samples.ts`, `source.yaml` templates, and `catalog.json`).
   - For `Console`:
     - Bump `version:` in `manifest/source.yaml` `console_assets` (`innfo-console`).
     - Rebuild the published bundle:
       ```powershell
       node scripts/build-console-bundle.mjs
       ```

3. **Verify Version Synchronization**:
   Run `npm run check:versions` to ensure all SSOT copies, catalog, and manifest are 100% in sync with zero drift.
   - Note ADR-008: Bumping `SKILL.md` and running `sync:versions` touches `source.yaml`, which satisfies `checkTagPinFreshness` automatically. Always confirm that `channels.stable.refs` `version:` was explicitly updated before cutting the tag.

4. **Verify Local Parity & Commit** (precise staging only — never `git add -A`,
   per `nn-dev-development` rule 6; a concurrent agent's files may be in the tree):
    ```powershell
    node scripts/manifest/check-parity.js
    git add <only-the-intended-files>
    git commit -m "chore(release): bump <subsystem> to <version>"
    git push origin main
    ```

5. **Create & Push Git Tags**:

   > **Stable tag shape (normative).** Every stable-channel ref MUST match
   > `<subsystem>-v<x.y.z>` — the `-v` separator is mandatory
   > (`innfo-console-v0.1.0`, `innfo-mcp-v0.5.0`, `skills-v2.1.0`,
   > `templates-v0.1.0`). `validate-manifest.js` enforces this via
   > `TAG_SHAPE_RE = ^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$`. A tag without `-v`
   > (e.g. `innfo-console0.1.0`) will fail validation: **stop the release flow
   > before tagging** and fix the tag name.

   - For `iNNfo`:
     ```powershell
     git tag v<A.B.C>
     git tag innfo-mcp-v<A.B.C>
     git push origin v<A.B.C>
     git push origin innfo-mcp-v<A.B.C>
     ```
   - For `Skills`:
     ```powershell
     git tag skills-v<X.Y.Z>
     git push origin skills-v<X.Y.Z>
     ```
   - For `Templates`:
     ```powershell
     git tag templates-v<T.U.V>
     git push origin templates-v<T.U.V>
     ```
   - For `Console`:
     ```powershell
     git tag innfo-console-v<C.D.E>
     git push origin innfo-console-v<C.D.E>
     ```

6. **Regenerate & Validate Manifests**:
   With GitHub authentication token active:
   ```powershell
   $env:GITHUB_TOKEN = (gh auth token).Trim()
   node scripts/manifest/generate-manifest.js --channel stable
   node scripts/manifest/generate-manifest.js --channel preview
   node scripts/manifest/validate-manifest.js
   ```

7. **Commit & Push Manifest**:
   ```powershell
   git add manifest/source.yaml docs/use/manifest.md docs/use/manifest-next.md
   git commit -m "chore(manifest): pin stable manifest to latest release tags"
   git push origin main
   ```

---

### Safe merge technique: `git push origin dev:main` (supersedes the checkout-based dance)

**Status: recommended technique.** Wherever this file (or `nn-dev-development`
§4e) previously instructed `switch main → pull → merge --ff-only → push →
switch dev`, use `git push origin dev:main` instead:

```powershell
git push origin dev:main
```

- It is a **server-side fast-forward push**: it never checks out `main`
  locally, so it never requires a clean working tree.
- The repo's tree is routinely dirty with a concurrent session's uncommitted,
  unrelated paths (`concurrent-sessions-share-working-tree.md`); the
  checkout-based dance's first step (`git switch main`) is unsafe or
  outright blocked in that state. `dev:main` leaves those foreign paths
  completely untouched because no checkout occurs.
- The old `switch main → pull → merge --ff-only → push → switch dev` sequence
  is **superseded** by this technique — do not present both as equally
  valid.

**Two constraints, both mandatory:**

1. **Tag immediately after the `dev:main` push, before any further commit on
   `dev`.** If `dev` has advanced since the push, tag the exact merged
   commit explicitly instead of `dev`'s current tip:
   `git tag <name> $(git rev-parse origin/main)`. Otherwise the tag lands on
   a `dev`-only commit and `validate-manifest.js` rejects the diverged tip
   (the same failure mode Option [c] step 0 already warns about, reached by
   a new route).
2. **`main` must be an ancestor of `dev`.** `git push origin dev:main` is a
   fast-forward push; if a sibling agent advanced `main` independently, the
   server rejects it non-destructively (no partial state, nothing to
   recover). Recovery is `git fetch origin && git merge origin/main` **on
   `dev`** — still no checkout of `main`.

**Tag/pin compatibility.** Every other release step (version bumps, manifest
regeneration, tagging, pinning) is unaffected and still runs from a `dev`
checkout; the only step this technique changes is the `main` merge + push in
step 4/7 of Option [c] above. No step in the release flow requires a real
checkout of `main`.

**Stated limitation.** If branch protection requiring PRs or status checks
is ever enabled on `main`, `git push origin dev:main` will be rejected. Not
enabled today (direct pushes to `main` are the documented flow), but recorded
here so the failure is legible if it ever occurs.

This technique introduces no new hook, script, or working-tree inspection —
it is a documentation change only.

---

### Option [d]: Validar publicación del Manifest

Run `node scripts/manifest/validate-manifest.js` with `$env:GITHUB_TOKEN = (gh auth token).Trim()` and report validation status for both `stable` and `preview` channels.

---

## Core Guidelines for LLM Execution

1. **Never guess git state:** Always run `git status -sb` before reporting or committing.
2. **Deterministic Parity First:** Always run `node scripts/manifest/check-parity.js` before tagging or committing manifest changes to guarantee zero drift.
3. **Always authenticate API calls:** Use `gh auth token` when running `generate-manifest.js` or `validate-manifest.js` to avoid GitHub HTTP 403 rate limits.
4. **Main-CI-green is a Definition of Done:** Before tagging a release or merging `dev → main`, the merge target `main` MUST have a green CI run for the branch being merged (the merged result's CI is the final gate). If CI on `main` is red or has never run for the incoming changes, do not cut tags — fix the failure first.
5. **Monorepo Scope:** Limit all operations to the cogNNitive repository root (`cogNNitive`).