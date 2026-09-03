export interface DocumentationEntry {
  name: string
  summary?: string
  description?: string
  methodologies?: string
  guidelines?: string
  examplesHigh?: string
  examplesLow?: string
  prompts?: string[]
  metadata?: Record<string, string>
}

export function parseMetamodelDocumentation(
  markdownContent: string,
): Record<string, DocumentationEntry> {
  const docs: Record<string, DocumentationEntry> = {}

  // Split the document by ## headers (with multiline support)
  const sections = markdownContent.split(/\r?\n##\s+/)

  for (const section of sections) {
    const lines = section.split(/\r?\n/)
    if (lines.length === 0) continue

    const titleLine = lines[0].trim()
    if (!titleLine || titleLine.startsWith('#')) continue // Skip document title or empty lines

    const headerKey = titleLine.toLowerCase()
    const restContent = lines.slice(1).join('\n')

    // Parse metadata lines (e.g. "*   **Emoji:** 📄")
    const metadata: Record<string, string> = {}
    const metadataRegex = /^\*\s+\*\*([^*]+):\*\*\s*(.*)$/gm
    let mlMatch
    while ((mlMatch = metadataRegex.exec(restContent)) !== null) {
      const key = mlMatch[1].trim().toLowerCase().replace(/\s+/g, '_')
      const value = mlMatch[2].trim().replace(/^`|`$/g, '') // strip backticks
      metadata[key] = value
    }

    // Split by ### subheadings
    const subsections = restContent.split(/\r?\n###\s+/)

    const entry: DocumentationEntry = {
      name: titleLine,
      metadata,
    }

    for (const sub of subsections) {
      const subLines = sub.split(/\r?\n/)
      if (subLines.length === 0) continue

      const subTitle = subLines[0].trim().toLowerCase()
      const subContent = subLines.slice(1).join('\n').trim()

      if (!subTitle) continue

      if (subTitle.includes('summary')) {
        entry.summary = subContent === '*No summary provided.*' ? '' : subContent
      } else if (subTitle.includes('description')) {
        entry.description = subContent === '*No description provided.*' ? '' : subContent
      } else if (subTitle.includes('methodologies')) {
        entry.methodologies = subContent === '*No methodologies provided.*' ? '' : subContent
      } else if (subTitle.includes('guidelines')) {
        entry.guidelines = subContent === '*No guidelines provided.*' ? '' : subContent
      } else if (
        subTitle.includes('examples (high score)') ||
        subTitle.includes('examples (high)')
      ) {
        entry.examplesHigh = subContent
      } else if (subTitle.includes('examples (low score)') || subTitle.includes('examples (low)')) {
        entry.examplesLow = subContent
      } else if (subTitle.includes('prompts')) {
        if (subContent === '*No prompts provided.*') {
          entry.prompts = []
        } else {
          // Extract prompts matching code block backticks `...`
          const promptLines: string[] = []
          const regex = /`([^`]+)`/g
          let match
          while ((match = regex.exec(subContent)) !== null) {
            promptLines.push(match[1])
          }
          // If no backticks found, split by lines and strip bullet points
          if (promptLines.length === 0) {
            const rawLines = subContent.split('\n')
            for (const l of rawLines) {
              const cleanL = l.replace(/^[-*]\s+/, '').trim()
              if (cleanL) promptLines.push(cleanL)
            }
          }
          entry.prompts = promptLines
        }
      }
    }

    docs[headerKey] = entry
  }

  return docs
}
