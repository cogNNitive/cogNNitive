# Design: Quick Wins — Ecosystem Alignment

**Risk: Low** — doc drift + small deterministic fixes; no schema, capability, or contract changes.

## Technical Approach

Six low-risk fixes across actioNN skills and the innfo-mcp package. F1–F3 are doc-only SKILL.md edits (vocabulary/rules consistency); F4 derives the MCP server version from package.json (single source of truth); M1 splits the `specs/` exclusion so discovery still skips it but explicit template resolution reads it; P1 maps `source_format` through the template-declared allowed set. Tests first for F4/M1/P1.

**Package boundaries**: `actioNN` (nn-innfo SKILL.md F1–F3; nn-trannsform scripts P1) and `iNNfo/packages/innfo-mcp` (F4, M1). No cross-package imports introduced. P1 keeps a local declared-set constant (mirrors the template) and does NOT reuse scanner-core `EXT_LABELS` (that map intentionally includes `html`/`srt`/`vtt` — outside the declared set).

## Architecture Decisions

### D1 (F1): Type vocabulary — replace `number`/`date` with `string`
| Option | Tradeoff | Decision |
|---|---|---|
| Map to `string` | Honest; value stored as text | **Adopt** |
| Add numeric type at L1 | Out of scope — no L1 changes | Rejected |

**Rationale**: Verified in `iNNfo/specs/iNNfo_V_0-2-0_NN.md` L114 (identical in V_0-2-1 L114, V_0-1-0 L114): Field `type` options are `string | select | reference | markdown_inline | markdown_file | image | file | video | audio | model`. `number`/`date` are undeclared; `list` is a **Concept** representation type (L92), not a field type. `budget`/`price` are attributes, not references → `string`.

### D2 (F2): Align rule 5 with L1 spec — `sources::` ALWAYS bracketed
| Option | Tradeoff | Decision |
|---|---|---|
| Rewrite rule 5 to mandate `[...]` even for single value | Matches L1 spec exactly; fixes original skill drift | **Adopt** |
| Keep "brackets only for 2+ values" (original design D2) | Contradicts L1 spec; would re-introduce drift | Rejected |

**Rationale**: `iNNfo/specs/iNNfo_V_0-2-0_NN.md` L378 — `sources:: [sources/nn/<filename>#<heading-slug>, ...]` (MUST always be formatted as a list enclosed in brackets `[...]`, **even when referencing a single source document**; no scalar string syntax). The original SKILL.md rule 5 ("un solo valor va sin corchetes") was skill↔spec drift. The earlier design draft wrongly kept the "2+ values" framing; corrected to mandate brackets always. Examples updated to `sources:: [sources/nn/...]` (single source stays bracketed). `type:: reference` single values independently require WikiLink `[[...]]` per §8d / Core Rule 12.

### D3 (F4): Version from package.json
| Option | Tradeoff | Decision |
|---|---|---|
| `import { version } from '../package.json'` | tsconfig `rootDir: ./src` puts package.json outside the root → TS6059 under `tsc --noEmit` | Rejected (apply-time finding) |
| `readFileSync(new URL('../package.json', import.meta.url))` | No TS6059; single source of truth at module init | **Adopt** |
| tsup `define` build constant | New build config for one value | Rejected |

**Rationale**: Single source of truth (`package.json` = `0.2.4`; server.ts L65 hardcoded `0.2.1`). The static JSON import fails typecheck because `package.json` lives outside `rootDir: ./src`; the `readFileSync` + `new URL` variant reads it at module-evaluation time without a tsc error. `import.meta.url` is available under ESM/`moduleResolution: bundler`.

### D4 (M1): Parameterize the `specs/` exclusion
| Option | Tradeoff | Decision |
|---|---|---|
| `opts?: { includeSpecs?: boolean }` on both walkers (default `false`) | Minimal; discovery semantics unchanged | **Adopt** |
| Drop `specs/` from exclusions entirely | Bare-name model/submodel lookup could misidentify spec files as models | Rejected |

**Rationale**: `recursiveFindModel` (spec.ts L151) and `searchDirSync` (validate.ts L77) serve both discovery and explicit id lookup. `validate_template { id }` (validate.ts L508/L618) must find templates living in `specs/` — today it fails with "Template file not found", forcing network fallback (stale cache). All other callers keep the default skip.

### D5 (P1): Map ext through declared set, fallback `md`
| Option | Tradeoff | Decision |
|---|---|---|
| In-set passthrough, unknown → `md` | Truthful: every source in `sources/nn/` is normalized Markdown | **Adopt** |
| Fallback `txt` | Misleading format | Rejected |

**Rationale**: Template `cogNNitive_V_0-1-0_NN.md` L80 declares `source_format` `options:: [txt, md, csv, json, docx, pdf, xlsx]`. Raw `ext` (`html`, `htm`, `srt`, `vtt`, `xls`, `doc`) is undeclared; the normalized artifact is always Markdown, so `md` is the honest default.

## Data Flow

```
M1: validate_template {id} → findModelFile(root, id, { includeSpecs: true })
      → reads specs/<name>_V_<ver>_NN.md (updated content served; no stale cache)
P1: raw file ext → mapSourceFormat(ext) → declared value | 'md' → source_format:: <value>
```

## File Changes

| File | Action | Description |
|---|---|---|
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | **F1**: L149 `budget (number)`→`budget (string)`; L150 `price (number)`→`price (string)`; L356 type list → `(string, select, reference, markdown_inline, markdown_file, image, file, video, audio, model)`. **F2**: rewrite L287 rule 5 per D2. Bump frontmatter `version` V_0-1-2→V_0-1-3 (PATCH per actioNN convention). |
| `actioNN/skills/nn-innfo/SKILL.md` | No change | **F3**: L596 (Core Rule 11) + §"Generación del Index Block" (L605–655) verified consistent — index lists Concepts only, never Elements. No edit needed. |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modify | **F4**: add `import { version } from '../package.json'`; L65 `version: '0.2.1'` → `version`. |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modify | **M1**: `findModelFile`/`recursiveFindModel` accept `opts?: { includeSpecs?: boolean }` (default `false`); when true, drop `'specs'` from the skip set (L151). |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modify | **M1**: `searchDirSync`/`syncFindSubmodel` accept the same opts; `validateTemplate` calls `findModelFile(rootDir, id, { includeSpecs: true })` at L508 and L618. |
| `iNNfo/packages/innfo-mcp/src/server.spec.ts` | Modify | **F4**: assert reported server version equals package.json version. |
| `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` | Modify | **M1**: split-exclusion + updated-spec-served tests. |
| `iNNfo/packages/innfo-mcp/src/tools/validate.spec.ts` | Create | **M1**: `validate_template` by id against a template under `specs/`. |
| `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` | Modify | **P1**: add `SOURCE_FORMAT_OPTIONS` + `mapSourceFormat(ext)`; L106 `source_format: ext` → `source_format: mapSourceFormat(ext)`; export both. |
| `actioNN/skills/nn-trannsform/scripts/provenance.js` | Modify | **P1**: re-export `SOURCE_FORMAT_OPTIONS`/`mapSourceFormat` from the wrapper (tests consume the wrapper, not the lib). |
| `actioNN/skills/nn-trannsform/test/unit/test-provenance.js` | Modify | **P1**: Node assert cases (see strategy). |

## Interfaces / Contracts

```ts
// innfo-mcp (no MCP envelope/tool-schema changes)
findModelFile(rootDir: string, id: string, opts?: { includeSpecs?: boolean }): Promise<string | null>
syncFindSubmodel(rootDir: string, cleanPath: string, referringDir?: string,
                 opts?: { includeSpecs?: boolean }): string | null

// nn-trannsform (CommonJS)
const SOURCE_FORMAT_OPTIONS = ['txt', 'md', 'csv', 'json', 'docx', 'pdf', 'xlsx']
mapSourceFormat(ext: string): string   // in-set → ext, else 'md'
```

## Testing Strategy

| Finding | Framework / File | Approach |
|---|---|---|
| F4 | Vitest, `server.spec.ts` | `client.getServerVersion().version` equals `version` read from `package.json` (0.2.4). Gate: `npm --prefix iNNfo run build` + `test` + `typecheck` pass. |
| M1 | Vitest, `spec.spec.ts` (both tests live here — no separate `validate.spec.ts` needed) | (a) default `findModelFile` → `null` for specs/-only id, `{ includeSpecs: true }` → path (split proven); (b) `validateTemplate { id }` valid against a template stored under `specs/` (L1 chain stubbed via `stubSpecChain`, no fetch). |
| P1 | Node assert, `test/unit/test-provenance.js` (`node test/run.js unit`) | `collectSources` on `.html`/`.srt` raw sources → `source_format:: md`; `.txt` → `txt`; direct `mapSourceFormat` in-set/unknown cases. Existing `source_format:: docx` assertion stays green. |
| Regression | `npm --prefix iNNfo run test` + `node test/run.js` (nn-trannsform) | All suites green; no new validation errors from these fixes. |

## Migration / Rollout

No migration required. Per-file revert (SKILL.md edits, server.ts version line, opts parameters, mapping function). `specs/` write-once immutability untouched. No feature flags.

## Open Questions

- None blocking. F4 fallback documented in D3 if TS6059 surfaces under `tsc --noEmit`.