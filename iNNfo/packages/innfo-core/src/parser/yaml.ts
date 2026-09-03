import { SpecFrontmatter } from '../types'
import { parse as yamlParse } from 'yaml'
import { normalizeSource, YAML_BLOCK_RE } from './markdown'

export function parseYaml(yamlStr: string): Record<string, any> {
  try {
    return yamlParse(yamlStr) || {}
  } catch (_err) {
    return {}
  }
}

export function parseFrontmatter(content: string): SpecFrontmatter | null {
  const match = normalizeSource(content).match(YAML_BLOCK_RE)
  if (!match) return null
  const parsed = parseYaml(match[1])
  // Normalize parent → parent_spec (supporting both new string URL and legacy parent object)
  if ((parsed as any).parent && !(parsed as any).parent_spec) {
    if (typeof (parsed as any).parent === 'string') {
      const url = (parsed as any).parent
      const name =
        url
          .split(/[/\\]/)
          .pop()
          ?.replace(/\.(md|markdown)$/i, '')
          .replace(/_(NN|FORMAT|F)$/i, '') || ''
      ;(parsed as any).parent_spec = { url, name }
    } else {
      ;(parsed as any).parent_spec = (parsed as any).parent
    }
    delete (parsed as any).parent
  }
  // Normalize legacy FORMAT-era field names (specification_* → spec_*)
  if ((parsed as any).specification_version && !(parsed as any).spec_version) {
    ;(parsed as any).spec_version = (parsed as any).specification_version
  }
  if ((parsed as any).specification_url && !(parsed as any).spec_url) {
    ;(parsed as any).spec_url = (parsed as any).specification_url
  }
  // Normalize `includes` entries: a bare string is shorthand for a name with
  // no explicit URL (resolved locally by name). Objects pass through with optional `alias`.
  const includes = (parsed as any).includes
  if (Array.isArray(includes)) {
    ;(parsed as any).includes = includes
      .map((entry: unknown) => {
        if (typeof entry === 'string') {
          const name = entry.replace(/\.(md|markdown)$/i, '').replace(/_(NN|FORMAT|F)$/i, '')
          return { name, url: '' }
        }
        if (entry && typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>
          const res: any = { name: String(e.name ?? ''), url: String(e.url ?? '') }
          if (e.alias && typeof e.alias === 'object' && e.alias !== null) {
            const aliasObj = e.alias as Record<string, unknown>
            const aliasMap: any = {}
            if (aliasObj.concepts && typeof aliasObj.concepts === 'object') {
              aliasMap.concepts = aliasObj.concepts
            }
            if (aliasObj.fields && typeof aliasObj.fields === 'object') {
              aliasMap.fields = aliasObj.fields
            }
            res.alias = aliasMap
          }
          return res
        }
        return null
      })
      .filter((e: unknown): e is { name: string; url: string } => !!e && !!(e as any).name)
  }
  // Normalize `procedures` block
  const procedures = (parsed as any).procedures
  if (Array.isArray(procedures)) {
    ;(parsed as any).procedures = procedures
      .map((p: unknown) => {
        if (p && typeof p === 'object' && p !== null) {
          const obj = p as Record<string, unknown>
          return {
            id: String(obj.id ?? ''),
            name: String(obj.name ?? ''),
            path: String(obj.path ?? ''),
            ...(obj.source_template ? { source_template: String(obj.source_template) } : {}),
          }
        }
        return null
      })
      .filter(
        (p: unknown): p is { id: string; name: string; path: string } => !!p && !!(p as any).id,
      )
  }
  // Normalize `skills` block
  const skills = (parsed as any).skills
  if (Array.isArray(skills)) {
    ;(parsed as any).skills = skills
      .map((s: unknown) => {
        if (s && typeof s === 'object' && s !== null) {
          const obj = s as Record<string, unknown>
          return {
            name: String(obj.name ?? ''),
            repo: String(obj.repo ?? ''),
            path: String(obj.path ?? ''),
            ...(obj.source_template ? { source_template: String(obj.source_template) } : {}),
          }
        }
        return null
      })
      .filter(
        (s: unknown): s is { name: string; repo: string; path: string } => !!s && !!(s as any).name,
      )
  }
  // Normalize `viewers` block
  const viewers = (parsed as any).viewers
  if (Array.isArray(viewers)) {
    ;(parsed as any).viewers = viewers
      .map((v: unknown) => {
        if (v && typeof v === 'object' && v !== null) {
          const obj = v as Record<string, unknown>
          const viewType = String(obj.view_type ?? obj.type ?? '')
          return {
            id: String(obj.id ?? ''),
            view_type: viewType,
            ...(obj.target_concept ? { target_concept: String(obj.target_concept) } : {}),
            ...(obj.label ? { label: String(obj.label) } : {}),
            ...(obj.icon ? { icon: String(obj.icon) } : {}),
            ...(obj.description ? { description: String(obj.description) } : {}),
            ...(obj.source_template ? { source_template: String(obj.source_template) } : {}),
          }
        }
        return null
      })
      .filter(
        (v: unknown): v is { id: string; view_type: string } =>
          !!v && !!(v as any).id && !!(v as any).view_type,
      )
  }
  // Normalize top-level `alias` block
  const topAlias = (parsed as any).alias
  if (topAlias && typeof topAlias === 'object' && topAlias !== null) {
    const aliasObj = topAlias as Record<string, unknown>
    const aliasMap: any = {}
    if (aliasObj.concepts && typeof aliasObj.concepts === 'object') {
      aliasMap.concepts = aliasObj.concepts
    }
    if (aliasObj.fields && typeof aliasObj.fields === 'object') {
      aliasMap.fields = aliasObj.fields
    }
    ;(parsed as any).alias = aliasMap
  }
  // Normalize legacy matrix params → values (R-MM-08 / 4.5 reader tolerance)
  const matrices = (parsed as any).matrices
  if (Array.isArray(matrices)) {
    for (const m of matrices) {
      if (m.params && !m.values) {
        m.values = m.params.split(';').map((s: string) => s.trim())
      }
      // R-MM-08 uses `widget`; the codebase uses `widgetType` (reader tolerance)
      if (m.widget && !m.widgetType) {
        m.widgetType = m.widget
        delete m.widget
      }
    }
  }
  return parsed as SpecFrontmatter
}
