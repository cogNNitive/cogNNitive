# Proposal: Dev Process and Tooling Gaps

## Intent

The predecessor change (`2026-09-21-repo-guardrails-hardening`) fixed a repo whose safety
mechanisms were **advisory where they needed to be executable**. It shipped five slices and its
success condition held: every mechanism it touched ended up executable or deleted.

This change is the same defect one level up. The safety net now runs. **The processes and agent
tooling wrapped around that net still depend on someone remembering**, and every finding below is
the identical shape as the five predecessor incidents:

> A mechanism that already exists, is already correct in isolation, and is simply **not wired to
> the moment it is needed** — so its coverage is whatever the operator happened to recall.

Nine findings, all confirmed by inspection. Not one of them is a missing capability:

| # | The mechanism that exists | Where it is not wired |
| :-- | :-- | :-- |
| A1 | `scripts/template-catalog.mjs` | in no npm script at all, while `check-integrity.js:73` names `sync:versions` as the fix |
| A2 | `node scripts/verify.js` (13 guards) | `.githooks/pre-push` runs `npm run typecheck` only |
| A3 | `.gitignore`, guard scripts | pinned to versions and paths that have since moved |
| A4 | four practices that measurably worked this session | unwritten, or written wrong in the skill that owns them |
| B1 | `sdd-archive` phase agent | declares no `Bash`, cannot run the git commands its own job requires |
| B2 | `git-guardrails-claude-code` hook | parses with `jq`, absent on this machine → **fails open, allows everything** |
| B3 | one falsification suite (`.claude/hooks/block-dangerous-git.test.mjs`) | no other skill ships one |
| B4 | `design` catches factual errors in `spec` | the graph runs them in parallel; corrections never reach the spec |
| B5 | engram protocol declared MANDATORY | no engram configured; all nine predecessor phases reported it unavailable |
| B6 | ADR-010 (this repo has no PRs) | orchestrator injected `branch-pr` / `chained-pr` anyway |

### Why this recurs, specifically

Three named causes, each of which predicts more of the same if left alone:

1. **A command's name is a promise its body does not keep.** `sync:versions` claims to sync
   versions; it syncs two of three generated artifacts. The operator who reads the name is
   correct to trust it and still reaches CI red. This is not forgetfulness — it is a false
   interface.
2. **Config that names a version or a path rots silently; config that names a *shape* survives.**
   A pinned rule does not fail loudly when its target moves. It stops matching, and the noise it
   was suppressing reappears as something a human eventually commits.
3. **Agent tooling is configured where this repository cannot see, test, or version it.** Every
   Partition B finding lives under `.claude\`. No CI run in this repo can observe
   a `tools:` line that omits `Bash`, or a security hook that exits 0 because `jq` is missing.

### Success condition

Same bar as the predecessor, tightened: **every mechanism this change touches ends up executable,
corrected, or deleted — and no finding is closed by writing a new document.** The predecessor added
zero dependencies, zero new scripts and zero new documents. This proposal holds that bar for
Partition A and states plainly where Partition B cannot (§Partition B delivery).

---

## Scope partition

### Partition A — in this repository

Versionable, reviewable, CI-observable, covered by `npm run verify`. Ships as ordinary work-unit
commits on `dev`. **A1, A2, A3, A4.**

### Partition B — global agent configuration, outside this repository

`B1`, `B2`, `B3`, `B4`, `B6` live in files under `.claude\`. `B5` is a project-level
wiring decision whose answer may also be global. These carry three constraints that Partition A
does not:

1. **Blast radius is every project on this machine.** A change to `~\.claude\agents\sdd-archive.md`
   or to the orchestrator template affects every repository this user opens, not cogNNitive.
2. **Not versionable here.** These paths are outside the repo. Committing copies of them into
   cogNNitive would create a second source of truth that drifts from the live file — the exact
   defect A3 describes, manufactured deliberately.
3. **Not validatable by this repo's CI.** `npm run verify` cannot observe them. Verification is
   manual falsification only.

#### MANDATORY: every Partition B slice requires explicit user confirmation before apply

**No Partition B slice may be applied by automatic mode without the user confirming that specific
slice first.** This is a hard gate, not a preference. Rationale: these are the user's global agent
configuration files, shared across every project. An automatic SDD run that silently rewrites
`~/.claude/` is precisely the class of unrequested foreign-scope mutation that destroyed 58
uncommitted changes in the predecessor change.

`sdd-tasks` MUST mark every Partition B task `[requires-user-confirmation]`. `sdd-apply` MUST stop
and ask per slice, even under `auto-chain`, and MUST NOT batch Partition B confirmations into one
approval.

#### Recommended delivery and tracking for Partition B

Given the constraints above:

- **Deliver by hand, one file at a time, after per-slice confirmation.** Not as a commit in this
  repo.
- **Track in this repo, do not mirror in this repo.** The OpenSpec change folder records *what was
  decided and why* (this proposal, the design ADRs, the tasks checklist). The file contents stay
  where they live. The tasks checklist is the durable record that a global edit was made, which is
  the only artifact this repo can honestly own.
- **Each Partition B task states its own rollback inline**, because git cannot roll these back.
  For a frontmatter edit that is "remove the added token"; for an uninstalled skill it is the
  original path and content.
- **B2's replacement is already in-repo and versioned** at `.claude/hooks/block-dangerous-git.mjs`
  with a 29-case suite. Partition B's residual work there is *removal* of the broken global skill,
  not authoring anything new.

---

## Ranking — revised, and it overrides the handoff's order

The handoff proposed A1 and B1 as minutes-long, B5 as a user decision, B4 as deepest and most
expensive. Two of those hold. **The handoff's implicit inclusion of A2 as a fix does not survive
the evidence, and B2 is under-ranked.**

| Rank | Finding | Why here |
| :-- | :-- | :-- |
| 1 | **A1** | Confirmed, and *larger* than the handoff described: the hole exists in both `sync:versions` **and** `check:versions`, and the repo's own drift error message points the operator at the incomplete command. Fix is two clauses appended to two existing scripts. Highest ratio in the set. |
| 2 | **B2** | Promoted. A **security control that fails open** while appearing installed, on every project on this machine. Its default list also blocks `git push` (needed here) while permitting `git stash`, `git add -A`, `git commit -a` — the three vectors that actually destroyed and contaminated work in this repo. The replacement already exists and is tested; the residual act is deletion. |
| 3 | **B1** | Confirmed at `~\.claude\agents\sdd-archive.md:8` — `tools: Read, Edit, Write, Glob` plus engram, no `Bash`, no `Grep`. A phase that cannot complete itself unattended. Cheapest real fix in the set once confirmed. |
| 4 | **B5** | A decision the user must make, not a slice to design. Ranked here rather than last because until it is answered, every SDD phase in this repo continues to claim persistence it does not have — false confidence is worse than a known absence. |
| 5 | **A4** | Reframed from "codify what worked" to "**correct what is written wrong**". `nn-dev-development` §4e currently instructs running `node scripts/check-integrity.js` and says it reports catalog staleness. It does not — `check-integrity.js` contains no catalog check at all (verified: zero matches for `catalog`). The catalog guard is `scripts/verify.js:215`. The skill sends the operator to a command that cannot detect the drift it promises. That is a factual error, not a missing convention. |
| 6 | **B6** | One gating condition in the orchestrator template. Cheap, and it already cost a stopped phase this session. |
| 7 | **A3** | An audit, not a fix, and therefore the finding most at risk of unbounded scope. Time-boxed and narrowed below. |
| 8 | **B4** | Deepest and most expensive — the handoff is right. Ranked last by urgency because its workaround (design §9 + hand-carried prompts) demonstrably *worked*, at a cost of repeating the correction three times. Also see the reframing below: the lazy fix is an edge in a graph, not an amendment mechanism. |
| — | **A2** | **Recommended as a non-goal.** See its section — A1 removes its motivating failure, and its own premise was already rejected on measured grounds. |
| — | **B3** | **Cut.** See §Cut from scope. |

---

## Scope by finding

### A1 — `template_version` bumps invalidate three artifacts; two commands cover two of them

**Verified.** Root `package.json:27-28`:

```
"sync:versions":  "node scripts/sync-template-versions.mjs && node scripts/manifest/generate-manifest.js --channel stable",
"check:versions": "node scripts/sync-template-versions.mjs --check && node scripts/manifest/generate-manifest.js --channel stable --check",
```

`scripts/template-catalog.mjs` appears in **neither**, nor in any other npm script. Its freshness
guard is blocking at `scripts/verify.js:215` (`node scripts/template-catalog.mjs --check`, step 7,
"Check Template Catalog Fresh"). The script already supports `--check` (`template-catalog.mjs:23`).

Two aggravations the handoff did not record:

1. **The gap is symmetric.** `check:versions` — the command whose entire purpose is detecting this
   drift — is equally blind to it.
2. **The repo actively misdirects.** `scripts/check-integrity.js:73` prints
   `Template version drift detected. Run \`npm run sync:versions\` to regenerate the copies.` An
   operator who obeys that message still has a stale `catalog.json` and still reaches CI red.

**In scope**
- Append `&& node scripts/template-catalog.mjs` to `sync:versions`.
- Append `&& node scripts/template-catalog.mjs --check` to `check:versions`.

**Approach (ponytail).** Rung 2: the script exists, the `--check` flag exists, the npm scripts
exist. Two clauses. No new script, no new npm entry, no new document, no dependency. Deliberately
*not* a third script named `sync:catalog` — that would add a fourth command an operator must
remember, which is the disease.

**Non-goals**
- A new npm script of any kind.
- Auditing every other generated artifact in the repo for the same class. If a fourth generated
  artifact exists, A3's audit is where it surfaces, not here.
- Changing `verify.js`, `check-integrity.js` logic, or the catalog format.
- Making `check-integrity.js` run the catalog check. `verify.js` already does, and duplicating a
  guard across two entry points is how the three-defenses problem in the predecessor's F4 started.

### A2 — the pre-push hook's coverage: recommended NON-GOAL

**Verified.** `.githooks/pre-push:16` runs `npm run typecheck` and nothing else. Stale
`catalog.json` is caught by `node scripts/verify.js`, which the hook never invokes. The handoff's
framing is factually right.

**The recommendation is nonetheless: change nothing, and this is the ponytail rung-1 answer.**

1. **A1 removes the motivating failure.** The incident occurred because an operator ran the command
   named `sync:versions` and got an incomplete sync. Once `sync:versions` is complete, the
   documented path produces a fresh catalog and there is no stale artifact for a hook to catch.
   Fixing the false interface is the root cause; widening the hook is the symptom patch — and
   `ponytail` is explicit that the lazy fix *is* the root-cause fix.
2. **The hook's budget was already set on measured grounds, and `verify.js` is above it.** ADR-001
   measured `npm run typecheck` at 25s and rejected `npm run verify` at >2min, on the reasoning that
   a multi-minute hook converts `--no-verify` from an escape hatch into a habit, which disarms every
   future hook. `node scripts/verify.js` runs 13 guards **plus** the discovered test suites, so it
   is strictly slower than `npm run verify`. Widening the hook to `verify.js` would therefore
   violate the predecessor's own measured decision — and a habitual `--no-verify` would cost more
   than the failure being prevented.
3. **The cost is unmeasured and `sdd-design` cannot measure it.** See §Open decisions #1. If the
   measurement contradicts (2), this recommendation is reopened, not defended.

**In scope if and only if the measurement contradicts the above:** the seam choice, decided by
`sdd-design`. Not decided here.

**Non-goals**
- Adding individual guards to the hook one at a time (`template-catalog --check`, then the next
  one). That is whack-a-mole with the hook as the scoreboard, and it grows without bound.
- A `pre-commit` hook. Already a predecessor non-goal, unchanged.
- Any `--no-verify` detection. ADR-003, unchanged.

### A3 — pinned config rots; shape-described config survives

**Verified as a class, not an anecdote.** `.gitignore` carried two dead rules aimed at the same
phenomenon — one pinned to the `_NN/` workspace directory that no longer exists (zero tracked
files), one pinned to the exact spec version `iNNfo_V_0-2-0`, plus a root-anchored `/specs/`. The
resolver writes its cache relative to the open workspace, now `workspace_NN/`, so every rename or
version bump silently resurfaced the cache as untracked noise. Fixed this session in `52572ff` by
rewriting it version-agnostic. `SHIPPED_TEMPLATE_VERSIONS` in `samples.ts` is the same class and
recurred five times in one week.

**In scope — deliberately narrow.**
- A **time-boxed** pass over `.gitignore` and the guard scripts, applying one criterion: *does this
  rule name a version, a version-bearing directory, or an absolute path that a rename would
  invalidate?* Rewrite only the hits.

**Approach (ponytail).** This is the finding most likely to metastasise into an
audit-everything-forever slice. Two hard boundaries:

- **Evidence-gated.** A rule is rewritten only if a version bump or rename *has* moved its target
  or *provably will* (the version string is in the rule). A rule that merely looks fragile is left
  alone — speculative hardening is YAGNI.
- **No new lint.** A script that detects version-pinned `.gitignore` rules is a new script guarding
  a file that changes a few times a year. Rejected outright.

**Non-goals**
- A guard, lint, test, or CI step enforcing the shape criterion. That is a new mechanism, which the
  success condition forbids, and it would be a false-positive farm (a legitimately version-pinned
  rule exists: the immutability guards).
- Auditing `manifest/source.yaml` pins. Those are *intentionally* version-pinned; that is the
  stable channel's contract, not rot.
- Re-auditing `.gitignore`'s already-fixed rules from `52572ff`.
- Rewriting `SHIPPED_TEMPLATE_VERSIONS`. Its recurrence is A1's problem (it is one of the three
  generated artifacts) and A1 closes it.

### A4 — correct the procedures that are written *wrong*, do not author new ones

**Reframed on evidence.** The handoff asks to codify four practices that worked. Investigation
found that the skill which owns two of them documents them **incorrectly**:

`nn-dev-development` §4e step 1 instructs: *"Run `node scripts/check-integrity.js`. If
`template-catalog` reports `catalog.json` is stale, run `node scripts/template-catalog.mjs`."*
**`check-integrity.js` contains no catalog check** — zero matches for `catalog` in the entire file.
The catalog guard lives at `scripts/verify.js:215`. The documented pre-push integrity gate cannot
detect the drift it claims to detect. An operator following the skill exactly is still exposed to
the A1 failure.

So A4 splits:

**In scope — corrections to existing text (factual errors, not conventions).**
- `nn-dev-development` §4e step 1: name the command that actually runs the catalog guard.
- The `origin/main` staleness rule: after a server-side `git push origin dev:main`, the **local**
  `main` ref stays stale. `git diff main..dev` produced a false risk report this session (100 files
  and a template path) where `origin/main..origin/dev` was the truth (22 files, no template).
  §4b already uses the `origin/` form correctly; the *rule* — always compare `origin/` refs, never
  local `main` — is the part that is missing and is one line.
- The decisive pre-merge template check, as a command:
  `git diff --name-only origin/main..origin/dev | grep '^iNNfo/specs/templates/'`. Verified in code
  that only those paths can trip the pin/main byte-coherence trap:
  `checkTemplateMainCoherence` is called from exactly one site,
  `scripts/manifest/lib/manifest-rules.js:461`, inside `validateTemplate`; skills route through
  `validateSkill`, which does not byte-compare.
- `git worktree add --detach <tmp> <sha>` as the rehearsal technique, replacing any `git stash` of
  the shared tree. §3a and §6c currently document stash-based flows; §1e/§6 already forbid blanket
  stashes, so this is a consistency correction, not an addition.

**Non-goals — the prose half, explicitly cut.**
- "Forbid destructive commands by name, not by principle" as a *written convention*. The practice
  is real and measured (zero foreign-path touches across three subsequent agent runs, verified
  seven times in the final batch), but its executable form already shipped: it is
  `.claude/hooks/block-dangerous-git.mjs`, which blocks by name. Writing the principle down a
  second time is the advisory restatement this change exists to refuse. The residual is B2:
  make sure the *working* hook is the one installed.
- "Falsify, do not assert" as a convention. See B3 — cut.
- "Run `node scripts/verify.js` locally before pushing" as a convention. Either the hook runs it
  (A2, recommended against) or an operator remembers it. A sentence is the third option and it is
  the one that has never worked. If A2's measurement reopens the hook, this closes executably; if
  not, it stays an unwritten habit and that is the honest state.

### B1 — `sdd-archive` cannot complete its own phase

**Verified.** `~\.claude\agents\sdd-archive.md:8`:
`tools: Read, Edit, Write, Glob, mcp__...mem_search, mcp__...mem_get_observation, mcp__...mem_save`.
No `Bash`, no `Grep`. Its stated job includes moving the change folder into `archive/` and
committing. In the predecessor change it wrote the content and handed the git commands back to the
orchestrator; that worked only because a human-facing orchestrator was present. Unattended, the
phase stalls.

**In scope**
- Reconcile the declared tool list with the declared job. One frontmatter line.

**Open, for design:** add `Bash` (and `Grep`), or narrow the phase's stated job to
"write the archive report and hand the git operations to the orchestrator" and make that the
contract rather than a workaround. Both are one-line edits; they are not equivalent. §Open
decisions #3.

**Requires explicit user confirmation before apply. Global file.**

**Non-goals**
- Auditing every other phase agent's tool list. Only `sdd-archive` has a demonstrated failure. If
  the design chooses the "narrow the job" option, the other phases are untouched by construction.
- Adding `Write` or `Edit` anywhere, or broadening any other agent's permissions.

### B2 — a security hook that installs cleanly, looks active, and allows everything

**Verified.** `~\.claude\skills\git-guardrails-claude-code\scripts\block-dangerous-git.sh:4`:

```sh
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
```

`jq` is not installed on this machine. Without it `COMMAND` is empty, no pattern in
`DANGEROUS_PATTERNS` matches, and the script reaches `exit 0` (line 25) — **allow**. It fails open.
Its default pattern list also blocks `git push` (needed here, and already covered by this repo's own
pre-push hook) while **not** blocking `git stash`, `git add -A`, or `git commit -a`, which are the
exact vectors that destroyed and contaminated work in this repo.

The replacement already exists, in-repo and versioned: `.claude/hooks/block-dangerous-git.mjs`
with `.claude/hooks/block-dangerous-git.test.mjs` (29 cases), written in Node, which this repo
already requires.

**In scope**
- Ensure the global broken skill is no longer the installed/active hook: uninstall it, or neutralise
  its hook registration. **Deletion over addition** — nothing is authored.

**Requires explicit user confirmation before apply. Global file, and it is a security control —
removing the wrong one leaves a real gap.**

**Non-goals**
- Fixing `block-dangerous-git.sh` (installing `jq`, or rewriting its parser). It is a third-party
  skill; the working replacement is already shipped. Repairing the broken copy produces two
  mechanisms for one outcome and a question about which one you are on.
- Publishing, distributing, or generalising the in-repo replacement into a skill. Not asked for, and
  it would make a repo-local file a global dependency.
- Broadening the in-repo hook's pattern list. It has a suite; changes to it are a separate,
  evidence-driven exercise.

### B3 — CUT (see §Cut from scope)

### B4 — `spec` and `design` run in parallel, and `design` is the one that finds the facts

**Verified by the predecessor's own record.** `design` found two factual errors in already-written
specs, both real:

- The `normalize-frontmatter-level` delta spec instructed deleting the string comparisons at
  `skills/nn-preflight/scripts/preflight-check.js:546-547`. That would have silently broken
  preflight's Level-1 skip: the file parses with `lib/yaml-lite`, whose `parseScalar` never coerces,
  so the STRING branches are live and the numeric halves were the dead code. (ADR-007.)
- The `untrack-skill-registry` spec claimed a `.gitignore` edit was needed; `.atl/` was already
  present at line 62. (ADR-008.)

**The specs stayed wrong on disk.** The correction lived only in `design.md` §9 and in the
orchestrator's hand-written prompts, and `sdd-tasks` had to repeat it inline so `sdd-apply` would
not reintroduce the regression. The archive report then had to record the amendments a third time.
There is no amendment mechanism.

**Reframing, which changes the cost estimate.** The handoff calls this the deepest and most
expensive finding. It is the deepest. It need not be the most expensive, because the lazy fix is
**an edge in a dependency graph, not a new artifact section**:

- Option 1 — **sequence `spec` after `design`.** One edge change in the orchestrator's dependency
  graph. Zero new machinery. Cost: loses the parallelism, so planning is one phase slower.
- Option 2 — **let `design` rewrite the specs it falsifies.** No new artifact, but it grants a
  phase write access to another phase's output, and two phases then own one file.
- Option 3 — **an explicit amendment block in the spec template.** A new artifact section that must
  be authored, read, and honoured by three downstream phases. This is the expensive option and the
  only one that adds a mechanism.

This proposal does **not** choose. It records that option 1 is a single edge and option 3 is a new
mechanism, and that `ponytail` biases hard toward the former unless design finds parallelism is
load-bearing. §Open decisions #4.

**Requires explicit user confirmation before apply. Global orchestrator/agent configuration.**

**Non-goals**
- A spec-validation tool, linter, or cross-artifact consistency checker. That is custom code
  guarding an artifact a human reads minutes later.
- Restructuring any other edge in the SDD graph.
- Retroactively correcting the archived predecessor specs. They were merged into living specs with
  the corrections already applied (archive report, Design Corrections).

### B5 — engram is mandated and inert: a decision, not a slice

**Verified by the predecessor's record:** all nine delegated phases reported `mem_save`
unavailable. There is no engram MCP configuration for this project. The global `CLAUDE.md` declares
engram saves MANDATORY and prescribes a session-close `mem_session_summary`.

**The effect is worse than absence.** An absent mechanism is a known gap. A mandated-but-inert one
manufactures false confidence that cross-session context is being persisted while nothing is
written — and the memory entries in `MEMORY.md` that *do* exist make that confidence plausible.

**This proposal does not choose.** It is the user's call, and it has exactly two honest answers:

1. **Wire engram for this project** — then the mandate is true, and `openspec` stays the artifact
   store with engram as recovery.
2. **Stop mandating it here** — amend the instruction so phases do not claim a persistence they do
   not perform, and `openspec` is the sole store.

What this proposal refuses is answer 3: leave it mandated and inert. That is the failure class.

**Blocks nothing in Partition A.** `openspec` is the configured store for this change and works.

**Requires explicit user confirmation before apply, and additionally requires a user *decision*
before design can proceed on it.** §Open decisions #2.

**Non-goals**
- Installing, configuring, or hosting an engram instance as part of this change. If answer 1 is
  chosen, that is its own work, not a slice here.
- Migrating the predecessor change's artifacts into engram.
- Building a fallback persistence layer. `openspec` is the fallback and it is already in use.

### B6 — skill injection contradicted the repo's own design

**Verified by the predecessor's record.** The orchestrator injected `branch-pr` and `chained-pr`
into the first `sdd-apply` because `delivery_strategy` was `auto-chain`, while ADR-010 states this
repo has no per-change PRs (`nn-dev-development` §4e: single-branch working "replaces the old
commit + push + PR flow"). The executing agent correctly followed the design over the instruction
and stopped to ask — a phase spent on a contradiction.

**In scope**
- Gate PR-skill injection on the repository's actual delivery model rather than on a cached
  strategy label. One condition in the orchestrator template.

**Approach (ponytail).** The lazy form is not a new detection routine. `auto-chain` already means
two different things in two repos; the cheapest correction is to make the *chain vocabulary*
resolve against the repo's documented workflow — which this repo states in one place
(`nn-dev-development` §4e) and which ADR-010 already restated. Design decides whether that is a
condition on an existing cached value or an explicit third setting.

**Requires explicit user confirmation before apply. Global orchestrator configuration.**

**Non-goals**
- Auto-detecting a repo's delivery model by inspecting git history or GitHub settings. Custom
  code, and the repo already says so in prose an agent reads at session start.
- Changing `delivery_strategy` / `chain_strategy` semantics for repos that do use PRs.
- Removing `branch-pr` or `chained-pr` from the registry.

---

## Delivery: chained work-unit commits on `dev` — no PRs

This repo has **no per-change pull-request workflow** (ADR-010; `single-dev-branch-workflow.md`;
`nn-dev-development` §4e). `auto-chain` here means a chain of independently-revertible work-unit
commits on `dev`, batched to `main` later by `git push origin dev:main`. No feature branches, no
PRs, no `branch-pr` / `chained-pr` skills. Inventing branches to satisfy chain vocabulary would
reproduce B6 inside the change that fixes B6.

### Partition A slices — commits on `dev`

| # | Slice | Files | Est. |
| :-- | :-- | :-- | :-- |
| A-1 | `sync-versions-covers-catalog` (A1) | root `package.json` (2 lines) | ~2 lines |
| A-2 | `correct-stale-dev-procedures` (A4 residue) | `.agents/skills/nn-dev-development/SKILL.md` (§4b, §4e), possibly `nn-dev-release` | ~10 lines |
| A-3 | `version-agnostic-ignore-rules` (A3, time-boxed) | `.gitignore` and any guard script the audit implicates | unknown; cap at ~20 lines |

**Dependency order: none.** The file sets are pairwise disjoint. Landing order is value order:
A-1 first (highest ratio, and it is the precondition for A-2's corrected text being *useful*),
then A-2, then A-3. Any slice may ship, stall, or revert alone.

One soft sequencing preference: **A-1 before A-2.** A-2 documents which command detects catalog
drift; A-1 changes the answer. Landing A-2 first would document the pre-A-1 state.

### Partition B slices — hand-applied, one confirmation each

| # | Slice | File | Gate |
| :-- | :-- | :-- | :-- |
| B-1 | `archive-agent-tool-parity` (B1) | `~\.claude\agents\sdd-archive.md` | **confirm** |
| B-2 | `remove-failing-open-git-guardrail` (B2) | `~\.claude\skills\git-guardrails-claude-code\` | **confirm** |
| B-3 | `spec-design-ordering` (B4) | orchestrator template / SDD graph config | **confirm** |
| B-4 | `pr-skill-injection-gate` (B6) | orchestrator template | **confirm** |
| B-5 | `engram-mandate-reconciliation` (B5) | depends on the user's answer | **decision, then confirm** |

Each is independent. None blocks a Partition A slice. Applying zero Partition B slices leaves
Partition A complete and green.

### Changed-line budget

Partition A totals well under 100 changed lines. No `size:exception` is needed. Partition B lines
are outside the repo and outside any diff budget by construction.

### Verification (Strict TDD Mode; runner `npm run verify`)

**No slice in this change contains testable logic.** Stating that is more useful than
manufacturing tautology tests that assert a config file contains the text just written into it —
the predecessor's design §6 established this position and it applies verbatim here.

| Slice | Falsification |
| :-- | :-- |
| A-1 | Delete/stale `iNNfo/specs/templates/catalog.json`, run `npm run check:versions` → must fail naming the catalog; run `npm run sync:versions` → catalog regenerated; `node scripts/verify.js` green. The **failing** case is the one that matters: it is the only proof the clause is wired and non-vacuous. |
| A-2 | Execute each corrected command as written and confirm it does what the text now claims — specifically that the named command detects catalog staleness, and that the `origin/` diff form is the one that reports truth. |
| A-3 | For each rewritten rule: reproduce the rename or version bump that defeated the old rule and confirm the new rule still matches. A rewrite with no reproducible defeat case is out of scope by the evidence gate. |
| B-1..B-5 | Manual, per slice, recorded in `tasks.md`. B-1: run an archive phase unattended and confirm it completes. B-2: confirm the working hook is active and the broken one is not, by attempting a named destructive command. B-3/B-4: run one planning cycle and confirm the contradiction does not recur. |

---

## Cut from scope (ponytail)

Listing these is the point: an unlisted simplification is an argument waiting to be relitigated.

| Cut | Why |
| :-- | :-- |
| **B3 — a falsification-test requirement for skills** | This is a *convention with no enforcement* — precisely the advisory class this change exists to be intolerant of. The one skill where it mattered already has its suite in-repo (`.claude/hooks/block-dangerous-git.test.mjs`, 29 cases, which caught both the trailing-semicolon false negative and the template-string `\s` collapse). Writing "skills should ship falsification tests" into a document would be the sixth restatement pattern the predecessor's F5 identified. If a second skill needs a suite, write the suite, not the rule. |
| A new npm script for the catalog (`sync:catalog`) | Adds a fourth command an operator must remember. The disease is commands whose coverage you must recall; the cure is not another command. |
| A lint/guard detecting version-pinned `.gitignore` rules | New script, guarding a file that changes a few times a year, and a false-positive farm (immutability guards are legitimately version-pinned). |
| Widening `.githooks/pre-push` to `node scripts/verify.js` | Violates ADR-001's measured friction budget; A1 removes the motivating failure. Reopened only if §Open decisions #1's measurement contradicts this. |
| Adding individual guards to the hook one at a time | Unbounded growth with the hook as scoreboard. |
| A `pre-commit` hook; any `--no-verify` policing | Predecessor non-goals, unchanged (ADR-003). |
| Writing "forbid destructive commands by name" down as a convention | Its executable form already shipped as `.claude/hooks/block-dangerous-git.mjs`. The residual is B2 (install the working one), not prose. |
| Writing "falsify, do not assert" down as a convention | Same reason. B3, cut. |
| Writing "run `verify.js` before pushing" down as a convention | The third option after "hook runs it" and "operator remembers" — and the only one that has never worked. |
| Fixing `block-dangerous-git.sh` (install `jq`, rewrite its parser) | Third-party skill; a working replacement exists. Two mechanisms for one outcome, plus a question about which one you are on. |
| Publishing the in-repo hook as a distributable skill | Not asked for; would make a repo-local file a global dependency. |
| Auditing every phase agent's tool list | Only `sdd-archive` has a demonstrated failure. |
| A spec-validation / cross-artifact consistency tool for B4 | Custom code guarding an artifact a human reads minutes later. Option 1 is one graph edge. |
| Installing or hosting engram as part of this change | B5 is a decision; if the answer is "wire it", that is separate work. |
| Auto-detecting a repo's delivery model from git/GitHub | The repo already states it in prose an agent reads at session start. |
| Mirroring Partition B file contents into this repo | Creates a second source of truth that drifts from the live file — A3's defect, built deliberately. |
| Auditing `manifest/source.yaml` pins under A3's criterion | Those pins are the stable channel's contract, not rot. |
| Feature branches or PRs for any slice | ADR-010. Doing so would reproduce B6 inside the fix for B6. |

**Bar check against the predecessor (zero dependencies, zero new scripts, zero new documents):**
Partition A meets it — **zero** new dependencies, **zero** new scripts, **zero** new documents; two
package.json clauses, corrections to existing skill text, and rewrites of existing `.gitignore`
rules. Partition B authors nothing and *deletes* one mechanism (B2). Every finding that would have
required a new document is in the cut table.

---

## Open decisions for `sdd-design` (do not silently choose)

1. **A2 — does the pre-push hook change at all, and what is `node scripts/verify.js` worth in
   seconds?** This proposal recommends **no change**, on two grounds: A1 removes the motivating
   failure, and ADR-001's measured budget (25s accepted, >2min rejected) already excludes a command
   strictly slower than `npm run verify`. **`sdd-design` cannot obtain this number — it has no Bash
   tool.** The orchestrator must measure `node scripts/verify.js` on a clean tree and supply the
   figure to design. Do not guess it, and do not accept the recommendation without it. If the
   measurement is surprisingly low, the recommendation is reopened, not defended.
2. **B5 — wire engram for this project, or stop mandating it here?** A **user decision**, not a
   design decision. Design must not pick. Surface both options with their consequences and stop.
   The one answer this change refuses is "leave it mandated and inert".
3. **B1 — add `Bash`/`Grep` to `sdd-archive`, or narrow its stated job?** Both are one frontmatter
   line and they are not equivalent. Adding `Bash` makes the phase self-sufficient and unattended-safe
   but widens a phase agent's permissions. Narrowing the job makes the orchestrator hand-off the
   contract instead of a workaround, and keeps the tool list minimal — but then unattended mode needs
   the orchestrator present anyway, which may just relocate the stall. Decide, and say which failure
   mode you are accepting.
4. **B4 — sequence, delegate, or amend?** Option 1 (`spec` after `design`) is one graph edge and no
   new mechanism. Option 2 (`design` rewrites specs) gives two phases one file. Option 3 (amendment
   block) is a new artifact section three phases must honour. Establish whether the `spec`/`design`
   parallelism is actually load-bearing — if planning latency is not a constraint, option 1 wins on
   the evidence and options 2 and 3 are unjustified.
5. **A3 — what is the time box, and what is the evidence gate exactly?** "Rules whose target has
   provably moved" versus "rules that name a version string". The second is broader and catches the
   next failure earlier; the first is strictly evidence-driven. Name the criterion before the audit,
   or the audit has no stopping condition.
6. **A4 — does the `nn-dev-release` skill carry the same catalog error as `nn-dev-development` §4e?**
   Only `nn-dev-development` was verified. Check `nn-dev-release` before deciding whether A-2 touches
   one file or two.
7. **B6 — a condition on the cached `delivery_strategy`, or an explicit repo-delivery-model
   setting?** The first is cheaper; the second is legible to a future reader who wonders why
   `auto-chain` behaved differently in two repos.

---

## Risks

| Risk | Severity | Mitigation |
| :-- | :-- | :-- |
| A Partition B slice is applied by automatic mode without confirmation, mutating global config for every project | **High** | The mandatory per-slice confirmation gate above. `sdd-tasks` marks each `[requires-user-confirmation]`; `sdd-apply` must stop per slice, not batch. |
| B2's removal leaves a real security gap if the in-repo replacement is not actually the active hook | **High** | B2's falsification is *attempting a named destructive command and observing the block* — not reading configuration. Verify the working hook is active **before** removing the broken one, not after. |
| A2's recommendation (no change) is accepted without the measurement, and the pre-push gate stays blind to a class it could cheaply catch | Medium | Open decision #1 makes the measurement a precondition and names the orchestrator as the only party that can take it. |
| A3's audit expands without a stopping condition | Medium | Evidence gate plus time box (open decision #5). No new lint, by non-goal. |
| A1 ships and the catalog check slows `sync:versions` enough that operators skip it | Low | `template-catalog.mjs --check` is a local tree render, no network. If it proves slow, that is a measurement for design, not a reason to leave the command lying. |
| B4's fix is taken as option 3 (amendment block) because it feels more thorough, adding a mechanism three phases must honour | Medium | Ranked and reframed explicitly: option 1 is one graph edge. Option 3 requires justifying that parallelism is load-bearing. |
| B5 is deferred indefinitely, so phases keep claiming persistence they do not perform | Medium | It is a user decision with two acceptable answers and one refused answer. Surfaced, not designed around. |
| This change is read as having "solved" agent-tooling reliability | Medium | It does not. Partition B is hand-applied, un-versioned, and un-CI-able by construction. That constraint is stated, not mitigated. |
| Partition A and Partition B drift: the tasks checklist says a global edit was made, the live file no longer matches | Low-Medium | Accepted and stated. No mirroring, by non-goal — a mirror would drift too, and silently. |

## Rollback

**Partition A** — each slice reverts independently: revert the two `package.json` clauses; revert
the skill text; revert the `.gitignore` rewrites. No data migration, no build-artifact change,
nothing irreversible.

**Partition B** — git cannot roll these back. Each Partition B task must record its own inline
rollback (the removed token, the original file path and content) at the moment it is applied. This
is a task-level requirement, not a proposal-level one, and `sdd-tasks` must carry it.

## Success criteria

- [ ] `npm run sync:versions` regenerates all **three** artifacts a `template_version` bump
      invalidates; `npm run check:versions` detects staleness in all three.
- [ ] A stale `iNNfo/specs/templates/catalog.json` cannot survive the command the repo's own error
      message tells an operator to run.
- [ ] Every command named in `nn-dev-development` §4e does what the text claims it does, verified by
      execution.
- [ ] No `.gitignore` rule rewritten by this change names a version string or a version-bearing
      directory.
- [ ] `sdd-archive` completes its stated job unattended, or its stated job matches its declared
      tools.
- [ ] A named destructive git command is observed being blocked, and the hook doing the blocking is
      the tested one.
- [ ] The engram mandate and the engram reality agree, in whichever direction the user chooses.
- [ ] **Zero** new dependencies, **zero** new scripts, **zero** new documents in Partition A.
- [ ] **Zero** Partition B slices applied without an explicit, per-slice user confirmation recorded
      in `tasks.md`.
- [ ] No finding in this change is closed by writing a new advisory document.
