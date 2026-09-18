import raw from './procedure_NN.md?raw'
import { innfoPrompt } from './prompt'

export interface ToolEntry {
  name: string
  initials: string
  description: string
  url: string
}

export interface WorkStep {
  title: string
  descriptionHtml: string
  prompt: string | null
}

export interface GuideData {
  title: string
  subtitle: string
  tools: ToolEntry[]
  steps: WorkStep[]
  matrixHeaders: string[]
  matrixRows: string[][]
}

function extractPrompt(title: string, yamlLines: string[], descLines: string[]): string | null {
  const allText = `${title} ${yamlLines.join(' ')} ${descLines.join(' ')}`
  const allLower = allText.toLowerCase()

  // First check for explicit quoted prompt in description text: *"innfo: ... "*
  const match = allText.match(/\*"(innfo:[^"]+)"\*/i) || allText.match(/"(innfo:[^"]+)"/i)
  if (match) {
    const promptText = match[1].trim()
    return promptText.startsWith('innfo: ') ? promptText : innfoPrompt(promptText.replace(/^innfo:\s*/i, ''))
  }

  if (allLower.includes('edit model') || allLower.includes('edit models')) {
    return innfoPrompt('Load the nn-innfo skill — I need to edit a model')
  }

  if (allLower.includes('configure mcp')) {
    return innfoPrompt('Load the nn-innfo skill and check that innfo-mcp is configured')
  }

  return null
}

export function parseGuide(content: string): GuideData {
  const lines = content.split('\n')

  const tools: ToolEntry[] = []
  const steps: WorkStep[] = []
  let matrixHeaders: string[] = []
  const matrixRows: string[][] = []
  let title = 'Use iNNfo with AI'
  let subtitle = 'Edit your iNNfo models using your preferred AI coding agent'

  let currentStep: Partial<WorkStep> | null = null
  let currentTool: Partial<ToolEntry> | null = null
  let inYaml = false
  let yamlLines: string[] = []
  let descLines: string[] = []
  let toolDescLines: string[] = []
  let inMatrix = false
  const matrixLines: string[] = []

  function flushStep(): void {
    if (currentStep?.title) {
      const desc = descLines.join('\n').trim()
      currentStep.descriptionHtml = desc
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
      currentStep.prompt = extractPrompt(currentStep.title, yamlLines, descLines)
      steps.push(currentStep as WorkStep)
    }
    currentStep = null
    yamlLines = []
    descLines = []
    inYaml = false
  }

  function flushTool(): void {
    if (currentTool?.name) {
      const descRaw = toolDescLines.join(' ').trim()
      let url = currentTool.url || ''
      let description = descRaw

      const downloadMatch = descRaw.match(/Download:\s*(\S+)/i)
      if (downloadMatch) {
        url = downloadMatch[1].trim()
        description = descRaw.replace(/Download:\s*\S+/i, '').trim()
      } else if (!url) {
        const urlMatch = descRaw.match(/https?:\/\/\S+/i)
        if (urlMatch) {
          url = urlMatch[0].trim()
        }
      }

      const initials = currentTool.name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

      tools.push({
        name: currentTool.name,
        initials,
        description: description || currentTool.name,
        url: url || 'https://cognnitive.com/use',
      })
    }
    currentTool = null
    toolDescLines = []
  }

  function flushAll(): void {
    flushStep()
    flushTool()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    // Frontmatter
    const titleMatch = line.match(/^title:\s*"(.+)"$/)
    if (titleMatch) {
      title = titleMatch[1]
      continue
    }
    const subtitleMatch = line.match(/^subtitle:\s*"(.+)"$/)
    if (subtitleMatch) {
      subtitle = subtitleMatch[1]
      continue
    }

    // Matrix section header
    if (/^#*\s*_?NN\s+matrices:/i.test(line)) {
      flushAll()
      inMatrix = true
      continue
    }

    if (inMatrix) {
      if (line.startsWith('|')) {
        matrixLines.push(line)
      } else if (trimmed === '' && matrixLines.length > 0) {
        // continue collecting
      } else if (!line.startsWith('|') && !line.startsWith(':---') && matrixLines.length > 0) {
        inMatrix = false
      }
      if (inMatrix) continue
    }

    // Section headers (# NN ...)
    if (/^#+\s+_?NN\s+(?:index|Concept Definition|Field Definition|Marker Definition|Matrix Definition|Procedure|Roles|Artifact)/i.test(line)) {
      flushAll()
      continue
    }

    // Tool item
    const toolMatch = line.match(/^(?:##|\*)\s+_?NN\s+Tools:\s*(.+)$/i)
    if (toolMatch) {
      flushAll()
      currentTool = { name: toolMatch[1].trim() }
      continue
    }

    if (currentTool) {
      if (trimmed.startsWith('url::')) {
        currentTool.url = trimmed.replace(/^url::\s*/, '').trim()
      } else if (trimmed) {
        toolDescLines.push(trimmed)
      }
      continue
    }

    // Work item
    const workMatch = line.match(/^(?:##|\*)\s+_?NN\s+Work:\s*(.+)$/i)
    if (workMatch) {
      flushAll()
      currentStep = { title: workMatch[1].trim(), descriptionHtml: '', prompt: null }
      continue
    }

    // Inside Work step
    if (currentStep) {
      if (trimmed === '```yaml') {
        inYaml = true
        continue
      }
      if (inYaml && trimmed === '```') {
        inYaml = false
        continue
      }
      if (inYaml) {
        yamlLines.push(trimmed)
        continue
      }
      // Inline field notation (e.g., step_type:: task, parent:: target)
      if (/^[a-zA-Z_]+::/.test(trimmed)) {
        yamlLines.push(trimmed)
        continue
      }
      // Description lines
      if (trimmed) {
        descLines.push(trimmed)
      }
    }
  }

  flushAll()

  // Parse matrix
  if (matrixLines.length > 0) {
    const headerLine = matrixLines.find((l) => l.startsWith('|') && !l.includes('---'))
    const dataLines = matrixLines.filter(
      (l) => l !== headerLine && !l.includes('---') && l.startsWith('|'),
    )
    if (headerLine) {
      matrixHeaders = headerLine
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
    }
    for (const l of dataLines) {
      const cells = l
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
      if (cells.length > 0) matrixRows.push(cells)
    }
  }

  return { title, subtitle, tools, steps, matrixHeaders, matrixRows }
}

const cached = parseGuide(raw)
export default cached
