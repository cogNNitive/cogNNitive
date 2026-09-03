#!/usr/bin/env node

/**
 * innfo-mcp — MCP server wrapping @cognnitive/innfo-core.
 *
 * Exposes semantic iNNfo tools over stdio transport for consumption by
 * MCP clients such as OpenCode Desktop.
 *
 * Tools:
 *   list_models   — scan models/ directory for iNNfo model files
 *   read_model    — parse and return a model's full structure
 *   get_spec      — retrieve the iNNfo specification for a version
 *   get_template  — retrieve a template (business/procedures/kb)
 *   validate_model— run innfo-core validator against a template
 *   apply_change  — apply an intent operation and re-validate
 */

import { pathToFileURL } from 'node:url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { ListToolsResult, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'

import { listModels, readModel } from './tools/list-read.js'
import {
  getSpec,
  getTemplateFromUrl,
  getTemplateFromModel,
  deriveNameFromUrl,
  listTemplates,
  hydrateTemplate,
  listTemplateProcedures,
  listTemplateSkills,
} from './tools/spec.js'
import {
  validateModel,
  validateModelUrl,
  applyChange,
  validateTemplate,
  initModel,
  pruneOrphanedSpecs,
} from './tools/mutate.js'
import { findRepoRoot } from './tools/repo-root.js'

/**
 * Root directory for model scanning and `specs/` placement.
 *
 * Defaults to the repo root found by walking up from `process.cwd()` (so
 * `specs/` always lands inside the repo, not in some ambiguous
 * sibling/parent directory when the server is started from an unexpected
 * cwd), falling back to `process.cwd()` itself when no `.git` is found.
 */
const ROOT_DIR: string =
  process.env.INNFO_MODELS_DIR ?? findRepoRoot(process.cwd()) ?? process.cwd()

export const server = new Server(
  { name: 'innfo-mcp', version: '0.2.1' },
  { capabilities: { tools: {} } },
)

/* ── Tool definitions ───────────────────────────────────────── */

const toolDefinitions: Tool[] = [
  {
    name: 'list_models',
    description: 'Scan the models directory and list all iNNfo models',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Optional override directory to scan' },
      },
    },
  },
  {
    name: 'read_model',
    description: "Parse and return an iNNfo model's full structure by its id",
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Model id (filename stem, e.g. Ghostbusters_V_0-1-0_business)',
        },
        root: {
          type: 'string',
          description: 'Optional models root directory override',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_spec',
    description:
      'Resolve the iNNfo specification (level-1) from an explicit url or from a loaded model. Provide either url or model_id — the URL is never taken from an internal constant',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Explicit spec/template URL to resolve the parent chain from',
        },
        model_id: {
          type: 'string',
          description: 'Model id whose frontmatter parent_spec.url seeds resolution',
        },
      },
    },
  },
  {
    name: 'get_template',
    description:
      'Resolve an iNNfo template (level-2) from an explicit url or from a loaded model. Provide either url or model_id — template names/URLs are never hardcoded',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Explicit template URL to resolve from' },
        model_id: {
          type: 'string',
          description: 'Model id whose parent_spec.url points to its template',
        },
        name: {
          type: 'string',
          description: 'Optional chain-start name; derived from the url when omitted',
        },
      },
    },
  },
  {
    name: 'validate_model',
    description:
      'Validate an iNNfo model against its template. Provide id (file on disk) or content (raw text). The template is resolved from the model parent_spec.url, or from an optional template_url',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Model id (reads from disk)' },
        content: { type: 'string', description: 'Raw model content string (inline)' },
        root: {
          type: 'string',
          description: 'Optional models root directory override (used only with id mode)',
        },
        template_url: {
          type: 'string',
          description:
            'Optional explicit template URL when the model has no resolvable parent_spec.url',
        },
      },
    },
  },
  {
    name: 'apply_change',
    description:
      'Apply an intent-level change to a model and re-validate. Returns updated model or validation errors',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Model id' },
        op: {
          type: 'string',
          description: 'Operation to perform',
          enum: [
            'add_concept',
            'add_field',
            'set_marker',
            'add_element',
            'update_field',
            'remove_element',
            'rename_concept',
            'rename_element',
            'generate_index',
            'bump_version',
          ],
        },
        args: {
          type: 'object',
          description:
            'Operation-specific arguments. For update_field: { conceptName, elementName, fieldName, value } (overwrites a field on an existing element). For generate_index: { taxonomy? } (rebuilds the model taxonomy from present concepts). For bump_version: { version: "V_0-5-0" } (explicit) or { bump: "major" | "minor" | "patch" } (increment from the current model_version, default patch).',
        },
      },
      required: ['id', 'op', 'args'],
    },
  },
  {
    name: 'validate_model_url',
    description:
      'Validate an iNNfo model fetched from a URL without writing to disk. Accepts a model URL and optional template_url. Returns validation results.',
    inputSchema: {
      type: 'object',
      properties: {
        model_url: {
          type: 'string',
          description: 'URL pointing to the iNNfo model content to validate',
        },
        template_url: {
          type: 'string',
          description:
            'Optional explicit template URL when the model has no resolvable parent_spec.url',
        },
      },
      required: ['model_url'],
    },
  },
  {
    name: 'validate_template',
    description:
      'Validate a Level 2 template against its Level 1 parent spec with frontmatter level-2 auto-detection and parent resolution failure diagnostics',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Template model id (reads from disk)' },
        content: { type: 'string', description: 'Raw template content string (inline)' },
        url: { type: 'string', description: 'Explicit parent spec URL override' },
        root: { type: 'string', description: 'Optional models root directory override' },
      },
    },
  },
  {
    name: 'init_model',
    description:
      'Initialize or repair a level-3 model file: writes canonical YAML frontmatter and, when the file has no concept sections and the template resolves, scaffolds a starter body (index block + one section per Concept) from the template schema. Returns templateResolved / scaffolded / warnings.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Model ID/filename stem (e.g. arenzano_V_0-1-0_cogNNitive)',
        },
        template_url: { type: 'string', description: 'Immutable URL of the parent template' },
        template_name: {
          type: 'string',
          description: 'Name of the parent template (e.g. cogNNitive_V_0-1-0)',
        },
        title: { type: 'string', description: 'Logical title of the model (defaults to ID)' },
        model_version: {
          type: 'string',
          description:
            'Initial version of the model (e.g. V_0-1-0, defaults to V_0-1-0). The model is scaffolded against the adopted L1 spec iNNfo_V_0-2-0.',
        },
        root: { type: 'string', description: 'Optional models root directory override' },
      },
      required: ['id', 'template_url', 'template_name'],
    },
  },
  {
    name: 'list_templates',
    description:
      'List all available Level 2 spec templates across local workspace, global environment, and installed skills',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Optional workspace root directory override' },
      },
    },
  },
  {
    name: 'hydrate_template',
    description:
      'Hydrate (copy) a Level 2 spec template from global or skill store into active workspace templates directory',
    inputSchema: {
      type: 'object',
      properties: {
        template_name: {
          type: 'string',
          description: 'Name of template to hydrate (e.g. workspace_spec_NN)',
        },
        root: { type: 'string', description: 'Optional workspace root directory override' },
        target_dir: {
          type: 'string',
          description: 'Optional target directory override (defaults to ./templates/)',
        },
      },
      required: ['template_name'],
    },
  },
  {
    name: 'prune_orphaned_specs',
    description:
      'Analyze reference reachability across models, templates, and entrypoints and safely prune orphaned specs with automatic backup archive generation',
    inputSchema: {
      type: 'object',
      properties: {
        dry_run: {
          type: 'boolean',
          description: 'Report orphaned candidates without deleting (defaults to true)',
        },
        backup: {
          type: 'boolean',
          description:
            'Create a zip archive snapshot in .backup/ before deletion (defaults to true)',
        },
        root: { type: 'string', description: 'Optional workspace root directory override' },
      },
    },
  },
  {
    name: 'list_template_procedures',
    description:
      'List all procedures defined in a template and its transitively included templates up to depth 10',
    inputSchema: {
      type: 'object',
      properties: {
        model_path: { type: 'string', description: 'Optional model file path or ID' },
        model_id: { type: 'string', description: 'Optional model ID' },
        template_name: { type: 'string', description: 'Optional template name' },
        version: { type: 'string', description: 'Optional template version' },
        url: { type: 'string', description: 'Optional template URL' },
        root: { type: 'string', description: 'Optional workspace root directory override' },
      },
    },
  },
  {
    name: 'list_template_skills',
    description:
      'List all agent skills defined in a template and its transitively included templates up to depth 10',
    inputSchema: {
      type: 'object',
      properties: {
        model_path: { type: 'string', description: 'Optional model file path or ID' },
        model_id: { type: 'string', description: 'Optional model ID' },
        template_name: { type: 'string', description: 'Optional template name' },
        version: { type: 'string', description: 'Optional template version' },
        url: { type: 'string', description: 'Optional template URL' },
        root: { type: 'string', description: 'Optional workspace root directory override' },
      },
    },
  },
]

/* ── Tool call dispatcher ────────────────────────────────────── */

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    switch (name) {
      case 'list_models':
        return await handleListModels(args)
      case 'read_model':
        return await handleReadModel(args)
      case 'get_spec':
        return await handleGetSpec(args)
      case 'get_template':
        return await handleGetTemplate(args)
      case 'validate_model':
        return await handleValidateModel(args)
      case 'apply_change':
        return await handleApplyChange(args)
      case 'validate_model_url':
        return await handleValidateModelUrl(args)
      case 'validate_template':
        return await handleValidateTemplate(args)
      case 'init_model':
        return await handleInitModel(args)
      case 'list_templates':
        return await handleListTemplates(args)
      case 'hydrate_template':
        return await handleHydrateTemplate(args)
      case 'prune_orphaned_specs':
        return await handlePruneOrphanedSpecs(args)
      case 'list_template_procedures':
        return await handleListTemplateProcedures(args)
      case 'list_template_skills':
        return await handleListTemplateSkills(args)
      default:
        return errorResult(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return errorResult(String(err))
  }
}

/* ── Handlers ────────────────────────────────────────────────── */

async function handleListModels(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR
  const models = await listModels(root)
  return textResult(JSON.stringify(models, null, 2))
}

async function handleReadModel(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string
  if (!id) return errorResult('Missing required argument: id')
  const root = (args.root as string) || ROOT_DIR
  const model = await readModel(root, id)
  if (!model) return errorResult(`Model not found: ${id}`)
  return textResult(JSON.stringify(model, null, 2))
}

async function handleGetSpec(args: Record<string, unknown>): Promise<CallToolResult> {
  const url = args.url as string | undefined
  const modelId = args.model_id as string | undefined
  if (!url && !modelId) return errorResult('Provide either url or model_id')
  const result = await getSpec(ROOT_DIR, { url, modelId })
  if (!result.spec) return errorResult('Spec could not be resolved from the provided url/model_id')
  return textResult(JSON.stringify(result, null, 2))
}

async function handleGetTemplate(args: Record<string, unknown>): Promise<CallToolResult> {
  const url = args.url as string | undefined
  const modelId = args.model_id as string | undefined
  const name = args.name as string | undefined

  let template = null
  if (url) {
    template = await getTemplateFromUrl(ROOT_DIR, url, name ?? deriveNameFromUrl(url))
  } else if (modelId) {
    template = await getTemplateFromModel(ROOT_DIR, modelId)
  } else {
    return errorResult('Provide either url or model_id')
  }

  if (!template) return errorResult('Template could not be resolved from the provided url/model_id')
  return textResult(JSON.stringify(template, null, 2))
}

async function handleValidateModel(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string | undefined
  const content = args.content as string | undefined
  const templateUrl = args.template_url as string | undefined
  if (!id && !content) return errorResult('Provide either id or content')
  const root = (args.root as string) || ROOT_DIR
  const result = await validateModel(root, id, content, templateUrl)
  return textResult(JSON.stringify(result, null, 2))
}

async function handleValidateModelUrl(args: Record<string, unknown>): Promise<CallToolResult> {
  const modelUrl = args.model_url as string | undefined
  if (!modelUrl) return errorResult('Missing required argument: model_url')
  const templateUrl = args.template_url as string | undefined
  const result = await validateModelUrl(ROOT_DIR, modelUrl, templateUrl)
  return textResult(JSON.stringify(result, null, 2))
}

async function handleApplyChange(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string
  const op = args.op as string
  const opArgs = args.args as Record<string, unknown>
  if (!id || !op || !opArgs) {
    return errorResult('Missing required arguments: id, op, args')
  }
  const result = await applyChange(ROOT_DIR, id, op, opArgs)
  return textResult(JSON.stringify(result, null, 2))
}

async function handleValidateTemplate(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string | undefined
  const content = args.content as string | undefined
  const url = args.url as string | undefined
  if (!id && !content) return errorResult('Provide either id or content')
  const root = (args.root as string) || ROOT_DIR
  const result = await validateTemplate(root, id, content, url)
  return textResult(JSON.stringify(result, null, 2))
}

async function handleInitModel(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string
  const template_url = args.template_url as string
  const template_name = args.template_name as string
  const title = args.title as string | undefined
  const model_version = args.model_version as string | undefined
  const root = (args.root as string) || ROOT_DIR
  if (!id || !template_url || !template_name) {
    return errorResult('Missing required arguments: id, template_url, template_name')
  }
  const result = await initModel(root, id, { template_url, template_name, title, model_version })
  return textResult(JSON.stringify(result, null, 2))
}

async function handleListTemplates(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR
  const templates = await listTemplates(root)
  return textResult(JSON.stringify(templates, null, 2))
}

async function handleHydrateTemplate(args: Record<string, unknown>): Promise<CallToolResult> {
  const templateName = args.template_name as string
  if (!templateName) return errorResult('Missing required argument: template_name')
  const root = (args.root as string) || ROOT_DIR
  const targetDir = args.target_dir as string | undefined
  const result = await hydrateTemplate(root, templateName, { targetDir })
  return textResult(JSON.stringify(result, null, 2))
}

async function handlePruneOrphanedSpecs(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR
  const dry_run = args.dry_run !== undefined ? Boolean(args.dry_run) : true
  const backup = args.backup !== undefined ? Boolean(args.backup) : true
  const result = await pruneOrphanedSpecs(root, { dry_run, backup })
  return textResult(JSON.stringify(result, null, 2))
}

async function handleListTemplateProcedures(
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR
  const result = await listTemplateProcedures(root, {
    model_path: args.model_path as string | undefined,
    model_id: args.model_id as string | undefined,
    template_name: args.template_name as string | undefined,
    version: args.version as string | undefined,
    url: args.url as string | undefined,
  })
  return textResult(JSON.stringify(result, null, 2))
}

async function handleListTemplateSkills(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR
  const result = await listTemplateSkills(root, {
    model_path: args.model_path as string | undefined,
    model_id: args.model_id as string | undefined,
    template_name: args.template_name as string | undefined,
    version: args.version as string | undefined,
    url: args.url as string | undefined,
  })
  return textResult(JSON.stringify(result, null, 2))
}

/* ── Response helpers ────────────────────────────────────────── */

function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] }
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

/* ── Handlers ────────────────────────────────────────────────── */

server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return { tools: toolDefinitions }
})

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params
  return dispatchTool(name, (args ?? {}) as Record<string, unknown>)
})

/* ── Start ──────────────────────────────────────────────────── */

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Only auto-start the stdio transport when this file is run directly
// (e.g. `node dist/server.js`), never when imported by tests or other modules.
const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error starting innfo-mcp:', err)
    process.exit(1)
  })
}
