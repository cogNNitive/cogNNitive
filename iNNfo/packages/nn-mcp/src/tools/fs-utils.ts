import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Recursively collect every `*.md` / `*.markdown` file under `dir`. */
export async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await getMarkdownFiles(fullPath)))
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: the directory may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[fs-utils] Failed to read directory ${dir}: ${err}`)
    }
    /* v8 ignore stop */
  }
  return files
}
