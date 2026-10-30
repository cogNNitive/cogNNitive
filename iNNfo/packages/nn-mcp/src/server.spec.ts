import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-server')
const specsDir = join(rootDir, 'specs')
process.env.INNFO_DOMAIN_DIR = rootDir

const { server, toolDefinitions, resolveRootDir } = await import('./server')

const pkgVersion = JSON.parse(
  await readFile(join(import.meta.dirname!, '..', 'package.json'), 'utf-8'),
).version

function textOf(result: CallToolResult): string {
  const first = result.content[0]
  if (!first || first.type !== 'text') throw new Error('Expected text content')
  return first.text
}

/** Write the level-1 + level-0 spec chain locally so resolution never hits the network. */
async function stubSpecChain() {
  await writeFile(
    join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-3-0"',
      'level: 1',
      'title: "Local iNNfo Spec"',
      'parent_spec:',
      '  name: "defiNNition_V_0-1-0"',
      '  url: "https://example.com/defiNNition_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
    ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "Local defiNNition Spec"', '---'].join('\n'),
    'utf-8',
  )
}

/** Write a level-2 business blueprint (declaring a "Work" list concept)
 * resolving up to the stubbed level-1 chain — fully resolvable locally. */
async function stubBlueprintChain() {
  await writeFile(
    join(specsDir, 'business_V_0-2-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 2',
      'title: "Local Business Blueprint"',
      'parent_spec:',
      '  name: "iNNfo_V_0-3-0"',
      '  url: "https://example.com/iNNfo_V_0-3-0_NN.md"',
      '---',
      '',
      '# NN Concept Definition',
      '',
      '## NN Concept Definition: Work',
      'type:: list',
      '',
    ].join('\n'),
    'utf-8',
  )
  await stubSpecChain()
}

/** A minimal, valid iNNfo knowledge document instantiating the "Work" concept. */
const MUTABLE_KNOWLEDGE_CONTENT = [
  '---',
  'spec_version: "V_0-3-0"',
  'level: 3',
  'knowledge_version: "V_0-0-1"',
  'title: "Test"',
  'parent_spec:',
  '  name: "business_V_0-2-0"',
  '  url: "https://example.com/business_V_0-2-0_NN.md"',
  '---',
  '',
  '# NN index',
  '* [[Work]]',
  '',
  '# NN Work',
  '## NN Work: Triage',
  '  First element.',
  '',
].join('\n')

describe('nn-mcp server (dispatch/handler layer, real MCP client/server round-trip)', () => {
  let client: Client
  const origCache = process.env.INNFO_CACHE_DIR

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  })

  afterAll(async () => {
    await client.close()
  })

  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(rootDir, 'isolated-cache')
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  })

  afterEach(async () => {
    if (origCache !== undefined) process.env.INNFO_CACHE_DIR = origCache
    else delete process.env.INNFO_CACHE_DIR
    await rm(rootDir, { recursive: true, force: true })
  })

  it('reports the package.json version in the initialize handshake', async () => {
    const info = client.getServerVersion()
    expect(info).toBeDefined()
    expect(info?.version).toBe(pkgVersion)
  })

  it('lists exactly the 24 canonical tools and no retired names', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(toolDefinitions.map((t) => t.name).sort())
    expect(tools).toHaveLength(24)

    const canonicalNames = [
      'list_knowledge',
      'read_knowledge',
      'get_spec',
      'get_blueprint',
      'validate_knowledge',
      'apply_change',
      'regenerate_console',
      'propose_changeset',
      'init_domain',
      'validate_knowledge_url',
      'validate_blueprint',
      'init_knowledge',
      'list_blueprints',
      'hydrate_blueprint',
      'sync_domain_manifest',
      'check_domain',
      'query_units',
      'cognitivize',
      'sync_lineage',
      'resolve_sources',
      'list_blueprint_procedures',
      'list_blueprint_skills',
      'resolve_effective',
      'explain',
    ].sort()
    expect(names).toEqual(canonicalNames)

    // Verify all 24 tools declare MCP tool annotations with readOnlyHint
    for (const tool of tools) {
      expect(tool.annotations).toBeDefined()
      expect(typeof tool.annotations?.readOnlyHint).toBe('boolean')
    }

    // Verify retired names are not present
    const retired = [
      'record_feedback_verdict',
      'evaluate_feedback_items',
      'list_models',
      'read_model',
      'init_model',
      'validate_model',
      'validate_model_url',
      'get_template',
      'validate_template',
      'list_templates',
      'hydrate_template',
      'list_template_procedures',
      'list_template_skills',
      'sync_workspace_manifest',
      'check_workspace',
      'migrate_domain',
      'build_console_payload',
      'prune_changesets',
    ]
    for (const r of retired) {
      expect(names).not.toContain(r)
    }
  })

  it('returns an isError result for a retired or unknown tool name', async () => {
    const result1 = await client.callTool({ name: 'get_template', arguments: {} })
    expect(result1.isError).toBe(true)
    expect(textOf(result1 as CallToolResult)).toBe('Unknown tool: get_template')

    const result2 = await client.callTool({ name: 'list_models', arguments: {} })
    expect(result2.isError).toBe(true)
    expect(textOf(result2 as CallToolResult)).toBe('Unknown tool: list_models')
  })

  describe('resolve_effective and explain dispatch', () => {
    it('resolve over the server domain root; explain carries the same trace; failures are structured isError results', async () => {
      await writeFile(join(rootDir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n', 'utf-8')
      await writeFile(
        join(rootDir, 'root_scope_NN.md'),
        '---\nlevel: 3\nscope: true\n---\n\n# NN Settings\n\n## NN Settings: Root\ncolor:: red\n',
        'utf-8',
      )
      const args = { path: 'note_NN.md', key: 'color', strategy: 'override' }

      const value = await client.callTool({ name: 'resolve_effective', arguments: args })
      expect(value.isError).toBeFalsy()
      const valueBody = JSON.parse(textOf(value as CallToolResult))
      expect(valueBody).toMatchObject({ version: 'innfo-resolve-effective@1', ok: true, present: true, value: 'red' })

      const explained = await client.callTool({ name: 'explain', arguments: args })
      const explainBody = JSON.parse(textOf(explained as CallToolResult))
      expect(explainBody.version).toBe('innfo-explain@1')
      expect(explainBody.trace).toEqual(valueBody.trace)
      expect(explainBody.chain).toEqual([{ id: '', kind: 'root', doc: 'root_scope_NN.md', isolate: false }])

      const outside = await client.callTool({ name: 'resolve_effective', arguments: { ...args, path: '../elsewhere_NN.md' } })
      expect(outside.isError).toBe(true)
      expect(JSON.parse(textOf(outside as CallToolResult))).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })

      const missing = await client.callTool({ name: 'explain', arguments: {} })
      expect(missing.isError).toBe(true)
      expect(JSON.parse(textOf(missing as CallToolResult))).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    })
  })

  describe('list_blueprint_procedures path dispatch', () => {
    it('lists the root procedures/ as the root scope with a path; a path outside any domaiNN is an isError result', async () => {
      await writeFile(join(rootDir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n', 'utf-8')
      await mkdir(join(rootDir, 'procedures'), { recursive: true })
      await writeFile(join(rootDir, 'procedures', 'close-month_procedures_NN.md'), '---\nlevel: 3\ntitle: Close Month\n---\n', 'utf-8')

      const scoped = await client.callTool({ name: 'list_blueprint_procedures', arguments: { path: 'note_NN.md' } })
      expect(scoped.isError).toBeFalsy()
      const body = JSON.parse(textOf(scoped as CallToolResult))
      expect(body.version).toBe('innfo-list-blueprint-procedures@1')
      expect(body.procedures).toMatchObject([{ id: 'close-month', source_kind: 'scope', source: '', status: 'selected' }])

      const outside = await client.callTool({ name: 'list_blueprint_procedures', arguments: { path: '../elsewhere_NN.md' } })
      expect(outside.isError).toBe(true)
      expect(JSON.parse(textOf(outside as CallToolResult))).toMatchObject({ ok: false, code: 'PATH_OUTSIDE_SCOPE' })
    })

    it.each([['domain'], ['root']])('refuses %s together with path: the scoped listing is bound to the server root', async (override) => {
      await writeFile(join(rootDir, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n', 'utf-8')
      const other = mkdtempSync(join(tmpdir(), 'nn-other-domain-'))
      try {
        writeFileSync(join(other, 'domaiNN_NN.md'), '---\ntitle: t\n---\n# t\n')
        mkdirSync(join(other, 'procedures'))
        writeFileSync(join(other, 'procedures', 'secret_procedures_NN.md'), '---\nlevel: 3\n---\n')
        const result = await client.callTool({
          name: 'list_blueprint_procedures',
          arguments: { path: 'note_NN.md', [override]: other },
        })
        expect(result.isError).toBe(true)
        const body = JSON.parse(textOf(result as CallToolResult))
        expect(body).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
        expect(JSON.stringify(body)).not.toContain('secret')
      } finally {
        rmSync(other, { recursive: true, force: true })
      }
    })

    it.each([[''], [42], [null], [{}]])('answers a structured INVALID_ARGUMENT for path %j instead of falling back to the unscoped listing', async (path) => {
      const result = await client.callTool({ name: 'list_blueprint_procedures', arguments: { path } })
      expect(result.isError).toBe(true)
      expect(JSON.parse(textOf(result as CallToolResult))).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    })
  })

  describe('apply_change dispatch (changeset vs legacy bare calls)', () => {
    it('rejects when neither changeset nor (id, op) is provided', async () => {
      const result = await client.callTool({ name: 'apply_change', arguments: {} })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toMatch(/Missing required arguments/)
    })

    it('routes changeset_path to the changeset engine', async () => {
      const result = await client.callTool({
        name: 'apply_change',
        arguments: { changeset_path: 'changes/does_not_exist_changes_NN.md' },
      })
      expect(textOf(result as CallToolResult)).toMatch(/Failed to read changeset file/)
    })

    it('routes the changeset alias to the changeset engine', async () => {
      const result = await client.callTool({
        name: 'apply_change',
        arguments: { changeset: 'changes/does_not_exist_changes_NN.md' },
      })
      expect(textOf(result as CallToolResult)).toMatch(/Failed to read changeset file/)
    })
  })

  describe('list_knowledge', () => {
    const docFrontmatter = [
      '---',
      'spec_version: "V_0-3-0"',
      'level: 3',
      'parent_spec:',
      '  name: business_V_0-2-0',
      '  url: https://example.com/business_V_0-2-0_NN.md',
      '---',
      '',
    ].join('\n')

    it('scans the configured domain and returns knowledge info enveloped under "knowledge"', async () => {
      const kDir = join(rootDir, 'kNNowledge')
      await mkdir(kDir, { recursive: true })
      await writeFile(join(kDir, 'Alpha_V_1-0-0_business_NN.md'), docFrontmatter, 'utf-8')
      await writeFile(join(kDir, 'Beta_V_1-0-0_business_NN.md'), docFrontmatter, 'utf-8')

      const result = await client.callTool({ name: 'list_knowledge', arguments: {} })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-list-knowledge@1')
      expect(parsed.knowledge.map((m: { id: string }) => m.id)).toEqual([
        'Alpha_V_1-0-0_business_NN',
        'Beta_V_1-0-0_business_NN',
      ])
    })

    it('honors an explicit domain root override', async () => {
      const otherRoot = join(rootDir, 'other-domain')
      await mkdir(otherRoot, { recursive: true })
      await writeFile(join(otherRoot, 'Only_V_1-0-0_NN.md'), docFrontmatter, 'utf-8')

      const result = await client.callTool({ name: 'list_knowledge', arguments: { domain: otherRoot } })
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-list-knowledge@1')
      expect(parsed.knowledge.map((m: { id: string }) => m.id)).toEqual(['Only_V_1-0-0_NN'])
    })
  })

  describe('read_knowledge', () => {
    it('returns an isError result when id is missing', async () => {
      const result = await client.callTool({ name: 'read_knowledge', arguments: {} })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Missing required argument: id')
    })

    it('returns an isError result when the knowledge document does not exist', async () => {
      const result = await client.callTool({ name: 'read_knowledge', arguments: { id: 'Nope' } })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Knowledge document not found: Nope')
    })

    it('parses and returns a knowledge document by id with innfo-read-knowledge@1 envelope', async () => {
      await writeFile(join(rootDir, 'Sample_NN.md'), MUTABLE_KNOWLEDGE_CONTENT, 'utf-8')
      const result = await client.callTool({ name: 'read_knowledge', arguments: { id: 'Sample' } })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-read-knowledge@1')
      expect(parsed.frontmatter.title).toBe('Test')
    })
  })

  describe('get_spec', () => {
    it('returns an isError result when neither url nor knowledge_id is provided', async () => {
      const result = await client.callTool({ name: 'get_spec', arguments: {} })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Provide either url or knowledge_id')
    })

    it('resolves the level-1 spec from an explicit url with innfo-get-spec@1 envelope', async () => {
      await stubSpecChain()
      const result = await client.callTool({
        name: 'get_spec',
        arguments: { url: 'https://example.com/iNNfo_V_0-3-0_NN.md' },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-get-spec@1')
      expect(parsed.spec.frontmatter.title).toBe('Local iNNfo Spec')
    })
  })

  describe('get_blueprint', () => {
    it('returns an isError result when neither url nor knowledge_id is provided', async () => {
      const result = await client.callTool({ name: 'get_blueprint', arguments: {} })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Provide either url or knowledge_id')
    })

    it('resolves a blueprint from an explicit url with innfo-get-blueprint@1 envelope', async () => {
      await stubBlueprintChain()
      const result = await client.callTool({
        name: 'get_blueprint',
        arguments: { url: 'https://example.com/business_V_0-2-0_NN.md' },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-get-blueprint@1')
      expect(parsed.frontmatter.title).toBe('Local Business Blueprint')
    })
  })

  describe('validate_knowledge', () => {
    it('returns an isError result when neither id nor content is provided', async () => {
      const result = await client.callTool({ name: 'validate_knowledge', arguments: {} })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Provide either id or content')
    })

    it('reports a clear PARENT_RESOLUTION_FAILED error when no blueprint resolves for a declared parent_spec.url', async () => {
      const result = await client.callTool({
        name: 'validate_knowledge',
        arguments: { content: MUTABLE_KNOWLEDGE_CONTENT },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-validate-knowledge@1')
      expect(parsed.valid).toBe(false)
      expect(
        parsed.errors.some((e: { message: string }) => /PARENT_RESOLUTION_FAILED/.test(e.message)),
      ).toBe(true)
    })
  })

  describe('apply_change', () => {
    it('returns an isError result when required arguments are missing', async () => {
      const result = await client.callTool({ name: 'apply_change', arguments: { id: 'X' } })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toBe('Missing required arguments: id, op, args')
    })

    it('applies a mutation, validates against the resolved blueprint, and writes back to disk', async () => {
      await stubBlueprintChain()
      await writeFile(join(rootDir, 'Mutable_NN.md'), MUTABLE_KNOWLEDGE_CONTENT, 'utf-8')

      const result = await client.callTool({
        name: 'apply_change',
        arguments: {
          id: 'Mutable',
          op: 'add_element',
          args: { conceptName: 'Work', elementName: 'Review', description: 'Code review step.' },
        },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-apply-change@1')
      expect(parsed.success).toBe(true)

      const onDisk = await readFile(join(rootDir, 'Mutable_NN.md'), 'utf-8')
      expect(onDisk).toContain('Work: Review')
    })

    it('ignores non-model markdown (session transcripts) during the pre-check', async () => {
      await stubBlueprintChain()
      await writeFile(join(rootDir, 'Mutable_NN.md'), MUTABLE_KNOWLEDGE_CONTENT, 'utf-8')
      // A session transcript: not a `_NN.md` model, no `level`/`parent_spec`.
      await mkdir(join(rootDir, 'conversations'), { recursive: true })
      await writeFile(
        join(rootDir, 'conversations', '2026-10-01_192904.md'),
        '# Session log\n\nNo frontmatter here — this is a transcript, not a model.\n',
        'utf-8',
      )

      const result = await client.callTool({
        name: 'apply_change',
        arguments: {
          id: 'Mutable',
          op: 'add_element',
          args: { conceptName: 'Work', elementName: 'Transcribe', description: 'A step.' },
        },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.success).toBe(true)
    })

    it('never advertises a preview URL, even when the retired INNFO_PREVIEW flag is set', async () => {
      await stubBlueprintChain()
      await writeFile(join(rootDir, 'Mutable_NN.md'), MUTABLE_KNOWLEDGE_CONTENT, 'utf-8')
      const orig = process.env.INNFO_PREVIEW
      process.env.INNFO_PREVIEW = '1'
      try {
        const result = await client.callTool({
          name: 'apply_change',
          arguments: {
            id: 'Mutable',
            op: 'add_element',
            args: { conceptName: 'Work', elementName: 'NoPreview', description: 'A step.' },
          },
        })
        const text = textOf(result as CallToolResult)
        const parsed = JSON.parse(text)
        expect(parsed.success).toBe(true)
        expect(Object.keys(parsed).filter((k) => /preview/i.test(k))).toEqual([])
        expect(text).not.toMatch(/preview_url|preview_app_url|127\.0\.0\.1|cognnitive\.com\/innfo\/app/)
      } finally {
        if (orig === undefined) delete process.env.INNFO_PREVIEW
        else process.env.INNFO_PREVIEW = orig
      }
    })
  })

  it('tool descriptions never mention a live preview or the hosted app', async () => {
    const { tools } = await client.listTools()
    const blob = JSON.stringify(tools)
    expect(blob).not.toMatch(/live[- ]preview|preview_url|preview_app_url|INNFO_PREVIEW|hosted app|innfo\/app/i)
  })

  describe('init_knowledge', () => {
    it('returns an isError result when required arguments are missing', async () => {
      const result = await client.callTool({ name: 'init_knowledge', arguments: { id: 'test' } })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toContain('Missing required arguments')
    })

    it('initializes a knowledge document file successfully with innfo-init-knowledge@1 envelope', async () => {
      await stubBlueprintChain()
      await mkdir(join(rootDir, 'kNNowledge'), { recursive: true })
      const result = await client.callTool({
        name: 'init_knowledge',
        arguments: {
          id: 'test_doc',
          blueprint_name: 'business_V_0-2-0',
          blueprint_url: 'https://example.com/business_V_0-2-0_NN.md',
          domain: rootDir,
          open: false,
        },
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-init-knowledge@1')
      expect(parsed.success).toBe(true)
      expect(parsed.filePath).toContain('test_doc_business_NN.md')
      expect(parsed.changeset).toMatch(/^changes\/.+_changes_NN\.md$/)
      expect(parsed.next_steps.notice).toContain('The changeset was applied')
    })

    it('fails without filePath or content when the blueprint cannot be resolved', async () => {
      await mkdir(join(rootDir, 'kNNowledge'), { recursive: true })
      const result = await client.callTool({
        name: 'init_knowledge',
        arguments: {
          id: 'test_doc',
          blueprint_name: 'ghost_V_0-1-0',
          blueprint_url: 'https://example.com/ghost_V_0-1-0_NN.md',
          domain: rootDir,
          open: false,
        },
      })
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.success).toBe(false)
      expect(parsed).not.toHaveProperty('filePath')
      expect(parsed).not.toHaveProperty('content')
    })
  })

  describe('list_blueprints and hydrate_blueprint', () => {
    it('list_blueprints returns enveloped array under "blueprints"', async () => {
      const result = await client.callTool({ name: 'list_blueprints', arguments: { domain: rootDir } })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result as CallToolResult))
      expect(parsed.version).toBe('innfo-list-blueprints@1')
      expect(Array.isArray(parsed.blueprints)).toBe(true)
    })

    it('hydrate_blueprint returns error when blueprint is missing', async () => {
      const result = await client.callTool({
        name: 'hydrate_blueprint',
        arguments: { blueprint_name: 'non_existent_spec_xyz', domain: rootDir },
      })
      expect(result.isError).toBe(true)
      expect(textOf(result as CallToolResult)).toContain('Unresolved template')
    })
  })

  describe('no legacy domain interception across MCP tools', () => {
    it('does not intercept a domain carrying retired-era frontmatter keys', async () => {
      await writeFile(
        join(rootDir, 'domaiNN_NN.md'),
        ['---', 'level: 2', 'model_version: "V_0-1-0"', '---'].join('\n'),
        'utf-8',
      )

      const result = await client.callTool({ name: 'list_knowledge', arguments: {} })
      expect(result.isError).toBeFalsy()
      const text = textOf(result as CallToolResult)
      expect(text).not.toContain('isLegacy')
      expect(text).not.toContain('legacy layout')
    })

    it('does not refuse writes on a domain carrying a retired layout folder', async () => {
      await mkdir(join(rootDir, 'sources', 'nn'), { recursive: true })
      await writeFile(join(rootDir, 'sources', 'nn', 'raw_NN.md'), '# raw\n', 'utf-8')

      const write = await client.callTool({
        name: 'init_knowledge',
        arguments: { id: 'x', blueprint_url: 'u', blueprint_name: 'n', knowledge_version: '0.1.0' },
      })
      const text = textOf(write as CallToolResult)
      expect(text).not.toContain('isLegacy')
      expect(text).not.toContain('legacy layout')
    })
  })
})

describe('resolveRootDir', () => {
  let base: string

  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'nn-mcp-root-dir-')))
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  function marker(dir: string): void {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'domaiNN_NN.md'), '# NN Models\n', 'utf-8')
  }

  it('resolves the root from a subdirectory of a domaiNN', () => {
    marker(join(base, 'acme'))
    const sub = join(base, 'acme', 'programs', 'alpha')
    mkdirSync(sub, { recursive: true })
    expect(resolveRootDir(sub, {})).toBe(join(base, 'acme'))
  })

  it('resolves a domaiNN that has no .git', () => {
    marker(join(base, 'plain'))
    expect(resolveRootDir(join(base, 'plain'), {})).toBe(join(base, 'plain'))
  })

  it('prefers the domaiNN marker over a .git directory above it', () => {
    mkdirSync(join(base, '.git'), { recursive: true })
    marker(join(base, 'acme'))
    expect(resolveRootDir(join(base, 'acme'), {})).toBe(join(base, 'acme'))
  })

  it('lets INNFO_DOMAIN_DIR win over the marker walk', () => {
    marker(join(base, 'acme'))
    expect(resolveRootDir(join(base, 'acme'), { INNFO_DOMAIN_DIR: '/somewhere/else' })).toBe('/somewhere/else')
  })

  it('falls back to cwd when no marker exists, never to the repository root', () => {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true })
    const sub = join(base, 'repo', 'docs')
    mkdirSync(sub, { recursive: true })
    expect(resolveRootDir(sub, {})).toBe(sub)
  })
})
