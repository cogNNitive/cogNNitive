import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import type { DirectoryHandleLike } from '../iNNfo/packages/innfo-core/src/fs-types'
import {
  parseModel,
  validateModel,
  extractTemplateSchemaFromContent,
  checkElementsAgainstSchema,
  recursiveParse,
} from '../iNNfo/packages/innfo-core/src/index'

const repoRoot = path.resolve(__dirname, '..')

function nodeFsHandle(dirPath: string): DirectoryHandleLike {
  return {
    kind: 'directory',
    name: path.basename(dirPath),
    entries: async function* () {
      const items = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)
        if (item.isDirectory()) {
          yield [item.name, nodeFsHandle(fullPath)]
        } else {
          yield [
            item.name,
            {
              kind: 'file',
              name: item.name,
              getFile: async () => ({
                text: async () => fs.readFileSync(fullPath, 'utf8'),
              }),
            },
          ]
        }
      }
    },
    getFileHandle: async (name: string) => {
      const fullPath = path.join(dirPath, name)
      if (!fs.existsSync(fullPath)) throw Object.assign(new Error('File not found'), { code: 'ENOENT' })
      return {
        kind: 'file',
        name,
        getFile: async () => ({
          text: async () => fs.readFileSync(fullPath, 'utf8'),
        }),
      }
    },
    getDirectoryHandle: async (name: string) => {
      const fullPath = path.join(dirPath, name)
      if (!fs.existsSync(fullPath)) throw Object.assign(new Error('Directory not found'), { code: 'ENOENT' })
      return nodeFsHandle(fullPath)
    },
  }
}

describe('Simulated Workspace V_0-3-0 Validation Test', () => {
  const templatePath = path.join(repoRoot, 'iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md')
  const workspacePath = path.join(repoRoot, 'temp/workspace_NN.md')

  it('extracts correct concepts, matrices and markers from workspace_V_0-3-0_spec_NN.md', () => {
    expect(fs.existsSync(templatePath)).toBe(true)
    const templateContent = fs.readFileSync(templatePath, 'utf8')
    const templateSchema = extractTemplateSchemaFromContent(templateContent)
    const conceptNames = templateSchema.concepts.map((c) => c.name)

    expect(conceptNames).toContain('Workspace')
    expect(conceptNames).toContain('Models')
    expect(conceptNames).toContain('Sources')
    expect(conceptNames).toContain('Procedures')
    expect(conceptNames).toContain('Artifacts')
    expect(conceptNames).toContain('Tag')
    expect(conceptNames).not.toContain('Folder')
    expect(conceptNames).not.toContain('Asset')

    expect(templateSchema.matrices).toHaveLength(1)
    expect(templateSchema.matrices[0].source).toBe('Artifacts')
    expect(templateSchema.matrices[0].target).toBe('Sources')
  })

  it('validates temp/workspace_NN.md cleanly against workspace_V_0-3-0 without errors', () => {
    expect(fs.existsSync(workspacePath)).toBe(true)
    const templateContent = fs.readFileSync(templatePath, 'utf8')
    const parsedTemplate = parseModel(templateContent, templatePath)
    const workspaceContent = fs.readFileSync(workspacePath, 'utf8')
    const parsedWorkspace = parseModel(workspaceContent, workspacePath)

    const validationResult = validateModel(parsedWorkspace, parsedTemplate, null)
    if (!validationResult.valid) {
      console.error('Validation errors:', JSON.stringify(validationResult.errors, null, 2))
    }
    expect(validationResult.valid).toBe(true)
    expect(validationResult.errors).toHaveLength(0)

    const templateSchema = extractTemplateSchemaFromContent(templateContent)
    const schemaCheck = checkElementsAgainstSchema(parsedWorkspace.elements, templateSchema.concepts)
    expect(schemaCheck).toHaveLength(0)
  })

  it('recursively parses temp/workspace_NN.md and resolves submodels into a connected graph', async () => {
    const tempDirHandle = nodeFsHandle(path.join(repoRoot, 'temp'))
    const result = await recursiveParse(tempDirHandle)

    const nodeCount = Object.keys(result.nodes).length
    expect(nodeCount).toBeGreaterThanOrEqual(2)

    // Entrypoint node exists
    const rootKey = result.rootIds[0]
    const rootNode = result.nodes[rootKey]
    expect(rootNode).toBeDefined()

    // Submodel reference was resolved in graph
    const childNode = Object.values(result.nodes).find(
      (n) => n.id.includes('Acme') || n.name.includes('Acme')
    )
    expect(childNode).toBeDefined()
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0)
  })
})
