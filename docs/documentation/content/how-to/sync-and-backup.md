# Sync lineage and back up a domaiNN

The lineage record is the map of a domaiNN: a derived document that lists every source, every kNNowledge document, and every artifact. This guide keeps that map honest and shows how to protect a domain before a risky change.

## Keep the lineage record in sync

The lineage record is a `<project>_cogNNitive_NN.md` document. Three of its sections are **projected** from the filesystem on every scan, cognitivize, import, or apply:

- `# NN Sources` — one entry per cognitivized raw file.
- `# NN ModelRecords` — one entry per Level-3 document.
- `# NN Artifacts` — one entry per artifact.

The fourth section, `# NN Procedures`, is an **append-only** journal and is never regenerated.

Regenerate the projection through the MCP:

```text
sync_lineage({ domain: "Aurora" })
```

or through the CLI:

```console
$ node skills/nn-sources/scripts/index.js --lineage --src Aurora
```

`sync_lineage` re-synchronizes the three projected sections without requiring the CLI. Pass `projectName` to override the record's project name (the default is the domain directory's basename).

## The drift gate

The record is derived, so its only failure mode is **drift**: the persisted text disagreeing with a fresh projection. That happens when someone edits a managed section by hand. The gate compares the managed sections byte for byte against a fresh projection:

```console
$ node skills/nn-sources/scripts/index.js --lineage --check --src Aurora
✖ LINEAGE_DRIFT  # NN Sources differs from a fresh projection
```

The same drift is reported as an error named `LINEAGE_DRIFT` in the `lineage` field of the `check_domain` report, and by `node scripts/verify.js` in CI. The `# NN Procedures` journal and hand-authored blocks such as `## NN External Watch Roots` are never compared.

**The fix is always regeneration, never a hand edit:**

```text
sync_lineage({ domain: "Aurora" })
```

> [!NOTE]
> The drift comparison reads the record without line-ending conversion, relying on the domaiNN's `.gitattributes` (`* -text`). Do not remove that line.

## Reconcile the manifest

The domain manifest (`domaiNN_NN.md`) lists its `## NN Knowledge` entries. When documents are added, removed, or renamed outside the normal flow, reconcile it with:

```text
sync_domain_manifest({ domain: "Aurora", dry_run: true })
```

It additively appends new entries, archives entries whose file disappeared, and reactivates tool-owned entries whose file returned. It never touches hand-authored entries that lack the `<!-- nn:auto -->` ownership marker. `dry_run` defaults to `true` — inspect the computed diff, then call again with `dry_run: false` to write.

## Back up a domaiNN

Back up **before** the first mutation of a risky operation, and keep the copy outside the domain tree.

### User-led snapshots

The simplest strategy is a full copy of the domain folder to a backups location on disk, taken before you start. Confirm the copy exists and predates the change. Because a domain is just files, an ordinary file copy is a complete snapshot.

### Out-of-tree migration backups

Before a guided migration or upgrade, use the verified backup script, which writes a timestamped full-tree copy outside the domain with a SHA-256 manifest:

```console
$ node skills/nn-upgrade/scripts/backup-workspace.js --workspace-dir Aurora
```

It defaults to a sibling directory named `<domain>-backup-<timestamp>` and skips `.git`, `node_modules`, `dist`, and `coverage`. Pass `--target <dir>` to choose the destination and `--dry-run` to preview.

### The optional Git layer

Git is an optional review and collaboration layer on top of a domaiNN. It never replaces the record or the changesets. If you use it, commit the domain and treat branches as review gates. See [Collaborate with Git](collaborate-git.md).

> [!NOTE]
> cogNNitive never deletes unilaterally. Superseded write-once family members are only *proposed* for cleanup (`--gc`), and removal happens only with explicit consent. Backups are therefore additive safety, not a substitute for consent.

## See also

- [Validate a domaiNN](validate-domain.md) — the diagnostics that surface drift.
- [Collaborate with Git](collaborate-git.md) — the optional Git review layer.
- [Sources, citations and lineage](../concepts/sources-citations-lineage.md) — the provenance chain behind the record.
