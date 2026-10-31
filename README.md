# cogNNitive

> Semantic Knowledge Architecture and AI Pair-Programming Ecosystem

Welcome to the **cogNNitive** monorepo. cogNNitive turns scattered ideas in human brains and computer files into a **living, structured knowledge base** powered by AI with **zero vendor lock-in** and **radical fine-grained traceability**.

---

## The Knowledge Lifecycle

```
0. External World       ➔ 1. IMPORT             ➔ 2. MANAGE              ➔ 3. EXPORT
[Brains & Files/URLs]     [sources/import/ + sidecars] [kNNowledge/*_NN.md (SSOT)] [artifacts/ Deliverables]
          ▲                                                                           │
          └───────────────────── Human Revision & Feedback Loop ──────────────────────┘
```

1. **External World**: Knowledge originates in human brains (internal & external) and is elicited into digital files/URLs without altering how contributors capture information.
2. **Phase 1 (IMPORT)**: Ingests immutable originals verbatim into `sources/import/` and cognitivizes them in place: a co-located sidecar (`<file>.<ext>_sidecar_NN.md`) records the SHA-256 and origin metadata (plus a normalized Markdown body for binaries), uses scratch `staging/` folders for extraction, and never overwrites anything: a changed import is a new UTC-suffixed file.
3. **Phase 2 (MANAGE)**: Structures knowledge into iNNfo Level 3 models (`kNNowledge/*_NN.md`) with explicit heading-level citations (`sources:: [sources/import/file.md@## Heading]`). Accessible via text editors (Obsidian, VS Code), visual web apps (`iNNfo Modeler`), or AI pair-programming agents (`OpenCode`, `Antigravity`, `Claude Code`).
4. **Phase 3 (EXPORT)**: Generates tailored deliverables (dashboards, Word, PDF) and re-ingests reviewed documents back into the knowledge loop.

---

## Repository Structure

```text
cogNNitive/
├── iNNfo/                # The product's semantic layer
│   ├── packages/         # nn-core (TS semantic engine) & nn-mcp (MCP server) — the npm workspaces
│   └── specs/            # Canonical specs, bluepriNNts and their shipped samples (published, write-once)
├── skills/               # Distributed agent skills (nn-innfo, nn-sources, nn-preflight, ...)
├── docs/                 # Public website (https://cognnitive.com), documentation and agent bootstrap (/use)
├── manifest/             # Source of the generated distribution manifest
├── scripts/              # Build, release, sync and verification tooling (`verify.js` is the gate)
├── test/                 # Root-level tests and everything used as test data
│   ├── fixtures/         # Frozen inputs (console exports, testlab domaiNN)
│   ├── _samples_nn/      # Sample domaiNN: source of truth for every blueprint sample
│   ├── ecosystem_NN/     # Dogfooding domaiNN for the ecosystem itself
│   └── simulation/       # Executable user-journey simulations (diagnostic, not a CI gate)
├── openspec/             # Specs, change history and `backlog_NN.md` (planned work)
├── .agents/ · .claude/   # Maintainer-only skills and git/worktree guard hooks (not distributed)
└── .github/ · .githooks/ # CI, release workflows and the pre-push hook
```

Where to look: product code is under `iNNfo/packages/`, what users install is
under `skills/` and `iNNfo/specs/`, and anything that is not shipped but proves it
works lives under `test/`.

## Public distribution (`cogNNitive-web`)

This monorepo is the **private source of truth**. The public website and the
canonically hosted specifications, bluepriNNts and bundles live in the public
[`cogNNitive/cogNNitive-web`](https://github.com/cogNNitive/cogNNitive-web)
repository, which owns the GitHub Pages deployment for `cognnitive.com`.

- **Generated output only.** `cogNNitive-web` is never hand-edited: CI pushes to
  it one-way from this repo (`scripts/publish-web.mjs`, wired into
  `.github/workflows/ci.yml`), append-only and idempotent.
- **Canonical base URL.** Every spec/template/bundle URL resolves against
  `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/`.
- **Publishing.** `npm run build:docs` builds the site and artifacts; the
  `publish-web` CI job copies the site (`docs/`) plus the distribution surface
  (`skills/**`, `iNNfo/specs/**`, the MCP bundle, `scripts/export-console.mjs`,
  `scripts/console-views.mjs`; the console asset set also includes
  `innfo-ui.css` and `console-payload.generated.cjs` under `iNNfo/specs/`)
  to the public repo. Set `WEB_PUBLISH_TOKEN` (Contents:write on
  `cogNNitive-web`) for a manual publish.

## AI Agent Bootstrap

If you are an AI Agent (Claude Code, Antigravity, OpenCode, Cursor):
- Bootstrap entrypoint: [https://cognnitive.com/use](https://cognnitive.com/use) (served from `docs/use/manifest.md`)
- Semantic kNNowledge entrypoint: `domaiNN_NN.md`

## Development & Philosophy

1. **Zero Vendor Lock-in:** Plain text Markdown files stored in your local Git repository. You own your knowledge forever.
2. **Concepts > Code:** Strict semantic modeling with clear invariants and fine-grained section traceability.
3. **Fail-Fast:** No silent fallbacks. Unmatched schemas and drifted source citations fail deterministically.
4. **Local-First:** Local workspace specifications take precedence over remote references.
5. **On-Demand Dependencies:** Skills declare dependencies declaratively; agent environments install them on-demand without bloating the core repository.

### Pre-push hook

`npm install` at the repo root wires a native `pre-push` hook via
`core.hooksPath` (`.githooks/pre-push`, no husky/lint-staged). It runs
`npm run typecheck`, the docs-facts guard, the ten derived-artifact
freshness guards and eslint on changed files before every `git push` and
blocks the push on a non-zero exit. If a generated file is stale, `npm run regen`
rewrites all of them. Bypass with `git push --no-verify`. Uninstall with
`git config --unset core.hooksPath`.
