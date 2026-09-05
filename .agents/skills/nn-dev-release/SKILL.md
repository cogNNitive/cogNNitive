---
name: nn-dev-release
version: "2.0.0"
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

When activated, present the following interactive menu:

```markdown
🛠️ cogNNitive — Developer Release & Workflow Manager

- [a] (Recomendado) Auditar estado del Monorepo (Git status, drift de paridad local y tags recientes)
- [b] Sincronizar y verificar gates (Pull main + verify.js + tests completos)
- [c] Ejecutar Release completo (Bump de versión + Rebuild + Tags en GitHub + Regenerar Manifest + Push)
- [d] Validar publicación del Manifest (Ejecutar validate-manifest.js con GITHUB_TOKEN)
- [x] Cancelar
```

---

## 1. Protocol execution details

### Option [a]: Auditar estado del Monorepo

Run an empirical scan across the monorepo root:

```powershell
Set-Location 'D:\Users\lucas\Documents\GitHub\cogNNitive'
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
```

Present a consolidated summary table with:
- Current branch & push sync status
- Working tree status (Clean / Uncommitted changes)
- Latest release tags for each subsystem
- Parity status between local workspace files and `manifest/source.yaml`

---

### Option [b]: Sincronizar y verificar gates

1. Perform `git pull origin main` in the monorepo root.
2. Run deterministic workspace verification:
   ```powershell
   node scripts/verify.js
   ```
   *(Enforces template inventory, orchestrator line limits < 200 lines, workspace parity, scripts typecheck, and stable manifest validity).*
3. In `iNNfo`:
   - Run typecheck: `npm run typecheck --prefix iNNfo`
   - Run tests: `npm test --prefix iNNfo`
   - Run lint: `npm run lint --prefix iNNfo`
4. Report test count and gate results to the developer.

---

### Option [c]: Ejecutar Release completo (Bump de versión + Tags + Manifest + Push)

1. **Confirm Version Bump Scope**:
   Prompt the developer to select which subsystem is releasing:
   - `iNNfo Suite` (`v<A.B.C>` & `innfo-mcp-v<A.B.C>`)
   - `Skills` (`skills-v<X.Y.Z>`)
   - `Templates` (`templates-v<T.U.V>`)

2. **Synchronize & Bump Versions**:
   - For `iNNfo Suite`:
     - Update `version` to `<A.B.C>` in all 4 `package.json` files:
       - `iNNfo/package.json` (`@cognnitive/innfo`)
       - `iNNfo/packages/innfo-core/package.json` (`@cognnitive/innfo-core`)
       - `iNNfo/packages/innfo-mcp/package.json` (`@cognnitive/innfo-mcp`, ensuring `@cognnitive/innfo-core` dependency is `^<A.B.C>`)
       - `iNNfo/apps/innfo-editor/package.json` (`@cognnitive/innfo-editor`)
     - Rebuild bundles:
       ```powershell
       npm --prefix iNNfo/packages/innfo-core run build
       npm --prefix iNNfo/packages/innfo-mcp run build:bundle
       ```
   - For `Skills`:
     - Bump `version:` in targeted `actioNN/skills/<skill>/SKILL.md`.
   - For `Templates`:
     - Bump `version:` in targeted `iNNfo/specs/templates/<template>.md`.

3. **Update Manifest Source**:
   Update `manifest/source.yaml`:
   - Update component `version:` field.
   - Update `channels.stable.refs` with the new tag names (`skills-v<X.Y.Z>`, `innfo-mcp-v<A.B.C>`, or `templates-v<T.U.V>`).

4. **Verify Local Parity & Commit**:
   ```powershell
   node scripts/manifest/check-parity.js
   git add -A
   git commit -m "chore(release): bump <subsystem> to <version>"
   git push origin main
   ```

5. **Create & Push Git Tags**:
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

### Option [d]: Validar publicación del Manifest

Run `node scripts/manifest/validate-manifest.js` with `$env:GITHUB_TOKEN = (gh auth token).Trim()` and report validation status for both `stable` and `preview` channels.

---

## Core Guidelines for LLM Execution

1. **Never guess git state:** Always run `git status -sb` before reporting or committing.
2. **Deterministic Parity First:** Always run `node scripts/manifest/check-parity.js` before tagging or committing manifest changes to guarantee zero drift.
3. **Always authenticate API calls:** Use `gh auth token` when running `generate-manifest.js` or `validate-manifest.js` to avoid GitHub HTTP 403 rate limits.
4. **Monorepo Scope:** Limit all operations to `D:\Users\lucas\Documents\GitHub\cogNNitive`.