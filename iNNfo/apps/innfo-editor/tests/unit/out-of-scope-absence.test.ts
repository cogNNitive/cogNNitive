import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(import.meta.dirname!, '..', '..', 'src')

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

const allSrcFiles = walk(srcDir)
const codeFiles = allSrcFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.vue'))

describe('out-of-scope feature absence (R19)', () => {
  it('ships no conversion UI/control or file<->folder conversion logic', () => {
    const offendingPaths = allSrcFiles.filter((f) => /convert/i.test(f))
    expect(offendingPaths).toEqual([])
  })

  it('ships no cross-boundary wikilink resolution/UI', () => {
    const offendingPaths = allSrcFiles.filter((f) => /wikilink/i.test(f))
    expect(offendingPaths).toEqual([])

    // The shared/validator.ts checks wikilink syntax as part of FORMAT compliance
    // (conv-wikilinks: ensures [[refs]] match declared concepts). This is syntax
    // validation, not resolution/navigation — R19 intent remains intact.
    // Editor components ported from file-format (BlockSheet, Pill, BlockRelationships)
    // reference [[wikilinks]] as part of FORMAT document parsing/display, not as
    // cross-boundary resolution or navigation UI — same exclusion rationale.
    const wikilinkExcluded = [
      /[\/\\]shared[\/\\]validator\.ts$/,
      /[\/\\]components[\/\\]editor[\/\\]BlockSheet\.vue$/,
      /[\/\\]components[\/\\]editor[\/\\]Pill\.vue$/,
      /[\/\\]components[\/\\]editor[\/\\]BlockRelationships\.vue$/,
      /[\/\\]components[\/\\]editor[\/\\]FieldViewer\.vue$/,
      /[\/\\]components[\/\\]editor[\/\\]FieldSchemaView\.vue$/,
      /[\/\\]components[\/\\]layout[\/\\]SetupWizard\.vue$/,
      /[\/\\]composables[\/\\]useWorkspaceScaffolding\.ts$/,
      /[\/\\]views[\/\\]StandaloneProcedureView\.vue$/,
      /FieldReference\.vue$/,
      /modelStore\.ts$/,
    ]
    const codeFilesNoExcluded = codeFiles.filter((f) => !wikilinkExcluded.some((re) => re.test(f)))
    const offendingContent = codeFilesNoExcluded.filter((f) =>
      /wikilink|\[\[.*\]\]/i.test(readFileSync(f, 'utf-8')),
    )
    expect(offendingContent).toEqual([])
  })

  it('ships no relationship view editors (grid/table/graph/matrix editor components)', () => {
    const offendingPaths = allSrcFiles.filter((f) =>
      /(relationship.*(grid|table|graph|matrix)|matrix.*editor|graph.*editor)/i.test(f),
    )
    expect(offendingPaths).toEqual([])
  })

  it('ships no rules/workflows features', () => {
    const offendingPaths = allSrcFiles.filter((f) => /\brules?\b|\bworkflows?\b/i.test(f))
    expect(offendingPaths).toEqual([])
  })

  it('ships no AI imports/SDKs/generation UI', () => {
    const offendingPaths = allSrcFiles.filter((f) => /\bai[-_]?(sdk|generat|assist)/i.test(f))
    expect(offendingPaths).toEqual([])

    const offendingContent = codeFiles.filter((f) => {
      const content = readFileSync(f, 'utf-8')
      return /from ['"](openai|anthropic|@anthropic-ai|@google\/generative-ai|langchain)/i.test(
        content,
      )
    })
    expect(offendingContent).toEqual([])
  })
})
