import { SpecCache, SpecDocument, ResolverOptions } from './types'

export interface SpecResolver {
  resolveParentChain(
    parentUrl: string,
    parentName: string,
    options?: ResolverOptions,
  ): Promise<SpecCache>
}

export class SpecResolutionError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message)
    this.name = 'SpecResolutionError'
  }
}

export interface MultiStoreResolverOptions {
  workspaceDir?: string
  globalTemplatesDir?: string
  skillsDir?: string
  timeout?: number
}

export interface SpecTemplateLocation {
  name: string
  filePath: string
  source: 'workspace' | 'global' | 'skill'
  skillName?: string
}

export class UnresolvedTemplateError extends Error {
  public readonly checkedPaths: string[]
  constructor(templateName: string, checkedPaths: string[]) {
    const formatted = checkedPaths.map((p) => `  - ${p}`).join('\n')
    super(`Unresolved template "${templateName}". (searched:\n${formatted})`)
    this.name = 'UnresolvedTemplateError'
    this.checkedPaths = checkedPaths
  }
}

export function getSpecForLevel(cache: SpecCache, level: number): SpecDocument | undefined {
  for (const doc of cache.specs.values()) {
    if (doc.level === level) return doc
  }
  return undefined
}

export function getTemplate(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 3) ?? getSpecForLevel(cache, 2)
}

export function getFormatSpec(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 1)
}

export function getDefiNNe(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 0)
}

interface TemplateCandidate {
  filePath: string
  source: 'workspace' | 'global' | 'skill'
  skillName?: string
}

/**
 * Builds the ordered list of paths that template resolution will check, in
 * precedence order: workspace, then global user templates, then the templates
 * bundled with each installed skill.
 *
 * Resolution and the "searched:" diagnostics in `UnresolvedTemplateError` both
 * read from this one list, so the precedence order cannot drift between where
 * a template is actually found and where we claim to have looked.
 */
async function buildTemplateCandidates(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<TemplateCandidate[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')

  const workspaceDir = options?.workspaceDir ?? process.cwd()
  const globalTemplatesDir =
    options?.globalTemplatesDir ?? path.join(os.homedir(), '.agents', 'templates')
  const skillsDir = options?.skillsDir ?? path.join(os.homedir(), '.agents', 'skills')

  const candidateNames = templateName.endsWith('.md')
    ? [templateName]
    : [`${templateName}.md`, templateName]

  const candidates: TemplateCandidate[] = []

  // Tier 1: Workspace-local directories
  for (const candidate of candidateNames) {
    candidates.push({
      filePath: path.join(workspaceDir, 'templates', candidate),
      source: 'workspace',
    })
    candidates.push({ filePath: path.join(workspaceDir, candidate), source: 'workspace' })
    candidates.push({ filePath: path.join(workspaceDir, 'specs', candidate), source: 'workspace' })
  }

  // Tier 2: Global user agents directory (~/.agents/templates/)
  for (const candidate of candidateNames) {
    candidates.push({ filePath: path.join(globalTemplatesDir, candidate), source: 'global' })
  }

  // Tier 3: Installed skill template directories (~/.agents/skills/*/templates/)
  let skillNames: string[] = []
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    skillNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    // No skills directory installed — tier 3 contributes no candidates.
  }
  for (const skillName of skillNames) {
    for (const candidate of candidateNames) {
      candidates.push({
        filePath: path.join(skillsDir, skillName, 'templates', candidate),
        source: 'skill',
        skillName,
      })
      candidates.push({
        filePath: path.join(skillsDir, skillName, candidate),
        source: 'skill',
        skillName,
      })
    }
  }

  return candidates
}

/**
 * Returns every path template resolution would check, in precedence order.
 * Intended for diagnostics after `resolveTemplatePath` returns null.
 */
export async function getTemplateSearchPaths(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<string[]> {
  const candidates = await buildTemplateCandidates(templateName, options)
  return candidates.map((candidate) => candidate.filePath)
}

export async function resolveTemplatePath(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<SpecTemplateLocation | null> {
  const fs = await import('node:fs/promises')
  const candidates = await buildTemplateCandidates(templateName, options)

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate.filePath)
      if (stat.isFile()) {
        return {
          name: templateName,
          filePath: candidate.filePath,
          source: candidate.source,
          ...(candidate.skillName ? { skillName: candidate.skillName } : {}),
        }
      }
    } catch {
      // Path does not exist — keep walking the precedence list.
    }
  }

  return null
}
