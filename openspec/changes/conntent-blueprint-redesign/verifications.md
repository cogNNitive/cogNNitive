# Open Verifications (Phase V)

One section per verification: command, observed result, decision. Results gate later
PRs (V.1/V.2 gate 4a, V.3 gates 3b-3, V.4 gates 3b-4, V.5 gates 2e). A failing
verification triggers the fallback and marks the affected tasks (`V1-fallback`,
`V2-fallback`, `V3-fallback`, `V5-fallback`).

## V.1 — FSA on `file://` (gates D-C2, tasks 4a.5–4a.8)

- **Command:** scratch `scratch-fsa.html` opened as `file://` in Chrome and Edge;
  `showDirectoryPicker`, store handle in IndexedDB, reload,
  `queryPermission`/`requestPermission`.
- **Observed:** NOT EXECUTED — this requires an interactive native directory-picker
  and a real gestural permission flow in Chrome and Edge on the maintainer machine
  (Windows 11). It cannot be faithfully reproduced by an agent. **Awaiting the
  maintainer's browser run.**
- **Decision:** PENDING. See V.6.

## V.2 — CSP media on `file://` (gates D-C1, task 4a.3)

- **Command:** scratch page with the widened CSP of D-C1
  (`img-src 'self' file: data: blob: https:`, `media-src 'self' file: blob:`), loading
  a relative `<img>`, `<video>`, `<audio>` in Chrome and Edge.
- **Observed:** NOT EXECUTED — same interactive-browser constraint as V.1. **Awaiting
  the maintainer's browser run.**
- **Decision:** PENDING. See V.6.

## V.3 — `hyperframes transcribe` word timings on Windows (gates 3b-3.x)

- **Command:** `npx hyperframes transcribe <wav> --json --model small.en` on a 10 s
  fixture in a temp cwd.
- **Observed:** NOT EXECUTED — `whisper.cpp` is **not on PATH** (verified: no
  `whisper.cpp`/`whisper-cli` found). Provisioning whisper is a consent-gated binary
  install; the engine/spec forbids silent installation (`npx --yes`). CLI `hyperframes`
  0.9.23 is available. `captions: off` stays valid regardless, so production is never
  blocked. **Awaiting consent to install whisper.cpp (and once installed, this run).**
- **Decision:** PENDING. See V.6.

## V.4 — Chrome overlay invisibility after hotfix (gates 3b-4.x)

- **Command:** after PR 0 (`conntent-render-hotfix`) is on `dev`, render the botijos
  fixture and inspect frames for the previously-invisible Chrome overlay.
- **Observed:** NOT EXECUTED — requires rendering real frames (provider spend) and
  visual inspection in Chrome. **Awaiting maintainer.** Hotfix is merged (PR #589) so
  the groundwork is in place; the QA heuristic (3) from `qa.mjs` catches the symptom
  regardless of this outcome.
- **Decision:** PENDING. See V.6.

## V.5 — Registry licenses and pins (gates 2e.5, 2e.8) — EXECUTED (research)

- **Command:** enumerate candidate registry items for `library/components/` (target
  15–18 total), read each license, pin version. Registry: `heygen-com/hyperframes`
  (CLI 0.9.23), host `raw.githubusercontent.com`.
- **Observed:**
  - The `heygen-com/hyperframes` **repo LICENSE is Apache-2.0** (permissive, SPDX).
  - Only **2 of 238 cached components** declare a per-item SPDX `license` field; the
    rest carry none. `hyperframes add <item>` writes **no `LICENSE` file** beside the
    item and records only the installed file's content **sha256** in
    `hyperframes.lock.json` — there is **no per-item semver**.
  - A pulled component (`caption-clip-wipe`) references **external CDNs** (Google Fonts
    `fonts.googleapis.com`/`fonts.gstatic.com`, `cdn.jsdelivr.net` gsap), which
    **violates the spec rule** "no `index.html` of the package contains an `http:`,
    `https:` or protocol-relative URL". Those assets must be vendored offline.
- **Final (fallback applied by 2e.5):** fewer than 15 items satisfy the spec rules
  (per-item pin + permissive license + network-clean `index.html`) — only the six
  engine-authored components qualify. Per the fallback clause, the package ships the
  **six engine-authored components** (`source: local`, one per slot), each with
  `preview.mp4` and complete prose, all network-clean. `2e.5` lands them; the package
  test enforces offline (no `http(s)` URL in any packaged `index.html`). Registry
  vendoring remains closed until a per-item pin/license mechanism exists upstream.
- **Decision (V5):** fallback triggered (6-item set), recorded 2026-11-09.

## V.6 — Decision checkpoint

- V.1, V.2, V.4: **blocked on the maintainer's Chrome/Edge browser run.**
- V.3: **blocked on consent to install whisper.cpp** (explicit stop-and-ask in the
  handoff; silent install is spec-forbidden).
- V.5: **decided** (fallback triggered: 6-item engine-authored set), recorded above.
- **2e.7:** `conntent-template` — kept as a **delta**, not removed (recorded in the
  spec's own decision line): its procedure-content requirements are superseded by
  `conntent-procedures`; its branding/skill-ownership requirements are unaffected.
- Per the handoff, no PR 2e, 3b-3, or 4a starts before its verification is recorded.
  This file is committed as the docs-only PR V; affected tasks will be marked with the
  fallback tags once the maintainer resolves V.1/V.2/V.3/V.4.