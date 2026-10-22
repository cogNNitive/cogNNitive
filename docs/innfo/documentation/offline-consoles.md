# Offline Console Artifacts

A generated console is a **frozen snapshot**: an HTML shell plus two JSON slots
(`#innfo-schema`, `#innfo-model`). The shell carries no inline runtime logic — a
shared bundle is loaded through **static `<script>` tags only**: no server, no
`fetch()`, no `type="module"`. That is what lets a generated console run by
double-clicking the file from `file://`.

---

## How a console boots

1. The shell declares its capabilities in `#innfo-config` (`needs[]`) and embeds
   the schema and model JSON in the two slots.
2. **Three** static tags load the same bundle, in order:

   | Order | Source | Purpose |
   | :--- | :--- | :--- |
   | 1 | `./nn-console.bundle.js` (vendored next to the artifact) | Local / offline |
   | 2 | `cdn.jsdelivr.net` pinned to tag `nn-console-v0.26.0` | CDN fallback |
   | 3 | `raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/…` | Mirror fallback |

   The order is defined in `iNNfo/specs/bluepriNNts/console/artifact_shell.html`
   (the three `<script src=…>` tags just after the JSON slots). The version in the
   jsDelivr tag is derived from `iNNfo/specs/bluepriNNts/console/package.json`
   (`scripts/lib/console-release-info.js`), so it moves with each console release.

3. **Offline**, the local tag loads and the two remote tags fail silently, so the
   double-click works. **Online**, the shell still tries the remote tags after the
   local one, so the bundle can execute more than once. The tags are
   **fallbacks**, not a mechanism that guarantees a single boot — do not assume
   re-execution is a strict no-op.

One shell is canonical: `console/artifact_shell.html`. It declares the JSON slots
(`#innfo-config`, `#innfo-schema`, `#innfo-model`) and the DOM anchors
`#innfo-domain-title` / `#innfo-view-tabs` / `#innfo-navbar-actions` /
`#innfo-rail` / `#innfo-search` / `#innfo-filter-facets` /
`#innfo-active-filters` / `#innfo-tab-explorer` / `#innfo-doc` /
`#innfo-content` / `#innfo-matrices` / `#innfo-tab-review` /
`#innfo-ref-dialog`. The former `#innfo-banner` and `#innfo-export-modal`
anchors no longer exist (the shell test asserts their absence). Every console is the domain
console (`domaiNN_console.html`), optionally scoped to one document. The procedures stepper
is not a shell either: it is the registered `procedure` view
(`procedures/assets/console-view-procedure.js`), which builds its own scoped
DOM inside the view container and never uses global ids.

### What is in the bundle

`console/nn-console.bundle.js` is a single self-contained file built by
`scripts/lib/console-bundle.js` (driven by `npm run build:console`;
`npm run check:console-bundle` verifies it is up to date). It concatenates
**12 files**, in this order:

| Order | Source | Global |
| :--- | :--- | :--- |
| 1 | `nn-slug.generated.js` | `InnfoSlug` |
| 2 | `nn-address.generated.js` | `InnfoAddress` |
| 3 | `vendor/preact.umd.js` | `preact` |
| 4 | `vendor/htm.umd.js` | `htm` |
| 5 | `nn-preact-init.js` | `InnfoPreact` |
| 6 | `uplot.iife.min.js` | `uPlot` |
| 7 | `visuals.js` | `InnfoVisuals` |
| 8 | `nn-icons.js` | `InnfoIcons` |
| 9 | `ui-kit.js` | `InnfoUI` |
| 10 | `review.js` | `InnfoReview` |
| 11 | `nn-runtime.js` | `InnfoConsole` |
| 12 | `render-procedure-stepper.js` | `InnfoProcedureStepper` |

---

## The `file://` invariant is test-enforced

`iNNfo/packages/nn-core/tests/console-shell.test.ts` pins the offline contract:

- the shell contains **no** `type="module"` and **no** `fetch(`, and no longer
  contains the `#innfo-banner` / `#innfo-export-modal` anchors;
- the runtime source and the single-file bundle keep the same no-fetch /
  no-module hygiene;
- the bundle **contains** `InnfoPreact`, `InnfoVisuals`, `InnfoIcons`,
  `InnfoConsole` and `InnfoProcedureStepper`, does **not** contain
  `InnfoModelViewer`, and carries a `Version <declared>` stamp matching the console
  package version. The test does **not** assert concatenation order.

If a change reintroduces a module import or a network fetch into a shell or the
bundle, this test fails.

---

## Distribution pinning is by tag + commit

The bundle is distributed as the `console-assets` block of the bootstrap
manifest and pinned by both a **tag** (`ref`) and a **40-char commit**:

| Artifact | Pins |
| :--- | :--- |
| `docs/use/manifest.md` (`console-assets`) | the console `version`, `ref: "nn-console-v<version>"`, `commit`, and the raw `url` containing that commit |
| `manifest/source.yaml` (`console_assets` + `channels.stable.refs`) | the same tag under the `nn-console` ref key |
| `scripts/manifest/lib/manifest-rules.js` | resolves a manifest ref to the declared commit (`checkRefResolvesInDeclaredRepo`), checks that a pinned URL contains that commit (`checkMcpUrlPinned`), and validates console assets via `validateConsoleAsset` (release provenance through `checkReleaseProvenance`) |

The stable channel requires a tag-shaped ref and verifies release provenance;
the preview channel tracks `main`.

> **Convention, not enforcement.** Not editing a published bundle in place is a
> **convention** applied by the release flow. The manifest rules validate that a
> console pin resolves and carries release provenance. None of these enforce
> write-once immutability on the published artifact. Treat immutability as a
> discipline, not a runtime guarantee.

---

## The legacy model viewer is gone

The older `business/assets/model_viewer.html` shell (which loaded a pre-bundle
runtime from the CDN) and the `Compile Model Viewer` procedure that targeted it
are frozen history. Consultation of kNNowledge documents now lives in the single
console shell (`console/artifact_shell.html`), which renders origin-typed
citation icons per field; there is no separate per-document console asset.

---

## See also

- [Sources, Citations & Lineage](sources-citations-lineage) §5 — Git vs. the native
  semantic-versioning system: history/release anchors vs. the write-once
  per-artifact contract.
- [Collaboration with Git](collaboration-git) — the domaiNN-to-Git review layer
  and its version map.
