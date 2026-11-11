import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface ArtifactTargetProblem {
  code: 'ARTIFACT_NOT_FOUND' | 'ARTIFACT_NOT_A_FILE'
  message: string
}

/**
 * Why a `produce_artifact` target cannot be recorded, or `null` when it is an existing
 * file. There is no artifact registry: the target is a path relative to the domain root,
 * and the file must already be written there. The message says what to do, since a
 * missing path and a directory (an export bundle folder) need different fixes.
 */
export async function artifactTargetProblem(rootDir: string, rel: string): Promise<ArtifactTargetProblem | null> {
  const info = await stat(join(rootDir, rel)).catch(() => null)
  if (info?.isFile()) return null
  if (info?.isDirectory()) {
    return {
      code: 'ARTIFACT_NOT_A_FILE',
      message:
        `"${rel}" is a directory; produce_artifact records one file. ` +
        `Record each file of the folder with its own produce_artifact, or record a manifest file inside it.`,
    }
  }
  return {
    code: 'ARTIFACT_NOT_FOUND',
    message:
      `"${rel}" does not exist in this domain. produce_artifact records a file that is already written ` +
      `inside the domain, addressed by its path relative to the domain root; no artifact registry or ` +
      `bluepriNNt declaration is involved. Write the file first (into this domain, not another one), ` +
      `then propose produce_artifact with that relative path.`,
  }
}
