/**
 * scripts/mirror/video-parser-entry.ts
 *
 * esbuild entry for the committed ESM mirror
 * `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs`.
 *
 * Why a wrapper instead of bundling `iNNfo/packages/innfo-video-parser/src/index.ts`
 * directly: that index resolves the VUS spec with `readFileSync(join(packageRoot(),
 * 'specs', 'V_0-3-3.json'))`, walking up for a `package.json`. In an installed skill
 * copy there is no such package root, so the bare index throws ENOENT at module load.
 *
 * Here we embed the spec as a literal (esbuild `loader{'.json':'json'}` folds the
 * import into the bundle) and re-export the real parser surface. The domain code —
 * including `rules/index.ts`, which already imports the same JSON — is unchanged.
 *
 * `__VUS_SPEC_SHA256__` is injected by scripts/build-video-parser-mirror.mjs from the
 * real vendored file (LF-normalized), so the mirror fails `--check` on any spec edit.
 */

import vus from '../../iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json';
import { ScriptParser } from '../../iNNfo/packages/innfo-video-parser/src/parser/Parser.js';
import type { ParseResult } from '../../iNNfo/packages/innfo-video-parser/src/parser/Parser.js';
import { SemanticValidator } from '../../iNNfo/packages/innfo-video-parser/src/parser/SemanticValidator.js';
import type { ValidationIssue } from '../../iNNfo/packages/innfo-video-parser/src/parser/validation/types.js';
import type { Project } from '../../iNNfo/packages/innfo-video-parser/src/domain/types.js';

export * from '../../iNNfo/packages/innfo-video-parser/src/parser/Parser.js';
export * from '../../iNNfo/packages/innfo-video-parser/src/parser/Serializer.js';
export * from '../../iNNfo/packages/innfo-video-parser/src/parser/validation/types.js';
export * from '../../iNNfo/packages/innfo-video-parser/src/domain/types.js';
export { SemanticValidator } from '../../iNNfo/packages/innfo-video-parser/src/parser/SemanticValidator.js';

// Injected at build time (see build-video-parser-mirror.mjs). Referencing it through
// an indirection keeps esbuild from constant-folding a bare identifier.
declare const __VUS_SPEC_SHA256__: string;

/** The vendored VUS specification, hash-verified against the pinned digest. */
export interface VusSpec {
  version: string;
  sha256: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: any;
}

export const VUS_SPEC: VusSpec = {
  version: 'V_0-3-3',
  sha256: __VUS_SPEC_SHA256__,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: vus as any,
};

/**
 * Parses VUS script text into a Project and the issues found while parsing
 * (the semantic validator already runs as part of parsing).
 */
export function parse(text: string, title?: string): ParseResult {
  return ScriptParser.parse(text, title);
}

/** Runs the semantic validation rules over an already-parsed Project. */
export function validate(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  SemanticValidator.validate(project, issues);
  return issues;
}
