/**
 * Preconfigured canonical virtual workspace presets for deep-linking.
 */
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main'

export interface WorkspacePreset {
  slug: string
  name: string
  description: string
  modelUrls: string[]
  templateName?: string
}

export const WORKSPACE_PRESETS: Record<string, WorkspacePreset> = {
  'startup-founder': {
    slug: 'startup-founder',
    name: 'SaaS Startup Founder',
    description: 'Comprehensive business model & value proposition for an AI startup.',
    modelUrls: [
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/startup-founder/models/SaaS_Founder_V_1-0-0_business_NN.md`,
    ],
    templateName: 'business',
  },
  'freelance-designer': {
    slug: 'freelance-designer',
    name: 'Freelance Design Studio',
    description: 'Client project website specification and design deliverables.',
    modelUrls: [
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/freelance-designer/models/Client_Website_V_1-0-0_site_spec_NN.md`,
    ],
    templateName: 'projects',
  },
  'consulting-sales': {
    slug: 'consulting-sales',
    name: 'Consulting Sales & RFP',
    description: 'Fintech RFP commercial response and consulting team staffing matrix.',
    modelUrls: [
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/consulting-sales/models/Fintech_RFP_Response_V_1-0-0_commercial_NN.md`,
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/consulting-sales/models/Consulting_Team_Matrix_V_1-0-0_organization_NN.md`,
    ],
    templateName: 'business',
  },
  'youtube-creator': {
    slug: 'youtube-creator',
    name: 'YouTube Content Creator',
    description: 'Battery tech episode script and studio production procedures.',
    modelUrls: [
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/youtube-creator/models/Episode_42_Battery_Tech_V_1-0-0_video_script_NN.md`,
      `${RAW_GITHUB_BASE}/docs/samples/use-cases/youtube-creator/models/Episode_42_Production_V_1-0-0_procedures_NN.md`,
    ],
    templateName: 'procedures',
  },
}

export function resolveWorkspacePreset(slug: string): WorkspacePreset | null {
  const cleanSlug = slug.toLowerCase().trim()
  return WORKSPACE_PRESETS[cleanSlug] || null
}
