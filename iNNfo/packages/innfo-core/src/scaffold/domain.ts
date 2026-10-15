import { slugify } from '../parser/slug.js'

/**
 * The pure plan of an empty, conformant domaiNN container. One plan feeds every
 * domain scaffolder (`init_domain` in the MCP and `migrate-domain.js
 * --import-as-source`), so the layout and the manifest cannot drift apart.
 */

/** Canonical bluepriNNt URL of the `domaiNN` manifest. */
export const DOMAIN_BLUEPRINT_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md'

/** Canonical folders of a domaiNN (`workspace-directory-conventions`) plus `changes/`. */
export const DOMAIN_DIRS = [
  'kNNowledge',
  'sources/import',
  'sources/conversations',
  'conversations',
  'artifacts',
  'procedures',
  'staging',
  'changes',
] as const

export const DOMAIN_MANIFEST_FILE = 'domaiNN_NN.md'

export interface DomainScaffoldInput {
  /** Display name of the domaiNN (the manifest `title`). */
  name: string
  /** Defaults to `slugify(name)`. */
  workspaceId?: string
}

export interface DomainScaffoldPlan {
  /** Workspace-relative folders, parents before children. */
  dirs: string[]
  /** Workspace-relative files and their full text. */
  files: Array<{ path: string; content: string }>
  workspaceId: string
}

const NOTICE = `> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.`

export function planDomainScaffold(input: DomainScaffoldInput): DomainScaffoldPlan {
  const name = input.name.trim()
  const workspaceId = (input.workspaceId?.trim() || slugify(name)).trim()
  const esc = (s: string) => JSON.stringify(s)
  // A heading is one line: collapse any line breaks or runs of whitespace in the name.
  const heading = name.split(/\s+/).join(' ')

  const manifest = [
    '---',
    'level: 3',
    'parent_spec:',
    '  name: "domaiNN"',
    `  url: ${esc(DOMAIN_BLUEPRINT_URL)}`,
    'knowledge_version: "V_0-1-0"',
    `title: ${esc(name)}`,
    `workspace_id: ${esc(workspaceId)}`,
    '---',
    '',
    NOTICE,
    '',
    '# NN index',
    '',
    '* [[domaiNN]]',
    '',
    '# NN domaiNN',
    '',
    `## NN domaiNN: ${heading}`,
    'knowledge_dir:: kNNowledge/',
    'blueprints_dir:: specs/bluepriNNts/',
    `${heading} — an empty domaiNN. Add models with an add_model changeset; every change to its content goes through a changeset.`,
    '',
  ].join('\n')

  return {
    dirs: [...DOMAIN_DIRS],
    files: [
      { path: DOMAIN_MANIFEST_FILE, content: manifest },
      { path: '.gitattributes', content: '* -text\n' },
    ],
    workspaceId,
  }
}
