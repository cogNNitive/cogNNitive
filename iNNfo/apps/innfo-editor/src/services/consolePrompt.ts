const BLUEPRINTS_ROOT = 'iNNfo/specs/bluepriNNts'

export const TEMPLATE_PROCEDURE_MAP: Record<string, string> = {
  business: `${BLUEPRINTS_ROOT}/business/procedures/compile_business_console_NN.md`,
  procedures: `${BLUEPRINTS_ROOT}/procedures/procedures_V_0-2-0_NN.md`,
  organization: `${BLUEPRINTS_ROOT}/organization/procedures/compile_org_chart_console_NN.md`,
  documentation: `${BLUEPRINTS_ROOT}/documentation/procedures/compile_docs_portal_console_NN.md`,
  analysis: `${BLUEPRINTS_ROOT}/analysis/procedures/compile_strategic_audit_console_NN.md`,
  innovation: `${BLUEPRINTS_ROOT}/innovation/procedures/compile_innovation_funnel_console_NN.md`,
  metrics: `${BLUEPRINTS_ROOT}/metrics/procedures/create_timeline_NN.md`,
  projects: `${BLUEPRINTS_ROOT}/projects/procedures/create_roadmap_NN.md`,
}

const HUB_COMPILE_PROCEDURE = `${BLUEPRINTS_ROOT}/workspace/procedures/compile_workspace_hub_NN.md`

export interface ConsolePromptModel {
  title: string
  template: string
  modelPath: string
  consolePath?: string
  hasConsole?: boolean
}

export interface ConsolePromptInput {
  title: string
  version: string
  models: ConsolePromptModel[]
}

export function resolveProcedure(template: string): string {
  return (
    TEMPLATE_PROCEDURE_MAP[template] ||
    `${BLUEPRINTS_ROOT}/${template}/procedures/compile_${template}_console_NN.md`
  )
}

export function generateConsolePrompt(input: ConsolePromptInput): string {
  const title = input.title || 'Workspace'
  const version = input.version || '1.0.0'
  const models = input.models || []

  let prompt = `Please validate and regenerate all interactive consoles for workspace "${title}" (v${version}).\n\n`
  prompt += `### Target Workspace Models:\n`
  models.forEach((m, idx) => {
    prompt += `${idx + 1}. **${m.title}** (Template: \`${m.template}\`, Model: \`${m.modelPath}\`)\n`
    prompt += `   - Compilation Procedure: \`${resolveProcedure(m.template)}\`\n`
    prompt += `   - Target Console Artifact: \`${m.consolePath || `artifacts/${m.template}_console.html`}\`\n\n`
  })

  prompt += `### Step-by-Step Instructions for the AI Agent:\n`
  prompt += `1. **Model Validation**: Inspect the workspace models listed above to ensure concepts, fields, and matrices are valid and properly formatted.\n`
  prompt += `2. **Console Regeneration**: For each model, run its declared compilation procedure to regenerate its standalone HTML console artifact in \`artifacts/\`.\n`
  prompt += `3. **Workspace Hub Compilation**: Execute \`${HUB_COMPILE_PROCEDURE}\` to recompile \`artifacts/workspace_hub.html\` reflecting all updated models and console statuses.\n`
  prompt += `4. **Verification**: Confirm that all generated HTML consoles and the Workspace Hub render correctly offline via \`file://\`.\n`

  return prompt
}
