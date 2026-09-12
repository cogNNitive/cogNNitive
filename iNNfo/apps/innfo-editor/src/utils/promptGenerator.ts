import type { ModelNode, MetamodelConcept } from '../model/types'

export interface PromptContext {
  block?: ModelNode
  schema?: MetamodelConcept
  conceptName?: string
  elementName?: string
  elementType?: string
  modelName?: string
  modelPath?: string
  relativePath?: string
  workspaceName?: string
  rawContent?: string
  userNotes?: string
  taskType?: 'implement' | 'refactor' | 'explain' | 'validate' | 'custom'
  customInstructions?: string
}

function getNodeDescription(node?: ModelNode): string | undefined {
  if (!node?.fields) return undefined
  const desc = node.fields['description']?.value
  return typeof desc === 'string' ? desc : undefined
}

export function generateOpenCodePrompt(context: PromptContext): string {
  const parts: string[] = []

  const targetTitle = context.elementName
    ? `${context.conceptName ? context.conceptName + ': ' : ''}${context.elementName}`
    : context.conceptName || context.modelName || 'Model Element'

  parts.push(`# Context: iNNfo Model Element — ${targetTitle}`)

  if (context.modelName || context.relativePath || context.modelPath) {
    parts.push(`- **Model:** \`${context.modelName || 'Active Model'}\``)
    const filePath = context.relativePath || context.modelPath
    if (filePath) {
      parts.push(`- **File:** \`${filePath}\``)
    }
    parts.push('')
  }

  const desc = getNodeDescription(context.block)
  if (desc) {
    parts.push(`> ${desc}\n`)
  }

  if (context.block?.fields && Object.keys(context.block.fields).length > 0) {
    parts.push('### Fields:')
    for (const [k, fv] of Object.entries(context.block.fields)) {
      const v = fv?.value !== undefined ? fv.value : fv
      parts.push(`- **${k}:** ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    }
    parts.push('')
  }

  const raw = context.rawContent
  if (raw) {
    parts.push('### Definition (Markdown AST segment):')
    parts.push('```markdown')
    parts.push(raw.trim())
    parts.push('```\n')
  }

  parts.push('### Instructions:')
  if (context.userNotes) {
    parts.push(context.userNotes)
  } else {
    parts.push(
      `Please inspect this ${context.conceptName || 'element'} and provide implementation or verification code conforming to clean architecture and project standards.`,
    )
  }

  return parts.join('\n')
}

export function generatePromptForBlock(context: PromptContext): string {
  if (context.userNotes) {
    return generateOpenCodePrompt(context)
  }

  const block = context.block
  const blockTitle = context.elementName || block?.name || block?.id || 'Target Block'
  const blockType = context.conceptName || context.elementType || block?.type || context.schema?.name || 'Block'
  const fields = Object.entries(block?.fields || {})
    .map(([k, fv]) => {
      const v = fv?.value !== undefined ? fv.value : fv
      return `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
    })
    .join('\n')

  let taskInstruction = ''
  switch (context.taskType || 'implement') {
    case 'implement':
      taskInstruction = `Please implement the logic, components, or procedures required for this ${blockType}. Follow clean architecture, write tests, and maintain 100% type safety.`
      break
    case 'refactor':
      taskInstruction = `Analyze and refactor this ${blockType} for improved modularity, readability, and consistency.`
      break
    case 'explain':
      taskInstruction = `Provide a clear architectural breakdown and explanation of this ${blockType} and its domain context.`
      break
    case 'validate':
      taskInstruction = `Audit this ${blockType} against its schema and verify data integrity.`
      break
    default:
      taskInstruction = context.customInstructions || 'Please process this model block.'
  }

  const desc = getNodeDescription(block)

  const sections: string[] = [
    `# Context: iNNfo Model [${context.modelName || 'Active Model'}]`,
    `## Target Block: ${blockTitle} (${blockType})`,
    desc ? `> ${desc}\n` : '',
    fields ? `### Fields:\n${fields}\n` : '',
    context.schema?.name ? `### Schema Definition: ${context.schema.name}\n` : '',
    context.rawContent
      ? `### Raw Model Segment:\n\`\`\`markdown\n${context.rawContent.trim()}\n\`\`\`\n`
      : '',
    `## Instructions:\n${taskInstruction}`,
  ]

  if (context.customInstructions && context.taskType !== 'custom') {
    sections.push(`\n### Additional Requirements:\n${context.customInstructions}`)
  }

  return sections.filter(Boolean).join('\n')
}
