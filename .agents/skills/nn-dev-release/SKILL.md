---
name: nn-dev-release
version: "1.0.0"
description: Internal developer skill for cogNNitive maintainers. Manages git status, branch pulls, automated gate checks, tagging, manifest generation, and release pushes across actioNN, eNNvironment, and iNNfo.
---

# nn-dev-release Skill (Developer Release & Workflow Manager)

## Overview

`nn-dev-release` is an internal maintenance skill for the developers and maintainers of `cogNNitive`. It automates the multi-repository release workflow across:
- **`actioNN`** (`D:\Users\lucas\Documents\GitHub\cogNNitive\actioNN`) - Skills & governance repository
- **`eNNvironment`** (`D:\Users\lucas\Documents\GitHub\cogNNitive\eNNvironment`) - Manifest, site, & deployment repository
- **`iNNfo`** (`D:\Users\lucas\Documents\GitHub\cogNNitive\iNNfo`) - Core engine, spec templates, & MCP package repository

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-release (🛠️)
```

---

## 0. Entry Menu

When activated, present the following interactive menu:

```markdown
🛠️ cogNNitive — Developer Release & Workflow Manager

- [a] (Recomendado) Auditar estado global (Git status, commits pendientes y tags en los 3 repos)
- [b] Sincronizar y verificar gates (Pull main + npm test + typecheck + lint)
- [c] Ejecutar Release completo (Bump de versión + Tags en GitHub + Regenerar Manifest + Push)
- [d] Validar publicación del Manifest (Ejecutar validate-manifest.js con GITHUB_TOKEN)
- [x] Cancelar
```

---

## 1. Protocol execution details

### Option [a]: Auditar estado global

Run an empirical scan across the 3 sub-repositories:

```powershell
$subrepos = @('actioNN', 'eNNvironment', 'iNNfo')
foreach ($r in $subrepos) {
    Set-Location (Join-Path 'D:\Users\lucas\Documents\GitHub\cogNNitive' $r)
    Write-Host "=== REPO: $r ==="
    git status -sb
    git tag --sort=-creatordate | Select-Object -First 3
}
```

Present a consolidated table with:
- Sub-repo name
- Current branch
- Working tree status (Clean / Uncommitted changes)
- Push status (In sync / Ahead / Behind)
- Latest release tag

---

### Option [b]: Sincronizar y verificar gates

1. Perform `git pull origin main` in `actioNN`, `eNNvironment`, and `iNNfo`.
2. In `iNNfo`:
   - Run tests: `npm test`
   - Run typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
   - Run lint: `npm run lint`
3. Report test count and gate results to the developer.

---

### Option [c]: Ejecutar Release completo (Bump de versión + Tags + Manifest + Push)

1. **Ask for Version Bump**:
   Prompt the developer to confirm the version increment for the release (e.g. `innfo suite v0.2.3` / `skills-v1.1.1`).
   *Note:* The `iNNfo` version aligns all packages in the repository monorepo under the same version:
   - Root: `package.json` (`@cognnitive/innfo`)
   - Core: `packages/innfo-core/package.json` (`@cognnitive/innfo-core`)
   - MCP: `packages/innfo-mcp/package.json` (`@cognnitive/innfo-mcp`)
   - Editor UI: `apps/innfo-editor/package.json` (`@cognnitive/innfo-editor` — displayed as `iNNfo Modeler vX.Y.Z`)

2. **Synchronize & Bump Versions in `iNNfo`**:
   - Update `version` to `<A.B.C>` in all 4 `package.json` files:
     - `package.json`
     - `packages/innfo-core/package.json`
     - `packages/innfo-mcp/package.json` (and ensure dependency `@cognnitive/innfo-core` is `^<A.B.C>` or compatible)
     - `apps/innfo-editor/package.json`
   - Commit & push changes in `iNNfo`:
     ```bash
     git add package.json packages/innfo-core/package.json packages/innfo-mcp/package.json apps/innfo-editor/package.json
     git commit -m "chore(release): bump innfo suite to v<A.B.C>"
     git push origin main
     ```

3. **Create & Push Tags**:
   - In `actioNN`:
     ```bash
     git tag skills-v<X.Y.Z>
     git push origin skills-v<X.Y.Z>
     ```
   - In `iNNfo`:
     Tag both the global suite (`v<A.B.C>`) for repo-wide visibility and the MCP ref (`innfo-mcp-v<A.B.C>`):
     ```bash
     git tag v<A.B.C>
     git tag innfo-mcp-v<A.B.C>
     git push origin v<A.B.C>
     git push origin innfo-mcp-v<A.B.C>
     ```

4. **Update Manifest Source**:
   Update `eNNvironment/manifest/source.yaml`:
   - Update `channels.stable.refs` with the new tag names (`skills-v<X.Y.Z>` and `innfo-mcp-v<A.B.C>`).
   - Update `skills[nn-innfo].mcp[innfo-mcp].version` to `<A.B.C>`.

5. **Regenerate & Validate Manifest**:
   In `eNNvironment`, execute with GitHub API authentication:
   ```powershell
   $env:GITHUB_TOKEN = (gh auth token).Trim()
   node scripts/generate-manifest.js --channel stable
   node scripts/generate-manifest.js --channel preview
   node scripts/validate-manifest.js
   ```

6. **Commit & Push Manifest**:
   In `eNNvironment`:
   ```bash
   git add manifest/source.yaml docs/use/manifest.md docs/use/manifest-next.md
   git commit -m "chore(release): update stable manifest pins to skills-v<X.Y.Z> and innfo-mcp-v<A.B.C>"
   git push origin main
   ```

---

### Option [d]: Validar publicación del Manifest

Run `node scripts/validate-manifest.js` with `$env:GITHUB_TOKEN = (gh auth token).Trim()` in `eNNvironment` and report validation status for both `stable` and `preview` channels.

---

## Core Guidelines for LLM Execution

1. **Never guess git state:** Always run `git status -sb` before reporting or committing.
2. **Always authenticate API calls:** Use `gh auth token` when running `generate-manifest.js` or `validate-manifest.js` to avoid GitHub HTTP 403 rate limits.
3. **Strict 3-Repo Scope:** Limit operations exclusively to `D:\Users\lucas\Documents\GitHub\cogNNitive` sub-repositories (`actioNN`, `eNNvironment`, `iNNfo`).
