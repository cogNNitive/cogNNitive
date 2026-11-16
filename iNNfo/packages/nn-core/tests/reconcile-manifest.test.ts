import { describe, it, expect } from 'vitest'
import { catalogKindOf, isReconcilableModel } from '../src/workspace/discoverModels'
import type { CandidateFile } from '../src/workspace/discoverModels'
import {
  OWNERSHIP_MARKER,
  reconcileManifest,
  type DiscoveredCatalog,
  type DiscoveredModel,
} from '../src/workspace/reconcileManifest'
import { parseKnowledge } from '../src/parser'

const MANIFEST_PATH = 'domaiNN_NN.md'

function candidate(path: string, frontmatter: Record<string, unknown>): CandidateFile {
  return { path, frontmatter }
}

describe('discoverModels: isReconcilableModel', () => {
  it('includes a level-3 domain model with parent_spec outside ignored dirs', () => {
    const file = candidate('startups/acme_business_NN.md', {
      level: 3,
      parent_spec: { name: 'business_V_0-2-0' },
    })
    expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(true)
  })

  it('excludes a file without level: 3', () => {
    const file = candidate('startups/acme_business_NN.md', {
      level: 2,
      parent_spec: { name: 'business_V_0-2-0' },
    })
    expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(false)
  })

  it('excludes a file without parent_spec', () => {
    const file = candidate('startups/acme_business_NN.md', { level: 3 })
    expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(false)
  })

  it('excludes a filename not matching *_NN.md', () => {
    const file = candidate('startups/acme_business.md', {
      level: 3,
      parent_spec: { name: 'business_V_0-2-0' },
    })
    expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(false)
  })

  it('excludes files inside backups/archive/specs', () => {
    const backups = candidate('backups/acme_business_NN.md', {
      level: 3,
      parent_spec: { name: 'business_V_0-2-0' },
    })
    const archive = candidate('archive/old_NN.md', {
      level: 3,
      parent_spec: { name: 'business_V_0-2-0' },
    })
    const specs = candidate('specs/business_V_0-2-0_spec_NN.md', {
      level: 2,
      parent_spec: { name: 'iNNfo_V_0-2-0' },
    })
    expect(isReconcilableModel(backups, MANIFEST_PATH)).toBe(false)
    expect(isReconcilableModel(archive, MANIFEST_PATH)).toBe(false)
    expect(isReconcilableModel(specs, MANIFEST_PATH)).toBe(false)
  })

  it('excludes the manifest file itself, matched by normalized path', () => {
    const file = candidate('./workspace_NN.md', {
      level: 3,
      parent_spec: { name: 'workspace_V_0-2-0' },
    })
    expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(false)
  })

  it('treats a cogNNitive template as ordinary knowledge (record role retired)', () => {
    const v1 = candidate('acme_cogNNitive_NN.md', {
      level: 3,
      parent_spec: { name: 'cogNNitive_V_0-1-0' },
    })
    const v2 = candidate('acme_cogNNitive_NN.md', {
      level: 3,
      parent_spec: { name: 'cogNNitive_V_0-2-0' },
    })
    expect(isReconcilableModel(v1, MANIFEST_PATH)).toBe(true)
    expect(isReconcilableModel(v2, MANIFEST_PATH)).toBe(true)
  })

  it('excludes catalog apps (procedures/sources/artifacts), any version', () => {
    const procedures = candidate('procedures_NN.md', {
      level: 3,
      parent_spec: { name: 'procedures' },
    })
    const proceduresVersioned = candidate('procedures/x_V_0-1-0_procedures_NN.md', {
      level: 3,
      parent_spec: { name: 'procedures_V_0-2-1' },
    })
    const sources = candidate('sources/sources_NN.md', {
      level: 3,
      parent_spec: { name: 'sources' },
    })
    const artifacts = candidate('artifacts/artifacts_NN.md', {
      level: 3,
      parent_spec: { name: 'artifacts' },
    })
    for (const file of [procedures, proceduresVersioned, sources, artifacts]) {
      expect(isReconcilableModel(file, MANIFEST_PATH)).toBe(false)
    }
  })
})

describe('reconcileManifest', () => {
  it('no-op-is-byte-identical: returns the EXACT SAME string reference when manifest already in sync', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Business Model',
      OWNERSHIP_MARKER,
      'path:: startups/acme_business_NN.md',
      'template:: [[business_V_0-2-0]]',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      {
        path: 'startups/acme_business_NN.md',
        name: 'Business Model',
        template: 'business_V_0-2-0',
      },
    ]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.changes).toEqual([])
    expect(Object.is(result.content, manifestContent)).toBe(true)
  })

  it('hand-authored-preserved-byte-identical: adding one model leaves every pre-existing byte unchanged', () => {
    const manifestContent =
      '---\r\n' +
      'level: 3\r\n' +
      'title: "Acme Workspace"\r\n' +
      '---\r\n' +
      '\r\n' +
      '# NN Workspace\r\n' +
      'The Acme workspace.\r\n' +
      '\r\n' +
      '# NN Models\r\n' +
      '\r\n' +
      '## NN Models: Legacy System\r\n' +
      '  path::   ./Legacy_System_NN.md  \r\n' +
      '  template:: [[legacy_V_0-1-0]]\r\n' +
      '  status:: active\r\n' +
      '  author:: Ada Lovelace\r\n'

    const discovered: DiscoveredModel[] = [
      { path: 'Legacy_System_NN.md', name: 'Legacy System' },
      { path: 'startups/beta_business_NN.md', name: 'Beta Business', template: 'business_V_0-2-0' },
    ]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.content.startsWith(manifestContent)).toBe(true)
    expect(result.changes).toEqual([
      { kind: 'added', path: 'startups/beta_business_NN.md', name: 'Beta Business' },
    ])
  })

  it('adds-new-model-at-end: appended block carries the marker and existing order is unchanged', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Alpha',
      OWNERSHIP_MARKER,
      'path:: alpha_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'alpha_NN.md', name: 'Alpha' },
      { path: 'beta_NN.md', name: 'Beta', template: 'business_V_0-2-0' },
    ]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.changes).toEqual([{ kind: 'added', path: 'beta_NN.md', name: 'Beta' }])
    const alphaIdx = result.content.indexOf('## NN Models: Alpha')
    const betaIdx = result.content.indexOf('## NN Models: Beta')
    expect(alphaIdx).toBeGreaterThan(-1)
    expect(betaIdx).toBeGreaterThan(alphaIdx)
    expect(result.content).toContain(
      `## NN Models: Beta\n${OWNERSHIP_MARKER}\npath:: beta_NN.md\ntemplate:: [[business_V_0-2-0]]\nstatus:: active`,
    )
  })

  it('archives-deleted-owned-entry: owned entry whose file is gone flips to archived and is retained', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Gone Model',
      OWNERSHIP_MARKER,
      'path:: gone_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const result = reconcileManifest(manifestContent, [])

    expect(result.changes).toEqual([{ kind: 'archived', path: 'gone_NN.md', name: 'Gone Model' }])
    expect(result.content).toContain('## NN Models: Gone Model')
    expect(result.content).toContain('status:: archived')
    expect(result.content).not.toContain('status:: active')
  })

  it('never-touches-unowned-entry: hand-authored entry whose file is gone is left completely unmodified', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Manual Entry',
      'path:: manual_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const result = reconcileManifest(manifestContent, [])

    expect(result.changes).toEqual([
      {
        kind: 'skipped-not-owned',
        path: 'manual_NN.md',
        name: 'Manual Entry',
        reason: 'file missing, entry not tool-owned',
      },
    ])
    expect(result.content).toBe(manifestContent)
  })

  it('reactivates-only-tool-archives: owned+archived+file-back reactivates; hand-authored+archived+file-back stays untouched', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Owned Archived',
      OWNERSHIP_MARKER,
      'path:: owned_NN.md',
      'status:: archived',
      '',
      '## NN Models: Manual Archived',
      'path:: manual_NN.md',
      'status:: archived',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'owned_NN.md', name: 'Owned Archived' },
      { path: 'manual_NN.md', name: 'Manual Archived' },
    ]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.changes).toEqual([
      { kind: 'reactivated', path: 'owned_NN.md', name: 'Owned Archived' },
      {
        kind: 'skipped-not-owned',
        path: 'manual_NN.md',
        name: 'Manual Archived',
        reason: 'file present, entry not tool-owned',
      },
    ])

    const ownedBlock = result.content.slice(
      result.content.indexOf('## NN Models: Owned Archived'),
      result.content.indexOf('## NN Models: Manual Archived'),
    )
    expect(ownedBlock).toContain('status:: active')

    const manualBlock = result.content.slice(
      result.content.indexOf('## NN Models: Manual Archived'),
    )
    expect(manualBlock).toContain('status:: archived')
  })

  it('path-matching-is-normalized: casing/prefix differences match, no duplicate entry', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Acme Business',
      OWNERSHIP_MARKER,
      'path:: ./startups/acme_business_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'Startups/Acme_Business_NN.md', name: 'Acme Business' },
    ]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.changes).toEqual([])
    expect(Object.is(result.content, manifestContent)).toBe(true)
    expect(result.content.match(/## NN Models:/g)?.length).toBe(1)
  })

  it('creates-section-when-absent: appends a fresh section at EOF, leaving prior content untouched', () => {
    const manifestContent = [
      '---',
      'level: 3',
      'title: "Acme"',
      '---',
      '',
      '# NN Workspace',
      'Desc.',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [{ path: 'alpha_NN.md', name: 'Alpha' }]

    const result = reconcileManifest(manifestContent, discovered)

    expect(result.changes).toEqual([{ kind: 'added', path: 'alpha_NN.md', name: 'Alpha' }])
    expect(result.content.startsWith(manifestContent)).toBe(true)
    expect(result.content).toContain('# NN kNNowledge')
    expect(result.content).toContain('## NN kNNowledge: Alpha')
  })

  it('reconciles canonical ## NN kNNowledge entries without creating duplicate section', () => {
    const manifestContent = [
      '# NN domaiNN',
      'Operational domain.',
      '',
      '# NN kNNowledge',
      '',
      '## NN kNNowledge: Existing',
      OWNERSHIP_MARKER,
      'path:: existing_NN.md',
      'blueprint:: [[business]]',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'existing_NN.md', name: 'Existing', template: 'business' },
      { path: 'new_NN.md', name: 'New Model', template: 'analysis' },
    ]

    const result = reconcileManifest(manifestContent, discovered)
    expect(result.changes).toEqual([{ kind: 'added', path: 'new_NN.md', name: 'New Model' }])
    expect(result.content).toContain('## NN kNNowledge: New Model')
    expect(result.content).toContain('blueprint:: [[analysis]]')
    expect(result.content).not.toContain('# NN Models')
  })

  it('keeps cognnitive documents in the model set: the record role is retired', () => {
    const candidates: CandidateFile[] = [
      candidate('acme_cogNNitive_NN.md', { level: 3, parent_spec: { name: 'cogNNitive_V_0-2-0' } }),
      candidate(MANIFEST_PATH, { level: 3, parent_spec: { name: 'workspace_V_0-2-0' } }),
      candidate('archive/old_NN.md', { level: 3, parent_spec: { name: 'business_V_0-2-0' } }),
      candidate('bluepriNNts/business_V_0-2-0_spec_NN.md', {
        level: 2,
        parent_spec: { name: 'iNNfo_V_0-2-0' },
      }),
    ]

    const reconcilable = candidates.filter((c) => isReconcilableModel(c, MANIFEST_PATH))
    expect(reconcilable.map((c) => c.path)).toEqual(['acme_cogNNitive_NN.md'])
  })

  it('regression: catalog apps never become ## NN Models entries', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '# NN Procedures',
      '',
      '## NN Procedures: Master Procedures Catalog',
      'path:: procedures/procedures_NN.md',
      '',
    ].join('\n')

    const candidates: CandidateFile[] = [
      candidate('procedures/procedures_NN.md', {
        level: 3,
        parent_spec: { name: 'procedures' },
      }),
      candidate('procedures/generar_guion_video_V_0-1-0_procedures_NN.md', {
        level: 3,
        parent_spec: { name: 'procedures' },
      }),
      candidate('sources/sources_NN.md', { level: 3, parent_spec: { name: 'sources' } }),
      candidate('artifacts/artifacts_NN.md', { level: 3, parent_spec: { name: 'artifacts' } }),
    ]

    const discovered: DiscoveredModel[] = candidates
      .filter((c) => isReconcilableModel(c, MANIFEST_PATH))
      .map((c) => ({ path: c.path, name: c.path }))
    expect(discovered).toEqual([])

    // The catalogs surface in their own sections, never as models: the
    // procedures catalog the manifest already links is in sync.
    const catalogs: DiscoveredCatalog[] = candidates.flatMap((c) => {
      const kind = catalogKindOf(c)
      return kind ? [{ kind, path: c.path, name: c.path }] : []
    })

    const result = reconcileManifest(manifestContent, discovered, catalogs)
    expect(result.changes).toEqual([])
    expect(result.content).toBe(manifestContent)
    expect(result.content).not.toContain('## NN Models:')
  })

  it('idempotent: running reconcileManifest twice produces zero further changes and identical content', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Alpha',
      OWNERSHIP_MARKER,
      'path:: alpha_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'alpha_NN.md', name: 'Alpha' },
      { path: 'beta_NN.md', name: 'Beta' },
    ]

    const first = reconcileManifest(manifestContent, discovered)
    expect(first.changes.length).toBeGreaterThan(0)

    const second = reconcileManifest(first.content, discovered)
    expect(second.changes).toEqual([])
    expect(Object.is(second.content, first.content)).toBe(true)
  })

  it('round-trip-through-parser: the spliced output re-parses as well-formed elements with the expected fields', () => {
    const manifestContent = [
      '# NN Models',
      '',
      '## NN Models: Alpha',
      OWNERSHIP_MARKER,
      'path:: alpha_NN.md',
      'status:: active',
      '',
    ].join('\n')

    const discovered: DiscoveredModel[] = [
      { path: 'alpha_NN.md', name: 'Alpha' },
      { path: 'beta_NN.md', name: 'Beta', template: 'business_V_0-2-0' },
    ]

    const result = reconcileManifest(manifestContent, discovered)
    const reparsed = parseKnowledge(result.content)
    const entries = reparsed.elements.get('Models') ?? []

    expect(entries).toHaveLength(2)
    const beta = entries.find((e) => e.name === 'Beta')
    expect(beta?.fields.path).toBe('beta_NN.md')
    expect(beta?.fields.status).toBe('active')
    expect(beta?.fields.template).toBe('[[business_V_0-2-0]]')
  })
})

describe('discoverModels: catalogKindOf', () => {
  it('recognises the catalog document of each section, at the root or in its own folder', () => {
    expect(
      catalogKindOf(candidate('sources_NN.md', { level: 3, parent_spec: { name: 'sources' } })),
    ).toBe('sources')
    expect(
      catalogKindOf(
        candidate('sources/sources_NN.md', { level: 3, parent_spec: { name: 'sources_V_0-2-1' } }),
      ),
    ).toBe('sources')
    expect(
      catalogKindOf(
        candidate('procedures_NN.md', { level: 3, parent_spec: { name: 'procedures' } }),
      ),
    ).toBe('procedures')
    expect(
      catalogKindOf(
        candidate('artifacts/artifacts_NN.md', { level: 3, parent_spec: { name: 'artifacts' } }),
      ),
    ).toBe('artifacts')
  })

  it('never mistakes a model, a procedure, the manifest, a raw source or an excluded tree for a catalog', () => {
    const notCatalogs: CandidateFile[] = [
      candidate('acme_business_NN.md', { level: 3, parent_spec: { name: 'business_V_0-2-0' } }),
      candidate('procedures/report_procedures_NN.md', {
        level: 3,
        parent_spec: { name: 'procedures' },
      }),
      candidate('sources/Report_sources_NN.md', { level: 3, parent_spec: { name: 'sources' } }),
      candidate('domaiNN_NN.md', { level: 3, parent_spec: { name: 'workspace' } }),
      candidate('sources/import/old-domain/sources_NN.md', {
        level: 3,
        parent_spec: { name: 'sources' },
      }),
      candidate('sources/sync/sources_NN.md', { level: 3, parent_spec: { name: 'sources' } }),
      candidate('archive/sources_NN.md', { level: 3, parent_spec: { name: 'sources' } }),
    ]
    for (const file of notCatalogs) {
      expect(catalogKindOf(file)).toBeNull()
    }
  })
})

describe('reconcileManifest: catalog sections', () => {
  const THREE_CATALOGS: DiscoveredCatalog[] = [
    { kind: 'sources', path: 'sources/sources_NN.md', name: 'Sources Catalog' },
    { kind: 'procedures', path: 'procedures_NN.md', name: 'Procedures Catalog' },
    { kind: 'artifacts', path: 'artifacts_NN.md', name: 'Artifacts Catalog' },
  ]

  function fourSectionManifest(): string {
    return [
      '# NN kNNowledge',
      '',
      '## NN kNNowledge: Existing',
      OWNERSHIP_MARKER,
      'path:: existing_NN.md',
      'blueprint:: [[business]]',
      'status:: active',
      '',
      '# NN Sources',
      '',
      '## NN Sources: Sources Catalog',
      'path:: sources/sources_NN.md',
      '',
      '# NN Procedures',
      '',
      '## NN Procedures: Procedures Catalog',
      'path:: procedures_NN.md',
      '',
      '# NN Artifacts',
      '',
      '## NN Artifacts: Artifacts Catalog',
      'path:: artifacts_NN.md',
      '',
    ].join('\n')
  }

  it('a kNNowledge sync leaves the three catalog sections byte-identical', () => {
    const manifestContent = fourSectionManifest()
    const catalogTail = manifestContent.slice(manifestContent.indexOf('# NN Sources'))

    const result = reconcileManifest(
      manifestContent,
      [
        { path: 'existing_NN.md', name: 'Existing' },
        { path: 'new_NN.md', name: 'New Model' },
      ],
      THREE_CATALOGS,
    )

    expect(result.changes).toEqual([{ kind: 'added', path: 'new_NN.md', name: 'New Model' }])
    expect(result.content).toContain(
      `## NN kNNowledge: New Model\n${OWNERSHIP_MARKER}\npath:: new_NN.md`,
    )
    expect(result.content.endsWith(catalogTail)).toBe(true)
  })

  it('adds a missing pointer to an existing catalog section with path only, no status and no blueprint', () => {
    const manifestContent = [
      '# NN kNNowledge',
      '',
      '# NN Sources',
      '',
      '# NN Artifacts',
      '',
      '## NN Artifacts: Artifacts Catalog',
      'path:: artifacts_NN.md',
      '',
    ].join('\n')

    const result = reconcileManifest(
      manifestContent,
      [],
      [
        { kind: 'sources', path: 'sources/sources_NN.md', name: 'Sources Catalog' },
        { kind: 'artifacts', path: 'artifacts_NN.md', name: 'Artifacts Catalog' },
      ],
    )

    expect(result.changes).toEqual([
      { kind: 'added', path: 'sources/sources_NN.md', name: 'Sources Catalog' },
    ])
    expect(result.content).toContain(
      `# NN Sources\n\n## NN Sources: Sources Catalog\n${OWNERSHIP_MARKER}\npath:: sources/sources_NN.md\n\n# NN Artifacts`,
    )
    const sourcesBlock = result.content.slice(
      result.content.indexOf('# NN Sources'),
      result.content.indexOf('# NN Artifacts'),
    )
    expect(sourcesBlock).not.toContain('status::')
    expect(sourcesBlock).not.toContain('blueprint::')
  })

  it('never creates a catalog section the manifest does not declare', () => {
    const manifestContent = ['# NN kNNowledge', '', ''].join('\n')

    const result = reconcileManifest(
      manifestContent,
      [],
      [{ kind: 'procedures', path: 'procedures/procedures_NN.md', name: 'Procedures Catalog' }],
    )

    expect(result.changes).toEqual([])
    expect(Object.is(result.content, manifestContent)).toBe(true)
    expect(result.content).not.toContain('# NN Procedures')
  })

  it('reports an unresolvable hand-authored catalog entry as missing-target and leaves it in place', () => {
    const manifestContent = [
      '# NN kNNowledge',
      '',
      '# NN Artifacts',
      '',
      '## NN Artifacts: Old',
      'path:: artifacts/old_artifacts_NN.md',
      '',
    ].join('\n')

    const result = reconcileManifest(manifestContent, [], [])

    expect(result.changes).toEqual([
      {
        kind: 'missing-target',
        path: 'artifacts/old_artifacts_NN.md',
        name: 'Old',
        reason: 'no catalog document discovered, entry not tool-owned',
      },
    ])
    expect(Object.is(result.content, manifestContent)).toBe(true)
  })

  it('reports an unresolvable tool-owned catalog entry without rewriting or archiving it', () => {
    const manifestContent = [
      '# NN kNNowledge',
      '',
      '# NN Sources',
      '',
      '## NN Sources: Moved Catalog',
      OWNERSHIP_MARKER,
      'path:: sources/moved_NN.md',
      '',
    ].join('\n')

    const result = reconcileManifest(
      manifestContent,
      [],
      [{ kind: 'sources', path: 'sources/sources_NN.md', name: 'Sources Catalog' }],
    )

    expect(result.changes).toEqual([
      {
        kind: 'missing-target',
        path: 'sources/moved_NN.md',
        name: 'Moved Catalog',
        reason: 'no catalog document discovered, entry tool-owned',
      },
      { kind: 'added', path: 'sources/sources_NN.md', name: 'Sources Catalog' },
    ])
    expect(result.content).toContain('path:: sources/moved_NN.md')
    expect(result.content).not.toContain('status:: archived')
    expect(result.content).toContain(
      `## NN Sources: Sources Catalog\n${OWNERSHIP_MARKER}\npath:: sources/sources_NN.md`,
    )
  })

  it('is idempotent: a second run over the four-section manifest reports no changes', () => {
    const first = reconcileManifest(
      fourSectionManifest(),
      [{ path: 'new_NN.md', name: 'New Model' }],
      THREE_CATALOGS,
    )

    const second = reconcileManifest(
      first.content,
      [{ path: 'new_NN.md', name: 'New Model' }],
      THREE_CATALOGS,
    )

    expect(second.changes).toEqual([])
    expect(Object.is(second.content, first.content)).toBe(true)
  })

  it('keeps one blank line between an inserted block and the next section header', () => {
    const manifestContent = [
      '# NN kNNowledge',
      '',
      '## NN kNNowledge: Alpha',
      OWNERSHIP_MARKER,
      'path:: alpha_NN.md',
      'status:: active',
      '',
      '# NN Templates',
      '',
      '## NN Templates: Business',
      'path:: templates/business/spec_NN.md',
      '',
    ].join('\n')

    const result = reconcileManifest(manifestContent, [
      { path: 'alpha_NN.md', name: 'Alpha' },
      { path: 'beta_NN.md', name: 'Beta' },
    ])

    expect(result.content).toContain(
      `## NN kNNowledge: Beta\n${OWNERSHIP_MARKER}\npath:: beta_NN.md\nstatus:: active\n\n# NN Templates`,
    )
    expect(
      result.content.endsWith(manifestContent.slice(manifestContent.indexOf('# NN Templates'))),
    ).toBe(true)
  })
})
