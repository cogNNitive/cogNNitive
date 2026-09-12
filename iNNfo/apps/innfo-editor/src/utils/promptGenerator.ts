export interface PromptContext {
  modelName?: string
  modelPath?: string
  conceptName?: string
  elementName?: string
  elementType?: string
  userNotes?: string
}

export function generateOpenCodePrompt(context: PromptContext): string {
  const { modelName, modelPath, conceptName, elementName, elementType, userNotes } = context
  
  let targetDesc = ''
  if (elementName) {
    const conceptPart = conceptName ? ` under concept "${conceptName}"` : ''
    const typePart = elementType ? ` (type: "${elementType}")` : ''
    targetDesc = `element "${elementName}"${typePart}${conceptPart}`
  } else if (conceptName) {
    targetDesc = `concept "${conceptName}"`
  } else if (modelName) {
    targetDesc = `model "${modelName}"`
  } else {
    targetDesc = 'current iNNfo model workspace'
  }

  const modelInfo = modelName ? `Model: "${modelName}"${modelPath ? ` (located at "${modelPath}")` : ''}` : ''
  const notesSection = userNotes ? `\nUser Instructions / Comments:\n${userNotes}\n` : ''

  return `I need your help to modify the ${targetDesc}${modelInfo ? `\n\n${modelInfo}` : ''}.

${notesSection}Please analyze the relevant files and perform the requested changes accurately while adhering to iNNfo specifications and project conventions.`
}
