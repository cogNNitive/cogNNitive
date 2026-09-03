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

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '')
}

function extractPrompt(title: string, yamlLines: string[]): string | null {
  const all = `${title} ${yamlLines.join(' ')}`.toLowerCase()
  if (all.includes('edit model') || all.includes('configure mcp')) {
    return innfoPrompt('Load the nn-innfo skill — I need to edit a model')
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
  const subtitle = 'Edit your iNNfo models using OpenCode Desktop'

  let currentStep: Partial<WorkStep> | null = null
  let currentTool: Partial<ToolEntry> | null = null
  let inYaml = false
  let yamlLines: string[] = []
  let descLines: string[] = []
  let inMatrix = false
  const matrixLines: string[] = []

  function flushStep(): void {
    if (currentStep?.title) {
      const desc = descLines.join('\n').trim()
      currentStep.descriptionHtml = desc
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
      currentStep.prompt = extractPrompt(currentStep.title, yamlLines)
      steps.push(currentStep as WorkStep)
    }
    currentStep = null
    yamlLines = []
    descLines = []
    inYaml = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    // Matrix section
    if (line.startsWith('* _NN matrices:')) {
      flushStep()
      inMatrix = true
      continue
    }

    if (inMatrix) {
      if (line.startsWith('|')) {
        matrixLines.push(line)
      } else if (line.trim() === '' && matrixLines.length > 0) {
        // continue collecting
      } else if (!line.startsWith('|') && !line.startsWith(':---') && matrixLines.length > 0) {
        inMatrix = false
      }
      if (inMatrix) continue
    }

    // Tool section
    const toolMatch = line.match(/^\* _NN Tools: (.+)$/)
    if (toolMatch) {
      flushStep()
      currentTool = { name: toolMatch[1].trim() }
      continue
    }

    if (currentTool) {
      const urlMatch = line.match(/Download:\s*(\S+)/)
      if (urlMatch) {
        currentTool.url = urlMatch[1].trim()
        currentTool.initials = (currentTool.name || '')
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
        currentTool.description = line.replace(/Download:\s*\S+\s*/, '').trim() || currentTool.name || ''
        if (currentTool.name && currentTool.url) {
          tools.push(currentTool as ToolEntry)
        }
        currentTool = null
      }
      continue
    }

    // Role section
    if (line.startsWith('* _NN Roles:')) {
      flushStep()
      continue
    }

    // Work section
    const workMatch = line.match(/^\* _NN Work: (.+)$/)
    if (workMatch) {
      flushStep()
      currentStep = { title: workMatch[1].trim(), descriptionHtml: '', prompt: null }
      continue
    }

    // YAML block
    if (currentStep) {
      if (line.trim() === '```yaml') {
        inYaml = true
        continue
      }
      if (inYaml && line.trim() === '```') {
        inYaml = false
        continue
      }
      if (inYaml) {
        yamlLines.push(line.trim())
        continue
      }

      if (line.startsWith('  ') && line.trim()) {
        descLines.push(line.trim())
      }
    }

    // Frontmatter title
    const titleMatch = line.match(/^title:\s*"(.+)"$/)
    if (titleMatch) title = titleMatch[1]
  }

  flushStep()

  // Parse matrix
  if (matrixLines.length > 0) {
    const headerLine = matrixLines.find((l) => l.startsWith('|') && !l.includes('---'))
    const dataLines = matrixLines.filter((l) => l !== headerLine && !l.includes('---') && l.startsWith('|'))
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
