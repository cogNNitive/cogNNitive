# Collaborate with Git

Git is an **optional** review and collaboration layer on top of a domaiNN. It carries branches and pull requests so humans can review changes, but it never replaces the document versions or the changesets. A domaiNN is the system of record; Git is transport.

No cogNNitive skill owns this workflow. If you want it, use Git directly — the domain is ordinary files.

## Private by default

A domaiNN routinely contains drafts, raw sources, and conversation transcripts that must not leak. Treat every new remote as **private**:

- If your host defaults new repositories to public, flip visibility to private **before** the first push.
- Keep credentials out of the tree entirely (`*.env`, `*.token`, `*.pem`, `*.key`, and any `secrets/` folder).
- Ignore scratch output such as `staging/` — it is never citable and never part of the record.

Verify with `git status`: ignored paths must never appear as staged.

## Keep bytes stable with `.gitattributes`

`init_domain` writes a `.gitattributes` containing:

```gitattributes
* -text
```

This is not cosmetic. A source's SHA-256 is its change-detection key, and the lineage drift gate compares the record byte for byte. If Git rewrote line endings on checkout, a hash would move even though the content did not, and the drift gate would fire on a clean machine. `* -text` pins the bytes so hashes and drift survive a checkout on any platform.

> [!NOTE]
> Never remove `* -text` from a domaiNN's `.gitattributes`. If it is missing, `nn-preflight` reports a `text-policy-missing` warning.

## Branch-per-change and PR gates

Give each change its own branch, cut from a clean base:

```bash
git checkout -b <change>/<short-slug>
```

Push only after the domain validates locally, and open a pull request targeting the protected branch. Require the PR to pass the checks you care about before merge:

- **Document validation** — `validate_knowledge` on the touched document.
- **Domain integrity** — `check_domain` over the whole domaiNN, which includes the `LINEAGE_DRIFT` gate.
- **Byte policy** — confirm `.gitattributes` still contains `* -text`.

Protect the main branch and require at least one approval so a change cannot land without review.

## How changesets map onto commits

The changeset workflow and Git are complementary, not competing:

| Layer | Unit | Role |
|---|---|---|
| cogNNitive | changeset under `changes/` | The semantic change: operations, evidence, version bump, audit trail. |
| cogNNitive | `knowledge_version` | The system of record for a document's version. |
| Git | commit / branch / PR | The transport and human review surface. |

A clean mapping is **one changeset per commit**:

1. Propose the change with `propose_changeset`; it lands under `changes/` with `status: proposed`.
2. Review it in the console, then apply it with `apply_change`. The applied changeset, the mutated documents, and the regenerated lineage record change together.
3. Commit exactly those files on a branch. The commit message can name the changeset.

Because the changeset is already the audit record, the commit does not need to restate the reasoning — link to it. And because a document version (`knowledge_version`) is never equal to a commit hash, do not try to derive one from the other; keep the changeset as the source of truth.

## See also

- [Review changesets](review-changesets.md) — the changeset workflow in full.
- [Sync lineage and back up a domaiNN](sync-and-backup.md) — the drift gate and backups.
- [Validate a domaiNN](validate-domain.md) — the checks a PR should run.
