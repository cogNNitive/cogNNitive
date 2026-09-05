---
title: "nn-skills-lifecycle — Skill Ecosystem Lifecycle & Governance"
description: "Install, create, audit, and maintain cogNNitive skills. Single entry point for managing manifest-pinned skills."
html_url: https://cognnitive.com/actionn/documentation/#/skills/nn-skills-lifecycle
generator: https://cognnitive.com/actionn/nn-design-presets
---

# nn-skills-lifecycle

**Skill**: `nn-skills-lifecycle` · **Version**: `V_1-2-0` · **Role**: Skill Lifecycle & Manifest Governance

Single entry point for managing skills tracked in the bootstrap manifest. Manages installation, updates, synchronization, quality audits, and registry generation.

---

## 0. Activation Gate

Executes the canonical activation gate defined in [`nn-preflight`](skills/nn-preflight.md).

---

## 1. Desired State & Installed State Architecture

- **Desired State (Source of Truth)**: The bootstrap manifest at `docs/use/manifest.md` (or fetched from GitHub). Frontmatter declares the canonical list of skills with pinned 40-character commit SHAs.
- **Installed State (Local Record)**: `~/.agents/skills-state.json`, recording `{ commit, version, updated_at }` for each locally installed skill.

---

## 2. Management Commands (`skills-manager.js`)

| Command | Action |
| :--- | :--- |
| `status` | Compares installed vs. pinned commits; prints status table and diff-file count preview. |
| `install` | Installs missing skills from GitHub tarballs into `~/.agents/skills/{name}/`. |
| `update [skill ...]` | Updates outdated skills to their pinned commit. |
| `sync [--direction ...]` | Recursively copies skill files between workspace `skills/` and global directory. |

**Consent is mandatory**: Any mutating command requires user confirmation before altering files.

---

## 3. Release Channels

| Channel | Manifest URL | Pins Resolve To |
| :--- | :--- | :--- |
| **Stable** (default) | `.../main/docs/use/manifest.md` | Release tags on `main` |
| **Preview** | `.../main/docs/use/manifest-next.md` | Feature branch tips |
