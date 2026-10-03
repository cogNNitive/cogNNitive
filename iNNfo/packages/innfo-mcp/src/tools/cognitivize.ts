import { cognitivize, type RejectReason } from '@cognnitive/innfo-core'
import { isInsideRoot, isSafeRelativeId } from './path-guard.js'

export type CognitivizeToolResult =
  | { status: 'written' | 'refreshed' | 'unchanged'; sidecar: string; sha256: string }
  | { status: 'requires-cli'; path: string; message: string }
  | { status: 'rejected'; path: string; reason: RejectReason | 'outside-root' }

/**
 * `cognitivize` tool: creates or refreshes the sidecar of one raw file in place.
 *
 * Text-native files (md, csv, json) are handled directly. The MCP server never
 * converts binaries (no normalizer is injected), so any other format yields a
 * structured `requires-cli` result and nothing is written. The path is an
 * untrusted tool argument: containment is proven here before core sees it.
 */
export async function cognitivizeTool(
  rootDir: string,
  path: string,
): Promise<CognitivizeToolResult> {
  if (!path || !isSafeRelativeId(path) || !isInsideRoot(rootDir, path)) {
    return { status: 'rejected', path, reason: 'outside-root' }
  }
  const result = await cognitivize(rootDir, path)
  if (result.status === 'requires-normalizer') {
    return {
      status: 'requires-cli',
      path: result.path,
      message: `"${result.path}" is a binary format; use the nn-trannsform CLI (--cognitivize ${result.path}) to convert it. The MCP server writes nothing for binaries.`,
    }
  }
  return result
}
