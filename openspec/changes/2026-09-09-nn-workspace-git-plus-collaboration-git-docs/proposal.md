# Proposal: nn-workspace-git plus collaboration-git docs

## Intent

Workspaces lack a safe Git story: ad-hoc public repos, `V_x-y-z` confused with Git history, destructive syncs without backup. This adds an explicitly-invoked standalone path keeping iNNfo as SSOT, Git for review only.

## Scope

### In Scope
- New standalone skill `actioNN/skills/nn-workspace-git` (never extends `nn-innfo`).
- Anti-accident gate: explicit `/nn-workspace-git` only, `disable-model-invocation: true`, alpha warning, technicians with prior Git only, double confirmation, abort without git/auth.
- Defaults: private repo, opinionated `.gitignore`, branch-per-change + PR with `validate`/`check_workspace` gate, protected `main` + 1 approval.
- Two-layer map (`V_x-y-z` SSOT vs Git commit) + timestamped filesystem copy outside workspace before deep changes.
- Docs page `docs/innfo/documentation/collaboration-git.md` + Guides sidebar entry; `manifest/source.yaml` registration.

### Out of Scope
- No `nn-innfo`/template changes; no auto-commit/push; no CI changes; no migration.

## Capabilities

### New Capabilities
- `workspace-git-collaboration`: explicit, gated workspace-to-Git workflow (private default, branch-per-change, PR gate, two-layer map, offline backup).

### Modified Capabilities
- `monorepo-release-manifest`: register `nn-workspace-git` in `manifest/source.yaml`.
- `documentation-template`: new Guides `Page` (`collaboration-git.md`) + sidebar.

## Approach

Approach 1 (recommended): standalone skill + Docs page, no `nn-innfo` extension. Skill owns gate, branch/PR, map, backup; Docs owns narrative; manifest owns distribution.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `actioNN/skills/nn-workspace-git/SKILL.md` | New | Gate, branch/PR, map, backup workflow |
| `docs/innfo/documentation/collaboration-git.md` | New | English collaboration guide |
| `docs/innfo/documentation/_sidebar.md` | Modified | Guides entry |
| `docs/innfo/documentation/documentation_NN.md` | Modified | New Page instance |
| `manifest/source.yaml` | Modified | Register skill |
| `actioNN/skills/nn-innfo/SKILL.md` | Untouched | SSOT boundary preserved |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidental push to public repo | Med | Private default + double confirm + abort without auth |
| Confusing `V_x-y-z` with Git commit | Med | Two-layer map section + backup rule |
| Scope creep into `nn-innfo` | Low | Explicit non-goal; standalone skill only |

## Rollback Plan

Delete new skill dir + docs page + sidebar line + manifest entry. No migration; workspaces work without Git.

## Dependencies

- `nn-preflight`, `nn-innfo` (SSOT only); git + auth at runtime.

## Success Criteria

- [ ] Skill invokes only via explicit `/nn-workspace-git`, aborts without git/auth.
- [ ] Private default, opinionated `.gitignore`, branch-per-change + PR gate + protected `main` + 1 approval documented.
- [ ] Two-layer map and timestamped offline copy required before deep changes.
- [ ] English Docs page renders under Guides; `source.yaml` validates.
- [ ] No `nn-innfo` file modified; English Only; conventional commits; dev only.

## Proposal question round

Assumed: alpha technicians-only is fine; no host decision now. Open: (1) canonical host for examples? (2) backup retention? (3) Is 1 approval enough?
