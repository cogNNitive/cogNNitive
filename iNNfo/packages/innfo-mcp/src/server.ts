#!/usr/bin/env node

/**
 * innfo-mcp — MCP server wrapping @cognnitive/innfo-core.
 *
 * Exposes semantic iNNfo tools over stdio transport for consumption by
 * MCP clients such as OpenCode Desktop.
 *
 * Every tool is ONE entry in `TOOL_REGISTRY` (definition + handler). The
 * ListTools result, the call dispatcher, and the tool count all derive from
 * that table — adding a tool is a single edit, with no separate switch arm or
 * count to keep in sync (see the registry section below).
 *
 * Every tool result is a versioned machine envelope: the payload keys are
 * preserved at the top level alongside a `version` field of the form
 * `innfo-<tool>@<major>`. Consumers MUST check the version before parsing;
 * optional fields may be added within a major, breaking shape or meaning
 * changes require a new major (see packages/innfo-core/src/envelope.ts).
 */

import { pathToFileURL } from 'node:url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { ListToolsResult, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'

import { listKnowledge, readKnowledge } from './tools/list-read.js'
import {
  getSpec,
  getBlueprintFromUrl,
  getBlueprintFromModel,
  deriveNameFromUrl,
  listBlueprints,
  hydrateBlueprint,
  listBlueprintProcedures,
  listBlueprintSkills,
} from './tools/spec.js'
import {
  validateKnowledge,
  validateKnowledgeUrl,
  applyChange,
  validateBlueprint,
  initKnowledge,
} from './tools/mutate.js'
import { checkDomain } from './tools/check-workspace.js'
import { queryUnits } from './tools/query-units.js'
import { cognitivizeTool } from './tools/cognitivize.js'
import { resolveSources } from './tools/resolve-sources.js'
import { findRepoRoot } from './tools/repo-root.js'
import { syncDomainManifest } from './tools/workspace-sync.js'
import { applyWithConsole, regenerateConsole, buildNextSteps } from './tools/console-regeneration.js'
import { proposeChangeset } from './tools/propose-changeset.js'
import { initDomain } from './tools/init-domain.js'
import { pruneChangesets } from './tools/prune-changesets.js'
import { envelope, envelopeList } from '@cognnitive/innfo-core'

/**
 * Root directory for knowledge scanning and `specs/` placement.
 *
 * Defaults to the repo root found by walking up from `process.cwd()` (so
 * `specs/` always lands inside the repo, not in some ambiguous
 * sibling/parent directory when the server is started from an unexpected
 * cwd), falling back to `process.cwd()` itself when no `.git` is found.
 */
export const ROOT_DIR: string =
  process.env.INNFO_DOMAIN_DIR ?? findRepoRoot(process.cwd()) ?? process.cwd()

// MCP server version: injected at build time by tsup via `define`, so the
// standalone bundle (bin/innfo-mcp.bundle.js) stays self-contained when
// installed flat (e.g. ~/.agents/mcp/) — it never reads a sibling
// package.json at boot.
declare const __INNFO_MCP_VERSION__: string

export const server = new Server(
  { name: 'innfo-mcp', version: typeof __INNFO_MCP_VERSION__ !== 'undefined' ? __INNFO_MCP_VERSION__ : '0.11.0' },
  { capabilities: { tools: {} } },
)

/* ── Tool registry ───────────────────────────────────────────── */

type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>

interface ToolEntry {
  definition: Tool
  handler: ToolHandler
}

/**
 * Single source of truth for the MCP tool surface: each entry pairs a tool's
 * JSON definition with the handler that serves it. Adding/removing a tool is a
 * one-entry change — `toolDefinitions`, `TOOL_COUNT`, and the dispatcher all
 * derive from this list.
 */
const TOOL_REGISTRY: ReadonlyArray<ToolEntry> = [
  {
    definition: {
      name: 'list_knowledge',
      description: 'Scan the knowledge directory and list all iNNfo knowledge documents',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Optional override domain directory to scan' },
          root: { type: 'string', description: 'Optional override domain directory to scan (alias for domain)' },
        },
      },
    },
    handler: handleListKnowledge,
  },
  {
    definition: {
      name: 'read_knowledge',
      description:
        "Parse and return an iNNfo knowledge document's full structure by its id. For surgical work prefer bounded slices: pass concept (+ element) with max_lines (default 150); slices over the cap truncate with truncated=true unless override_reason records a manual override",
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Knowledge id (filename stem, e.g. Ghostbusters_V_0-1-0_business)',
          },
          knowledge_id: {
            type: 'string',
            description: 'Knowledge id (alias for id)',
          },
          domain: {
            type: 'string',
            description: 'Optional domain root directory override',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
          concept: {
            type: 'string',
            description: 'Optional concept slice (e.g. Models); returns only that concept',
          },
          element: {
            type: 'string',
            description: 'Optional element slice within the concept',
          },
          max_lines: {
            type: 'number',
            description: 'Line cap for the returned slice (default 150)',
          },
          override_reason: {
            type: 'string',
            description: 'Recorded reason to bypass the line cap for wide context',
          },
          intent: {
            type: 'string',
            description:
              'Optional intent class for this call (coach, surgical, verify, or match); omit for current behavior (no-op default)',
          },
        },
      },
    },
    handler: handleReadKnowledge,
  },
  {
    definition: {
      name: 'get_spec',
      description:
        'Resolve the iNNfo specification (level-1) from an explicit url or from a loaded knowledge document. Provide either url or knowledge_id — the URL is never taken from an internal constant',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Explicit spec/blueprint URL to resolve the parent chain from',
          },
          knowledge_id: {
            type: 'string',
            description: 'Knowledge id whose frontmatter parent_spec.url seeds resolution',
          },
          in_place: {
            type: 'boolean',
            description:
              'Write fetched blueprints inside the domain tree (default false = OS temp cache, tree stays clean)',
          },
        },
      },
    },
    handler: handleGetSpec,
  },
  {
    definition: {
      name: 'get_blueprint',
      description:
        'Resolve an iNNfo blueprint (level-2) from an explicit url or from a loaded knowledge document. Provide either url or knowledge_id — blueprint names/URLs are never hardcoded',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Explicit blueprint URL to resolve from' },
          knowledge_id: {
            type: 'string',
            description: 'Knowledge id whose parent_spec.url points to its blueprint',
          },
          name: {
            type: 'string',
            description: 'Optional chain-start name; derived from the url when omitted',
          },
          in_place: {
            type: 'boolean',
            description:
              'Write fetched blueprints inside the domain tree (default false = OS temp cache, tree stays clean)',
          },
        },
      },
    },
    handler: handleGetBlueprint,
  },
  {
    definition: {
      name: 'validate_knowledge',
      description:
        'Validate an iNNfo knowledge document against its blueprint. Provide id (file on disk) or content (raw text). The blueprint is resolved from the knowledge parent_spec.url, or from an optional blueprint_url',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Knowledge id (reads from disk)' },
          knowledge_id: { type: 'string', description: 'Knowledge id (alias for id)' },
          content: { type: 'string', description: 'Raw knowledge content string (inline)' },
          domain: {
            type: 'string',
            description: 'Optional domain root directory override (used only with id mode)',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
          blueprint_url: {
            type: 'string',
            description:
              'Optional explicit blueprint URL when the knowledge document has no resolvable parent_spec.url',
          },
          baseline_path: {
            type: 'string',
            description:
              'Optional path to a versioned validation-baseline.json: only NEW errors surface, known errors are suppressed and counted with a backlog link',
          },
          in_place: {
            type: 'boolean',
            description:
              'Write fetched blueprints inside the domain tree (default false = OS temp cache, tree stays clean)',
          },
          scope_domain: {
            type: 'boolean',
            description:
              "Optional domain-scope mode (default false = single-file behavior). When true, also runs cross-document reference validation across the whole domain.",
          },
          intent: {
            type: 'string',
            description:
              'Optional intent class for this call (coach, surgical, verify, or match); omit for current behavior (no-op default)',
          },
        },
      },
    },
    handler: handleValidateKnowledge,
  },
  {
    definition: {
      name: 'apply_change',
      description:
        'Apply an intent-level change or changeset to knowledge documents and re-validate. Supports two-phase execution (validate, then persist atomically) from changes/ documents or bare intent operations. ' +
        'Every operation that mutates a Level-3 kNNowledge model (including freeze_slugs and bump_version) is synthesized into a sealed, recorded changeset; only generate_index and the Level-2 bluepriNNt authoring operations (add_concept, add_field, set_marker, bump_version on a bluepriNNt) write directly. ' +
        'After an applied or partially applied changeset the domain console is regenerated and opened in a browser tab (pass open: false to skip). ' +
        'The result carries console (the regeneration outcome) and next_steps: you MUST relay next_steps.notice to the user.',
      inputSchema: {
        type: 'object',
        properties: {
          changeset: {
            type: 'string',
            description: 'Path to changeset document in changes/ (e.g. changes/ws_agent_changes_NN.md)',
          },
          changeset_path: {
            type: 'string',
            description: 'Path to changeset document (alias for changeset)',
          },
          id: { type: 'string', description: 'Knowledge id (for bare mutation calls)' },
          knowledge_id: { type: 'string', description: 'Knowledge id (alias for id)' },
          domain: {
            type: 'string',
            description:
              'Optional domain root override (defaults to the server root).',
          },
          root: {
            type: 'string',
            description:
              'Optional domain root override (alias for domain).',
          },
          op: {
            type: 'string',
            description: 'Operation to perform (for bare mutation calls)',
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
              'freeze_slugs',
            ],
          },
          args: {
            type: 'object',
            description:
              'Operation-specific arguments for bare mutation calls. For update_field: { conceptName, elementName, fieldName, value }. For generate_index: { taxonomy? }. For bump_version: { bump: "major" | "minor" | "patch" } (default patch). freeze_slugs takes no args. add_concept, add_field and set_marker are refused on a Level-3 model (SCHEMA_OP_ON_LEVEL3).',
          },
          open: {
            type: 'boolean',
            description:
              'Open the regenerated domain console in a browser tab (default true). When false, next_steps.notice gives the file path to open manually.',
          },
        },
      },
    },
    handler: handleApplyChange,
  },
  {
    definition: {
      name: 'regenerate_console',
      description:
        'Regenerate the domain console (or one model-scoped console) and open it in a browser tab. Idempotent: an up-to-date console is reported as unchanged. ' +
        'Also the retry path after an apply whose console regeneration failed. The result carries console and next_steps: you MUST relay next_steps.notice to the user.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Optional domain root override (defaults to the server root).' },
          root: { type: 'string', description: 'Optional domain root override (alias for domain).' },
          model: {
            type: 'string',
            description: 'Optional model id: regenerate the console scoped to this model instead of the whole domain.',
          },
          open: {
            type: 'boolean',
            description: 'Open the regenerated console in a browser tab (default true).',
          },
        },
      },
    },
    handler: handleRegenerateConsole,
  },
  {
    definition: {
      name: 'propose_changeset',
      description:
        'Write a sealed changeset with status proposed under changes/ from a structured list of operations, then regenerate and open the domain console so the user can review it. It never applies the changeset. ' +
        'You derive the operations (update_field, add_element, remove_element, rename_element, rename_concept, update_matrix_cell, update_concept_text, comment, add_model, freeze_slugs, bump_version); the tool does not interpret conversations. ' +
        'Validation runs before any write: an unknown model, an add_model on an existing model, or an operation missing required keys returns errors and writes nothing. ' +
        'The result carries changeset, console and next_steps: you MUST relay next_steps.notice to the user. When the user replies OK, call apply_change with next_steps.approve.changeset.',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description:
              'Change objects using the changeset keys: op, target, from, to, concept, name, slug, fields, notes, sources (evidence citation), base_hash, author. add_model also takes blueprint_name, blueprint_url and optional knowledge_version; initial content is add_element changes that follow it and target the new id. freeze_slugs and bump_version target a bare model id; bump_version carries its level (patch, minor or major) in to. sources is a single citation string, not an array.',
            items: { type: 'object' },
          },
          title: { type: 'string', description: 'Title of the changeset.' },
          author: { type: 'string', description: 'Author recorded on the changeset (default agent).' },
          domain: { type: 'string', description: 'Optional domain root override (defaults to the server root).' },
          root: { type: 'string', description: 'Optional domain root override (alias for domain).' },
          open: {
            type: 'boolean',
            description: 'Open the regenerated domain console in a browser tab (default true).',
          },
        },
        required: ['operations'],
      },
    },
    handler: handleProposeChangeset,
  },
  {
    definition: {
      name: 'init_domain',
      description:
        'Create an empty, conformant domaiNN container in a new directory: the canonical folders (kNNowledge/, sources/import/, sources/conversations/, conversations/, artifacts/, procedures/, staging/, changes/), a .gitattributes with * -text and a domaiNN_NN.md manifest listing no models. ' +
        'Refuses a directory that exists and is not empty. It is not a changeset; add models afterwards with an add_model changeset (propose_changeset) or init_knowledge. ' +
        'Migration recipe: init_domain for a NEW domain, import the old domain as a source (migrate-domain.js --import-as-source), derive add_model/add_element changes that cite it through sources::, propose_changeset, review, apply_change.',
      inputSchema: {
        type: 'object',
        properties: {
          dir: { type: 'string', description: 'Directory of the new domain (must not exist or be empty).' },
          name: { type: 'string', description: 'Display name of the domain (the manifest title).' },
          workspace_id: {
            type: 'string',
            description: 'Optional workspace_id recorded in the manifest and used in changeset file names (defaults to the slug of name).',
          },
        },
        required: ['dir', 'name'],
      },
    },
    handler: handleInitDomain,
  },
  {
    definition: {
      name: 'validate_knowledge_url',
      description:
        'Validate an iNNfo knowledge document fetched from a URL without writing to disk. Accepts a knowledge URL and optional blueprint_url. Returns validation results.',
      inputSchema: {
        type: 'object',
        properties: {
          knowledge_url: {
            type: 'string',
            description: 'URL pointing to the iNNfo knowledge content to validate',
          },
          blueprint_url: {
            type: 'string',
            description:
              'Optional explicit blueprint URL when the knowledge document has no resolvable parent_spec.url',
          },
        },
        required: ['knowledge_url'],
      },
    },
    handler: handleValidateKnowledgeUrl,
  },
  {
    definition: {
      name: 'validate_blueprint',
      description:
        'Validate a Level 2 blueprint against its Level 1 parent spec with frontmatter level-2 auto-detection and parent resolution failure diagnostics',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Blueprint id (reads from disk)' },
          content: { type: 'string', description: 'Raw blueprint content string (inline)' },
          url: { type: 'string', description: 'Explicit parent spec URL override' },
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
        },
      },
    },
    handler: handleValidateBlueprint,
  },
  {
    definition: {
      name: 'init_knowledge',
      description:
        'Create a new level-3 knowledge document. Create-only: it is a wrapper over a one-change add_model changeset (written to changes/ and applied), so the creation is recorded as a change. ' +
        'It scaffolds canonical YAML frontmatter and a starter body (index block + one section per Concept) from the resolved blueprint schema; an unresolvable blueprint fails and writes nothing. ' +
        'An existing id fails with MODEL_EXISTS and the file is untouched (it never repairs or rewrites a document). ' +
        'Returns filePath, content and changeset on success (none of them on failure), plus console and next_steps: you MUST relay next_steps.notice to the user.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Knowledge ID/filename stem (e.g. arenzano_V_0-1-0_cogNNitive)',
          },
          blueprint_url: { type: 'string', description: 'Immutable URL of the parent blueprint' },
          blueprint_name: {
            type: 'string',
            description: 'Name of the parent blueprint (e.g. cogNNitive_V_0-1-0)',
          },
          title: { type: 'string', description: 'Logical title of the knowledge document (defaults to ID)' },
          knowledge_version: {
            type: 'string',
            description:
              'Initial version of the knowledge document (e.g. V_0-1-0). When omitted it is inferred from the resolved parent blueprint (blueprint_version, else spec_version, else V_0-1-0). An explicit value that differs from the parent version is accepted.',
          },
          open: {
            type: 'boolean',
            description: 'Open the regenerated domain console in a browser tab (default true).',
          },
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
        },
        required: ['id', 'blueprint_url', 'blueprint_name'],
      },
    },
    handler: handleInitKnowledge,
  },
  {
    definition: {
      name: 'list_blueprints',
      description:
        'List all available Level 2 spec blueprints across local domain, global environment, and installed skills',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
        },
      },
    },
    handler: handleListBlueprints,
  },
  {
    definition: {
      name: 'hydrate_blueprint',
      description:
        'Hydrate (copy) a Level 2 spec blueprint from global or skill store into active domain blueprints directory',
      inputSchema: {
        type: 'object',
        properties: {
          blueprint_name: {
            type: 'string',
            description: 'Name of blueprint to hydrate (e.g. business_V_0-1-0)',
          },
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
          target_dir: {
            type: 'string',
            description: 'Optional target directory override (defaults to ./specs/bluepriNNts/)',
          },
        },
        required: ['blueprint_name'],
      },
    },
    handler: handleHydrateBlueprint,
  },
  {
    definition: {
      name: 'sync_domain_manifest',
      description:
        'Reconcile the domain manifest ## NN Knowledge entries against discovered Level-3 knowledge files: additively appends new entries, archives entries whose file disappeared, and reactivates tool-owned entries whose file returned. Never touches hand-authored entries lacking the <!-- nn:auto --> ownership marker. Defaults to a dry run.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
          dry_run: {
            type: 'boolean',
            description: 'Report computed changes/diff without writing (defaults to true)',
          },
        },
      },
    },
    handler: handleSyncDomainManifest,
  },
  {
    definition: {
      name: 'check_domain',
      description:
        'Run one consolidated domain integrity pass over every Level-3 knowledge document: validate each against its blueprint and traceability, self-heal missing blueprint packages/specs (write-once hydration), classify each pinned blueprint version against the published catalog, compare the managed sections of the lineage record with a fresh projection (error LINEAGE_DRIFT in the lineage field of the report; read-only), and return one report with a per-knowledge status and a domain aggregate. Non-blocking and informational — validation failures never fail the tool.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Optional domain root directory override (default: server root)',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
          summary_only: {
            type: 'boolean',
            description:
              'Omit clean knowledge documents; return the aggregate plus failing/upgrade-available documents only (capped at 25). Default false.',
          },
          offline: {
            type: 'boolean',
            description:
              'Skip all network: no catalog fetch, no hydration, no freshness. Default false.',
          },
        },
      },
    },
    handler: handleCheckDomain,
  },
  {
    definition: {
      name: 'query_units',
      description:
        'Run a read-only content query over one workspace file and return matching knowledge-unit URIs: "path?filter=value[&filter...][&projection]". Filters use exact match (trimmed, case-insensitive); a trailing bare segment projects one column/field over the matches. Capped at 100 results with truncated=true. Pass max_values_chars to cap projected value characters for slice-only surgical reads. Never writes files.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query string, e.g. "sources/import/m.csv?segmento=Enterprise&mrr_usd"',
          },
          domain: {
            type: 'string',
            description: 'Optional domain root directory override (default: server root)',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
          max_values_chars: {
            type: 'number',
            description: 'Optional cap on total projected value characters',
          },
          intent: {
            type: 'string',
            description:
              'Optional intent class for this call (coach, surgical, verify, or match); omit for current behavior (no-op default)',
          },
        },
        required: ['query'],
      },
    },
    handler: handleQueryUnits,
  },
  {
    definition: {
      name: 'cognitivize',
      description:
        'Create or refresh the sidecar (`<file>_sidecar_NN.md`) of one raw markdown, CSV, or JSON file in place, so it can be cited. Binary formats (pdf, docx, images, ...) are never converted here: the result has status `requires-cli` and nothing is written (use the nn-sources CLI). Paths outside the workspace, sidecars, and NN documents are rejected.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Domain-relative path of the raw file, e.g. "sources/import/notes.md"',
          },
          domain: {
            type: 'string',
            description: 'Optional domain root directory override (default: server root)',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
        },
        required: ['path'],
      },
    },
    handler: handleCognitivize,
  },
  {
    definition: {
      name: 'resolve_sources',
      description:
        'Read-only: resolve an element\'s citation-typed field(s) to their underlying file, anchor, and content. Returns one entry per citation reference: {path, anchor, exists, field, origin, author?, excerpt?, sha256?, version?, error?}. `origin` classifies who produced the cited content ("agent" | "human" | "document"), resolved from the `author::` of the `## NN Change:` block the citation anchors to. Omit fieldName to resolve across every citation-typed field on the element (name-based sources/source plus any schema-declared type:: citation field). Never writes files.',
      inputSchema: {
        type: 'object',
        properties: {
          knowledge_id: { type: 'string', description: 'Knowledge id (filename stem)' },
          model: { type: 'string', description: 'Knowledge id (alias for knowledge_id)' },
          elementId: { type: 'string', description: 'Element name within the knowledge document' },
          fieldName: {
            type: 'string',
            description: 'Optional: restrict resolution to this single field',
          },
          domain: {
            type: 'string',
            description: 'Optional domain root directory override (default: server root)',
          },
          root: {
            type: 'string',
            description: 'Optional domain root directory override (alias for domain)',
          },
        },
        required: ['elementId'],
      },
    },
    handler: handleResolveSources,
  },
  {
    definition: {
      name: 'list_blueprint_procedures',
      description:
        'List all procedures defined in a blueprint and its transitively included blueprints up to depth 10',
      inputSchema: {
        type: 'object',
        properties: {
          knowledge_path: { type: 'string', description: 'Optional knowledge file path or ID' },
          model_path: { type: 'string', description: 'Optional knowledge file path or ID (alias for knowledge_path)' },
          knowledge_id: { type: 'string', description: 'Optional knowledge ID' },
          model_id: { type: 'string', description: 'Optional knowledge ID (alias for knowledge_id)' },
          blueprint_name: { type: 'string', description: 'Optional blueprint name' },
          version: { type: 'string', description: 'Optional blueprint version' },
          url: { type: 'string', description: 'Optional blueprint URL' },
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
        },
      },
    },
    handler: handleListBlueprintProcedures,
  },
  {
    definition: {
      name: 'list_blueprint_skills',
      description:
        'List all agent skills defined in a blueprint and its transitively included blueprints up to depth 10. Skills shipped inside a package under skills/<name>/SKILL.md are returned with embedded: true and a resolved absolute path.',
      inputSchema: {
        type: 'object',
        properties: {
          knowledge_path: { type: 'string', description: 'Optional knowledge file path or ID' },
          model_path: { type: 'string', description: 'Optional knowledge file path or ID (alias for knowledge_path)' },
          knowledge_id: { type: 'string', description: 'Optional knowledge ID' },
          model_id: { type: 'string', description: 'Optional knowledge ID (alias for knowledge_id)' },
          blueprint_name: { type: 'string', description: 'Optional blueprint name' },
          version: { type: 'string', description: 'Optional blueprint version' },
          url: { type: 'string', description: 'Optional blueprint URL' },
          domain: { type: 'string', description: 'Optional domain root directory override' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
        },
      },
    },
    handler: handleListBlueprintSkills,
  },
  {
    definition: {
      name: 'prune_changesets',
      description:
        'Scan all knowledge documents in the domain for cited changesets and remove the unreferenced, finished (applied or rejected) changesets from changes/, then refresh the domain manifest. Proposed, conflict, partially applied and unreadable changesets are never removed. It does not regenerate index.md or the console.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Optional domain root directory override (default: server root)' },
          root: { type: 'string', description: 'Optional domain root directory override (alias for domain)' },
          dryRun: { type: 'boolean', description: 'If true, only report which changesets would be removed without deleting files (default false)' },
        },
      },
    },
    handler: handlePruneChangesets,
  },
]

/** Tool definitions advertised by ListTools — derived from the registry. */
export const toolDefinitions: Tool[] = TOOL_REGISTRY.map((entry) => entry.definition)

/** Number of registered tools — single source for the count (no brittle literal). */
export const TOOL_COUNT = TOOL_REGISTRY.length

/* ── Tool call dispatcher ────────────────────────────────────── */

const handlersByName = new Map<string, ToolHandler>(
  TOOL_REGISTRY.map((entry) => [entry.definition.name, entry.handler]),
)

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const handler = handlersByName.get(name)
    if (!handler) return errorResult(`Unknown tool: ${name}`)
    return await handler(args)
  } catch (err) {
    return errorResult(String(err))
  }
}

/* ── Handlers ────────────────────────────────────────────────── */

async function handleListKnowledge(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const knowledge = await listKnowledge(root)
  return textResult(JSON.stringify(envelopeList('innfo-list-knowledge', 'knowledge', knowledge), null, 2))
}

async function handleReadKnowledge(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = (args.knowledge_id as string) || (args.id as string)
  if (!id) return errorResult('Missing required argument: id')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const doc = await readKnowledge(root, id, {
    concept: args.concept as string | undefined,
    element: args.element as string | undefined,
    max_lines: args.max_lines as number | undefined,
    override_reason: args.override_reason as string | undefined,
  })
  if (!doc) return errorResult(`Knowledge document not found: ${id}`)
  return textResult(JSON.stringify(envelope('innfo-read-knowledge', doc), null, 2))
}

async function handleGetSpec(args: Record<string, unknown>): Promise<CallToolResult> {
  const url = args.url as string | undefined
  const knowledgeId = (args.knowledge_id as string) || (args.model_id as string)
  if (!url && !knowledgeId) return errorResult('Provide either url or knowledge_id')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await getSpec(
    root,
    { url, modelId: knowledgeId },
    { inPlace: args.in_place as boolean | undefined },
  )
  if (!result.spec) return errorResult('Spec could not be resolved from the provided url/knowledge_id')
  return textResult(JSON.stringify(envelope('innfo-get-spec', result), null, 2))
}

async function handleGetBlueprint(args: Record<string, unknown>): Promise<CallToolResult> {
  const url = args.url as string | undefined
  const knowledgeId = (args.knowledge_id as string) || (args.model_id as string)
  const name = (args.blueprint_name as string) || (args.name as string)
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR

  let blueprint = null
  if (url) {
    blueprint = await getBlueprintFromUrl(root, url, name ?? deriveNameFromUrl(url), {
      inPlace: args.in_place as boolean | undefined,
    })
  } else if (knowledgeId) {
    blueprint = await getBlueprintFromModel(root, knowledgeId, {
      inPlace: args.in_place as boolean | undefined,
    })
  } else {
    return errorResult('Provide either url or knowledge_id')
  }

  if (!blueprint) return errorResult('Blueprint could not be resolved from the provided url/knowledge_id')
  return textResult(JSON.stringify(envelope('innfo-get-blueprint', blueprint), null, 2))
}

async function handleValidateKnowledge(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = (args.knowledge_id as string) || (args.id as string)
  const content = args.content as string | undefined
  const blueprintUrl = (args.blueprint_url as string) || (args.template_url as string)
  const domainScope = Boolean(args.scope_domain ?? args.workspace)
  if (!id && !content) return errorResult('Provide either id or content')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await validateKnowledge(root, id, content, blueprintUrl, domainScope, {
    baselinePath: args.baseline_path as string | undefined,
    inPlace: args.in_place as boolean | undefined,
  })
  return textResult(JSON.stringify(envelope('innfo-validate-knowledge', result), null, 2))
}

async function handleValidateKnowledgeUrl(args: Record<string, unknown>): Promise<CallToolResult> {
  const knowledgeUrl = (args.knowledge_url as string) || (args.model_url as string)
  if (!knowledgeUrl) return errorResult('Missing required argument: knowledge_url')
  const blueprintUrl = (args.blueprint_url as string) || (args.template_url as string)
  const result = await validateKnowledgeUrl(ROOT_DIR, knowledgeUrl, blueprintUrl)
  return textResult(JSON.stringify(envelope('innfo-validate-knowledge-url', result), null, 2))
}

async function handleApplyChange(args: Record<string, unknown>): Promise<CallToolResult> {
  const changesetPath = (args.changeset_path as string) || (args.changeset as string)
  const id = (args.knowledge_id as string) || (args.id as string)
  const op = args.op as string | undefined
  const opArgs = (args.args as Record<string, unknown>) || {}

  if (!changesetPath && (!id || !op || !args.args)) {
    return errorResult('Missing required arguments: id, op, args')
  }

  const root = (args.domain as string) || (args.root as string) || ROOT_DIR

  const open = args.open === undefined ? true : Boolean(args.open)
  const run = () => (changesetPath ? applyChange(root, changesetPath) : applyChange(root, id!, op!, opArgs))
  const applied = await applyWithConsole(root, run, { open })
  const payload: Record<string, unknown> = { ...applied }
  return textResult(JSON.stringify(envelope('innfo-apply-change', payload), null, 2))
}

async function handleProposeChangeset(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const open = args.open === undefined ? true : Boolean(args.open)
  const result = await proposeChangeset(root, {
    operations: args.operations,
    title: typeof args.title === 'string' ? args.title : undefined,
    author: typeof args.author === 'string' ? args.author : undefined,
    open,
  })
  const text = JSON.stringify(envelope('innfo-propose-changeset', result), null, 2)
  return result.success ? textResult(text) : errorResult(text)
}

async function handleInitDomain(args: Record<string, unknown>): Promise<CallToolResult> {
  const dir = typeof args.dir === 'string' ? args.dir : ''
  const name = typeof args.name === 'string' ? args.name : ''
  if (!dir || !name) return errorResult('Missing required arguments: dir, name')
  const workspaceId = typeof args.workspace_id === 'string' ? args.workspace_id : undefined
  const result = await initDomain(dir, name, workspaceId)
  const text = JSON.stringify(envelope('innfo-init-domain', result), null, 2)
  return result.success ? textResult(text) : errorResult(text)
}

async function handlePruneChangesets(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const dryRun = Boolean(args.dryRun)
  const result = await pruneChangesets(root, { dryRun })
  const text = JSON.stringify(envelope('innfo-prune-changesets', result), null, 2)
  return result.success ? textResult(text) : errorResult(text)
}

async function handleRegenerateConsole(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const model = typeof args.model === 'string' && args.model !== '' ? args.model : undefined
  const open = args.open === undefined ? true : Boolean(args.open)
  const outcome = await regenerateConsole(root, { scope: model ? { model } : 'domain', open })
  const payload = {
    success: outcome.status !== 'failed',
    console: outcome,
    next_steps: buildNextSteps('regenerate', { console: outcome }),
  }
  return textResult(JSON.stringify(envelope('innfo-regenerate-console', payload), null, 2))
}

async function handleValidateBlueprint(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = (args.blueprint_id as string) || (args.id as string)
  const content = args.content as string | undefined
  const url = args.url as string | undefined
  if (!id && !content) return errorResult('Provide either id or content')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await validateBlueprint(root, id, content, url)
  return textResult(JSON.stringify(envelope('innfo-validate-blueprint', result), null, 2))
}

async function handleInitKnowledge(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = (args.knowledge_id as string) || (args.id as string)
  const blueprintUrl = (args.blueprint_url as string) || (args.template_url as string)
  const blueprintName = args.blueprint_name as string
  const title = args.title as string | undefined
  const knowledgeVersion = args.knowledge_version as string
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  if (!id || !blueprintUrl || !blueprintName) {
    return errorResult('Missing required arguments: id, blueprint_url, blueprint_name')
  }
  const open = args.open === undefined ? true : Boolean(args.open)
  const result = await initKnowledge(
    root,
    id,
    { blueprint_url: blueprintUrl, blueprint_name: blueprintName, title, knowledge_version: knowledgeVersion },
    { open },
  )
  return textResult(JSON.stringify(envelope('innfo-init-knowledge', result), null, 2))
}

async function handleListBlueprints(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const blueprints = await listBlueprints(root)
  return textResult(
    JSON.stringify(envelopeList('innfo-list-blueprints', 'blueprints', blueprints), null, 2),
  )
}

async function handleHydrateBlueprint(args: Record<string, unknown>): Promise<CallToolResult> {
  const blueprintName = args.blueprint_name as string
  if (!blueprintName) return errorResult('Missing required argument: blueprint_name')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const targetDir = args.target_dir as string | undefined
  const result = await hydrateBlueprint(root, blueprintName, { targetDir })
  return textResult(JSON.stringify(envelope('innfo-hydrate-blueprint', result), null, 2))
}

async function handleSyncDomainManifest(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const dryRun = args.dry_run !== undefined ? Boolean(args.dry_run) : true
  const result = await syncDomainManifest(root, { dry_run: dryRun })
  const payload: Record<string, unknown> = { ...result }
  return textResult(JSON.stringify(envelope('innfo-sync-domain-manifest', payload), null, 2))
}

async function handleCheckDomain(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const report = await checkDomain(root, {
    summaryOnly: Boolean(args.summary_only),
    offline: Boolean(args.offline),
  })
  return textResult(JSON.stringify(envelope('innfo-check-domain', report), null, 2))
}

async function handleQueryUnits(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await queryUnits(root, String(args.query ?? ''), {
    max_values_chars: args.max_values_chars as number | undefined,
  })
  return textResult(JSON.stringify(envelope('innfo-query-units', result), null, 2))
}

async function handleCognitivize(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const path = String(args.path ?? '')
  if (!path) return errorResult('Missing required argument: path')
  const result = await cognitivizeTool(root, path)
  const text = JSON.stringify(envelope('innfo-cognitivize', result), null, 2)
  return result.status === 'rejected' ? errorResult(text) : textResult(text)
}

async function handleResolveSources(args: Record<string, unknown>): Promise<CallToolResult> {
  const knowledgeId = (args.knowledge_id as string) || (args.model as string)
  const elementId = args.elementId as string
  if (!knowledgeId || !elementId) return errorResult('Missing required arguments: knowledge_id, elementId')
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const results = await resolveSources(root, {
    model: knowledgeId,
    elementId,
    fieldName: args.fieldName as string | undefined,
  })
  return textResult(
    JSON.stringify(envelopeList('innfo-resolve-sources', 'citations', results), null, 2),
  )
}

async function handleListBlueprintProcedures(
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await listBlueprintProcedures(root, {
    model_path: (args.knowledge_path as string) || (args.model_path as string),
    model_id: (args.knowledge_id as string) || (args.model_id as string),
    blueprint_name: args.blueprint_name as string,
    version: args.version as string | undefined,
    url: args.url as string | undefined,
  })
  return textResult(JSON.stringify(envelope('innfo-list-blueprint-procedures', result), null, 2))
}

async function handleListBlueprintSkills(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.domain as string) || (args.root as string) || ROOT_DIR
  const result = await listBlueprintSkills(root, {
    model_path: (args.knowledge_path as string) || (args.model_path as string),
    model_id: (args.knowledge_id as string) || (args.model_id as string),
    blueprint_name: args.blueprint_name as string,
    version: args.version as string | undefined,
    url: args.url as string | undefined,
  })
  return textResult(JSON.stringify(envelope('innfo-list-blueprint-skills', result), null, 2))
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
