# Domain Backup Strategies & Safety Model

## Overview

In the cogNNitive ecosystem, domaiNNs consist of plain-text Markdown kNNowledge documents (`kNNowledge/*_NN.md`), cognitivized sources, procedures, and specifications. Protecting user data against accidental corruption or breaking migrations is handled through a layered approach:

1. **User-Led Domain Snapshots** (Primary baseline)
2. **Automated Migration Out-of-Tree Backups** (`backup-workspace.js`)
3. **Optional Git Collaboration Layer** (`/nn-domain-git` for technicians)

---

## 1. User-Led Session Backup Protocol

The recommended and simplest safety practice is for the user to make a local copy of their domaiNN folder before initiating a major modeling or transformation session:

```text
C:\Projects\
├── my-domain\                 <-- Active domaiNN
└── my-domain-backup-2026-09\   <-- Manual snapshot
```

### Why this is the baseline
- **Zero tooling dependency**: Works across all platforms, editors, and operating systems without running scripts or installing tools.
- **Context efficiency**: Instructing the user once at the start of a session removes the need for repetitive and verbose manual backup instructions (`xcopy`, command lines) inside individual agent skills.

---

## 2. Automated Migration Backup (`backup-workspace.js`)

For automated, potentially breaking schema migrations (such as upgrading kNNowledge documents between blueprint versions with `nn-upgrade`), cogNNitive provides an out-of-tree backup script:

- **Location**: `skills/nn-upgrade/scripts/backup-workspace.js`
- **Execution**: `node backup-workspace.js --workspace-dir <dir>`

### Scope & Behavior
- Performs a **full-tree recursive copy** of the entire domaiNN into a timestamped directory **outside** the domaiNN.
- Excludes only the noise and generated directories: `.git`, `.staging`, `backups`, `archive`, `node_modules`, `dist`, and `coverage`.
- Writes a `manifest.sha256` file listing the SHA-256 of every copied file, sorted by path.
- Target directory defaults to a timestamped sibling (e.g. `<domaiNN-dir>-backup-YYYY-MM-DD_HHMMSS`); the target must be outside the domaiNN root (`isInside(target, ws)` check).
- **"Never Half-Migrate" Guarantee**: If kNNowledge validation fails during an automated blueprint upgrade, `nn-upgrade` programmatically rolls back the domaiNN from this backup without requiring human intervention.

> [!WARNING]
> **Sandbox Boundary Note**: The automated backup script explicitly requires writing outside the domaiNN root (`isInside(target, ws)` check). In restricted execution environments or sandboxed AI agents confined strictly to the domaiNN directory, out-of-tree write operations require appropriate host filesystem permissions.

---

## 3. Optional Git Review Layer (`nn-domain-git`)

For technicians and engineering teams, the `/nn-domain-git` skill provides a gated review workflow:

- **SSOT Boundary**: iNNfo kNNowledge documents remain the single source of truth; Git serves solely as a review and branch/PR gating mechanism.
- **Gated PRs**: Pull requests must pass `nn-mcp` `validate_knowledge` and `check_domain` before merging.
- **Offline Backup Fallback**: Step 3d in `nn-domain-git` triggers an out-of-tree backup before deep modifications.

---

## 4. User Domain vs Maintainer Infrastructure

To avoid architectural confusion, cogNNitive maintains a strict separation between user domaiNN tools and monorepo maintainer infrastructure:

| Mechanism | Target Audience | Scope |
| :--- | :--- | :--- |
| **Manual Folder Copy** | End Users & AI Sessions | Entire domaiNN snapshot prior to major edits |
| **`backup-workspace.js`** | End Users / `nn-upgrade` | Automated recovery during blueprint upgrades |
| **`nn-domain-git`** | Technicians (Alpha) | Branch & PR review workflows |
| **Engram Persistent Memory** | Maintainer AI Agents | Internal session memory within the `cogNNitive` repo |
| **Git Restore Points & Checkpoints** | Maintainer AI Agents | Monorepo branch hygiene (`nn-dev-development`) |
