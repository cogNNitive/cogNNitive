# Open Verifications (Phase V)

One section per verification: command, observed result, decision. Results gate later
PRs (V.1/V.2 gate 4a, V.3 gates 3b-3, V.4 gates 3b-4, V.5 gates 2e). A failing
verification triggers the fallback and marks the affected tasks (`V1-fallback`,
`V2-fallback`, `V3-fallback`, `V5-fallback`).

## V.1 — FSA on `file://` (gates D-C2, tasks 4a.5–4a.8) — EXECUTED (Chrome 156)

- **Command:** scratch pages in `temp/v-verify/` (`fsa.html`, `persist.html`), opened as
  `file://` in headless Chrome 156.0.8078.80 driven over CDP (`node --remote-debugging`),
  plus the same `fsa.html` over `http://127.0.0.1` to exercise a real
  `FileSystemDirectoryHandle` (OPFS) through IndexedDB. Edge is **not installed** on this
  machine (no `msedge.exe` in Program Files or LocalAppData).
- **Observed (file://):** `isSecureContext: true`; `showDirectoryPicker` and
  `showSaveFilePicker` are functions and the picker is actually invoked (headless
  returns `AbortError` when the native dialog is dismissed). IndexedDB works and
  **persists across page loads** (localStorage `yes`, IndexedDB `yes` after a reload).
  `navigator.storage.getDirectory()` (OPFS) throws `SecurityError` on `file://`, but the
  design does not use OPFS.
- **Observed (http://127.0.0.1, same page):** a real OPFS directory handle is
  structured-cloneable, stored in IndexedDB and restored
  (`restored-directory-handle`), and `queryPermission`/`requestPermission` return
  `granted`. The picker returns the same `FileSystemDirectoryHandle` class, so handle
  storage is not scheme-dependent.
- **Decision:** **(a) keep D-C2 as designed.** The picker is available on `file://`,
  IndexedDB stores and restores handles, and permissions are queryable; the worst case
  is one re-prompt per browser session, as designed. The native picker still needs one
  human click per session (by design, not a blocker). Tasks 4a.5–4a.8 stay as planned.

## V.2 — CSP media on `file://` (gates D-C1, task 4a.3) — EXECUTED (Chrome 156)

- **Command:** `temp/v-verify/media.html` with
  `default-src 'none'; img-src 'self' file: data: blob: https:; media-src 'self' file: blob:`
  loading a relative `<img>`, `<video>` (mp4) and `<audio>` (wav), opened as `file://` in
  headless Chrome 156 with **default flags** (no `--allow-file-access-from-files`).
- **Observed:** `img` loaded (`naturalWidth: 256`), `video` `readyState: 4`, `audio`
  `readyState: 4`, zero media errors, ~52 ms. Reproduced with and without the
  file-access flag. Edge is not installed on this machine, so the Edge half is
  unverified (recorded as a residual, not a blocker).
- **Decision:** **(a) keep D-C1.** Relative media loads from `file://` under the widened
  CSP; no `V2-fallback` (no inlined posters / "Open" links). Task 4a.3 stays as planned.

## V.3 — `hyperframes transcribe` word timings on Windows (gates 3b-3.x) — EXECUTED (Parakeet)

- **Command:** `npx hyperframes transcribe v3-speech.wav --json --engine auto` on a
  12.66 s spoken fixture (Windows SAPI) in a temp cwd. First run with the default engine
  returned `{"ok":false,"skipped":true,"reason":"whisper_unavailable"}`; the CLI cannot
  install whisper on this machine. `npx hyperframes models install parakeet` then
  installed `parakeet-tdt-0.6b-v3` (sherpa-onnx runtime).
- **Observed:** `{"ok":true,"engine":"parakeet","model":"parakeet-tdt-0.6b-v3",
  "wordCount":32,"durationSeconds":12.48}` and a transcript of per-word entries
  `{id, text, start, end}` (`w0` "This" 0–0.24, ...). Fixture saved at
  `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/fixtures/transcribe-parakeet.json`.
- **Decision (V3):** **(a) word timings present.** `captions: words` stays as designed;
  `captions: lines` builds from segment timings; `off` remains valid. The engine is
  `hyperframes transcribe --engine auto` (Parakeet when installed, whisper otherwise);
  the whisper model rule (`small.en` / `small --language <code>`) applies only when
  whisper is selected. `caption_model` is advisory for a non-whisper engine. Recorded
  2026-11-09.

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

- **V.1: decided** — keep D-C2 (Chrome 156; handle storage proven via OPFS over localhost,
  picker availability + IndexedDB persistence proven on `file://`). Edge residual.
- **V.2: decided** — keep D-C1 (Chrome 156; all media loads on `file://` under the widened
  CSP, default flags). Edge residual.
- **V.4 and the video/provider verifications are deferred to the joint session** with the
  maintainer (see "Live tier" below). The code is implemented against fake providers and
  synthetic fixtures until then.
- V.3: **deferred** to the joint session (whisper install consent is already granted but
  the transcription run is a live check; `captions: off` stays valid so production is
  never blocked).
- V.5: **decided** (fallback triggered: 6-item engine-authored set), recorded above.

## Live tier (deferred verification, adopted 2026-11-09)

Everything that needs a provider call, a HyperFrames render or whisper is implemented and
covered offline first, then verified live in one session with the maintainer:

- Tests that require live providers/render/whisper are marked and run only with
  `NN_LIVE=1` (default: skipped, never failing).
- Deterministic contracts stay in the normal suite: hashes, gate state, exit codes, plan
  slices, delivery versioning, cache keys, CSP/jsdom runtime, fake-provider E2E.
- Two fixtures are captured once in the joint session: one `hyperframes transcribe` JSON
  and one frame with a transparent watermark (QA regression).
- `QA_TEXT_EDGE_MIN` ships as a named constant marked `CALIBRATION-PENDING` until V.4.

- **2e.7:** `conntent-template` — kept as a **delta**, not removed (recorded in the
  spec's own decision line): its procedure-content requirements are superseded by
  `conntent-procedures`; its branding/skill-ownership requirements are unaffected.
- Per the handoff, no PR 2e, 3b-3, or 4a starts before its verification is recorded.
  This file is committed as the docs-only PR V; affected tasks will be marked with the
  fallback tags once the maintainer resolves V.1/V.2/V.3/V.4.